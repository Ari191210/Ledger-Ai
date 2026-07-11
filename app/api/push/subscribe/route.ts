import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isPushConfigured } from "@/lib/push";

// Push subscription registry. POST upserts a device subscription (multiple
// devices/browsers per user — endpoint is the primary key), DELETE removes
// one. Bearer-authenticated with the same pattern as every user-called API.

async function authedUser(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const { data: { user } } = await supabaseServer.auth.getUser(token);
  return user;
}

export async function POST(req: NextRequest) {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push is not enabled yet." }, { status: 503 });
  }
  const user = await authedUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let endpoint: string, p256dh: string, auth: string, tz: string;
  try {
    const body = await req.json();
    endpoint = body.subscription?.endpoint;
    p256dh = body.subscription?.keys?.p256dh;
    auth = body.subscription?.keys?.auth;
    tz = typeof body.tz === "string" ? body.tz : "Asia/Kolkata";
    if (!endpoint?.startsWith("https://") || !p256dh || !auth) throw new Error("bad subscription");
  } catch {
    return NextResponse.json({ error: "Expected { subscription, tz }." }, { status: 400 });
  }

  const { error } = await supabaseServer.from("push_subscriptions").upsert({
    endpoint,
    user_id: user.id,
    p256dh,
    auth,
    tz,
    user_agent: req.headers.get("user-agent")?.slice(0, 255) ?? null,
    last_used_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await authedUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let endpoint: string;
  try {
    endpoint = (await req.json()).endpoint;
    if (!endpoint) throw new Error();
  } catch {
    return NextResponse.json({ error: "Expected { endpoint }." }, { status: 400 });
  }

  // Scoped to the caller's own rows — one user can't unsubscribe another.
  const { error } = await supabaseServer
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
