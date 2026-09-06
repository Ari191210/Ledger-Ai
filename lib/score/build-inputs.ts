/**
 * The one place score inputs are assembled from rows.
 *
 * There used to be two: the dashboard built them one way and the Patterns page
 * rebuilt them another, so the counterfactual behind "breaking your streak cost
 * you N points" was differenced against a baseline that was not the score the
 * student could see. The windows disagreed twice over, once on mistakes (144
 * hours against 168) and once on past papers (last 30 days against all time).
 *
 * Anything that scores goes through here, so that class of drift cannot recur.
 * Windows are IST calendar days, not rolling instants, because a student should
 * not watch a mistake fall out of "this week" at eleven at night.
 */

import type { Mistake, PyqAttempt, SyllabusTopic } from "@/lib/study/types";
import type { ScoreInputs } from "./compute";
import { isoDateIST, isoDaysAgoIST } from "@/lib/date";

/** Past papers count toward accuracy for this many calendar days. */
export const PYQ_WINDOW_DAYS = 30;
/** Mistake velocity looks back over this many calendar days, today included. */
export const MISTAKE_WINDOW_DAYS = 7;

const onOrAfter = (timestamp: string, day: string) => isoDateIST(new Date(timestamp)) >= day;

export function buildScoreInputs(rows: {
  /** May be unfiltered. The window is applied here so callers cannot disagree. */
  attempts: PyqAttempt[];
  syllabus: SyllabusTopic[];
  /** Every mistake ever logged, resolved ones included. */
  mistakes: Mistake[];
  streakDays: number;
}): ScoreInputs {
  const pyqFrom = isoDaysAgoIST(PYQ_WINDOW_DAYS - 1);
  const mistakeFrom = isoDaysAgoIST(MISTAKE_WINDOW_DAYS - 1);

  const recentAttempts = rows.attempts.filter((a) => onOrAfter(a.taken_at, pyqFrom));

  return {
    pyqTotal: recentAttempts.reduce((s, a) => s + a.total, 0),
    pyqCorrect: recentAttempts.reduce((s, a) => s + a.correct, 0),
    syllabusTotal: rows.syllabus.length,
    syllabusCovered: rows.syllabus.filter((t) => t.covered).length,
    mistakesEverLogged: rows.mistakes.length,
    mistakesRecent7d: rows.mistakes.filter((m) => onOrAfter(m.created_at, mistakeFrom)).length,
    streakDays: rows.streakDays,
  };
}
