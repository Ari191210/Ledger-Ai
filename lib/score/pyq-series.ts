import { dayKeyIST } from "@/lib/date";

type Attempt = { taken_at: string; correct: number; total: number };

/**
 * The 7-day accuracy line and its headline figure.
 *
 * Before 2026-09-14 the line carried a running value that started at 0, so every
 * day before the first attempt in the week was drawn as 0% accuracy. A student at
 * 80% last week who scored 70% today saw a line climbing from 0 to 70: a
 * decline drawn as a rise. And a student who had never sat a paper read "0%",
 * which says every answer was wrong.
 *
 * Now the line opens on the most recent accuracy from before the week (within
 * the 30 days the attempts cover), and if there is none it back-fills from the
 * first attempt, so a flat stretch means "no new evidence", never "scored zero".
 * With no attempts at all there is no figure to give, and the tile says so.
 */
export function pyqAccuracySeries(
  days7: string[],
  attempts: Attempt[],
): number[] {
  const byDay = new Map<string, { total: number; correct: number }>();
  for (const a of attempts) {
    const d = dayKeyIST(a.taken_at);
    const cur = byDay.get(d) ?? { total: 0, correct: 0 };
    cur.total += a.total;
    cur.correct += a.correct;
    byDay.set(d, cur);
  }

  let before: number | null = null;
  for (const d of [...byDay.keys()].sort()) {
    if (d >= days7[0]) break;
    const e = byDay.get(d)!;
    if (e.total > 0) before = Math.round((e.correct / e.total) * 100);
  }

  let last: number | null = before;
  const raw = days7.map((d) => {
    const e = byDay.get(d);
    if (e && e.total > 0) last = Math.round((e.correct / e.total) * 100);
    return last;
  });
  const first = raw.find((v) => v !== null) ?? 0;
  return raw.map((v) => v ?? first);
}

/** The headline figure, from the same totals the score uses. No attempts means no figure, not 0%. */
export function accuracyLabel(correct: number, total: number): string {
  return total > 0 ? `${Math.round((correct / total) * 100)}%` : "none yet";
}
