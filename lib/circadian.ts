// Shared time-of-day bucketing for the Circadian tool and the dashboard's
// "best hours" widget, kept in one place so the two never drift.

export const CIRCADIAN_WINDOWS = [
  { id: "late", label: "late night", range: "12am–5am", from: 0, to: 5 },
  { id: "early", label: "early morning", range: "5am–8am", from: 5, to: 8 },
  { id: "morning", label: "morning", range: "8am–12pm", from: 8, to: 12 },
  { id: "afternoon", label: "afternoon", range: "12pm–4pm", from: 12, to: 16 },
  { id: "evening", label: "evening", range: "4pm–8pm", from: 16, to: 20 },
  { id: "night", label: "night", range: "8pm–12am", from: 20, to: 24 },
] as const;

export type CircadianWindow = (typeof CIRCADIAN_WINDOWS)[number];

export function circadianWindowFor(hour: number): CircadianWindow {
  return CIRCADIAN_WINDOWS.find((w) => hour >= w.from && hour < w.to) ?? CIRCADIAN_WINDOWS[0];
}

export type CircadianRow = CircadianWindow & {
  accuracy: number | null;
  volume: number;
  total: number;
};

/**
 * Buckets PYQ attempts + mistakes into the 6 windows and picks the "best"
 * one: highest PYQ accuracy among windows with a meaningful sample (>=3
 * attempts), falling back to the highest-volume window when there isn't
 * enough accuracy data yet to trust.
 */
export function computeCircadianRows(
  pyq: { correct: number; total: number; hour: number }[],
  mistakeHours: number[],
): { rows: CircadianRow[]; best: CircadianRow | null; totalVolume: number } {
  const stats = new Map<string, { correct: number; total: number; mistakes: number }>();
  for (const w of CIRCADIAN_WINDOWS) stats.set(w.id, { correct: 0, total: 0, mistakes: 0 });

  for (const a of pyq) {
    const s = stats.get(circadianWindowFor(a.hour).id)!;
    s.correct += a.correct;
    s.total += a.total;
  }
  for (const hour of mistakeHours) {
    stats.get(circadianWindowFor(hour).id)!.mistakes++;
  }

  const rows: CircadianRow[] = CIRCADIAN_WINDOWS.map((w) => {
    const s = stats.get(w.id)!;
    const accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : null;
    return { ...w, accuracy, volume: s.total + s.mistakes, total: s.total };
  });

  const totalVolume = rows.reduce((sum, r) => sum + r.volume, 0);
  if (totalVolume === 0) return { rows, best: null, totalVolume };

  const withSample = rows.filter((r) => r.total >= 3);
  const best =
    withSample.length > 0
      ? withSample.reduce((a, b) => (b.accuracy! > a.accuracy! ? b : a))
      : rows.reduce((a, b) => (b.volume > a.volume ? b : a));

  return { rows, best, totalVolume };
}
