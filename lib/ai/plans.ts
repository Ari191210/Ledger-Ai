/**
 * What each plan allows. Pure and dependency-free so the numbers can be tested
 * and changed in one place without touching the query that enforces them.
 *
 * The free allowance is meant to let a student have a genuine study session
 * using the AI tools, and to run out if they lean on it all day. It is not a
 * demo: every tool works on free, there is just a ceiling on how often.
 */

export type Plan = "free" | "pro";

export type PlanLimits = {
  /** Requests allowed in any 10-minute window, to stop scripted hammering. */
  burst: number;
  /** Requests allowed in any rolling 24 hours. This is the real allowance. */
  daily: number;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { burst: 5, daily: 10 },
  pro: { burst: 8, daily: 50 },
};

export const BURST_WINDOW_MS = 10 * 60 * 1000;
export const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * A lapsed paid plan is treated as free rather than as an error. Nothing needs
 * to run on a schedule to downgrade anyone, and a failed payment degrades to
 * the free ceiling instead of locking a student out of their own ledger.
 */
export function planFromRow(row: { plan?: string | null; expires_at?: string | null } | null): Plan {
  if (!row || row.plan !== "pro") return "free";
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return "free";
  return "pro";
}

export function limitsFor(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}
