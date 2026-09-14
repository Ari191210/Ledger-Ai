import type { SupabaseClient } from "@supabase/supabase-js";
import { dayKeyIST } from "@/lib/date";

/**
 * What counts as a study day, in one place.
 *
 * Until 2026-09-15 only study time did (activity_days with minutes), so a
 * student who sat a past paper and logged what they got wrong, without running
 * the timer, had not studied that day as far as the streak, the calendar and
 * the consistency pillar (up to 150 points) were concerned. In production 4 of
 * the 12 days with a logged paper or mistake counted for nothing.
 *
 * The founder's rule (option b): a day counts if it has study time, or a past
 * paper, or at least MISTAKES_FOR_A_DAY mistakes. Not a single mistake, because
 * logging one throwaway mistake a day would then keep a streak alive without
 * any studying behind it.
 *
 * The streak, the calendar, the missed-day cost and /sample all read this, so
 * they cannot disagree about which days were studied.
 */
export const MISTAKES_FOR_A_DAY = 2;

export function studyDaySet(input: {
  activity: { day: string; minutes: number }[];
  pyq: { taken_at: string }[];
  mistakes: { created_at: string }[];
}): Set<string> {
  const days = new Set<string>();
  for (const a of input.activity) if (a.minutes > 0) days.add(a.day);
  for (const p of input.pyq) days.add(dayKeyIST(p.taken_at));
  const mistakesPerDay = new Map<string, number>();
  for (const m of input.mistakes) {
    const d = dayKeyIST(m.created_at);
    mistakesPerDay.set(d, (mistakesPerDay.get(d) ?? 0) + 1);
  }
  for (const [d, n] of mistakesPerDay) if (n >= MISTAKES_FOR_A_DAY) days.add(d);
  return days;
}

/** Every study day on record, newest data first, bounded like the other queries. */
export async function loadStudyDays(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
  const [activity, pyq, mistakes] = await Promise.all([
    supabase
      .from("activity_days")
      .select("day, minutes")
      .eq("user_id", userId)
      .gt("minutes", 0)
      .order("day", { ascending: false })
      .limit(400),
    supabase
      .from("pyq_attempts")
      .select("taken_at")
      .eq("user_id", userId)
      .order("taken_at", { ascending: false })
      .limit(2000),
    supabase
      .from("mistakes")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);
  if (activity.error) throw activity.error;
  if (pyq.error) throw pyq.error;
  if (mistakes.error) throw mistakes.error;
  return studyDaySet({ activity: activity.data ?? [], pyq: pyq.data ?? [], mistakes: mistakes.data ?? [] });
}
