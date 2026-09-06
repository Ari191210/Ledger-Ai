/**
 * 2. Confidence calibration.
 *
 * Before marking a paper the student says how many they think they got. The gap
 * between that and the truth is the signal, and it is one of the few things in
 * this product that changes behaviour rather than describing it: a student who
 * learns they are consistently 18 points overconfident in Physics revises
 * differently the following week.
 *
 * Overconfidence and underconfidence are different problems, so they are named
 * differently rather than collapsed into one absolute error.
 */

import type { PyqAttempt } from "@/lib/study/types";

export type CalibrationRow = {
  subject: string;
  papers: number;
  predictedPct: number;
  actualPct: number;
  /** positive means overconfident, negative means underconfident */
  gap: number;
  verdict: "overconfident" | "underconfident" | "well calibrated";
};

export type AttemptWithPrediction = PyqAttempt & { predicted_correct: number | null };

/** Inside this band the difference is noise, not a tendency. */
const CALIBRATED_BAND = 5;

export function calibration(
  attempts: AttemptWithPrediction[],
  minPapers = 2,
): CalibrationRow[] {
  const bySubject = new Map<string, AttemptWithPrediction[]>();
  for (const a of attempts) {
    if (a.predicted_correct === null || a.total <= 0) continue;
    bySubject.set(a.subject, [...(bySubject.get(a.subject) ?? []), a]);
  }

  const out: CalibrationRow[] = [];
  for (const [subject, rows] of bySubject) {
    if (rows.length < minPapers) continue;

    const total = rows.reduce((s, a) => s + a.total, 0);
    if (total === 0) continue;

    // Clamp: a student can predict more than the paper holds, and that should
    // not produce an accuracy above 100.
    const predicted = rows.reduce((s, a) => s + Math.min(a.predicted_correct ?? 0, a.total), 0);
    const actual = rows.reduce((s, a) => s + a.correct, 0);

    const predictedPct = Math.round((predicted / total) * 100);
    const actualPct = Math.round((actual / total) * 100);
    const gap = predictedPct - actualPct;

    out.push({
      subject,
      papers: rows.length,
      predictedPct,
      actualPct,
      gap,
      verdict:
        Math.abs(gap) <= CALIBRATED_BAND
          ? "well calibrated"
          : gap > 0
            ? "overconfident"
            : "underconfident",
    });
  }

  // biggest self-deception first, in either direction
  return out.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
}
