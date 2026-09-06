import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BURST_WINDOW_MS,
  DAILY_WINDOW_MS,
  limitsFor,
  planFromRow,
  type Plan,
} from "./plans";

export type RateLimitResult =
  | { allowed: true; plan: Plan; remaining: number; limit: number }
  | { allowed: false; plan: Plan; remaining: 0; limit: number; message: string };

/**
 * Checks both windows against ai_invocations (migration 0008) for the caller's
 * plan (migration 0012). Fails open (allows the call) if the check itself
 * errors, e.g. a migration hasn't been applied yet, a missing table shouldn't
 * take down the AI tools entirely.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<RateLimitResult> {
  const now = Date.now();
  const burstSince = new Date(now - BURST_WINDOW_MS).toISOString();
  const dailySince = new Date(now - DAILY_WINDOW_MS).toISOString();

  const [burst, daily, sub] = await Promise.all([
    supabase
      .from("ai_invocations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", burstSince),
    supabase
      .from("ai_invocations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", dailySince),
    supabase.from("subscriptions").select("plan, expires_at").eq("user_id", userId).maybeSingle(),
  ]);

  // A missing subscriptions table means nobody has upgraded yet, which is the
  // same answer as a missing row: free.
  const plan = planFromRow(sub.error ? null : sub.data);
  const limits = limitsFor(plan);

  if (burst.error || daily.error) {
    return { allowed: true, plan, remaining: limits.daily, limit: limits.daily };
  }

  const dailyUsed = daily.count ?? 0;
  const remaining = Math.max(0, limits.daily - dailyUsed);

  if ((burst.count ?? 0) >= limits.burst) {
    return {
      allowed: false,
      plan,
      remaining: 0,
      limit: limits.daily,
      message: "Too many AI requests in a short time. Wait a few minutes and try again.",
    };
  }
  if (dailyUsed >= limits.daily) {
    return {
      allowed: false,
      plan,
      remaining: 0,
      limit: limits.daily,
      // No upsell here. There is nothing to buy yet, and inviting someone to
      // upgrade to a plan that does not exist is worse than saying nothing.
      message: `That's your ${limits.daily} AI requests for today. The allowance frees up gradually over the next 24 hours, and every tool that doesn't call the AI still works.`,
    };
  }
  return { allowed: true, plan, remaining, limit: limits.daily };
}

/** Records an attempt regardless of whether the model call itself later
 * succeeds, a failed call still cost a function invocation, and counting
 * it discourages retry-storming past the limit. */
export async function recordInvocation(supabase: SupabaseClient, userId: string, tool: string) {
  await supabase.from("ai_invocations").insert({ user_id: userId, tool });
}
