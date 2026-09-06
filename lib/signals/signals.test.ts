import { describe, expect, it } from "vitest";
import {
  mistakeHalfLife,
  abandonmentFingerprint,
  honestHour,
  silentSyllabus,
  topicContagion,
  ghostMode,
  type FocusSessionRow,
} from "./index";
import type { Mistake, PyqAttempt, SyllabusTopic } from "@/lib/study/types";

const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const mistake = (subject: string, topic: string, daysAgo: number): Mistake => ({
  id: `${subject}-${topic}-${daysAgo}`,
  subject,
  topic,
  note: null,
  source: "manual",
  created_at: day(daysAgo),
  resolved_at: null,
  next_review_at: day(0),
  review_count: 0,
});

const session = (
  subject: string | null,
  minutes: number,
  completed: boolean,
  daysAgo = 1,
): FocusSessionRow => ({
  subject,
  topic: null,
  minutes,
  completed,
  started_at: day(daysAgo),
});

describe("mistakeHalfLife", () => {
  it("needs three occurrences before claiming a pattern", () => {
    const two = [mistake("Chem", "Moles", 20), mistake("Chem", "Moles", 10)];
    expect(mistakeHalfLife(two)).toEqual([]);
  });

  it("averages the gaps between recurrences", () => {
    const rows = [
      mistake("Chem", "Moles", 30),
      mistake("Chem", "Moles", 20),
      mistake("Chem", "Moles", 10),
    ];
    const [hit] = mistakeHalfLife(rows);
    expect(hit.days).toBe(10);
    expect(hit.breaks).toBe(3);
  });

  it("ignores topics logged in one sitting", () => {
    const sameDay = [mistake("Chem", "Moles", 5), mistake("Chem", "Moles", 5), mistake("Chem", "Moles", 5)];
    expect(mistakeHalfLife(sameDay)).toEqual([]);
  });
});

describe("abandonmentFingerprint", () => {
  it("ignores subjects with fewer than three sessions", () => {
    expect(abandonmentFingerprint([session("Chem", 5, false), session("Chem", 5, true)])).toEqual([]);
  });

  it("reports follow-through and the average quitting minute", () => {
    const [hit] = abandonmentFingerprint([
      session("Chem", 6, false),
      session("Chem", 8, false),
      session("Chem", 25, true),
    ]);
    expect(hit).toMatchObject({ subject: "Chem", started: 3, finished: 1, quitAtMinute: 7 });
  });

  it("puts the worst follow-through first", () => {
    const rows = [
      session("Maths", 25, true),
      session("Maths", 25, true),
      session("Maths", 25, true),
      session("Chem", 5, false),
      session("Chem", 5, false),
      session("Chem", 25, true),
    ];
    expect(abandonmentFingerprint(rows)[0].subject).toBe("Chem");
  });
});

describe("honestHour", () => {
  it("returns null below three sessions", () => {
    expect(honestHour([session("Chem", 25, true), session("Chem", 25, true)])).toBeNull();
  });

  it("separates minutes actually finished from minutes started", () => {
    const hit = honestHour([
      session("Chem", 25, true, 1),
      session("Chem", 7, false, 2),
      session("Chem", 8, false, 3),
    ]);
    expect(hit).toMatchObject({ started: 3, finished: 1, realMinutes: 25, claimedMinutes: 40 });
  });

  it("excludes sessions outside the window", () => {
    const rows = [
      session("Chem", 25, true, 1),
      session("Chem", 25, true, 2),
      session("Chem", 25, true, 3),
      session("Chem", 25, true, 40),
    ];
    // the 40-day-old session is dropped, leaving the three inside the window
    expect(honestHour(rows, 7)?.started).toBe(3);
  });
});

describe("silentSyllabus", () => {
  const topic = (subject: string, name: string): SyllabusTopic => ({
    id: `${subject}-${name}`,
    subject,
    topic: name,
    covered: true,
    position: 0,
  });

  it("lists topics never touched by a mistake or an attempt", () => {
    const out = silentSyllabus(
      [topic("Chem", "Moles"), topic("Chem", "Redox")],
      [mistake("Chem", "Moles", 3)],
      [],
    );
    expect(out).toEqual([{ subject: "Chem", topics: ["Redox"] }]);
  });

  it("counts a topic as touched when a past paper covered it", () => {
    const attempt: PyqAttempt = {
      id: "a",
      subject: "Chem",
      topic: "Redox",
      total: 5,
      correct: 3,
      taken_at: day(2),
    };
    expect(silentSyllabus([topic("Chem", "Redox")], [], [attempt])).toEqual([]);
  });

  it("matches case-insensitively so casing does not fake a gap", () => {
    expect(silentSyllabus([topic("Chem", "moles")], [mistake("Chem", "Moles", 1)], [])).toEqual([]);
  });
});

describe("topicContagion", () => {
  it("needs a pair to co-occur twice", () => {
    const once = [mistake("Chem", "Moles", 5), mistake("Chem", "Redox", 4)];
    expect(topicContagion(once)).toEqual([]);
  });

  it("finds topics that break together inside the window", () => {
    const rows = [
      mistake("Chem", "Moles", 20),
      mistake("Chem", "Redox", 19),
      mistake("Chem", "Moles", 10),
      mistake("Chem", "Redox", 9),
    ];
    const [hit] = topicContagion(rows);
    expect(hit.times).toBeGreaterThanOrEqual(2);
    expect([hit.a, hit.b].sort()).toEqual(["Chem · Moles", "Chem · Redox"]);
  });

  it("ignores pairs further apart than the window", () => {
    const rows = [
      mistake("Chem", "Moles", 40),
      mistake("Chem", "Redox", 20),
      mistake("Chem", "Moles", 15),
      mistake("Chem", "Redox", 1),
    ];
    expect(topicContagion(rows, 4)).toEqual([]);
  });
});

describe("ghostMode", () => {
  const attempt = (topic: string, correct: number, total: number, daysAgo: number): PyqAttempt => ({
    id: `${topic}-${daysAgo}`,
    subject: "Chem",
    topic,
    total,
    correct,
    taken_at: day(daysAgo),
  });

  it("needs two sittings on the same topic", () => {
    expect(ghostMode([attempt("Moles", 5, 10, 2)])).toEqual([]);
  });

  it("compares the latest sitting against everything before it", () => {
    const [hit] = ghostMode([attempt("Moles", 5, 10, 10), attempt("Moles", 9, 10, 1)]);
    expect(hit).toMatchObject({ topic: "Moles", past: 50, latest: 90, delta: 40 });
  });

  it("puts the biggest regression first", () => {
    const rows = [
      attempt("Moles", 5, 10, 10),
      attempt("Moles", 9, 10, 1),
      attempt("Redox", 9, 10, 10),
      attempt("Redox", 4, 10, 1),
    ];
    expect(ghostMode(rows)[0].topic).toBe("Redox");
  });

  it("skips attempts with no topic recorded", () => {
    const untagged = { ...attempt("Moles", 5, 10, 2), topic: null };
    expect(ghostMode([untagged, untagged])).toEqual([]);
  });
});
