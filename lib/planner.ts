// Pure planning logic for the Planner tool — reverse-plans from real
// deadlines and syllabus coverage gaps. No AI call: every number here is
// derived deterministically from the user's own data, same spirit as the
// Ledger Score engine (lib/score/compute.ts).

import type { Deadline } from "./study/deadlines";
import type { SyllabusTopic } from "./study/types";

export type SubjectPriority = {
  subject: string;
  score: number; // 0-100, higher = more urgent
  allocationPct: number; // suggested share of this week's study time
  daysUntilDeadline: number | null;
  nearestDeadlineTitle: string | null;
  debtPct: number; // % of syllabus not yet covered for this subject
};

export type PlanBlock = {
  subject: string;
  topic: string;
  reason: string;
};

function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export function rankSubjects(
  deadlines: Deadline[],
  syllabus: SyllabusTopic[],
  today: string,
): SubjectPriority[] {
  const subjects = new Set<string>();
  for (const d of deadlines) if (d.subject) subjects.add(d.subject);
  for (const t of syllabus) subjects.add(t.subject);

  const raw = [...subjects].map((subject) => {
    const upcoming = deadlines
      .filter((d) => d.subject === subject && daysBetween(today, d.due_date) >= 0)
      .sort((a, b) => daysBetween(today, a.due_date) - daysBetween(today, b.due_date));
    const nearest = upcoming[0] ?? null;
    const daysUntil = nearest ? daysBetween(today, nearest.due_date) : null;

    const topics = syllabus.filter((t) => t.subject === subject);
    const debtPct = topics.length > 0
      ? Math.round(((topics.length - topics.filter((t) => t.covered).length) / topics.length) * 100)
      : 0;

    const deadlineScore = daysUntil === null ? 0 : Math.max(0, 1 - daysUntil / 14) * 60;
    const debtScore = (debtPct / 100) * 40;

    return {
      subject,
      score: Math.round(deadlineScore + debtScore),
      daysUntilDeadline: daysUntil,
      nearestDeadlineTitle: nearest?.title ?? null,
      debtPct,
    };
  });

  const scoreSum = raw.reduce((s, r) => s + Math.max(r.score, 1), 0) || 1;
  return raw
    .map((r) => ({ ...r, allocationPct: Math.round((Math.max(r.score, 1) / scoreSum) * 100) }))
    .sort((a, b) => b.score - a.score);
}

/** Today's plan: for each of the top-ranked subjects, the next thing to study. */
export function buildTodaysPlan(
  priorities: SubjectPriority[],
  syllabus: SyllabusTopic[],
  limit = 4,
): PlanBlock[] {
  const blocks: PlanBlock[] = [];
  for (const p of priorities) {
    if (blocks.length >= limit) break;
    const next = syllabus
      .filter((t) => t.subject === p.subject && !t.covered)
      .sort((a, b) => a.position - b.position)[0];

    const reason =
      p.daysUntilDeadline !== null
        ? p.daysUntilDeadline === 0
          ? `${p.nearestDeadlineTitle} due today`
          : `${p.nearestDeadlineTitle} in ${p.daysUntilDeadline}d`
        : p.debtPct > 0
          ? `${p.debtPct}% syllabus debt`
          : "keep it warm";

    blocks.push({
      subject: p.subject,
      topic: next?.topic ?? "review — syllabus fully covered",
      reason,
    });
  }
  return blocks;
}
