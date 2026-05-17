import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── In-memory IP rate limiter (resets on cold start — good enough for edge) ──
const ipHits = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS  = 60_000; // 1 minute window
const IP_LIMIT   = 20;     // 20 AI calls per minute per IP (unauthenticated)
const AUTH_LIMIT = 60;     // 60 per minute for authenticated users

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkIpLimit(ip: string, limit: number): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: limit - 1, resetAt: now + WINDOW_MS };
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  const ok = entry.count <= limit;
  return { ok, remaining, resetAt: entry.resetAt };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only gate the AI route
  if (!pathname.startsWith("/api/ai")) {
    return NextResponse.next();
  }

  const ip = getIp(req);

  // Try to identify authenticated user from Bearer token
  let isAuthed = false;
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    isAuthed = true; // trust the token — route handler validates it fully
  }

  const limit = isAuthed ? AUTH_LIMIT : IP_LIMIT;
  const { ok, remaining, resetAt } = checkIpLimit(ip, limit);

  if (!ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before trying again." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit":     String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset":     String(Math.ceil(resetAt / 1000)),
          "Retry-After":           String(Math.ceil((resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit",     String(limit));
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  res.headers.set("X-RateLimit-Reset",     String(Math.ceil(resetAt / 1000)));
  return res;
}

export const config = {
  matcher: ["/api/ai/:path*"],
};
