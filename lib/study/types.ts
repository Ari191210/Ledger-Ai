// Row shapes for migration 0003, activity_days, mistakes, pyq_attempts,
// syllabus_topics. Kept separate from queries.ts so the score engine and UI
// can import just the types without pulling in Supabase.

export type MistakeSource = "practice" | "pyq" | "exam" | "manual";

export type ActivityDay = {
  day: string; // ISO date, e.g. "2026-09-04"
  minutes: number;
};

export type Mistake = {
  id: string;
  subject: string;
  topic: string;
  note: string | null;
  source: MistakeSource;
  created_at: string;
  resolved_at: string | null;
  next_review_at: string;
  review_count: number;
};

export type PyqAttempt = {
  id: string;
  subject: string;
  topic: string | null;
  total: number;
  correct: number;
  taken_at: string;
};

export type SyllabusTopic = {
  id: string;
  subject: string;
  topic: string;
  covered: boolean;
  position: number;
};
