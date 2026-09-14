import { describe, expect, it } from "vitest";
import { MISTAKES_FOR_A_DAY, studyDaySet } from "./study-days";

// Noon IST on a given day, so the IST day key is unambiguous.
const at = (day: string) => `${day}T06:30:00Z`;

describe("studyDaySet", () => {
  it("counts a day with study time", () => {
    expect(studyDaySet({ activity: [{ day: "2026-09-10", minutes: 25 }], pyq: [], mistakes: [] })).toEqual(
      new Set(["2026-09-10"]),
    );
  });

  it("counts a day with a past paper and no study time", () => {
    expect(studyDaySet({ activity: [], pyq: [{ taken_at: at("2026-09-11") }], mistakes: [] }).has("2026-09-11")).toBe(true);
  });

  it("counts a day with enough mistakes and no study time", () => {
    const mistakes = Array.from({ length: MISTAKES_FOR_A_DAY }, () => ({ created_at: at("2026-09-12") }));
    expect(studyDaySet({ activity: [], pyq: [], mistakes }).has("2026-09-12")).toBe(true);
  });

  it("does not let one throwaway mistake keep a streak alive", () => {
    expect(studyDaySet({ activity: [], pyq: [], mistakes: [{ created_at: at("2026-09-13") }] }).size).toBe(0);
  });

  it("ignores a zero-minute activity row", () => {
    expect(studyDaySet({ activity: [{ day: "2026-09-14", minutes: 0 }], pyq: [], mistakes: [] }).size).toBe(0);
  });

  it("puts a 1am IST paper on its IST day, not the UTC one", () => {
    // 2026-09-14 01:00 IST is 2026-09-13 19:30 UTC.
    const days = studyDaySet({ activity: [], pyq: [{ taken_at: "2026-09-13T19:30:00Z" }], mistakes: [] });
    expect([...days]).toEqual(["2026-09-14"]);
  });
});
