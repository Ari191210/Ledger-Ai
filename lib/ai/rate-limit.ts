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
 * plan (migration 0012).
 *
 * Call this AFTER recording the invocation, not before. Counting first and
 * inserting afterwards leaves a gap in which parallel requests all read the
 * same count and all pass, which makes the cap decorative against anyone with
 * a devtools console. Recording first means every racer is counted, so the
 * counts here include the caller's own row and the comparisons below are
 * strictly greater-than rather than greater-or-equal.
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

  // Fail CLOSED. This used to allow the call through, defending against a
  // migration that had not been applied yet. That migration has been applied
  // everywhere for a long time; the realistic error today is a database
  // timeout or a 5xx, which is correlated across users and correlated with
  // load. That is the exact moment an unlimited AI budget becomes unlimited,
  // and the only backstop is the monthly cap at the provider.
  //
  // Failing open also buys nothing: during a database incident every AI tool
  // is broken anyway, because the prompt context and the profile come from the
  // same database a few lines later.
  if (burst.error || daily.error) {
    return {
      allowed: false,
      plan,
      remaining: 0,
      limit: limits.daily,
      message:
        "We can't check your AI allowance right now, so the AI tools are paused for a moment. Everything else still works. Try again shortly.",
    };
  }

  const dailyUsed = daily.count ?? 0;
  const remaining = Math.max(0, limits.daily - dailyUsed);

  if ((burst.count ?? 0) > limits.burst) {
    return {
      allowed: false,
      plan,
      remaining: 0,
      limit: limits.daily,
      message: "Too many AI requests in a short time. Wait a few minutes and try again.",
    };
  }
  if (dailyUsed > limits.daily) {
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
