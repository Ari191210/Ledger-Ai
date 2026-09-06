import { describe, expect, it } from "vitest";
import { calibration, type AttemptWithPrediction } from "./calibration";

const paper = (
  subject: string,
  predicted: number | null,
  correct: number,
  total = 10,
): AttemptWithPrediction => ({
  id: `${subject}-${predicted}-${correct}`,
  subject,
  topic: null,
  total,
  correct,
  taken_at: new Date().toISOString(),
  predicted_correct: predicted,
});

describe("calibration", () => {
  it("ignores papers with no prediction recorded", () => {
    expect(calibration([paper("Physics", null, 5), paper("Physics", null, 6)])).toEqual([]);
  });

  it("needs at least two papers before judging a tendency", () => {
    expect(calibration([paper("Physics", 8, 5)])).toEqual([]);
  });

  it("names overconfidence", () => {
    const [row] = calibration([paper("Physics", 8, 5), paper("Physics", 8, 6)]);
    expect(row).toMatchObject({
      subject: "Physics",
      papers: 2,
      predictedPct: 80,
      actualPct: 55,
      gap: 25,
      verdict: "overconfident",
    });
  });

  it("names underconfidence separately", () => {
    const [row] = calibration([paper("Maths", 4, 8), paper("Maths", 5, 9)]);
    expect(row.verdict).toBe("underconfident");
    expect(row.gap).toBeLessThan(0);
  });

  it("treats a small gap as well calibrated rather than a flaw", () => {
    const [row] = calibration([paper("Bio", 7, 7), paper("Bio", 7, 8)]);
    expect(row.verdict).toBe("well calibrated");
  });

  it("clamps a prediction larger than the paper", () => {
    const [row] = calibration([paper("Physics", 50, 5), paper("Physics", 50, 5)]);
    expect(row.predictedPct).toBe(100);
  });

  it("sorts the biggest self-deception first regardless of direction", () => {
    const rows = calibration([
      paper("Physics", 6, 5),
      paper("Physics", 6, 5),
      paper("Maths", 2, 9),
      paper("Maths", 2, 9),
    ]);
    expect(rows[0].subject).toBe("Maths");
  });
});
