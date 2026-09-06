/**
 * What breaking the streak actually cost, and whether you have ever practised
 * at the hour your exam starts.
 *
 * Both are separated from signals/index.ts because they depend on the score
 * engine and on circadian windows respectively, and keeping index.ts free of
 * those imports keeps it trivially testable.
 */

import { computeScore, type ScoreInputs } from "@/lib/score/compute";
import { CIRCADIAN_WINDOWS } from "@/lib/circadian";

/* ── 8. the cost of yesterday ──────────────────────────────────────────
 * Re-runs the real scoring function with the streak the student would have had
 * if they had not missed a day. The difference is the price of the gap, in the
 * same units the dashboard shows.
 */
export type StreakCost = { points: number; currentStreak: number; wouldHaveBeen: number };

export function costOfBreakingStreak(
  inputs: ScoreInputs,
  daysSinceLastLog: number,
): StreakCost | null {
  // Only meaningful once a day has actually been missed.
  if (daysSinceLastLog < 1) return null;

  const actual = computeScore(inputs);
  // What the streak would be had the missed days been logged.
  const wouldHaveBeen = inputs.streakDays + daysSinceLastLog;
  const counterfactual = computeScore({ ...inputs, streakDays: wouldHaveBeen });

  const points = counterfactual.total - actual.total;
  if (points <= 0) return null;

  return { points, currentStreak: inputs.streakDays, wouldHaveBeen };
}

/* ── 1. the exam-hour mismatch ─────────────────────────────────────────
 * The student's accuracy peaks in one window. Their exam starts in another.
 * Nobody tells them this.
 */
export type ExamHourMismatch = {
  examTitle: string;
  examHour: number;
  examWindowLabel: string;
  bestWindowLabel: string;
  bestWindowRange: string;
  attemptsInExamWindow: number;
  daysAway: number;
};

const windowFor = (hour: number) =>
  CIRCADIAN_WINDOWS.find((w) => hour >= w.from && hour < w.to) ?? CIRCADIAN_WINDOWS[0];

export function examHourMismatch(args: {
  exam: { title: string; startHour: number | null; daysAway: number } | null;
  bestWindowId: string | null;
  /** hour-of-day (IST) for every logged attempt, used to see if they ever practise then */
  attemptHours: number[];
}): ExamHourMismatch | null {
  const { exam, bestWindowId, attemptHours } = args;
  if (!exam || exam.startHour === null || !bestWindowId) return null;

  const examWindow = windowFor(exam.startHour);
  if (examWindow.id === bestWindowId) return null; // no mismatch, nothing to say

  const best = CIRCADIAN_WINDOWS.find((w) => w.id === bestWindowId);
  if (!best) return null;

  const attemptsInExamWindow = attemptHours.filter(
    (h) => h >= examWindow.from && h < examWindow.to,
  ).length;

  return {
    examTitle: exam.title,
    examHour: exam.startHour,
    examWindowLabel: examWindow.label,
    bestWindowLabel: best.label,
    bestWindowRange: best.range,
    attemptsInExamWindow,
    daysAway: exam.daysAway,
  };
}
