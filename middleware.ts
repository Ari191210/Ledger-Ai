import { NextRequest, NextResponse } from "next/server";

// Composite key: "endpoint-group:ip"
const hits = new Map<string, { count: number; resetAt: number }>();

interface RateRule {
  prefix: string;
  limit: number;
  windowMs: number;
}

const RULES: RateRule[] = [
  { prefix: "/api/ai",          limit: 20, windowMs: 60_000 }, // 20/min — AI calls
  { prefix: "/api/auth/google", limit: 5,  windowMs: 60_000 }, // 5/min  — OAuth exchange
  { prefix: "/api/welcome",     limit: 3,  windowMs: 60_000 }, // 3/min  — email sends
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const rule = RULES.find(r => pathname.startsWith(r.prefix));
  if (!rule) return NextResponse.next();

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

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit",     String(rule.limit));
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  res.headers.set("X-RateLimit-Reset",     String(Math.ceil(resetAt / 1000)));
  return res;
}

export const config = {
  matcher: ["/api/ai/:path*", "/api/auth/:path*", "/api/welcome"],
};
