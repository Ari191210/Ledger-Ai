import { Flame, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/score/inputs";
import { todayPartsIST } from "@/lib/date";

/**
 * The streak and score chips in the top bar.
 *
 * These two numbers are the whole reason the app shell used to run
 * getDashboardData before rendering anything: sixty days of activity, every
 * mistake, thirty days of past papers, the syllabus and the streak, computed on
 * every page load to print two chips. The HTML headers were leaving in 31ms and
 * the body was taking 1.8 seconds behind them, so nothing painted at all until
 * the work finished, on the timer page as much as on the dashboard.
 *
 * Split out and suspended, the page streams first and the chips arrive when
 * they are ready. The fallback is the same size as the real thing, so nothing
 * moves when they land.
 */
const CHIP =
  "u-mono hidden items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-2xs font-medium sm:flex";

export function LedgerChipsFallback() {
  return (
    <>
      <span className={`${CHIP} text-text-3`} aria-hidden>
        <Flame size={12} className="text-text-3" />
        <span className="tabular-nums">··</span>
      </span>
      <span className={`${CHIP} text-text-3`} aria-hidden>
        <TrendingUp size={12} className="text-text-3" />
        <span className="tabular-nums">···</span>
      </span>
    </>
  );
}

export async function LedgerChips({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { score, streakDays, studiedDays } = await getDashboardData(supabase, userId);
  // Same source as the streak (activity_days with minutes), so this is exactly
  // "today counts toward the run yet".
  const loggedToday = studiedDays.has(todayPartsIST().day);
  // A run still standing on yesterday: shown, not zeroed, but marked as waiting
  // on today, so the chip tells the truth in both directions.
  const atRisk = streakDays > 0 && !loggedToday;
  const streakLabel = atRisk
    ? `${streakDays} day streak, log today to keep it`
    : `${streakDays} day streak`;

  return (
    <>
      <span className={`${CHIP} ${atRisk ? "text-text-3" : "text-text-2"}`} title={streakLabel} aria-label={streakLabel}>
        <Flame size={12} className={atRisk ? "text-text-3" : "text-accent-strong"} />
        {streakDays}d
      </span>
      <span className={`${CHIP} text-text`}>
        <TrendingUp size={12} className="text-accent-2-strong" />
        {score.total}
      </span>
    </>
  );
}
