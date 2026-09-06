/**
 * This text goes into the system prompt of every AI request, so the risks are
 * a line that states something the rows do not support, and a wall of findings
 * that buries the one that matters. Both are tested here.
 */

import { describe, expect, it } from "vitest";
import { derivedPatterns } from "./patterns-context";
import type { Mistake, PyqAttempt, SyllabusTopic } from "@/lib/study/types";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const mistake = (subject: string, topic: string, days: number): Mistake => ({
  id: `${subject}-${topic}-${days}`,
  subject,
  topic,
  note: null,
  source: "manual",
  created_at: daysAgo(days),
  resolved_at: null,
  next_review_at: daysAgo(days),
  review_count: 0,
});

const attempt = (
  subject: string,
  topic: string | null,
  correct: number,
  days: number,
  predicted: number | null = null,
): PyqAttempt =>
  ({
    id: `${subject}-${topic}-${days}-${correct}`,
    subject,
    topic,
    total: 10,
    correct,
    taken_at: daysAgo(days),
    predicted_correct: predicted,
  }) as PyqAttempt;

const topic = (subject: string, t: string): SyllabusTopic =>
  ({ id: `${subject}-${t}`, subject, topic: t, covered: false }) as SyllabusTopic;

const empty = { mistakes: [], allMistakes: [], syllabus: [], attempts: [] };

describe("derivedPatterns", () => {
  it("says nothing when there is nothing to say", () => {
    expect(derivedPatterns(empty)).toEqual([]);
  });

  it("never emits more lines than the cap, however much is going on", () => {
    const mistakes = [
      mistake("Chemistry", "Mole concept", 30),
      mistake("Chemistry", "Mole concept", 20),
      mistake("Chemistry", "Mole concept", 10),
      mistake("Physics", "Rotation", 29),
      mistake("Physics", "Rotation", 19),
      mistake("Economics", "National income", 28),
      mistake("Economics", "National income", 18),
    ];
    const attempts = [
      attempt("Physics", "Rotation", 3, 20, 9),
      attempt("Physics", "Rotation", 2, 5, 9),
      attempt("Chemistry", "Mole concept", 8, 20, 3),
      attempt("Chemistry", "Mole concept", 4, 4, 3),
    ];
    const lines = derivedPatterns({
      mistakes,
      allMistakes: mistakes,
      syllabus: [topic("Biology", "Genetics"), topic("Biology", "Evolution")],
      attempts,
    });
    expect(lines.length).toBeLessThanOrEqual(4);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("stays silent on calibration when the student is well calibrated", () => {
    const attempts = [attempt("Bio", null, 7, 10, 7), attempt("Bio", null, 8, 5, 7)];
    const lines = derivedPatterns({ ...empty, attempts });
    expect(lines.some((l) => /calibrat|predict/i.test(l))).toBe(false);
  });

  it("reports a decline but not an improvement, because only one needs acting on", () => {
    const declining = derivedPatterns({
      ...empty,
      attempts: [attempt("Physics", "Optics", 9, 30), attempt("Physics", "Optics", 4, 2)],
    });
    expect(declining.some((l) => /getting worse/i.test(l))).toBe(true);

    const improving = derivedPatterns({
      ...empty,
      attempts: [attempt("Physics", "Optics", 4, 30), attempt("Physics", "Optics", 9, 2)],
    });
    expect(improving.some((l) => /getting worse/i.test(l))).toBe(false);
  });

  it("counts untested topics across every subject, not just the first", () => {
    const [line] = derivedPatterns({
      ...empty,
      syllabus: [topic("Bio", "Genetics"), topic("Bio", "Evolution"), topic("Physics", "Optics")],
    });
    expect(line).toMatch(/^3 topics/);
  });

  it("does not count a topic as untested once it has been attempted", () => {
    const lines = derivedPatterns({
      ...empty,
      syllabus: [topic("Bio", "Genetics")],
      attempts: [attempt("Bio", "Genetics", 5, 3)],
    });
    expect(lines).toEqual([]);
  });

  it("draws contagion from the unscoped set so cross-subject pairs survive", () => {
    const allMistakes = [
      mistake("Chemistry", "Mole concept", 10),
      mistake("Economics", "National income", 9),
      mistake("Chemistry", "Mole concept", 5),
      mistake("Economics", "National income", 4),
    ];
    const lines = derivedPatterns({ ...empty, mistakes: [], allMistakes });
    expect(lines.some((l) => /usually follows/i.test(l))).toBe(true);
  });
});
