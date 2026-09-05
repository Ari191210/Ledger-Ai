// Pure reverse-planning logic for the Exam Planner tool, counts back from
// a real exam deadline (kind: "exam" in the deadlines table) and splits the
// remaining time into a coverage phase (finish what's uncovered) and a
// revision phase (spaced review of everything), same deterministic spirit
// as lib/planner.ts and lib/score/compute.ts. No AI call.

import type { SyllabusTopic } from "./study/types";

export type ExamPlan = {
  daysLeft: number;
  coverageDays: number;
  revisionDays: number;
  uncoveredCount: number;
  totalTopics: number;
  topicsPerDay: number;
  onTrack: boolean;
};

function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export function buildExamPlan(
  today: string,
  examDate: string,
  scopedTopics: SyllabusTopic[],
): ExamPlan {
  const daysLeft = Math.max(daysBetween(today, examDate), 0);
  const uncovered = scopedTopics.filter((t) => !t.covered);

  // Reserve roughly the last fifth of the runway for pure revision, never
  // less than 2 days (if there's runway at all) or more than 10.
  const revisionDays = daysLeft <= 2 ? 0 : Math.min(10, Math.max(2, Math.round(daysLeft * 0.2)));
  const coverageDays = Math.max(daysLeft - revisionDays, 0);

  const topicsPerDay = coverageDays > 0
    ? Math.ceil(uncovered.length / coverageDays)
    : uncovered.length;

  // "On track" if a sane daily pace (<=4 new topics/day) clears the backlog
  // before revision has to start.
  return {
    daysLeft,
    coverageDays,
    revisionDays,
    uncoveredCount: uncovered.length,
    totalTopics: scopedTopics.length,
    topicsPerDay,
    onTrack: topicsPerDay <= 4,
  };
}
