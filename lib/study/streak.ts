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
