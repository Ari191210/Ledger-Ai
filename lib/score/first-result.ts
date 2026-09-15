import { computeScore, type ScoreInputs } from "./compute";

/**
 * The score a student lands on after logging a past paper today.
 *
 * The tour's first-result step promises to name "exactly the number the ring
 * lands on". It added the paper to accuracy only, which was exact until
 * 2026-09-15, when a past paper started counting as a study day: logging one
 * also extends the streak, so the consistency pillar moves too. Checked live on
 * 2026-09-16: the tour said "0 to 300" and /score read 311.
 *
 * The streak rule is the one in lib/study/streak.ts: if today was not a study
 * day yet, the current streak is the run ending yesterday, and a paper today
 * adds one to it. If today already counted, the streak does not change.
 */
export function scoreAfterPaperToday(
  inputs: ScoreInputs,
  paper: { total: number; correct: number },
  todayAlreadyStudied: boolean,
): number {
  return computeScore({
    ...inputs,
    pyqTotal: inputs.pyqTotal + paper.total,
    pyqCorrect: inputs.pyqCorrect + paper.correct,
    streakDays: todayAlreadyStudied ? inputs.streakDays : inputs.streakDays + 1,
  }).total;
}
