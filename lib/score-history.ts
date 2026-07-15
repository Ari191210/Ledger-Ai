import { supabase } from "./supabase";
import { buildMarketReport, type ScoreSnapshot, type MarketReport } from "./score-market";

// Reads the signed-in user's score series.
//
// No API route is needed: score_history has an RLS SELECT policy scoped to
// auth.uid(), so the browser's anon key can only ever return this user's own
// rows. Writes are service-role only (the daily close cron), so a student can
// read their track record but cannot manufacture one.

const DEFAULT_WINDOW_DAYS = 90;

export async function fetchScoreHistory(
  userId: string,
  windowDays: number = DEFAULT_WINDOW_DAYS
): Promise<ScoreSnapshot[]> {
  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  const { data, error } = await supabase
    .from("score_history")
    .select("captured_on, total, pqa, syllabus, mistakes, consistency, streak, papers_count, recent_mistakes")
    .eq("user_id", userId)
    .gte("captured_on", since.toISOString().slice(0, 10))
    .order("captured_on", { ascending: false });

  if (error) throw new Error(`fetchScoreHistory: ${error.message}`);
  return (data ?? []) as ScoreSnapshot[];
}

/**
 * The series plus everything the newspaper needs to write about it.
 *
 * Returns a report with isNewlyListed=true (not an error, not a fake chart)
 * when the account has fewer than two closes on record. The UI must render an
 * honest "building track record" state in that case — a ticker with one data
 * point is worse than no ticker.
 */
export async function fetchMarketReport(
  userId: string,
  windowDays: number = DEFAULT_WINDOW_DAYS
): Promise<MarketReport> {
  return buildMarketReport(await fetchScoreHistory(userId, windowDays));
}
