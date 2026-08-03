import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This endpoint is intentionally unauthenticated: it must capture crashes on
// public pages and blank screens where no session exists. That means the body
// is attacker-controlled, and it writes with the SERVICE ROLE (RLS bypassed),
// so every field that another system makes a decision from must be constrained
// here.
//
// `type` is the security-critical one. /api/ai suspends a user's AI access for
// 30 days once they have 3 error_logs rows of type "moderation_block"
// (app/api/ai/route.ts getUserStrikeCount + the strike check). Those rows are
// written server-side by /api/ai itself — never through this route. Accepting
// an arbitrary `type` here therefore let anyone ban any account by posting
// three forged rows. Only the types real clients emit are accepted:
//   · js_error, unhandled_rejection, blank_screen  (components/error-logger.tsx)
//   · react_crash                                  (components/error-boundary.tsx)
const CLIENT_ERROR_TYPES = new Set([
  "js_error",
  "unhandled_rejection",
  "blank_screen",
  "react_crash",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_CONTEXT_BYTES = 4000;

function safeContext(context: unknown): Record<string, unknown> {
  if (!context || typeof context !== "object") return {};
  try {
    return JSON.stringify(context).length <= MAX_CONTEXT_BYTES
      ? (context as Record<string, unknown>)
      : {};
  } catch {
    return {}; // circular or non-serialisable
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, message, stack, url, route, user_agent, user_id, context } = body;
    if (!type) return NextResponse.json({ ok: false });

    // Unknown/forged types are dropped silently — same shape of response as
    // before, so no client behaviour changes.
    if (typeof type !== "string" || !CLIENT_ERROR_TYPES.has(type)) {
      return NextResponse.json({ ok: false });
    }

    // Unverified attribution: keep it only if it is at least shaped like a real
    // user id, so the column cannot be stuffed with arbitrary payloads.
    const attributedUser = typeof user_id === "string" && UUID_RE.test(user_id) ? user_id : null;

    await supabaseServer.from("error_logs").insert({
      type,
      message: message?.slice(0, 2000) ?? null,
      stack:   stack?.slice(0, 5000)   ?? null,
      url:     typeof url   === "string" ? url.slice(0, 2000)   : null,
      route:   typeof route === "string" ? route.slice(0, 512)  : null,
      user_agent: typeof user_agent === "string" ? user_agent.slice(0, 512) : null,
      user_id:    attributedUser,
      // Bound the JSON blob — this is an unauthenticated service-role write.
      // Oversized payloads are dropped whole rather than truncated, so the row
      // is never written with malformed JSON.
      context:    safeContext(context),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
