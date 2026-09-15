import { describe, expect, it } from "vitest";
import type { ScoreInputs } from "./compute";
import { scoreAfterPaperToday } from "./first-result";

const empty: ScoreInputs = {
  pyqTotal: 0,
  pyqCorrect: 0,
  syllabusTotal: 0,
  syllabusCovered: 0,
  mistakesEverLogged: 0,
  mistakesRecent7d: 0,
  streakDays: 0,
};

describe("scoreAfterPaperToday", () => {
  it("matches what /score showed live for a new student logging 15 of 20", () => {
    // 2026-09-16, live: the tour said 300, /score read 311. The 11 is one study
    // day of consistency, round(1/14 * 150).
    expect(scoreAfterPaperToday(empty, { total: 20, correct: 15 }, false)).toBe(311);
  });

  it("does not add a streak day when today already counted", () => {
    const already = scoreAfterPaperToday({ ...empty, streakDays: 3 }, { total: 20, correct: 15 }, true);
    const notYet = scoreAfterPaperToday({ ...empty, streakDays: 3 }, { total: 20, correct: 15 }, false);
    expect(notYet - already).toBe(Math.round((4 / 14) * 150) - Math.round((3 / 14) * 150));
  });
});
