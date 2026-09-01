// ═══════════════════════════════════════════════════════════════════════════
// lib/parent-space.ts   ·   M17
//
// Types and pure helpers for the parent space (architecture Part N,
// PRODUCT_DECISIONS §9.2 — Option B, structural privacy). The actual data
// crossing the parent boundary is assembled by `public.get_parent_projection()`
// (supabase/migrations/029_parent_space.sql) — this file never queries the
// database itself. It exists so:
//
//   1. token hashing (invitation creation/acceptance) has ONE implementation,
//      shared by every API route that touches it;
//   2. the shape of what a parent CAN receive is declared once, in TypeScript,
//      so a test can assert — by type, not by hope — that the forbidden
//      fields (topic names, miss counts, wrong answers, evidence) have no
//      place to be assigned to even if a future edit tried.
//
// STRUCTURAL NOTE (V.8.3 — "not filtered, absent"): `ParentProjection` below
// is the complete list of what a parent can ever see. There is no
// `weakTopics`, no `occurrences`, no `label`, no `student_answer` field on
// this type — not commented out, not optional-and-unused. Adding one would
// require editing this file in a way any reviewer or grep can see.
// ═══════════════════════════════════════════════════════════════════════════

import { createHash, randomBytes } from "node:crypto";

// ── Share categories — exactly N.4's seven, no eighth ──────────────────────
export const SHARE_CATEGORIES = [
  "scoreTrajectory",
  "dimensionBreakdown",
  "subjectState",
  "progressFixing",
  "consistency",
  "upcomingExams",
  "assessmentActivity",
] as const;
export type ShareCategory = (typeof SHARE_CATEGORIES)[number];

/** The column each category maps to in `parent_share_policies`. */
export const SHARE_CATEGORY_COLUMNS: Record<ShareCategory, string> = {
  scoreTrajectory: "score_trajectory",
  dimensionBreakdown: "dimension_breakdown",
  subjectState: "subject_state",
  progressFixing: "progress_fixing",
  consistency: "consistency",
  upcomingExams: "upcoming_exams",
  assessmentActivity: "assessment_activity",
};

/** Human copy for the settings UI. Deliberately describes what IS shared —
 *  never implies a forbidden field ("weak topics", "marks lost") is nearby. */
export const SHARE_CATEGORY_LABELS: Record<ShareCategory, { title: string; body: string }> = {
  scoreTrajectory: {
    title: "Score & trajectory",
    body: "The Ledger Score total and its direction over time. No breakdown.",
  },
  dimensionBreakdown: {
    title: "Dimension breakdown",
    body: "The four pillars behind the score — past-paper accuracy, syllabus coverage, mistake control, consistency.",
  },
  subjectState: {
    title: "Subject-level state",
    body: "Per subject: how much is proven, studied or not yet touched. Never which concept.",
  },
  progressFixing: {
    title: "Progress on what is being fixed",
    body: "How many things are currently being worked on, and how many closed this month. Never which ones.",
  },
  consistency: {
    title: "Consistency of verification",
    body: "Sessions verified in the last 30 days. Not a streak — missing a day changes nothing here.",
  },
  upcomingExams: {
    title: "Upcoming exams",
    body: "Exam name, subject and date. Logistics only.",
  },
  assessmentActivity: {
    title: "Assessment activity",
    body: "How many practice assessments were completed. Never a single question or answer.",
  },
};

/** Every value defaults FALSE — V.8.1/V.8.2. There is no constructor for this
 *  type that starts with anything ON. */
export function allCategoriesOff(): Record<ShareCategory, boolean> {
  return {
    scoreTrajectory: false,
    dimensionBreakdown: false,
    subjectState: false,
    progressFixing: false,
    consistency: false,
    upcomingExams: false,
    assessmentActivity: false,
  };
}

// ── The complete shape of a parent projection. Nothing else is ever sent. ──
export interface ParentSystemInfo {
  connectionActive: boolean;
  connectionSince: string;
  policyVersion: number;
  policyUpdatedAt: string | null;
}

export interface ParentScorePoint {
  captured_on: string;
  total: number;
  pqa: number;
  syllabus: number;
  mistakes: number;
  consistency: number;
  confidence: number | null;
}

export interface ParentSubjectRow {
  subject: string;
  proven_count: number;
  studied_count: number;
  untouched_count: number;
}

export interface ParentProgress {
  being_worked_count: number;
  resolved_this_period_count: number;
}

export interface ParentConsistency {
  verified_sessions_count: number;
}

export interface ParentExam {
  name: string;
  subject: string;
  date: string;
  board: string;
}

export interface ParentAssessmentActivity {
  assessments_completed_count: number;
}

/**
 * The complete, closed set of what a parent read can ever return. Every
 * field is OPTIONAL, and absence means the category is off — never present
 * with a null/zero standing in for "you can't see this" (that would be a
 * runtime filter pretending at the data layer; N.5 requires the field to
 * really not be there).
 */
export interface ParentProjection {
  system: ParentSystemInfo;
  scoreTrajectory?: ParentScorePoint[];
  dimensionBreakdown?: ParentScorePoint;
  subjectState?: ParentSubjectRow[];
  progressFixing?: ParentProgress;
  consistency?: ParentConsistency;
  upcomingExams?: ParentExam[];
  assessmentActivity?: ParentAssessmentActivity;
}

// ── Invitation tokens ───────────────────────────────────────────────────────
// crypto.randomBytes, not Math.random — this token is a bearer secret for a
// student's academic data, exactly the discipline the retired SharePanel
// applied to `parentCode` (components/settings/share-panel.tsx, pre-M17).
export function generateInvitationToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const INVITATION_TTL_MS = 1000 * 60 * 60 * 72; // 72 hours — "short expiry" (N.3)

export function invitationExpiry(now = new Date()): Date {
  return new Date(now.getTime() + INVITATION_TTL_MS);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
