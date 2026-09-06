/**
 * Fetches everything the signals need in one pass and runs them.
 *
 * Kept apart from the pure functions so those stay testable without a database.
 * This module is the only place that knows about Supabase.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getMistakes, getSyllabus, getPyqAttempts, getCurrentStreak } from "@/lib/study/queries";
import { getDeadlines } from "@/lib/study/deadlines";
import { computeCircadianRows } from "@/lib/circadian";
import { isoDateIST, hourIST } from "@/lib/date";
import {
  mistakeHalfLife,
  abandonmentFingerprint,
  honestHour,
  silentSyllabus,
  topicContagion,
  ghostMode,
  type FocusSessionRow,
  type HalfLife,
  type Abandonment,
  type HonestHour,
  type Silent,
  type Contagion,
  type Ghost,
} from "./index";
import { calibration, type CalibrationRow, type AttemptWithPrediction } from "./calibration";
import { costOfBreakingStreak, examHourMismatch, type StreakCost, type ExamHourMismatch } from "./cost";

export type Signals = {
  examMismatch: ExamHourMismatch | null;
  calibration: CalibrationRow[];
  halfLife: HalfLife[];
  abandonment: Abandonment[];
  honest: HonestHour | null;
  silent: Silent[];
  contagion: Contagion[];
  streakCost: StreakCost | null;
  ghosts: Ghost[];
  /** true when nothing fired, so the page can say why instead of showing blanks */
  empty: boolean;
};

export async function loadSignals(supabase: SupabaseClient, userId: string): Promise<Signals> {
  const [mistakes, syllabus, attempts, deadlines, sessionsRes, streakDays, lastDayRes] =
    await Promise.all([
      getMistakes(supabase, userId),
      getSyllabus(supabase, userId),
      getPyqAttempts(supabase, userId),
      getDeadlines(supabase, userId),
      supabase
        .from("focus_sessions")
        .select("subject, topic, minutes, completed, started_at")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(200),
      getCurrentStreak(supabase, userId),
      supabase
        .from("activity_days")
        .select("day")
        .eq("user_id", userId)
        .order("day", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const sessions = (sessionsRes.data ?? []) as FocusSessionRow[];

  // exam-hour mismatch needs the best window and the next timed exam
  const { best } = computeCircadianRows(
    attempts.map((a) => ({ correct: a.correct, total: a.total, hour: hourIST(a.taken_at) })),
    mistakes.map((m) => hourIST(m.created_at)),
  );

  const today = new Date(`${isoDateIST()}T00:00:00Z`).getTime();
  const nextTimedExam = deadlines
    .map((d) => ({
      ...d,
      daysAway: Math.round((new Date(`${d.due_date}T00:00:00Z`).getTime() - today) / 86_400_000),
    }))
    .filter((d) => d.daysAway >= 0 && d.start_hour !== null)
    .sort((a, b) => a.daysAway - b.daysAway)[0];

  const examMismatch = examHourMismatch({
    exam: nextTimedExam
      ? {
          title: nextTimedExam.title,
          startHour: nextTimedExam.start_hour,
          daysAway: nextTimedExam.daysAway,
        }
      : null,
    bestWindowId: best?.id ?? null,
    attemptHours: attempts.map((a) => hourIST(a.taken_at)),
  });

  // days since anything was logged, for the streak cost
  const lastDay = lastDayRes.data?.day ?? null;
  const daysSinceLastLog = lastDay
    ? Math.round((today - new Date(`${lastDay}T00:00:00Z`).getTime()) / 86_400_000)
    : 0;

  // The same inputs the dashboard scores with, rebuilt here so the
  // counterfactual is run through the real engine rather than an approximation.
  const weekAgo = Date.now() - 7 * 86_400_000;
  const scoreInputs = {
    pyqTotal: attempts.reduce((s, a) => s + a.total, 0),
    pyqCorrect: attempts.reduce((s, a) => s + a.correct, 0),
    syllabusTotal: syllabus.length,
    syllabusCovered: syllabus.filter((t) => t.covered).length,
    mistakesEverLogged: mistakes.length,
    mistakesRecent7d: mistakes.filter((m) => new Date(m.created_at).getTime() >= weekAgo).length,
    streakDays,
  };

  const signals: Omit<Signals, "empty"> = {
    examMismatch,
    calibration: calibration(attempts as AttemptWithPrediction[]),
    halfLife: mistakeHalfLife(mistakes),
    abandonment: abandonmentFingerprint(sessions),
    honest: honestHour(sessions),
    silent: silentSyllabus(syllabus, mistakes, attempts),
    contagion: topicContagion(mistakes),
    streakCost: costOfBreakingStreak(scoreInputs, daysSinceLastLog),
    ghosts: ghostMode(attempts),
  };

  const empty =
    !signals.examMismatch &&
    !signals.honest &&
    !signals.streakCost &&
    signals.calibration.length === 0 &&
    signals.halfLife.length === 0 &&
    signals.abandonment.length === 0 &&
    signals.silent.length === 0 &&
    signals.contagion.length === 0 &&
    signals.ghosts.length === 0;

  return { ...signals, empty };
}
