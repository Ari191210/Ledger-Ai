/**
 * The counterfactual behind the dashboard's what-if dial.
 *
 * The dial turns, these functions rebuild the score inputs as they would be if
 * the student did the thing, and the real `computeScore` runs on the result.
 * Nothing here invents a number: the projection is the same formula the ledger
 * scores with, fed a different set of rows.
 *
 * Every cap is a real ceiling, not a round number picked for the dial. You
 * cannot cover more topics than you have listed, and the consistency pillar
 * stops paying at fourteen days, so the dial stops there too. A control that
 * keeps turning after the value stops moving teaches the student the wrong
 * thing about their own score.
 */

import type { ScoreInputs } from "./compute";

export type Lever = "topics" | "past papers" | "streak";

export const LEVERS: readonly Lever[] = ["topics", "past papers", "streak"] as const;

/** The streak pillar is full at fourteen consecutive days. */
const STREAK_FULL = 14;
/** Past this many extra papers the dial is longer than it is useful. */
const PYQ_MAX = 20;

/** How far this lever can honestly be turned, given where the student is. */
export function leverCap(lever: Lever, inputs: ScoreInputs): number {
  switch (lever) {
    case "topics":
      return Math.max(0, inputs.syllabusTotal - inputs.syllabusCovered);
    case "streak":
      return Math.max(0, STREAK_FULL - inputs.streakDays);
    case "past papers":
      return PYQ_MAX;
  }
}

/** The inputs as they would be after doing `amount` more of `lever`. */
export function project(inputs: ScoreInputs, lever: Lever, amount: number): ScoreInputs {
  const n = Math.max(0, Math.min(leverCap(lever, inputs), Math.round(amount)));
  switch (lever) {
    case "topics":
      return { ...inputs, syllabusCovered: inputs.syllabusCovered + n };
    case "streak":
      return { ...inputs, streakDays: inputs.streakDays + n };
    // Answering n more questions, all of them right: both the numerator and
    // the denominator move, which is why a few correct answers barely lift an
    // already-large sample. That is the honest shape of an average.
    case "past papers":
      return { ...inputs, pyqTotal: inputs.pyqTotal + n, pyqCorrect: inputs.pyqCorrect + n };
  }
}

/** What the student would have to actually do, in their words not the model's. */
export function leverPhrase(lever: Lever, amount: number): string {
  const n = Math.round(amount);
  switch (lever) {
    case "topics":
      return `cover ${n} more ${n === 1 ? "topic" : "topics"}`;
    case "streak":
      return `study ${n} more ${n === 1 ? "day" : "days"} in a row`;
    case "past papers":
      return `get ${n} more ${n === 1 ? "question" : "questions"} right`;
  }
}
