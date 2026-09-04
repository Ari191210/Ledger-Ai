import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeScore, type ScoreBreakdown } from "./compute";
import {
  getActivityRange,
  getCurrentStreak,
  getMistakes,
  getPyqAttempts,
  getSyllabus,
} from "@/lib/study/queries";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Last n ISO dates, oldest first, ending today. */
function lastDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(isoDate(daysAgo(i)));
  return out;
}

export type ActivityTile = {
  key: string;
  label: string;
  value: string;
  sub: string;
  data: number[];
};

export type DashboardData = {
  score: ScoreBreakdown;
  streakDays: number;
  activity: ActivityTile[];
  studiedDays: Set<number>;
  coveragePct: number;
  syllabusLogged: boolean;
  fixNext: { subject: string; topic: string; count: number }[];
};

// cache() dedupes calls with the same arguments within one request — the
// (app) layout and the dashboard/score pages all ask for this per render.
export const getDashboardData = cache(async function getDashboardData(
  supabase: SupabaseClient,
  userId: string,
): Promise<DashboardData> {
  const to = isoDate(new Date());
  const from60 = isoDate(daysAgo(59));

  const [activity60, mistakesAll, pyq30, syllabus, streakDays] = await Promise.all([
    getActivityRange(supabase, userId, from60, to),
    getMistakes(supabase, userId),
    getPyqAttempts(supabase, userId, 30),
    getSyllabus(supabase, userId),
    getCurrentStreak(supabase, userId),
  ]);

  // ── score ────────────────────────────────────────────────────────────
  const pyqTotal = pyq30.reduce((s, a) => s + a.total, 0);
  const pyqCorrect = pyq30.reduce((s, a) => s + a.correct, 0);
  const syllabusTotal = syllabus.length;
  const syllabusCovered = syllabus.filter((t) => t.covered).length;
  const mistakesRecent7d = mistakesAll.filter(
    (m) => new Date(m.created_at) >= daysAgo(6),
  ).length;

  const score = computeScore({
    pyqTotal,
    pyqCorrect,
    syllabusTotal,
    syllabusCovered,
    mistakesEverLogged: mistakesAll.length,
    mistakesRecent7d,
    streakDays,
  });

  // ── weekly series (7 days, oldest -> newest) ────────────────────────
  const days7 = lastDays(7);

  const minutesByDay = new Map(activity60.map((a) => [a.day, a.minutes]));
  const focusSeries = days7.map((d) => minutesByDay.get(d) ?? 0);
  const focusMinutesWeek = focusSeries.reduce((s, m) => s + m, 0);

  const pyqByDay = new Map<string, { total: number; correct: number }>();
  for (const a of pyq30) {
    const d = a.taken_at.slice(0, 10);
    const cur = pyqByDay.get(d) ?? { total: 0, correct: 0 };
    cur.total += a.total;
    cur.correct += a.correct;
    pyqByDay.set(d, cur);
  }
  let lastKnownAccuracy = 0;
  const pyqSeries = days7.map((d) => {
    const e = pyqByDay.get(d);
    if (e && e.total > 0) lastKnownAccuracy = Math.round((e.correct / e.total) * 100);
    return lastKnownAccuracy;
  });

  const mistakesByDay = new Map<string, number>();
  for (const m of mistakesAll) {
    const d = m.created_at.slice(0, 10);
    mistakesByDay.set(d, (mistakesByDay.get(d) ?? 0) + 1);
  }
  const mistakesSeries = days7.map((d) => mistakesByDay.get(d) ?? 0);
  const openMistakes = mistakesAll.filter((m) => !m.resolved_at);

  const pyqAccuracyPct = pyqTotal > 0 ? Math.round((pyqCorrect / pyqTotal) * 100) : 0;
  const focusHours = Math.floor(focusMinutesWeek / 60);
  const focusMins = focusMinutesWeek % 60;
  const focusLabel =
    focusHours > 0 ? `${focusHours}h${focusMins ? focusMins : ""}` : `${focusMins}m`;

  const activity: ActivityTile[] = [
    {
      key: "pyq",
      label: "pyq accuracy",
      value: `${pyqAccuracyPct}%`,
      sub: `${pyqTotal} attempted · 30d`,
      data: pyqSeries,
    },
    {
      key: "mistakes",
      label: "open mistakes",
      value: String(openMistakes.length),
      sub: `${mistakesRecent7d} new this week`,
      data: mistakesSeries,
    },
    {
      key: "focus",
      label: "focus time",
      value: focusLabel,
      sub: `${Math.round(focusMinutesWeek / 7)}m avg/day`,
      data: focusSeries,
    },
  ];

  // ── calendar (current month) ─────────────────────────────────────────
  const curMonthPrefix = to.slice(0, 7);
  const studiedDays = new Set(
    activity60
      .filter((a) => a.day.startsWith(curMonthPrefix) && a.minutes > 0)
      .map((a) => Number(a.day.slice(8, 10))),
  );

  // ── fix next: open mistakes grouped by subject + topic ──────────────
  const groups = new Map<string, { subject: string; topic: string; count: number }>();
  for (const m of openMistakes) {
    const key = `${m.subject}::${m.topic}`;
    const g = groups.get(key) ?? { subject: m.subject, topic: m.topic, count: 0 };
    g.count++;
    groups.set(key, g);
  }
  const fixNext = [...groups.values()].sort((a, b) => b.count - a.count).slice(0, 4);

  return {
    score,
    streakDays,
    activity,
    studiedDays,
    coveragePct: syllabusTotal > 0 ? Math.round((syllabusCovered / syllabusTotal) * 100) : 0,
    syllabusLogged: syllabusTotal > 0,
    fixNext,
  };
});
