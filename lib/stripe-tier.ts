// Pure Stripe → tier logic. No I/O, no SDK imports — unit-tested directly
// (tests/score-projection.test.mjs compiles this file alongside the score
// libs). The webhook route is a thin adapter over decideTierAction().

export type PaidTier = "pro" | "max";
export type BillingInterval = "monthly" | "yearly";

export type PriceEnv = {
  proMonthly?: string;
  proYearly?: string;
  maxMonthly?: string;
  maxYearly?: string;
};

export function readPriceEnv(env: Record<string, string | undefined>): PriceEnv {
  return {
    proMonthly: env.STRIPE_PRICE_PRO_MONTHLY,
    proYearly:  env.STRIPE_PRICE_PRO_YEARLY,
    maxMonthly: env.STRIPE_PRICE_MAX_MONTHLY,
    maxYearly:  env.STRIPE_PRICE_MAX_YEARLY,
  };
}

export function priceIdFor(prices: PriceEnv, tier: PaidTier, interval: BillingInterval): string | null {
  const id = tier === "pro"
    ? (interval === "monthly" ? prices.proMonthly : prices.proYearly)
    : (interval === "monthly" ? prices.maxMonthly : prices.maxYearly);
  return id || null;
}

export function tierForPrice(prices: PriceEnv, priceId: string): PaidTier | null {
  if (priceId && (priceId === prices.proMonthly || priceId === prices.proYearly)) return "pro";
  if (priceId && (priceId === prices.maxMonthly || priceId === prices.maxYearly)) return "max";
  return null;
}

// ── Webhook event reducer ────────────────────────────────────────────────────

/** The subset of Stripe event payloads the reducer needs — structural, so
 *  tests can construct them without the SDK. */
export type WebhookEventShape = {
  type: string;
  data: {
    object: {
      // checkout.session.completed
      metadata?: Record<string, string> | null;
      customer?: string | null;
      subscription?: string | null;
      // customer.subscription.*
      id?: string;
      status?: string;
      cancel_at_period_end?: boolean;
      items?: { data?: Array<{ price?: { id?: string } }> };
    };
  };
};

export type TierAction =
  | {
      type: "set-tier";
      /** From session metadata (checkout) — absent means resolve via customer id. */
      userId?: string;
      customerId: string;
      tier: "free" | PaidTier;
      subscriptionId?: string;
      status: string;
    }
  | { type: "record-status"; customerId: string; status: string }
  | { type: "ignore"; reason: string };

export function decideTierAction(prices: PriceEnv, event: WebhookEventShape): TierAction {
  const obj = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      const tier = obj.metadata?.tier;
      const userId = obj.metadata?.userId;
      if (tier !== "pro" && tier !== "max") return { type: "ignore", reason: "no tier metadata" };
      if (!obj.customer) return { type: "ignore", reason: "no customer on session" };
      return {
        type: "set-tier", userId, customerId: obj.customer, tier,
        subscriptionId: obj.subscription ?? undefined, status: "active",
      };
    }

    case "customer.subscription.updated": {
      if (!obj.customer) return { type: "ignore", reason: "no customer on subscription" };
      const priceId = obj.items?.data?.[0]?.price?.id ?? "";
      const tier = tierForPrice(prices, priceId);
      if (!tier) return { type: "ignore", reason: `unknown price ${priceId}` };
      // cancel_at_period_end keeps access until the period lapses —
      // the terminal downgrade arrives as customer.subscription.deleted.
      return {
        type: "set-tier", customerId: obj.customer, tier,
        subscriptionId: obj.id, status: obj.status ?? "active",
      };
    }

    case "customer.subscription.deleted": {
      if (!obj.customer) return { type: "ignore", reason: "no customer on subscription" };
      return {
        type: "set-tier", customerId: obj.customer, tier: "free",
        subscriptionId: obj.id, status: "canceled",
      };
    }

    case "invoice.payment_failed": {
      // Tier unchanged — Stripe dunning retries; subscription.deleted is
      // the terminal downgrade. Recording past_due enables UI messaging.
      if (!obj.customer) return { type: "ignore", reason: "no customer on invoice" };
      return { type: "record-status", customerId: obj.customer, status: "past_due" };
    }

    default:
      return { type: "ignore", reason: `unhandled event type ${event.type}` };
  }
}
