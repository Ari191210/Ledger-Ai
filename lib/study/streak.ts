import { isoDateIST } from "@/lib/date";

/** Consecutive IST calendar days ending today, given the set of days logged. */
export function computeStreak(loggedDays: Set<string>): number {
  let streak = 0;
  let cursor = Date.now();
  for (;;) {
    const iso = isoDateIST(new Date(cursor));
    if (!loggedDays.has(iso)) break;
    streak++;
    cursor -= 86_400_000;
  }
  return streak;
}

/**
 * Consecutive days ending on a given day rather than on today.
 *
 * computeStreak breaks the moment today is missing, so a student who has missed
 * any days necessarily has a streak of zero, and the counterfactual "what your
 * streak would be had you not missed" was being built on that zero. It reported
 * a sixty day streak to someone who had logged nothing for sixty days. This
 * gives the run that was actually running when the break happened, which is the
 * only number that counterfactual can honestly be built from.
 */
export function streakEndingOn(loggedDays: Set<string>, endDay: string): number {
  if (!loggedDays.has(endDay)) return 0;
  let streak = 0;
  let cursor = new Date(`${endDay}T12:00:00Z`).getTime();
  for (;;) {
    const iso = isoDateIST(new Date(cursor));
    if (!loggedDays.has(iso)) break;
    streak++;
    cursor -= 86_400_000;
  }
  return streak;
}
