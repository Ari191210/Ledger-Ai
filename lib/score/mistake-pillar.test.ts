import { describe, expect, it } from "vitest";
import { buildScoreInputs } from "./build-inputs";
import { computeScore, REVIEWS_FOR_FULL } from "./compute";
import { isoDaysAgoIST } from "@/lib/date";
import type { Mistake } from "@/lib/study/types";

const at = (day: string, hour = 12) => {
  const base = new Date(`${day}T00:00:00Z`).getTime() + (hour - 5.5) * 3_600_000;
  return new Date(base).toISOString();
};
const mistake = (i: number, day: string): Mistake =>
  ({ id: `m${i}`, subject: "Physics", topic: `t${i}`, created_at: at(day), resolved_at: null }) as Mistake;
const review = (i: number, day: string, remembered = true) => ({
  mistake_id: `m${i}`,
  remembered,
  reviewed_at: at(day),
});

const score = (rows: Parameters<typeof buildScoreInputs>[0]) => computeScore(buildScoreInputs(rows));
const base = { attempts: [], syllabus: [], streakDays: 0 };

describe("the mistakes pillar", () => {
  it("does not punish a student for logging mistakes", () => {
    // The old rule: one mistake ever logged jumped the pillar from 0 to 193,
    // and every honest log after that took points away.
    const none = score({ ...base, mistakes: [] });
    const many = score({
      ...base,
      mistakes: Array.from({ length: 20 }, (_, i) => mistake(i, isoDaysAgoIST(1))),
    });
    expect(many.pillars[2].pts).toBe(none.pillars[2].pts);
  });

  it("pays for the reviews, not for logging nothing", () => {
    const reviews = Array.from({ length: REVIEWS_FOR_FULL }, (_, i) => review(i, isoDaysAgoIST(i % 30)));
    const worked = score({
      ...base,
      mistakes: reviews.map((_, i) => mistake(i, isoDaysAgoIST(29))),
      reviews,
    });
    expect(worked.pillars[2].pts).toBe(200);
  });

  it("counts a forgotten review as work too", () => {
    const one = score({
      ...base,
      mistakes: [mistake(0, isoDaysAgoIST(2))],
      reviews: [review(0, isoDaysAgoIST(1), false)],
    });
    expect(one.pillars[2].pts).toBe(Math.round((1 / REVIEWS_FOR_FULL) * 200));
  });

  it("counts the same card once a day, however many times it is clicked", () => {
    const day = isoDaysAgoIST(1);
    const spammed = score({
      ...base,
      mistakes: [mistake(0, isoDaysAgoIST(2))],
      reviews: Array.from({ length: 30 }, () => review(0, day)),
    });
    expect(spammed.pillars[2].pts).toBe(Math.round((1 / REVIEWS_FOR_FULL) * 200));
  });

  it("forgets reviews older than the window", () => {
    const old = score({
      ...base,
      mistakes: [mistake(0, isoDaysAgoIST(60))],
      reviews: [review(0, isoDaysAgoIST(45))],
    });
    expect(old.pillars[2].pts).toBe(0);
  });
});
