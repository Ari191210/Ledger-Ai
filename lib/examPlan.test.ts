import { describe, it, expect } from "vitest";
import { buildExamPlan } from "./examPlan";
import type { SyllabusTopic } from "@/lib/study/types";

const topics = (uncovered: number, covered = 0): SyllabusTopic[] =>
  [
    ...Array.from({ length: uncovered }, (_, i) => ({ id: `u${i}`, covered: false })),
    ...Array.from({ length: covered }, (_, i) => ({ id: `c${i}`, covered: true })),
  ] as unknown as SyllabusTopic[];

describe("buildExamPlan", () => {
  it("is not on track when the exam is today and work remains", () => {
    // The bug: with no runway, topicsPerDay fell back to the raw backlog, and
    // three topics passed the "four a day is manageable" test on the morning of
    // the exam. The page rendered "3/day needed, that pace is manageable".
    const p = buildExamPlan("2026-09-07", "2026-09-07", topics(3));
    expect(p.daysLeft).toBe(0);
    expect(p.coverageDays).toBe(0);
    expect(p.onTrack).toBe(false);
  });

  it("is on track when the exam is today and nothing is left", () => {
    const p = buildExamPlan("2026-09-07", "2026-09-07", topics(0, 5));
    expect(p.uncoveredCount).toBe(0);
    expect(p.onTrack).toBe(true);
  });

  it("keeps the daily threshold on the last day of runway", () => {
    // One day left is still a day, so the pace rule applies normally: four
    // topics is at the limit, five is over it. This is the boundary the
    // coverageDays > 0 guard deliberately leaves alone.
    const ok = buildExamPlan("2026-09-07", "2026-09-08", topics(4));
    expect(ok.coverageDays).toBe(1);
    expect(ok.topicsPerDay).toBe(4);
    expect(ok.onTrack).toBe(true);

    const over = buildExamPlan("2026-09-07", "2026-09-08", topics(5));
    expect(over.onTrack).toBe(false);
  });

  it("still calls a sustainable pace on track when there is runway", () => {
    // 40 days out: revision takes 8, leaving 32 coverage days for 32 topics.
    const p = buildExamPlan("2026-09-07", "2026-10-17", topics(32));
    expect(p.coverageDays).toBeGreaterThan(0);
    expect(p.topicsPerDay).toBe(1);
    expect(p.onTrack).toBe(true);
  });

  it("still calls an impossible pace off track when there is runway", () => {
    const p = buildExamPlan("2026-09-07", "2026-10-17", topics(400));
    expect(p.topicsPerDay).toBeGreaterThan(4);
    expect(p.onTrack).toBe(false);
  });

  it("never reports a negative runway for an exam already past", () => {
    const p = buildExamPlan("2026-09-07", "2026-09-01", topics(2));
    expect(p.daysLeft).toBe(0);
    expect(p.coverageDays).toBe(0);
    expect(p.onTrack).toBe(false);
  });
});
