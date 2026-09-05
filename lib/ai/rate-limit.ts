import type { SupabaseClient } from "@supabase/supabase-js";

// Two windows: a burst cap to stop scripted hammering, a daily cap to stop
// one account from running up the real Anthropic bill unbounded. Both are
// deliberately generous for a real study session, not tuned to be stingy.
const BURST_LIMIT = 8;
const BURST_WINDOW_MS = 10 * 60 * 1000;
const DAILY_LIMIT = 50;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

export type RateLimitResult = { allowed: true } | { allowed: false; message: string };

/**
 * Checks both windows against ai_invocations (migration 0008). Fails open
 * (allows the call) if the check itself errors, e.g. the migration hasn't
 * been applied yet, a missing rate-limit table shouldn't take down the AI
 * tools entirely.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<RateLimitResult> {
  const now = Date.now();
  const burstSince = new Date(now - BURST_WINDOW_MS).toISOString();
  const dailySince = new Date(now - DAILY_WINDOW_MS).toISOString();

  const [burst, daily] = await Promise.all([
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
  ]);

  if (burst.error || daily.error) return { allowed: true };

  if ((burst.count ?? 0) >= BURST_LIMIT) {
    return {
      allowed: false,
      message: "Too many AI requests in a short time. Wait a few minutes and try again.",
    };
  }
  if ((daily.count ?? 0) >= DAILY_LIMIT) {
    return {
      allowed: false,
      message: `You've hit today's limit of ${DAILY_LIMIT} AI requests. It resets on a rolling 24-hour basis.`,
    };
  }
  return { allowed: true };
}

/** Records an attempt regardless of whether the model call itself later
 * succeeds, a failed call still cost a function invocation, and counting
 * it discourages retry-storming past the limit. */
export async function recordInvocation(supabase: SupabaseClient, userId: string, tool: string) {
  await supabase.from("ai_invocations").insert({ user_id: userId, tool });
}
