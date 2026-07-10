import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

// Stripe's hosted Billing Portal is the manage/cancel surface: plan
// switches, payment-method updates, and cancellations all happen there,
// and land back in our webhook as customer.subscription.* events.
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments are not enabled yet." }, { status: 503 });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const { data: { user } } = token
    ? await supabaseServer.auth.getUser(token)
    : { data: { user: null } };
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: mapping } = await supabaseServer
    .from("stripe_customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!mapping?.customer_id) {
    return NextResponse.json({ error: "No subscription found for this account." }, { status: 404 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://studyledger.in";
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: mapping.customer_id,
      return_url: `${base}/dashboard`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[billing-portal] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not open the billing portal." }, { status: 500 });
  }
}
