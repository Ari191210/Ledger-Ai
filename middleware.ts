import { NextRequest, NextResponse } from "next/server";
import { authDecision, isEnforcementEnabled } from "@/lib/auth-routes";

// Composite key: "endpoint-group:ip"
// COLD-START NOTE: this Map is per-serverless-instance and resets on every Vercel cold start.
// It is a fast IP-burst guard only — NOT the authoritative rate limit.
// The authoritative per-user daily limit is enforced in app/api/ai/route.ts via the
// Supabase `ai_calls` column. Do not rely on this Map for correctness guarantees.
const hits = new Map<string, { count: number; resetAt: number }>();

interface RateRule {
  prefix: string;
  limit: number;
  windowMs: number;
}

const RULES: RateRule[] = [
  { prefix: "/api/ai",                    limit: 20, windowMs: 60_000 }, // 20/min — AI calls
  { prefix: "/api/auth/google",           limit: 5,  windowMs: 60_000 }, // 5/min  — OAuth exchange
  // Unauthenticated, and every call sends a real email via Resend. The matcher
  // below already covers /api/auth/:path*, but no RULE prefix matched this path,
  // so the lookup fell through and the route ran with no limit at all.
  { prefix: "/api/auth/send-reset",       limit: 3,  windowMs: 600_000 }, // 3/10min — unauth'd password-reset email
  { prefix: "/api/welcome",               limit: 3,  windowMs: 60_000 }, // 3/min  — email sends
  { prefix: "/api/send-report",           limit: 5,  windowMs: 60_000 }, // 5/min  — email + billable AI call
  { prefix: "/api/parent",                limit: 10, windowMs: 60_000 }, // 10/min — unauth'd, code-guessing guard
  { prefix: "/api/admin/generate-hash",   limit: 2,  windowMs: 60_000 }, // 2/min  — unauth'd, expensive scrypt hash
  { prefix: "/api/track",                 limit: 60, windowMs: 60_000 }, // 60/min — client analytics beacon
  { prefix: "/api/errors",                limit: 30, windowMs: 60_000 }, // 30/min — client error-log beacon
  { prefix: "/api/jobs/enqueue",          limit: 5,  windowMs: 60_000 }, // 5/min  — queues background email work
];

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  entry.count++;
  return {
    ok: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// M4-1 — this middleware now does two things, in this order:
//
//   1. THE RATE LIMITER, UNCHANGED. Every `RULES` prefix, every limit, every
//      window, the CRON_SECRET bypass, the 429 body and all four response
//      headers are byte-for-byte what they were. The only structural change is
//      that a request which the limiter does not act on now FALLS THROUGH to
//      step 2 instead of returning early — `RULES` prefixes are all `/api/…`
//      and no page route can ever match one, so the limiter's behaviour on
//      every path it governs is identical.
//
//   2. EDGE AUTHENTICATION for student page routes (architecture R.1, T11).
//      The decision is `lib/auth-routes.ts`; this file only supplies the
//      request and acts on the verdict.
//
// **Read the header of `lib/auth-routes.ts` before enabling enforcement.** The
// session now travels as a cookie (`@supabase/ssr`, see `lib/supabase.ts`), so
// the edge CAN see it — the architectural blocker is gone. What is not yet done
// is a single human confirmation in a real browser that the cookie lands on a
// real sign-in against the real project. Until that happens, enforcement stays
// gated on `AUTH_MIDDLEWARE_ENFORCE=1` and OFF by default, because the failure
// mode of getting it wrong is that nobody can use the product.
// ═══════════════════════════════════════════════════════════════════════════
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 1. Rate limiter ──────────────────────────────────────────────────────
  const rule = RULES.find(r => pathname.startsWith(r.prefix));

  // Trusted internal callers (the cron job runner, authenticated via the
  // same CRON_SECRET the target routes themselves require) bypass the IP
  // guard — a single batch run can legitimately fire many requests from
  // one server-side origin and shouldn't trip a per-IP abuse limit meant
  // for untrusted traffic.
  const internalCaller =
    !!process.env.CRON_SECRET &&
    req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;

  let rateHeaders: Record<string, string> | null = null;

  if (rule && !internalCaller) {
    const ip = getIp(req);
    const key = `${rule.prefix}:${ip}`;
    const { ok, remaining, resetAt } = checkLimit(key, rule.limit, rule.windowMs);

    if (!ok) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit":     String(rule.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset":     String(Math.ceil(resetAt / 1000)),
            "Retry-After":           String(Math.ceil((resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    rateHeaders = {
      "X-RateLimit-Limit":     String(rule.limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset":     String(Math.ceil(resetAt / 1000)),
    };
  }

  // ── 2. Edge authentication ───────────────────────────────────────────────
  const verdict = authDecision({
    pathname,
    cookieNames: req.cookies.getAll().map(c => c.name),
    // Read as a static member access, not by passing `process.env` wholesale:
    // the edge runtime inlines `process.env.FOO` at build time and cannot
    // inline a spread of the whole object.
    enforce: isEnforcementEnabled({
      AUTH_MIDDLEWARE_ENFORCE: process.env.AUTH_MIDDLEWARE_ENFORCE,
    }),
  });

  if (verdict.action === "redirect") {
    const url = req.nextUrl.clone();
    url.pathname = verdict.location!;
    // The sign-in page reads `?forgot=1` and `?error=…` and nothing else, so
    // carrying the protected route's query string forward would only leak it
    // into a URL that ignores it. Returning to the intended destination after
    // sign-in needs `app/auth/page.tsx` to honour a `next` param — that page is
    // rebuilt in M5-3, and the round-trip belongs there rather than half-built
    // here.
    url.search = "";
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (rateHeaders) {
    for (const [k, v] of Object.entries(rateHeaders)) res.headers.set(k, v);
  }
  return res;
}

export const config = {
  matcher: [
    // — Rate-limited API surfaces (unchanged) —
    "/api/ai/:path*",
    "/api/auth/:path*",
    "/api/welcome",
    "/api/send-report",
    "/api/parent/:path*",
    "/api/admin/generate-hash",
    "/api/track",
    "/api/errors",
    "/api/jobs/enqueue",
    // — M4-1: student page routes, authenticated at the edge —
    // `/home` is the one shell (M3-1). `/dashboard` and `/console` are 308
    // redirects on their exact paths only, so their SUBPATHS — `/dashboard/
    // profile`, `/dashboard/saved`, `/console/ai`, `/console/analytics`,
    // `/console/practice`, `/console/work` — are still real student surfaces
    // and are matched here. `/tools/:path*` covers all 46.
    "/dashboard/:path*",
    "/console/:path*",
    "/tools/:path*",
    "/onboard",
    // Bare segments too: `:path*` does not match the segment on its own.
    "/dashboard",
    "/console",
    "/tools",
  ],
};
