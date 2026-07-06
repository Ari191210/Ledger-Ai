import type { User } from "@supabase/supabase-js";

// Free / Pro (₹199/mo) / Max — mirrors the pricing page.
export type Tier = "free" | "pro" | "max";

// Legacy gate markup still says requires="pro-plus"; that tier is now Max.
export type TierRequirement = Tier | "pro-plus";

const TIER_ORDER: Record<Tier, number> = { free: 0, pro: 1, max: 2 };

export const TIER_LABELS: Record<Tier, string> = { free: "Free", pro: "Pro", max: "Max" };

export function normalizeTier(req: TierRequirement): Tier {
  return req === "pro-plus" ? "max" : req;
}

// Paywall activation date. Before this, every gate renders its children so
// nothing locks while there is no way to pay. Stripe checkout wiring lands
// separately; flipping NEXT_PUBLIC_TIER_ENFORCEMENT=on turns gates on early
// for testing, =off holds them closed past the date.
export const TIER_ENFORCEMENT_DATE = new Date("2026-09-08T00:00:00Z");

export function isTierEnforced(now = new Date()): boolean {
  const flag = process.env.NEXT_PUBLIC_TIER_ENFORCEMENT;
  if (flag === "on") return true;
  if (flag === "off") return false;
  return now >= TIER_ENFORCEMENT_DATE;
}

// The tier lives in Supabase app_metadata, which only the service role can
// write. It must NOT move to the user_data row: RLS lets users update their
// own row, which would make the tier self-upgradeable from devtools.
export function userTier(user: User | null | undefined): Tier {
  const t = user?.app_metadata?.tier;
  return t === "pro" || t === "max" ? t : "free";
}

export function tierAtLeast(have: Tier, need: Tier): boolean {
  return TIER_ORDER[have] >= TIER_ORDER[need];
}

// The one call sites should use: enforcement window + tier rank in one check.
export function hasAccess(user: User | null | undefined, need: TierRequirement, now = new Date()): boolean {
  if (!isTierEnforced(now)) return true;
  return tierAtLeast(userTier(user), normalizeTier(need));
}
