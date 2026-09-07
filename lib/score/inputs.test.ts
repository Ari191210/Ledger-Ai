import { describe, it, expect, vi, beforeEach } from "vitest";
import { isoDateIST, isoDaysAgoIST } from "@/lib/date";

/**
 * The dashboard's assembler: every tile, sparkline, calendar cell and Fix Next
 * row comes from here, and it had no tests at all. Six of an external audit's
 * findings passed through this file, including ten day keys sliced off UTC
 * timestamps and compared against IST ones.
 *
 * The queries are stubbed rather than mocked loosely, so what is under test is
 * the arithmetic and the day boundaries, which is where the defects were.
 */

const rows = {
  activity: [] as { day: string; minutes: number }[],
  mistakes: [] as Record<string, unknown>[],
  pyq: [] as Record<string, unknown>[],
  syllabus: [] as Record<string, unknown>[],
  streak: 0,
};

vi.mock("@/lib/study/queries", () => ({
  getActivityRange: async () => rows.activity,
  getCurrentStreak: async () => rows.streak,
  getMistakes: async () => rows.mistakes,
  getPyqAttempts: async () => rows.pyq,
  getSyllabus: async () => rows.syllabus,
}));
vi.mock("@/lib/score/tape", () => ({ getLedgerTape: async () => [] }));

const { getDashboardData } = await import("./inputs");

/** An IST timestamp for a given day at a given IST hour. */
const atIST = (day: string, hourIST: number) => {
  const utcHour = hourIST - 5.5;
  const base = new Date(`${day}T00:00:00Z`).getTime() + utcHour * 3_600_000;
  return new Date(base).toISOString();
};

const supabase = {} as never;

beforeEach(() => {
  rows.activity = [];
  rows.mistakes = [];
  rows.pyq = [];
  rows.syllabus = [];
  rows.streak = 0;
});

describe("getDashboardData", () => {
  it("puts a 1am IST attempt on today, not yesterday", async () => {
    // The bug this pins: taken_at.slice(0, 10) reads the UTC day, so anything
    // logged between midnight and 05:29 IST landed a day early, while the
    // Ledger Score put it on the right one. The two disagreed about the week.
    const today = isoDateIST();
    rows.pyq = [{ subject: "Physics", total: 10, correct: 8, taken_at: atIST(today, 1) }];

    const data = await getDashboardData(supabase, "u1");
    const pyqTile = data.activity.find((t) => /pyq/i.test(t.label))!;
    // Today is the last point of the seven-day series.
    expect(pyqTile.data[pyqTile.data.length - 1]).toBe(80);
  });

  it("counts a 1am IST mistake on today in the calendar and the series", async () => {
    const today = isoDateIST();
    rows.mistakes = [
      { subject: "Maths", topic: "Integrals", created_at: atIST(today, 1), resolved_at: null },
    ];

    const data = await getDashboardData(supabase, "u1");
    const tile = data.activity.find((t) => /mistake/i.test(t.label))!;
    expect(tile.data[tile.data.length - 1]).toBe(1);
    const dayOfMonth = Number(today.slice(8, 10));
    expect(data.dayDetails[dayOfMonth]?.mistakes).toHaveLength(1);
  });

  it("carries the last known accuracy forward across days with no attempts", async () => {
    // A day with no papers is not a day you scored zero. Drawing it as zero
    // would put a cliff in the sparkline that never happened.
    rows.pyq = [
      { subject: "Physics", total: 10, correct: 5, taken_at: atIST(isoDaysAgoIST(4), 10) },
    ];
    const data = await getDashboardData(supabase, "u1");
    const tile = data.activity.find((t) => /pyq/i.test(t.label))!;
    expect(tile.data[tile.data.length - 1]).toBe(50);
    expect(tile.data.every((v) => v >= 0 && v <= 100)).toBe(true);
  });

  it("reports zero rather than NaN when nothing has been logged", async () => {
    const data = await getDashboardData(supabase, "u1");
    expect(data.coveragePct).toBe(0);
    expect(data.syllabusLogged).toBe(false);
    for (const tile of data.activity) {
      expect(tile.data.every(Number.isFinite), tile.label).toBe(true);
    }
    expect(Number.isFinite(data.score.total)).toBe(true);
  });

  it("gives every activity tile exactly seven points", async () => {
    const data = await getDashboardData(supabase, "u1");
    for (const tile of data.activity) expect(tile.data, tile.label).toHaveLength(7);
  });

  it("computes coverage as a whole percentage of listed topics", async () => {
    rows.syllabus = [
      { id: "1", subject: "Physics", topic: "a", covered: true, position: 0 },
      { id: "2", subject: "Physics", topic: "b", covered: true, position: 1 },
      { id: "3", subject: "Physics", topic: "c", covered: false, position: 2 },
    ];
    const data = await getDashboardData(supabase, "u1");
    expect(data.coveragePct).toBe(67);
    expect(data.syllabusLogged).toBe(true);
  });

  it("counts a topic as studied on the IST day it happened", async () => {
    const today = isoDateIST();
    rows.activity = [{ day: today, minutes: 45 }];
    const data = await getDashboardData(supabase, "u1");
    expect(data.studiedDays.has(Number(today.slice(8, 10)))).toBe(true);
  });

  it("hands the score engine the same inputs it exposes", async () => {
    rows.syllabus = [{ id: "1", subject: "P", topic: "a", covered: true, position: 0 }];
    const data = await getDashboardData(supabase, "u1");
    // scoreInputs is what the what-if dial re-runs; it must describe the same
    // ledger the rest of the payload describes.
    expect(data.scoreInputs.syllabusTotal).toBe(1);
    expect(data.scoreInputs.syllabusCovered).toBe(1);
    expect(data.coveragePct).toBe(100);
  });

  it("never returns a day detail for a day in the future", async () => {
    const data = await getDashboardData(supabase, "u1");
    const todayNum = Number(isoDateIST().slice(8, 10));
    for (const key of Object.keys(data.dayDetails)) {
      expect(Number(key)).toBeLessThanOrEqual(todayNum);
    }
  });
});
