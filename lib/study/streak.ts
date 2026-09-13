import { isoDateIST } from "@/lib/date";

/**
 * The streak a student is on right now, in IST calendar days.
 *
 * A day is not missed until it is over. This used to count only runs ending
 * today, so every morning, before the first log, a student on a thirty day run
 * read a streak of 0, and because the Ledger Score's consistency pillar is built
 * from this number, their score fell by up to 150 points overnight and came
 * back at the first log. The score swung every day while nothing about their
 * preparation had changed.
 *
 * So the run ending today counts if today is logged, and otherwise the run
 * ending yesterday still stands until today is over. It breaks only once a
 * whole day passes with nothing logged, which is the rule the product has
 * always stated.
 */
export function computeStreak(loggedDays: Set<string>): number {
  let streak = 0;
  let cursor = Date.now();
  if (!loggedDays.has(isoDateIST(new Date(cursor)))) cursor -= 86_400_000;
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
