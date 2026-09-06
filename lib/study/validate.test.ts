/**
 * These decide what is allowed into a student's ledger. Everything downstream,
 * the score, the signals, the AI context, treats those rows as fact, so a rule
 * that lets the wrong thing through does not cause an error, it causes a
 * confident wrong number weeks later.
 */

import { describe, expect, it } from "vitest";
import { validateMistake, validatePyq, validateFocusMinutes } from "./validate";

describe("validateMistake", () => {
  it("accepts and trims a normal mistake", () => {
    const r = validateMistake({ subject: " Physics ", topic: " Kinematics " });
    expect(r).toEqual({ ok: true, value: { subject: "Physics", topic: "Kinematics", note: undefined } });
  });

  it("rejects a topic long enough to matter to the API bill", () => {
    const r = validateMistake({ subject: "Physics", topic: "A".repeat(5000) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/under 120 characters/);
  });

  it("rejects an oversized subject too, not just the topic", () => {
    expect(validateMistake({ subject: "S".repeat(200), topic: "Kinematics" }).ok).toBe(false);
  });

  it("rejects an oversized note", () => {
    const r = validateMistake({ subject: "Physics", topic: "Kinematics", note: "n".repeat(2000) });
    expect(r.ok).toBe(false);
  });

  it("still requires a subject and a topic", () => {
    expect(validateMistake({ subject: "", topic: "Kinematics" }).ok).toBe(false);
    expect(validateMistake({ subject: "Physics", topic: "   " }).ok).toBe(false);
  });

  it("treats an absent note as absent, not as an error", () => {
    const r = validateMistake({ subject: "Physics", topic: "Kinematics" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.note).toBeUndefined();
  });
});

describe("validatePyq", () => {
  it("accepts a normal attempt", () => {
    const r = validatePyq({ subject: "Maths", total: 10, correct: 7 });
    expect(r).toEqual({
      ok: true,
      value: { subject: "Maths", total: 10, correct: 7, predictedCorrect: null },
    });
  });

  it("refuses to score more than were attempted", () => {
    expect(validatePyq({ subject: "Maths", total: 10, correct: 11 }).ok).toBe(false);
  });

  it("refuses a negative or empty paper", () => {
    expect(validatePyq({ subject: "Maths", total: 0, correct: 0 }).ok).toBe(false);
    expect(validatePyq({ subject: "Maths", total: -5, correct: 0 }).ok).toBe(false);
    expect(validatePyq({ subject: "Maths", total: 10, correct: -1 }).ok).toBe(false);
  });

  it("rejects NaN and Infinity, which a number input can produce", () => {
    expect(validatePyq({ subject: "Maths", total: NaN, correct: 1 }).ok).toBe(false);
    expect(validatePyq({ subject: "Maths", total: Infinity, correct: 1 }).ok).toBe(false);
    expect(validatePyq({ subject: "Maths", total: 10, correct: NaN }).ok).toBe(false);
  });

  it("guards the prediction, because calibration differences it against reality", () => {
    expect(validatePyq({ subject: "Maths", total: 10, correct: 7, predictedCorrect: 50 }).ok).toBe(false);
    expect(validatePyq({ subject: "Maths", total: 10, correct: 7, predictedCorrect: -1 }).ok).toBe(false);
    expect(validatePyq({ subject: "Maths", total: 10, correct: 7, predictedCorrect: NaN }).ok).toBe(false);
  });

  it("allows a prediction of zero, which is a real answer", () => {
    const r = validatePyq({ subject: "Maths", total: 10, correct: 7, predictedCorrect: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.predictedCorrect).toBe(0);
  });

  it("normalises an absent prediction to null rather than undefined", () => {
    const r = validatePyq({ subject: "Maths", total: 10, correct: 7 });
    if (r.ok) expect(r.value.predictedCorrect).toBeNull();
  });

  it("allows a perfect paper", () => {
    expect(validatePyq({ subject: "Maths", total: 10, correct: 10 }).ok).toBe(true);
  });
});

describe("validateFocusMinutes", () => {
  it("rounds to whole minutes, since the column is an integer", () => {
    expect(validateFocusMinutes(25.4)).toEqual({ ok: true, value: 25 });
    expect(validateFocusMinutes(25.6)).toEqual({ ok: true, value: 26 });
  });

  it("refuses zero, negative and non-finite input", () => {
    expect(validateFocusMinutes(0).ok).toBe(false);
    expect(validateFocusMinutes(-10).ok).toBe(false);
    expect(validateFocusMinutes(NaN).ok).toBe(false);
    expect(validateFocusMinutes(Infinity).ok).toBe(false);
  });

  it("refuses a session that rounds away to nothing", () => {
    // 0.4 clears "greater than zero" and then rounds to 0. Accepting it would
    // report success while logging no study at all.
    const r = validateFocusMinutes(0.4);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/under a minute/);
  });
});
