import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isPushConfigured } from "@/lib/push";

// Push subscription registry. GET reports what the SERVER actually knows,
// POST upserts a device subscription (multiple devices/browsers per user —
// endpoint is the primary key), DELETE removes one. Bearer-authenticated with
// the same pattern as every user-called API.

async function authedUser(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const { data: { user } } = await supabaseServer.auth.getUser(token);
  return user;
}

/**
 * Ground truth for the client.
 *
 * `subscribed` is read from the table, not inferred from the browser. The
 * browser's own `pushManager.getSubscription()` lied for months: users who
 * granted permission while `push_subscriptions` did not exist in prod kept a
 * live browser-side subscription whose row had been silently dropped. The
 * opt-in card trusted that browser state, saw "already subscribed", and hid
 * itself — so the very users who had opted in could never be re-registered.
 *
 * `publicKey` is served at runtime rather than left to the client's
 * build-time-inlined NEXT_PUBLIC_VAPID_PUBLIC_KEY. If that var is missing from
 * the build environment it inlines as `undefined` and the whole feature
 * vanishes from the UI with a green build and no error anywhere. Same class of
 * silent failure this codebase keeps getting bitten by; the server is the one
 * place that can be checked.
 */
export async function GET(req: NextRequest) {
  const user = await authedUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const configured = isPushConfigured();
  if (!configured) {
    return NextResponse.json({ configured: false, publicKey: null, subscribed: false });
  }

  const { data, error } = await supabaseServer
    .from("push_subscriptions")
    .select("endpoint")
    .eq("user_id", user.id)
    .limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    configured: true,
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
    subscribed: (data?.length ?? 0) > 0,
  });
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

  // Read the row back before claiming success. A write that returns no error
  // is not a row that exists — that assumption is exactly how this table sat
  // empty while the UI reported every subscription as saved.
  const { data: verify } = await supabaseServer
    .from("push_subscriptions")
    .select("endpoint")
    .eq("endpoint", endpoint)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!verify) {
    return NextResponse.json({ error: "Subscription did not persist." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, verified: true });
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
