import { dayKeyIST } from "@/lib/date";

type Attempt = { taken_at: string; correct: number; total: number };

/**
 * The 7-day accuracy line: a value only where there is evidence for one.
 *
 * Before 2026-09-14 the line carried a running value that started at 0, so every
 * day before the first attempt in the week was drawn as 0% accuracy: a student
 * at 80% last week who scored 70% today saw a climb from 0 to 70. The first fix
 * back-filled instead, which still drew a flat run of days at an accuracy the
 * student had no attempt on. Now a day holds a value only if a paper was sat
 * that day, and null otherwise; the chart joins real points and draws nothing
 * where there are none.
 *
 * One exception, the left edge: if the first day of the week has no attempt but
 * an earlier one exists (within the 30 days loaded), its accuracy sits there as
 * where the student stood coming into the week. Without it, 80% last week and
 * 70% today would be a single dot, and the decline would vanish.
 */
export function pyqAccuracySeries(days7: string[], attempts: Attempt[]): (number | null)[] {
  const byDay = new Map<string, { total: number; correct: number }>();
  for (const a of attempts) {
    const d = dayKeyIST(a.taken_at);
    const cur = byDay.get(d) ?? { total: 0, correct: 0 };
    cur.total += a.total;
    cur.correct += a.correct;
    byDay.set(d, cur);
  }
  const pct = (e?: { total: number; correct: number }) =>
    e && e.total > 0 ? Math.round((e.correct / e.total) * 100) : null;

  let before: number | null = null;
  for (const d of [...byDay.keys()].sort()) {
    if (d >= days7[0]) break;
    before = pct(byDay.get(d)) ?? before;
  }

  const series = days7.map((d) => pct(byDay.get(d)));
  if (series[0] === null) series[0] = before;
  return series;
}

/** The headline figure, from the same totals the score uses. No attempts means no figure, not 0%. */
export function accuracyLabel(correct: number, total: number): string {
  return total > 0 ? `${Math.round((correct / total) * 100)}%` : "none yet";
}
