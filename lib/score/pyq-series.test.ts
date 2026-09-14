import { describe, expect, it } from "vitest";
import { accuracyLabel, pyqAccuracySeries } from "./pyq-series";

const days7 = ["2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14"];
// Noon IST, so the IST day key is unambiguous.
const at = (day: string) => `${day}T06:30:00Z`;

describe("pyqAccuracySeries", () => {
  it("draws a decline as a decline, not as a climb from zero", () => {
    const series = pyqAccuracySeries(days7, [
      { taken_at: at("2026-09-02"), correct: 8, total: 10 },
      { taken_at: at("2026-09-14"), correct: 7, total: 10 },
    ]);
    expect(series).toEqual([80, null, null, null, null, null, 70]);
  });

  it("gives no value to a day with no attempt", () => {
    const series = pyqAccuracySeries(days7, [{ taken_at: at("2026-09-12"), correct: 6, total: 10 }]);
    expect(series).toEqual([null, null, null, null, 60, null, null]);
  });

  it("has nothing to draw for a student who has never sat a paper", () => {
    expect(pyqAccuracySeries(days7, []).every((v) => v === null)).toBe(true);
    expect(accuracyLabel(0, 0)).toBe("none yet");
  });

  it("still reports a real 0% as 0%", () => {
    const series = pyqAccuracySeries(days7, [{ taken_at: at("2026-09-10"), correct: 0, total: 5 }]);
    expect(accuracyLabel(0, 5)).toBe("0%");
    expect(series).toEqual([null, null, 0, null, null, null, null]);
  });
});
