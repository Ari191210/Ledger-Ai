/**
 * What this student should point a focus session at, and why.
 *
 * This is the whole difference between StudyLedger's timer and every other
 * Pomodoro. A timer that opens on an empty screen makes you decide what to work
 * on at the exact moment you have least willpower. This opens with an answer,
 * and shows its reasoning so the answer can be argued with.
 *
 * Every suggestion is derived from data the student logged themselves. Nothing
 * here is invented, and when there is nothing to go on it says so rather than
 * inventing a plausible topic.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getMistakes, getSyllabus, getPyqAttempts } from "@/lib/study/queries";
import { getDeadlines } from "@/lib/study/deadlines";
import { computeCircadianRows } from "@/lib/circadian";
import { isoDateIST, hourIST, dayKeyIST } from "@/lib/date";

export type FocusTarget = {
  subject: string;
  topic: string | null;
  /** Shown to the student. Must be a fact, not a motivational line. */
  reason: string;
  source: "deadline" | "mistakes" | "coverage";
};

export type FocusSession = {
  subject: string | null;
  topic: string | null;
  minutes: number;
  completed: boolean;
  startedAt: string;
};

export type FocusBrief = {
  targets: FocusTarget[];
  /** Best accuracy window from logged attempts, null until there is enough. */
  bestWindow: { label: string; range: string; accuracy: number | null } | null;
  inBestWindowNow: boolean;
  recent: FocusSession[];
  /** Completed vs started, last 14 days. null when nothing has been logged. */
  followThrough: { completed: number; started: number } | null;
};

const daysUntil = (iso: string) => {
  const today = new Date(`${isoDateIST()}T00:00:00Z`).getTime();
  const due = new Date(`${iso}T00:00:00Z`).getTime();
  return Math.round((due - today) / 86_400_000);
};

export async function getFocusBrief(
  supabase: SupabaseClient,
  userId: string,
): Promise<FocusBrief> {
  const [mistakes, syllabus, deadlines, attempts, sessionsRes] = await Promise.all([
    getMistakes(supabase, userId, { onlyOpen: true }),
    getSyllabus(supabase, userId),
    getDeadlines(supabase, userId),
    getPyqAttempts(supabase, userId),
    supabase
      .from("focus_sessions")
      .select("subject, topic, minutes, completed, started_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(30),
  ]);

  const sessions = sessionsRes.data ?? [];
  const targets: FocusTarget[] = [];

  // 1. A deadline inside a fortnight beats everything else, because it is the
  //    only input with a hard external clock attached.
  const soon = deadlines
    .map((d) => ({ ...d, days: daysUntil(d.due_date) }))
    .filter((d) => d.days >= 0 && d.days <= 14)
    .sort((a, b) => a.days - b.days)[0];

  if (soon?.subject) {
    targets.push({
      subject: soon.subject,
      topic: null,
      reason:
        soon.days === 0
          ? `${soon.title} is today`
          : `${soon.title} in ${soon.days} day${soon.days === 1 ? "" : "s"}`,
      source: "deadline",
    });
  }

  // 2. The topic you keep getting wrong. Counted, not guessed.
  const byTopic = new Map<string, { subject: string; topic: string; count: number }>();
  for (const m of mistakes) {
    const key = `${m.subject}||${m.topic}`;
    const hit = byTopic.get(key);
    if (hit) hit.count += 1;
    else byTopic.set(key, { subject: m.subject, topic: m.topic, count: 1 });
  }
  const worst = [...byTopic.values()].sort((a, b) => b.count - a.count)[0];
  if (worst && !targets.some((t) => t.subject === worst.subject && t.topic === worst.topic)) {
    targets.push({
      subject: worst.subject,
      topic: worst.topic,
      reason: `${worst.count} open mistake${worst.count === 1 ? "" : "s"} logged here`,
      source: "mistakes",
    });
  }

  // 3. The subject you have covered least of what you yourself listed.
  const coverage = new Map<string, { covered: number; total: number }>();
  for (const t of syllabus) {
    const row = coverage.get(t.subject) ?? { covered: 0, total: 0 };
    row.total += 1;
    if (t.covered) row.covered += 1;
    coverage.set(t.subject, row);
  }
  const thinnest = [...coverage.entries()]
    .filter(([, v]) => v.total >= 3 && v.covered < v.total)
    .sort((a, b) => a[1].covered / a[1].total - b[1].covered / b[1].total)[0];

  // Deduped against subject AND topic, not subject alone: "fix Mole concept"
  // and "cover the rest of Chemistry" are different sessions, and collapsing
  // them would leave a student with a single chip and no choice.
  if (thinnest && !targets.some((t) => t.subject === thinnest[0] && t.topic === null)) {
    const [subject, v] = thinnest;
    targets.push({
      subject,
      topic: null,
      reason: `${v.covered} of ${v.total} topics covered`,
      source: "coverage",
    });
  }

  // Best hours, reusing the exact computation the Circadian tool shows, so the
  // two can never disagree with each other.
  const { best } = computeCircadianRows(
    attempts.map((a) => ({ correct: a.correct, total: a.total, hour: hourIST(a.taken_at) })),
    mistakes.map((m) => hourIST(m.created_at)),
  );

  const hourNow = hourIST(new Date());

  const completed14 = sessions.filter(
    // daysUntil expects an IST calendar day; slicing the stored UTC timestamp
    // put sessions started before 05:30 IST on the day before, moving the
    // fourteen day boundary by one.
    (s) => daysUntil(dayKeyIST(String(s.started_at))) >= -14,
  );

  return {
    targets,
    bestWindow: best
      ? { label: best.label, range: best.range, accuracy: best.accuracy }
      : null,
    inBestWindowNow: best ? hourNow >= best.from && hourNow < best.to : false,
    recent: sessions.slice(0, 5).map((s) => ({
      subject: s.subject,
      topic: s.topic,
      minutes: s.minutes,
      completed: s.completed,
      startedAt: s.started_at,
    })),
    followThrough: completed14.length
      ? {
          completed: completed14.filter((s) => s.completed).length,
          started: completed14.length,
        }
      : null,
  };
}
