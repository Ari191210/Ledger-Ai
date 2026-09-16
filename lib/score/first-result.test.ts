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
  mistakeReviews30d: 0,
  streakDays: 0,
};

describe("scoreAfterPaperToday", () => {
  it("matches what /score showed live for a new student logging 15 of 20", () => {
    // 2026-09-16, live: the tour said 300, /score read 311. The 11 is one study
    // day of consistency, round(1/14 * 150).
    //
    // 311 became 261 later the same day, when the PYQ pillar started shrinking
    // accuracy toward 50% with a twenty-question prior. 15 of 20 is no longer
    // read as 75% on its own, it is (15+10)/(20+20), so 250 rather than 300.
    // The drop is the point: one paper is one paper, and the number now says
    // so. This case is still the real one a new student sees in the tour.
    expect(scoreAfterPaperToday(empty, { total: 20, correct: 15 }, false)).toBe(261);
  });

  it("does not add a streak day when today already counted", () => {
    const already = scoreAfterPaperToday({ ...empty, streakDays: 3 }, { total: 20, correct: 15 }, true);
    const notYet = scoreAfterPaperToday({ ...empty, streakDays: 3 }, { total: 20, correct: 15 }, false);
    expect(notYet - already).toBe(Math.round((4 / 14) * 150) - Math.round((3 / 14) * 150));
  });
});
