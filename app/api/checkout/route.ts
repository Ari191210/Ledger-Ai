import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { priceIdFor, readPriceEnv, type BillingInterval, type PaidTier } from "@/lib/stripe-tier";

// Creates a subscription-mode Stripe Checkout Session for the signed-in
// user. Access is NOT granted here — the tier flips only when the webhook
// confirms checkout.session.completed (see docs/stripe-architecture.md).
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments are not enabled yet." }, { status: 503 });
  }

  // Same auth pattern as /api/welcome: the caller proves who they are with
  // their Supabase access token.
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const { data: { user } } = token
    ? await supabaseServer.auth.getUser(token)
    : { data: { user: null } };
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let tier: PaidTier, interval: BillingInterval;
  try {
    const body = await req.json();
    tier = body.tier;
    interval = body.interval ?? "monthly";
    if ((tier !== "pro" && tier !== "max") || (interval !== "monthly" && interval !== "yearly")) {
      throw new Error("bad input");
    }
  } catch {
    return NextResponse.json({ error: "Expected { tier: 'pro'|'max', interval?: 'monthly'|'yearly' }." }, { status: 400 });
  }

  const price = priceIdFor(readPriceEnv(process.env), tier, interval);
  if (!price) {
    return NextResponse.json({ error: "This plan is not configured yet." }, { status: 503 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://studyledger.in";

  try {
    // Reuse the Stripe customer from a previous subscription if we have one.
    const { data: existing } = await supabaseServer
      .from("stripe_customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      // userId travels on BOTH the session (for checkout.session.completed)
      // and the subscription (for later subscription.* events).
      metadata: { userId: user.id, tier },
      subscription_data: { metadata: { userId: user.id, tier } },
      ...(existing?.customer_id
        ? { customer: existing.customer_id }
        : { customer_email: user.email ?? undefined }),
      client_reference_id: user.id,
      success_url: `${base}/dashboard?upgraded=1`,
      cancel_url: `${base}/pricing`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[checkout] session creation failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
