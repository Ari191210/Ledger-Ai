# Stripe Subscription Architecture

## Invariants

1. **`app_metadata.tier` is the single source of truth** for a user's plan.
   It is only writable with the service role (`supabaseServer.auth.admin.
   updateUserById`) — never from the client — which is why `lib/tier.ts`
   reads it from `user.app_metadata` and deliberately not from the
   RLS-writable `user_data` table.
2. **Only the webhook writes the tier.** The checkout route never grants
   access optimistically; access flips when Stripe confirms payment via
   `checkout.session.completed`.
3. **Every webhook event is processed at most once** (event-id dedup) and
   **at least once** (any processing failure returns 5xx so Stripe retries).

## Components

| Piece | File | Job |
|---|---|---|
| Stripe client | `lib/stripe.ts` | Lazy singleton; `isStripeConfigured()` guards every route so the app builds and runs with no Stripe env at all |
| Pure tier logic | `lib/stripe-tier.ts` | price-id → tier mapping and the webhook event → action reducer. No I/O, unit-tested |
| Checkout | `app/api/checkout/route.ts` | Authenticated (Bearer, same pattern as `/api/welcome`); creates a subscription-mode Checkout Session |
| Billing portal | `app/api/billing-portal/route.ts` | Authenticated; lets an existing subscriber manage/cancel — cancellation UX is Stripe's hosted portal |
| Webhook | `app/api/webhooks/stripe/route.ts` | Signature verification, replay/idempotency guard, tier writes |
| Upgrade UI | `components/ui/pricing-cards.tsx` | Signed-in users go straight to Checkout; signed-out fall back to `/auth` |

## Data flow

```
student clicks "Get Pro"
  → POST /api/checkout  { tier, interval }         (Bearer = supabase access token)
      · resolves price id from STRIPE_PRICE_* env
      · metadata { userId, tier } on BOTH the session and subscription_data
      · reuses stripe_customers.customer_id when the user has one
  → 303 to Stripe-hosted Checkout
  → Stripe: checkout.session.completed
  → POST /api/webhooks/stripe
      · stripe.webhooks.constructEvent (signature + 300s timestamp tolerance
        = replay protection for old payloads)
      · INSERT event.id INTO stripe_events  — unique PK; conflict = already
        processed = return 200 immediately (idempotency for retries and
        duplicate deliveries)
      · upsert stripe_customers (customer_id → user_id)
      · app_metadata: { tier, stripe_customer_id, stripe_subscription_id,
        stripe_status }
      · on any failure: DELETE the stripe_events row, return 500
        → Stripe retries → row is absent → reprocessed  (failure recovery)
```

## Lifecycle events handled

| Event | Action |
|---|---|
| `checkout.session.completed` | set tier from metadata; record customer mapping |
| `customer.subscription.updated` | re-derive tier from the subscription's price id (plan switches, renewals); `cancel_at_period_end` keeps the tier — access runs to period end |
| `customer.subscription.deleted` | downgrade to `free` |
| `invoice.payment_failed` | record `stripe_status: past_due`; tier unchanged — Stripe dunning owns retries, `subscription.deleted` is the terminal downgrade |

Unknown events are acknowledged with 200 and ignored (forward-compatible).

## Environment

```
STRIPE_SECRET_KEY            sk_live_… / sk_test_…
STRIPE_WEBHOOK_SECRET        whsec_…   (from the webhook endpoint config)
STRIPE_PRICE_PRO_MONTHLY     price_…   ₹199/mo
STRIPE_PRICE_PRO_YEARLY      price_…   ₹1,499/yr
STRIPE_PRICE_MAX_MONTHLY     price_…   ₹499/mo
STRIPE_PRICE_MAX_YEARLY      price_…   ₹3,999/yr
NEXT_PUBLIC_SITE_URL         already used by lib/jobs.ts; checkout return URLs
```

## Database (service-role only; RLS enabled with no policies)

Two tables: `stripe_events` (processed-event dedup) and `stripe_customers`
(customer → user resolution for subscription events, which don't carry
session metadata). SQL in the migration snippet shipped with this change.

## Rollout

1. Run the SQL migration.
2. Create the four prices in Stripe; set env vars on Vercel.
3. Point a Stripe webhook endpoint at `/api/webhooks/stripe` with the four
   events above; copy the signing secret.
4. Test-mode end-to-end: checkout → tier flips to `pro` → portal cancel →
   `subscription.deleted` → tier back to `free`.
5. Tier *enforcement* stays governed by `TIER_ENFORCEMENT_DATE` /
   `NEXT_PUBLIC_TIER_ENFORCEMENT` in `lib/tier.ts` — payments can go live
   before or after enforcement flips, independently.
