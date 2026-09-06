import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeScore, type ScoreBreakdown } from "./compute";
import { buildScoreInputs } from "./build-inputs";
import { isoDateIST, hourIST } from "@/lib/date";
import {
  getActivityRange,
  getCurrentStreak,
  getMistakes,
  getPyqAttempts,
  getSyllabus,
} from "@/lib/study/queries";

function isoDate(d: Date): string {
  return isoDateIST(d);
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
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

export type DayDetail = {
  minutes: number;
  mistakes: { subject: string; topic: string }[];
  pyq: { subject: string; correct: number; total: number }[];
};

export type DashboardData = {
  score: ScoreBreakdown;
  streakDays: number;
  activity: ActivityTile[];
  focusHistory: { day: string; minutes: number }[];
  studiedDays: Set<number>;
  dayDetails: Record<number, DayDetail>;
  coveragePct: number;
  syllabusLogged: boolean;
  /** One slot per topic, in the order the student listed them, grouped by
   *  subject. A punch card: the slots do not reflow as they fill, so the gaps
   *  stay where they are and stay countable. */
  syllabusCard: { subject: string; slots: boolean[] }[];
  /** Accuracy per hour of the day, 24 entries, null where nothing was logged
   *  at that hour. Null is not zero and must not be drawn as zero. */
  hourAccuracy: (number | null)[];
  fixNext: { subject: string; topic: string; count: number }[];
};

// cache() dedupes calls with the same arguments within one request, the
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
  const scoreInputs = buildScoreInputs({
    attempts: pyq30,
    syllabus,
    mistakes: mistakesAll,
    streakDays,
  });
  const { pyqTotal, pyqCorrect, syllabusTotal, syllabusCovered } = scoreInputs;
  const score = computeScore(scoreInputs);

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
      sub: `${scoreInputs.mistakesRecent7d} new this week`,
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

  // ── 30-day focus history (bars + rolling average in the UI) ─────────
  const days30 = lastDays(30);
  const focusHistory = days30.map((d) => ({ day: d, minutes: minutesByDay.get(d) ?? 0 }));

  // ── calendar (current month) ─────────────────────────────────────────
  const curMonthPrefix = to.slice(0, 7);
  const studiedDays = new Set(
    activity60
      .filter((a) => a.day.startsWith(curMonthPrefix) && a.minutes > 0)
      .map((a) => Number(a.day.slice(8, 10))),
  );

  const dayDetails: Record<number, DayDetail> = {};
  const detailFor = (day: number): DayDetail =>
    (dayDetails[day] ??= { minutes: 0, mistakes: [], pyq: [] });

  for (const a of activity60) {
    if (a.day.startsWith(curMonthPrefix) && a.minutes > 0) {
      detailFor(Number(a.day.slice(8, 10))).minutes = a.minutes;
    }
  }
  for (const m of mistakesAll) {
    const d = m.created_at.slice(0, 10);
    if (d.startsWith(curMonthPrefix)) {
      detailFor(Number(d.slice(8, 10))).mistakes.push({ subject: m.subject, topic: m.topic });
    }
  }
  for (const a of pyq30) {
    const d = a.taken_at.slice(0, 10);
    if (d.startsWith(curMonthPrefix)) {
      detailFor(Number(d.slice(8, 10))).pyq.push({
        subject: a.subject,
        correct: a.correct,
        total: a.total,
      });
    }
  }

  // ── fix next: open mistakes grouped by subject + topic ──────────────
  const groups = new Map<string, { subject: string; topic: string; count: number }>();
  for (const m of openMistakes) {
    const key = `${m.subject}::${m.topic}`;
    const g = groups.get(key) ?? { subject: m.subject, topic: m.topic, count: 0 };
    g.count++;
    groups.set(key, g);
  }
  const fixNext = [...groups.values()].sort((a, b) => b.count - a.count).slice(0, 4);

  // Grouped in listing order, not alphabetically: the student's own sequence
  // is the one they revise in, and reordering it would hide where they stopped.
  const bySubject = new Map<string, boolean[]>();
  for (const t of syllabus) {
    bySubject.set(t.subject, [...(bySubject.get(t.subject) ?? []), t.covered]);
  }
  const syllabusCard = [...bySubject.entries()].map(([subject, slots]) => ({ subject, slots }));

  // Per hour rather than per window. The six circadian windows are the right
  // grain for a sentence ("you are sharpest at night") and the wrong grain for
  // a dial, which can afford 24 marks and is more honest for having them.
  const byHour = Array.from({ length: 24 }, () => ({ correct: 0, total: 0 }));
  for (const a of pyq30) {
    const h = hourIST(a.taken_at);
    byHour[h].correct += a.correct;
    byHour[h].total += a.total;
  }
  const hourAccuracy = byHour.map((b) =>
    b.total > 0 ? Math.round((b.correct / b.total) * 100) : null,
  );

  return {
    score,
    streakDays,
    activity,
    focusHistory,
    studiedDays,
    dayDetails,
    coveragePct: syllabusTotal > 0 ? Math.round((syllabusCovered / syllabusTotal) * 100) : 0,
    syllabusLogged: syllabusTotal > 0,
    syllabusCard,
    hourAccuracy,
    fixNext,
  };
});
