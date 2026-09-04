/** Consecutive ISO-date days ending today, given the set of days logged. */
export function computeStreak(loggedDays: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!loggedDays.has(iso)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
