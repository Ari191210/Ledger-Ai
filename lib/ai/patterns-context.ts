/**
 * The derived half of what the AI knows about a student.
 *
 * buildLedgerContext tells the model what happened: topics, counts, accuracy.
 * This tells it what those facts mean over time, which is the part a student
 * cannot get by pasting their notes into a general chatbot. It is the same
 * engine the Patterns page renders, so the model and the page never disagree.
 *
 * Pure, and takes rows the caller has already fetched. That is the whole point:
 * five patterns for zero additional database round trips, on a code path that
 * runs on every AI request.
 */

import type { Mistake, PyqAttempt, SyllabusTopic } from "@/lib/study/types";
import { mistakeHalfLife, topicContagion, silentSyllabus, ghostMode } from "@/lib/signals";
import { calibration, type AttemptWithPrediction } from "@/lib/signals/calibration";

/** Kept short on purpose. Every line here is paid for on every AI request, and
 *  a wall of findings buries the one that should change the answer. */
const MAX_LINES = 4;

export function derivedPatterns(args: {
  /** All mistakes, resolved included: a repeat break is only visible in the full history. */
  mistakes: Mistake[];
  /** Unscoped, because contagion across subjects is the finding worth having. */
  allMistakes: Mistake[];
  syllabus: SyllabusTopic[];
  attempts: PyqAttempt[];
}): string[] {
  const lines: string[] = [];

  // Ordered by how much each should change an answer, not by how interesting
  // it reads. Calibration first: if a student's self-assessment is off, every
  // other judgement they make about what to study is built on it.
  const [worstCalibration] = calibration(args.attempts as AttemptWithPrediction[]);
  if (worstCalibration && worstCalibration.verdict !== "well calibrated") {
    lines.push(
      `They are ${worstCalibration.verdict} in ${worstCalibration.subject}: they predict ${worstCalibration.predictedPct}% and score ${worstCalibration.actualPct}%.`,
    );
  }

  const [fastestBreak] = mistakeHalfLife(args.mistakes);
  if (fastestBreak) {
    lines.push(
      `They re-break ${fastestBreak.subject} · ${fastestBreak.topic} about every ${fastestBreak.days} days (${fastestBreak.breaks} times so far). Re-explaining it the usual way has not held.`,
    );
  }

  const declining = ghostMode(args.attempts).filter((g) => g.delta < 0);
  if (declining.length > 0) {
    const g = declining[0];
    lines.push(
      `They are getting worse at ${g.subject} · ${g.topic}, not better: ${g.past}% before, ${g.latest}% on the most recent attempt.`,
    );
  }

  const [pair] = topicContagion(args.allMistakes);
  if (pair) {
    lines.push(
      `When ${pair.a} goes wrong, ${pair.b} usually follows within ${pair.withinDays} days (${pair.times} times). Treat them as connected.`,
    );
  }

  const untested = silentSyllabus(args.syllabus, args.allMistakes, args.attempts);
  const untestedCount = untested.reduce((n, s) => n + s.topics.length, 0);
  if (untestedCount > 0) {
    lines.push(
      `${untestedCount} topics on their syllabus have never been tested or logged as a mistake, so there is no evidence either way on those.`,
    );
  }

  return lines.slice(0, MAX_LINES);
}
