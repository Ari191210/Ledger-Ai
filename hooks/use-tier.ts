"use client";
import { useState, useEffect } from "react";

export type Tier = "starter" | "pro" | "pro-plus";

const TIERS: Tier[] = ["starter", "pro", "pro-plus"];
export const TIER_RANK: Record<Tier, number> = { starter: 0, pro: 1, "pro-plus": 2 };

export function useTier(): Tier {
  const [tier, setTier] = useState<Tier>("starter");
  useEffect(() => {
    const stored = localStorage.getItem("ledger-tier") as Tier | null;
    if (stored && TIERS.includes(stored)) setTier(stored);
  }, []);
  return tier;
}

export function setStoredTier(tier: Tier) {
  localStorage.setItem("ledger-tier", tier);
  window.location.reload();
}
