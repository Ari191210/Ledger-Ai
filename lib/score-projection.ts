// Score Projection Engine
//
// Predicts Ledger Score movement BEFORE a user action completes, by delta
// simulation against the real scoring engine — never by a parallel formula:
//
//   1. clone the current ScoreInputs
//   2. apply the simulated event to the clone
//   3. recompute with computeScoreFromInputs (the same function that
//      produces the real score)
//   4. return the delta
//
// Every projection therefore stays correct automatically if the scoring
// weights in lib/ledger-score.ts ever change.

import {
  computeScoreFromInputs,
  readScoreInputs,
  type ScoreInputs,
} from "@/lib/ledger-score";

export type ScorePillar = "accuracy" | "coverage" | "mistakes" | "consistency";

export type ScoreProjection = {
  current: number;
  projected: number;
  delta: number;
  pillar: ScorePillar;
};

function cloneInputs(inputs: ScoreInputs): ScoreInputs {
  return {
    papersLog:        [...inputs.papersLog],
    syllabusSubjects: [...inputs.syllabusSubjects],
    syllabusUploaded: inputs.syllabusUploaded,
    notesHistory:     [...inputs.notesHistory],
    mistakes:         [...inputs.mistakes],
    streak:           inputs.streak,
  };
}

function project(
  inputs: ScoreInputs,
  pillar: ScorePillar,
  mutate: (draft: ScoreInputs) => void,
): ScoreProjection {
  const current = computeScoreFromInputs(inputs).total;
  const draft = cloneInputs(inputs);
  mutate(draft);
  const projected = computeScoreFromInputs(draft).total;
  return { current, projected, delta: projected - current, pillar };
}

/** Current device inputs, or null during SSR. Callers pass these in so one
 *  read serves several projections on the same page (no duplicate reads). */
export function currentInputs(): ScoreInputs | null {
  return readScoreInputs();
}

/**
 * Projected impact of completing a past-paper session.
 * When the expected result isn't known yet, we assume the student's
 * historical accuracy (or 70% for a first paper) across `questionCount`
 * questions — an estimate fed through the real engine, not a made-up delta.
 */
export function projectExamPracticeImpact(
  inputs: ScoreInputs,
  session: { subject: string; questionCount: number; expectedScore?: number },
): ScoreProjection {
  const prior = computeScoreFromInputs(inputs);
  const expected = session.expectedScore ??
    Math.round(session.questionCount * (prior.papersCount > 0 ? prior.pqaAccuracy : 0.7));
  return project(inputs, "accuracy", d => {
    d.papersLog = [
      { date: new Date().toISOString(), subject: session.subject, score: expected, total: session.questionCount },
      ...d.papersLog,
    ];
  });
}

/** Projected impact of saving a parsed syllabus with these subjects. */
export function projectSyllabusImpact(
  inputs: ScoreInputs,
  subjects: string[],
): ScoreProjection {
  return project(inputs, "coverage", d => {
    d.syllabusUploaded = true;
    d.syllabusSubjects = subjects;
  });
}

/** Projected impact of generating notes that cover a syllabus subject. */
export function projectCoverageImpact(
  inputs: ScoreInputs,
  subject: string,
): ScoreProjection {
  return project(inputs, "coverage", d => {
    d.notesHistory = [...d.notesHistory, { subject }];
  });
}

/** Projected impact of extending the focus streak by `days` (default: today). */
export function projectFocusImpact(
  inputs: ScoreInputs,
  days = 1,
): ScoreProjection {
  return project(inputs, "consistency", d => { d.streak = d.streak + days; });
}

/**
 * Projected impact of resolving `resolvedCount` of this week's mistakes —
 * i.e. what the score becomes once those recent misses age out or stop
 * recurring. Simulated by removing the most recent in-window entries.
 */
export function projectMistakeReductionImpact(
  inputs: ScoreInputs,
  resolvedCount: number,
): ScoreProjection {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return project(inputs, "mistakes", d => {
    let left = resolvedCount;
    d.mistakes = d.mistakes.filter(m => {
      if (left > 0 && new Date(m.date).getTime() > sevenDaysAgo) { left--; return false; }
      return true;
    });
  });
}

/**
 * Realized impact of the most recent past-paper session — the inverse
 * simulation (remove the latest log entry, diff against now). Used on
 * results screens to show what the session the student just finished
 * actually moved.
 */
export function realizedExamPracticeImpact(inputs: ScoreInputs): ScoreProjection {
  const current = computeScoreFromInputs(inputs).total;
  const before = cloneInputs(inputs);
  before.papersLog = before.papersLog.slice(1);
  const prior = computeScoreFromInputs(before).total;
  return { current, projected: current, delta: current - prior, pillar: "accuracy" };
}
