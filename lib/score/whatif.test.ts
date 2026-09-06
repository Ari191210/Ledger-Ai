import { describe, it, expect } from "vitest";
import { computeScore, type ScoreInputs } from "./compute";
import { LEVERS, leverCap, leverPhrase, project } from "./whatif";

const base: ScoreInputs = {
  pyqTotal: 40,
  pyqCorrect: 30,
  syllabusTotal: 20,
  syllabusCovered: 8,
  mistakesEverLogged: 12,
  mistakesRecent7d: 3,
  streakDays: 5,
};

describe("what-if levers", () => {
  it("caps topics at the ones not yet covered", () => {
    expect(leverCap("topics", base)).toBe(12);
    expect(leverCap("topics", { ...base, syllabusCovered: 20 })).toBe(0);
  });

  it("caps the streak where the pillar stops paying", () => {
    expect(leverCap("streak", base)).toBe(9);
    expect(leverCap("streak", { ...base, streakDays: 30 })).toBe(0);
  });

  it("never projects past a lever's cap", () => {
    const p = project(base, "topics", 99);
    expect(p.syllabusCovered).toBe(base.syllabusTotal);
  });

  it("moves both sides of the pyq ratio", () => {
    const p = project(base, "past papers", 10);
    expect(p.pyqTotal).toBe(50);
    expect(p.pyqCorrect).toBe(40);
  });

  it("leaves the score untouched at zero", () => {
    for (const lever of LEVERS) {
      expect(project(base, lever, 0)).toEqual(base);
    }
  });

  it("never lowers the score, for any lever at any legal amount", () => {
    const before = computeScore(base).total;
    for (const lever of LEVERS) {
      for (let n = 0; n <= leverCap(lever, base); n++) {
        expect(computeScore(project(base, lever, n)).total).toBeGreaterThanOrEqual(before);
      }
    }
  });

  it("agrees with the real formula rather than approximating it", () => {
    // Covering every remaining topic must land exactly on the full coverage
    // pillar, because the projection runs the same computeScore the ledger does.
    const full = computeScore(project(base, "topics", 12));
    expect(full.pillars.find((p) => p.key === "coverage")!.pts).toBe(250);
  });

  it("says what to do in singular and plural", () => {
    expect(leverPhrase("topics", 1)).toBe("cover 1 more topic");
    expect(leverPhrase("topics", 4)).toBe("cover 4 more topics");
    expect(leverPhrase("streak", 1)).toBe("study 1 more day in a row");
    expect(leverPhrase("past papers", 3)).toBe("get 3 more questions right");
  });
});
