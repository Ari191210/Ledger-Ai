import { describe, it, expect, vi, afterEach } from "vitest";
import { computeStreak } from "./streak";

/**
 * The streak feeds the Ledger Score's consistency pillar, so whether it reads 0
 * at 8am decides whether a student's score silently drops by up to 150 points
 * overnight. These pin the rule: a day is not missed until it is over.
 *
 * Times are set in IST terms. 2026-09-14 09:00 IST is 03:30 UTC.
 */

const at = (isoUtc: string) => vi.setSystemTime(new Date(isoUtc));

afterEach(() => {
  vi.useRealTimers();
});

describe("computeStreak", () => {
  it("keeps yesterday's run in the morning before today is logged", () => {
    vi.useFakeTimers();
    at("2026-09-14T03:30:00Z"); // 09:00 IST, nothing logged yet today
    const days = new Set(["2026-09-11", "2026-09-12", "2026-09-13"]);
    expect(computeStreak(days)).toBe(3);
  });

  it("counts today once it is logged", () => {
    vi.useFakeTimers();
    at("2026-09-14T03:30:00Z");
    const days = new Set(["2026-09-12", "2026-09-13", "2026-09-14"]);
    expect(computeStreak(days)).toBe(3);
  });

  it("breaks once a whole day has passed with nothing logged", () => {
    vi.useFakeTimers();
    at("2026-09-14T03:30:00Z");
    // Last log was the 12th. The 13th ended empty.
    const days = new Set(["2026-09-10", "2026-09-11", "2026-09-12"]);
    expect(computeStreak(days)).toBe(0);
  });

  it("is zero for a student who has never logged", () => {
    vi.useFakeTimers();
    at("2026-09-14T03:30:00Z");
    expect(computeStreak(new Set())).toBe(0);
  });

  it("uses the IST day, not the UTC one, at the edge of midnight", () => {
    vi.useFakeTimers();
    // 00:30 IST on the 14th is still 19:00 UTC on the 13th.
    at("2026-09-13T19:00:00Z");
    const days = new Set(["2026-09-12", "2026-09-13"]);
    // Today (IST) is the 14th and unlogged, so yesterday's run of 2 stands.
    expect(computeStreak(days)).toBe(2);
  });

  it("stops at the first gap going backwards", () => {
    vi.useFakeTimers();
    at("2026-09-14T03:30:00Z");
    const days = new Set(["2026-09-09", "2026-09-12", "2026-09-13", "2026-09-14"]);
    expect(computeStreak(days)).toBe(3);
  });
});
