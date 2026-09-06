/**
 * The risk here is not a crash, it is the model telling a student they ignored
 * advice when they did not, or when they have not had time to act on it. These
 * tests are mostly about when this stays silent.
 */

import { describe, expect, it } from "vitest";
import { followThrough, type AdviceRow } from "./recall";
import type { Mistake, PyqAttempt } from "@/lib/study/types";

const NOW = new Date("2026-09-06T12:00:00Z").getTime();
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

const advice = (topic: string | null, days: number, subject = "Chemistry"): AdviceRow => ({
  tool: "crunch",
  subject,
  topic,
  headline: `Work ${topic}`,
  created_at: daysAgo(days),
});

const mistake = (topic: string, days: number, resolvedDays?: number): Mistake => ({
  id: `m-${topic}-${days}`,
  subject: "Chemistry",
  topic,
  note: null,
  source: "manual",
  created_at: daysAgo(days),
  resolved_at: resolvedDays === undefined ? null : daysAgo(resolvedDays),
  next_review_at: daysAgo(days),
  review_count: 0,
});

const attempt = (topic: string, days: number, correct = 7): PyqAttempt => ({
  id: `a-${topic}-${days}`,
  subject: "Chemistry",
  topic,
  total: 10,
  correct,
  taken_at: daysAgo(days),
});

describe("followThrough", () => {
  it("says nothing when there is no advice", () => {
    expect(followThrough([], [], [], NOW)).toEqual([]);
  });

  it("stays silent on advice too recent to have been acted on", () => {
    // Two days is not a failure to act, it is a Tuesday.
    expect(followThrough([advice("Mole concept", 2)], [], [], NOW)).toEqual([]);
  });

  it("stays silent on advice with no topic, which cannot be checked", () => {
    expect(followThrough([advice(null, 30)], [], [], NOW)).toEqual([]);
  });

  it("credits a student who tested themselves, with their real score", () => {
    const [line] = followThrough(
      [advice("Mole concept", 14)],
      [],
      [attempt("Mole concept", 3, 8), attempt("Mole concept", 1, 6)],
      NOW,
    );
    expect(line).toMatch(/tested themselves on it 2 times, scoring 70%/);
  });

  it("ignores activity that predates the advice", () => {
    // Tested 20 days ago, advised 14 days ago: that attempt proves nothing.
    const [line] = followThrough(
      [advice("Mole concept", 14)],
      [],
      [attempt("Mole concept", 20)],
      NOW,
    );
    expect(line).toMatch(/nothing has been logged against it since/);
  });

  it("notices a resolved mistake", () => {
    const [line] = followThrough(
      [advice("Mole concept", 20)],
      [mistake("Mole concept", 25, 5)],
      [],
      NOW,
    );
    expect(line).toMatch(/marked that mistake resolved/);
  });

  it("reports repeat breaks without testing as exactly that", () => {
    const [line] = followThrough(
      [advice("Mole concept", 20)],
      [mistake("Mole concept", 8), mistake("Mole concept", 3)],
      [],
      NOW,
    );
    expect(line).toMatch(/logged it wrong 2 more times since/);
  });

  it("matches topics case-insensitively, since students type them by hand", () => {
    const [line] = followThrough(
      [advice("mole CONCEPT", 14)],
      [],
      [attempt("Mole concept", 2)],
      NOW,
    );
    expect(line).toMatch(/tested themselves/);
  });

  it("never repeats the same topic, however often it was advised", () => {
    const lines = followThrough(
      [advice("Mole concept", 10), advice("Mole concept", 20), advice("Mole concept", 30)],
      [],
      [],
      NOW,
    );
    expect(lines).toHaveLength(1);
  });

  it("caps the lines it emits, because this rides on every AI request", () => {
    const lines = followThrough(
      [advice("A topic", 10), advice("B topic", 12), advice("C topic", 14), advice("D topic", 16)],
      [],
      [],
      NOW,
    );
    expect(lines.length).toBeLessThanOrEqual(2);
  });

  it("prefers the most recent advice when it has to choose", () => {
    const lines = followThrough(
      [advice("Older topic", 40), advice("Newer topic", 8)],
      [],
      [],
      NOW,
    );
    expect(lines[0]).toContain("Newer topic");
  });
});
