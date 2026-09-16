import { describe, expect, it } from "vitest";
import { computeScore, PYQ_PRIOR_CORRECT, PYQ_PRIOR_TOTAL } from "./compute";
import type { ScoreInputs } from "./compute";

/**
 * The PYQ pillar is 40% of the Ledger Score, and until 2026-09-16 it read raw
 * accuracy with no sense of how much work was behind it. A third-party audit
 * found that one question answered correctly paid the full 400.
 *
 * The abuse was the smaller half. The honest student was the real casualty: a
 * five-question quiz aced outscored three full papers at 70%, so the instrument
 * called the better prepared student worse. These tests pin the shape of the
 * fix rather than just its arithmetic.
 */

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

const pyq = (total: number, correct: number) =>
  computeScore({ ...empty, pyqTotal: total, pyqCorrect: correct }).pillars.find((p) => p.key === "pyq")!.pts;

describe("the pyq pillar", () => {
  it("does not pay for a single question", () => {
    // The exact exploit the audit reported: 1 of 1, ten seconds of logging, and
    // the pillar used to read 400 of 400.
    expect(pyq(1, 1)).toBe(210);
    expect(pyq(1, 1)).toBeLessThan(pyq(50, 45));
  });

  it("scores real work above a lucky small sample", () => {
    // The honest-student case, and the one that actually justifies the change.
    // A perfect five-question quiz must not outrank three full papers at 70%.
    const quiz = pyq(5, 5);
    const threePapers = pyq(100, 70);
    expect(threePapers).toBeGreaterThan(quiz);
  });

  it("converges on the true rate as evidence arrives", () => {
    // The prior has to fade, otherwise it is just a penalty. A student holding
    // 80% gets closer to 320 the more questions they put behind it.
    const small = pyq(10, 8);
    const medium = pyq(100, 80);
    const large = pyq(1000, 800);
    expect(small).toBeLessThan(medium);
    expect(medium).toBeLessThan(large);
    expect(large).toBeGreaterThan(310);
    expect(large).toBeLessThanOrEqual(320);
  });

  it("gives an empty ledger nothing, not half marks", () => {
    // The trap in the obvious form of this formula. The prior alone reads 50%,
    // so an account that has logged nothing would collect 200 points, and the
    // tour's first paper would then LOWER the score it exists to raise.
    expect(pyq(0, 0)).toBe(0);
    expect(pyq(20, 15)).toBeGreaterThan(pyq(0, 0));
  });

  it("still separates a strong student from a weak one", () => {
    // Shrinkage must not flatten everyone toward the middle at real volumes.
    expect(pyq(100, 90) - pyq(100, 50)).toBeGreaterThan(100);
  });

  it("keeps the prior honest about what it is", () => {
    // If these two ever drift apart, the pillar stops being centred on 50% and
    // the comment in compute.ts quietly becomes false.
    expect(PYQ_PRIOR_CORRECT * 2).toBe(PYQ_PRIOR_TOTAL);
  });
});
