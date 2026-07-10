import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase-server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { decideTierAction, readPriceEnv } from "@/lib/stripe-tier";

// The only writer of app_metadata.tier. Guarantees:
//  · signature verification (constructEvent; 300s timestamp tolerance
//    doubles as replay protection for captured payloads)
//  · at-most-once: event ids recorded in stripe_events — a duplicate or
//    retried delivery of a processed event returns 200 without side effects
//  · at-least-once: any processing failure removes the dedup row and
//    returns 500, so Stripe's retry reprocesses from scratch
export async function POST(req: NextRequest) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = getStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("[stripe-webhook] signature verification failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Idempotency / replay guard — claim the event id before doing work.
  const { error: claimError } = await supabaseServer
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });
  if (claimError) {
    if (claimError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[stripe-webhook] could not claim event:", claimError.message);
    return NextResponse.json({ error: "Event store unavailable." }, { status: 500 });
  }

  try {
    const action = decideTierAction(
      readPriceEnv(process.env),
      event as unknown as Parameters<typeof decideTierAction>[1],
    );

    if (action.type === "set-tier") {
      const userId = action.userId ?? (await userIdForCustomer(action.customerId));
      if (!userId) throw new Error(`no user mapping for customer ${action.customerId}`);

      // Keep the customer→user mapping current (first write happens on
      // checkout.session.completed, which carries userId in metadata).
      await supabaseServer
        .from("stripe_customers")
        .upsert({ customer_id: action.customerId, user_id: userId });

      const { data: { user }, error: getErr } = await supabaseServer.auth.admin.getUserById(userId);
      if (getErr || !user) throw new Error(`user ${userId} not found: ${getErr?.message}`);

      const { error: updErr } = await supabaseServer.auth.admin.updateUserById(userId, {
        app_metadata: {
          ...user.app_metadata,
          tier: action.tier,
          stripe_customer_id: action.customerId,
          stripe_subscription_id: action.subscriptionId ?? user.app_metadata?.stripe_subscription_id,
          stripe_status: action.status,
        },
      });
      if (updErr) throw new Error(`tier update failed: ${updErr.message}`);
    } else if (action.type === "record-status") {
      const userId = await userIdForCustomer(action.customerId);
      if (userId) {
        const { data: { user } } = await supabaseServer.auth.admin.getUserById(userId);
        if (user) {
          await supabaseServer.auth.admin.updateUserById(userId, {
            app_metadata: { ...user.app_metadata, stripe_status: action.status },
          });
        }
      }
    }
    // action.type === "ignore" acknowledges with 200 (forward-compatible).

    return NextResponse.json({ received: true });
  } catch (e) {
    // Release the claim so Stripe's retry reprocesses this event.
    await supabaseServer.from("stripe_events").delete().eq("id", event.id);
    console.error("[stripe-webhook] processing failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}

async function userIdForCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabaseServer
    .from("stripe_customers")
    .select("user_id")
    .eq("customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}
