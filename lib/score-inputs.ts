// ═══════════════════════════════════════════════════════════════════════════
// M14-1 — THE EVENT-DERIVED SCORE INPUT BUILDER.
//
// EXECUTION_PLAN M14-1: *"Event-derived input builder reproducing the
// unified-inputs pattern exactly. **KEEP as a pattern.** Done when: one
// formula, all consumers, zero duplication."*
//
// Architecture S.2 names the thing being kept, and names it precisely:
//
//   > The unified-inputs *pattern* — `readScoreInputs` / `scoreInputsFromBlob`
//   > / `computeScoreFromInputs` — **KEEP as a pattern**. One formula, seven
//   > consumers, zero duplication. **Reproduce exactly with an event-derived
//   > input builder.**
//
// J.8 says the same thing from the other side: *"This is the best-engineered
// thing in the score layer and the target keeps it exactly — **only the input
// source changes from blob to events.**"*
//
//
// WHAT IS KEPT, AND WHAT CHANGES
//
// KEPT — the SHAPE. There is exactly one input type (`LedgerScoreInputs`),
// exactly one builder that produces it, and exactly one formula that consumes
// it (`lib/score-engine.ts`). No consumer computes a term. No consumer sees a
// row. A surface that wants a dimension asks the engine for a score.
//
// CHANGED — the SOURCE, and the number of builders. v1 had two builders
// because it had two sources: `localStorage` on the client and the synced
// `user_data.blob` on the server. **The target has ONE, and it is the server.**
// J.7: *"the strongest of all — the score is computed only on the server, from
// server-written events"*, and B.10: *"a client-computed score is a
// client-forgeable score."* So the client twin is not reproduced; it is
// deliberately absent, and its absence is stronger than its unification was.
//
//
// WHAT IT READS — the new substrate, and nothing else
//
//   `study_sessions`         (021, M9)  — verified sessions, and how a session
//                                         stopped
//   `academic_record`        (026, M12) — the coverage rung per concept
//   `assessment_attempts`    (024, M10) — graded, closed-form outcomes
//     joined to `unrevoked_assessment_questions` for `depth` and `concept_ref`
//   `patterns`               (007, M11) — mistake patterns faced
//   `mistake_resolutions`    (025, M11) — resolutions, WITH THEIR PROOF
//   `confirmed_occurrences`  (020, M11) — occurrences, with their evidence
//
// The `user_data.blob` is not read here, by anything, ever. Neither is
// `localStorage`. Neither is `ledger-focus-streak` — §9.3, and M14-2.
//
// No I/O, no clock, no randomness, no Supabase client, no `next/*`: the
// database verbs are injected as an interface of SIX READS AND NO WRITE, and
// every derivation below takes its rows as arguments (U.3). That is what lets
// M14's done-whens be proved with no live project in reach.
// ═══════════════════════════════════════════════════════════════════════════

import { readOccurrence, readPattern, type OccurrenceRecord, type PatternRecord } from "./diagnosis";
import type { CoverageState } from "./coverage-state";
import { COVERAGE_STATES } from "./coverage-state";
import { SESSION_STATES, CLOSE_REASONS, type SessionState, type CloseReason } from "./study-session";
import type { ISOTimestamp, UUID } from "./mistakes/types";

export type Row = Record<string, unknown>;

// ═══════════════════════════════════════════════════════════════════════════
// THE SOURCES, NAMED ONCE
//
// 022 §4's discipline, and M13's after it: a relation spelled in two files is a
// relation that drifts. Every caller of this module reaches its tables through
// these constants, and the tests assert the set.
// ═══════════════════════════════════════════════════════════════════════════

/** 021 (M9). Verified sessions, and the reason a session stopped. */
export const SCORE_SESSION_SOURCE = "study_sessions";
/** 026 (M12). The coverage rung per concept — the L2 cache of the record. */
export const SCORE_RECORD_SOURCE = "academic_record";
/** 024 (M10), joined to `unrevoked_assessment_questions` for depth. */
export const SCORE_ATTEMPT_SOURCE = "assessment_attempts";
/** 007 (M11). Patterns faced. Their `status` is NOT the resolution evidence. */
export const SCORE_PATTERN_SOURCE = "patterns";
/** 025 (M11). THE resolution evidence — see M14-3 and `lib/score-recovery.ts`. */
export const SCORE_RESOLUTION_SOURCE = "mistake_resolutions";
/** 020 (M11). Confirmed occurrences, each naming the evidence behind it. */
export const SCORE_OCCURRENCE_SOURCE = "confirmed_occurrences";

export const SCORE_SOURCES: readonly string[] = Object.freeze([
  SCORE_SESSION_SOURCE,
  SCORE_RECORD_SOURCE,
  SCORE_ATTEMPT_SOURCE,
  SCORE_PATTERN_SOURCE,
  SCORE_RESOLUTION_SOURCE,
  SCORE_OCCURRENCE_SOURCE,
]);

// ═══════════════════════════════════════════════════════════════════════════
// ROW → RECORD. Each reader REFUSES rather than repairs.
//
// `lib/occurrences.ts`'s rule, reused for the fourth time in this repository:
// *"A coerced draft is a claim wearing a fact's clothes."* A row that cannot be
// read is a row from somewhere the schema does not describe, and half of one in
// a score is worse than none of it.
// ═══════════════════════════════════════════════════════════════════════════

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

const int = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null;

const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);

const time = (v: unknown): number | null => {
  const s = str(v);
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
};

/** F.3's ladder, as the score reads it. */
export const DEPTHS = ["recall", "application", "transfer"] as const;
export type Depth = (typeof DEPTHS)[number];

const SESSION_STATE_SET = new Set<string>(SESSION_STATES);
const CLOSE_REASON_SET = new Set<string>(CLOSE_REASONS);
const COVERAGE_STATE_SET = new Set<string>(COVERAGE_STATES);
const DEPTH_SET = new Set<string>(DEPTHS);

/**
 * One graded, closed-form answer. **The only kind of thing Verified Performance
 * may be computed from** (J.2, P.3.a): the row exists because a deterministic
 * grader ran against a stored answer key before it was written.
 *
 * `attemptNo` is carried rather than filtered away because F.5 makes answers
 * append-only — a "correction" is a NEW row — so deduplicating to the latest
 * attempt per question is a decision the derivation makes in the open,
 * downstream, where a test can see it.
 */
export interface AssessedItem {
  attemptId: UUID;
  questionId: UUID;
  assessmentId: UUID;
  sessionId: UUID;
  conceptRef: string;
  subject: string | null;
  depth: Depth;
  isCorrect: boolean;
  attemptNo: number;
  gradedAtMs: number;
  /** F.2.b. A retest counts toward its pattern, not toward session coverage. */
  countsTowardCoverage: boolean;
}

export function readAssessedItem(row: Row): AssessedItem | null {
  const attemptId = str(row.attempt_id);
  const questionId = str(row.question_id);
  const assessmentId = str(row.assessment_id);
  const sessionId = str(row.session_id);
  const conceptRef = str(row.concept_ref);
  const depth = str(row.depth);
  const isCorrect = bool(row.is_correct);
  const attemptNo = int(row.attempt_no);
  const gradedAtMs = time(row.graded_at);

  if (!attemptId || !questionId || !assessmentId || !sessionId || !conceptRef) return null;
  if (!depth || !DEPTH_SET.has(depth)) return null;
  if (isCorrect === null || attemptNo === null || attemptNo < 1 || gradedAtMs === null) return null;

  return {
    attemptId,
    questionId,
    assessmentId,
    sessionId,
    conceptRef,
    subject: str(row.subject),
    depth: depth as Depth,
    isCorrect,
    attemptNo,
    gradedAtMs,
    countsTowardCoverage: bool(row.counts_toward_coverage) ?? true,
  };
}

/**
 * One `study_sessions` row, narrowed to the two facts the score is allowed to
 * read from it: whether it reached `VERIFIED`, and how it stopped.
 *
 * `lib/study-session.ts`'s SESSION_SCORE_CONTRACT is addressed to this module
 * by name and it is obeyed literally: nothing below counts an ABANDONED, a
 * DORMANT or a CLOSED_UNVERIFIED session as a deduction, a penalty, or a
 * completion-rate denominator.
 */
export interface SessionRecord {
  sessionId: UUID;
  state: SessionState;
  closeReason: CloseReason | null;
  openedAtMs: number;
  closedAtMs: number | null;
}

export function readSession(row: Row): SessionRecord | null {
  const sessionId = str(row.session_id);
  const state = str(row.state);
  const openedAtMs = time(row.opened_at);
  if (!sessionId || !state || !SESSION_STATE_SET.has(state) || openedAtMs === null) return null;

  const closeReason = str(row.close_reason);
  return {
    sessionId,
    state: state as SessionState,
    closeReason: closeReason && CLOSE_REASON_SET.has(closeReason) ? (closeReason as CloseReason) : null,
    openedAtMs,
    closedAtMs: time(row.closed_at),
  };
}

/**
 * One `academic_record` row (026, M12) — where one concept stands, and when it
 * was last studied.
 *
 * `coverage_state` is read as an opaque rung and compared through
 * `lib/coverage-state.ts`'s own vocabulary. This module never re-derives a rung
 * from sessions and answers: M12 owns that derivation, and a second copy of it
 * here is exactly the duplication M14-1 exists to refuse.
 */
export interface RecordedConcept {
  conceptRef: string;
  conceptId: UUID | null;
  subject: string | null;
  coverageState: CoverageState;
  lastStudiedAtMs: number | null;
  sessionCount: number;
  assessedCount: number;
  /** `evidence_refs.studied_in_session_id` — which session carried it there. */
  studiedInSessionId: UUID | null;
}

export function readRecordedConcept(row: Row): RecordedConcept | null {
  const conceptRef = str(row.concept_ref);
  const coverageState = str(row.coverage_state);
  if (!conceptRef || !coverageState || !COVERAGE_STATE_SET.has(coverageState)) return null;

  const refs = (row.evidence_refs ?? {}) as Row;
  return {
    conceptRef,
    conceptId: str(row.concept_id),
    subject: str(row.subject),
    coverageState: coverageState as CoverageState,
    lastStudiedAtMs: time(row.last_studied_at),
    sessionCount: int(row.session_count) ?? 0,
    assessedCount: int(row.assessed_count) ?? 0,
    studiedInSessionId: typeof refs === "object" && refs !== null ? str(refs.studied_in_session_id) : null,
  };
}

/**
 * One `mistake_resolutions` row (025).
 *
 * **THIS, AND NOT `patterns.status`, IS WHAT RECOVERY IS PAID FROM** — see
 * M14-3 and `lib/score-recovery.ts` for the whole argument. The reader enforces
 * in TypeScript the three things 025's own CHECK constraints enforce in SQL, so
 * a row that reached the table another way still cannot be counted:
 *
 *   · `set_by = 'system'`                     — a student did not set it
 *   · `array_length(proof_attempt_ids) >= 2`  — §4.8's ≥2 correct answers
 *   · `cooling_days >= 7`                     — G.8's cooling period
 */
export interface ResolutionRecord {
  id: UUID;
  patternId: UUID;
  resolvedAtMs: number;
  proofAttemptIds: readonly UUID[];
  coolingDays: number;
  setBy: "system";
}

export type ResolutionRefusal =
  | "no-id"
  | "no-pattern"
  | "unreadable-timestamp"
  | "not-system-set"
  | "insufficient-proof"
  | "cooling-period-not-elapsed";

/** §4.8's `RESOLUTION_MIN_CORRECT`, and G.8's `RESOLUTION_COOLING_DAYS`, as the
 *  score's own admission gate. They are re-stated rather than imported so this
 *  module has no runtime dependency on the mistake engine; a test asserts the
 *  two pairs of numbers are equal, which is a cheaper coupling than an import. */
export const SCORE_RESOLUTION_MIN_PROOF = 2;
export const SCORE_RESOLUTION_MIN_COOLING_DAYS = 7;

export function readResolution(
  row: Row,
): { ok: true; record: ResolutionRecord } | { ok: false; refusal: ResolutionRefusal } {
  const id = str(row.id);
  if (!id) return { ok: false, refusal: "no-id" };

  const patternId = str(row.pattern_id);
  if (!patternId) return { ok: false, refusal: "no-pattern" };

  const resolvedAtMs = time(row.resolved_at);
  if (resolvedAtMs === null) return { ok: false, refusal: "unreadable-timestamp" };

  if (str(row.set_by) !== "system") return { ok: false, refusal: "not-system-set" };

  const proof = Array.isArray(row.proof_attempt_ids)
    ? (row.proof_attempt_ids as unknown[]).map(str).filter((v): v is string => v !== null)
    : [];
  if (proof.length < SCORE_RESOLUTION_MIN_PROOF) return { ok: false, refusal: "insufficient-proof" };

  const coolingDays = typeof row.cooling_days === "number" ? row.cooling_days : Number(row.cooling_days);
  if (!Number.isFinite(coolingDays) || coolingDays < SCORE_RESOLUTION_MIN_COOLING_DAYS) {
    return { ok: false, refusal: "cooling-period-not-elapsed" };
  }

  return {
    ok: true,
    record: { id, patternId, resolvedAtMs, proofAttemptIds: Object.freeze(proof), coolingDays, setBy: "system" },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE ONE INPUT TYPE
//
// Everything the formula is allowed to see. It is a bag of FACTS, and there is
// deliberately no field on it that a client writes and no field that a
// presentation layer produces (§9.4: *"Presentation state is never score
// evidence."*).
//
// There is no `streak` field. There is no `activeStreak` field. There is no
// field from which a consecutive-day count could be reconstructed, because
// nothing here carries a per-day index — §9.3, and M14-2's done-when.
// ═══════════════════════════════════════════════════════════════════════════

export interface LedgerScoreInputs {
  studentId: UUID;
  /** `StudentProfile.subjects` (012). The declared syllabus, per J.2. */
  declaredSubjects: readonly string[];
  sessions: readonly SessionRecord[];
  concepts: readonly RecordedConcept[];
  items: readonly AssessedItem[];
  patterns: readonly PatternRecord[];
  occurrences: readonly OccurrenceRecord[];
  resolutions: readonly ResolutionRecord[];
  /** The instant the score is AS OF. Supplied, never read from a clock (U.3). */
  asOfMs: number;
}

/** An input set with nothing in it. A brand-new account, exactly. */
export const emptyScoreInputs = (studentId: UUID, asOfMs: number): LedgerScoreInputs => ({
  studentId,
  declaredSubjects: [],
  sessions: [],
  concepts: [],
  items: [],
  patterns: [],
  occurrences: [],
  resolutions: [],
  asOfMs,
});

/**
 * How many rows of each kind were read, and how many were refused.
 *
 * J.5 makes confidence *"computed from evidence volume, recency, and breadth"*
 * and stored on every snapshot; this is the volume half, carried as data rather
 * than recounted by the engine. The refusal counts are here for the same reason
 * M13's tallies carry `occurrenceIds`: a figure that cannot say what it is a
 * sum of is a claim.
 */
export interface InputCounts {
  sessions: number;
  concepts: number;
  items: number;
  patterns: number;
  occurrences: number;
  resolutions: number;
  refused: Readonly<Record<string, number>>;
}

export interface BuiltInputs {
  inputs: LedgerScoreInputs;
  counts: InputCounts;
}

/**
 * THE BUILDER. Rows in, one `LedgerScoreInputs` out.
 *
 * Pure: it takes the rows, the declared subjects and the instant as arguments,
 * and it is the single place in the product where a database row becomes a
 * scoring fact. Every consumer — the cron, the parent surface, a route, a test
 * — calls this and then calls the one formula. Neither is reachable another
 * way, which is the whole of *"one formula, all consumers, zero duplication."*
 */
export function buildScoreInputs(args: {
  studentId: UUID;
  asOfMs: number;
  declaredSubjects?: readonly string[];
  sessionRows?: readonly Row[];
  recordRows?: readonly Row[];
  attemptRows?: readonly Row[];
  patternRows?: readonly Row[];
  occurrenceRows?: readonly Row[];
  resolutionRows?: readonly Row[];
}): BuiltInputs {
  const refused: Record<string, number> = {};
  const refuse = (key: string) => {
    refused[key] = (refused[key] ?? 0) + 1;
  };

  const sessions: SessionRecord[] = [];
  for (const row of args.sessionRows ?? []) {
    const r = readSession(row);
    if (r) sessions.push(r);
    else refuse("session");
  }

  const concepts: RecordedConcept[] = [];
  for (const row of args.recordRows ?? []) {
    const r = readRecordedConcept(row);
    if (r) concepts.push(r);
    else refuse("concept");
  }

  const items: AssessedItem[] = [];
  for (const row of args.attemptRows ?? []) {
    const r = readAssessedItem(row);
    if (r) items.push(r);
    else refuse("item");
  }

  const patterns: PatternRecord[] = [];
  for (const row of args.patternRows ?? []) {
    const r = readPattern(row);
    if (r) patterns.push(r);
    else refuse("pattern");
  }

  const occurrences: OccurrenceRecord[] = [];
  for (const row of args.occurrenceRows ?? []) {
    const r = readOccurrence(row);
    if (r.ok) occurrences.push(r.record);
    else refuse(`occurrence:${r.refusal}`);
  }

  const resolutions: ResolutionRecord[] = [];
  for (const row of args.resolutionRows ?? []) {
    const r = readResolution(row);
    if (r.ok) resolutions.push(r.record);
    else refuse(`resolution:${r.refusal}`);
  }

  const declaredSubjects = Object.freeze(
    [...new Set((args.declaredSubjects ?? []).map(s => s.trim()).filter(Boolean))],
  );

  return {
    inputs: {
      studentId: args.studentId,
      declaredSubjects,
      sessions,
      concepts,
      items,
      patterns,
      occurrences,
      resolutions,
      asOfMs: args.asOfMs,
    },
    counts: {
      sessions: sessions.length,
      concepts: concepts.length,
      items: items.length,
      patterns: patterns.length,
      occurrences: occurrences.length,
      resolutions: resolutions.length,
      refused: Object.freeze(refused),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE ACCESS LAYER — verbs, never a client (U.3)
//
// SIX READS AND NO WRITE. The score observes the record; it never changes it,
// and a later edit that wanted it to would have to widen this interface in a
// diff — the same guarantee `DiagnosisDb` and `RecordDb` already provide.
// ═══════════════════════════════════════════════════════════════════════════

export interface DbError {
  code?: string | null;
  message: string;
}

export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
}

export interface ScoreInputsDb {
  /** `study_sessions` for this student. */
  listSessions(studentId: UUID): Promise<DbResult<Row[]>>;
  /** `academic_record` for this student. */
  listRecordedConcepts(studentId: UUID): Promise<DbResult<Row[]>>;
  /** `assessment_attempts` joined to `unrevoked_assessment_questions`, so each
   *  row carries `depth`, `concept_ref`, `subject` and `counts_toward_coverage`
   *  alongside the grade. The join lives in the adapter; the derivation never
   *  sees a client. */
  listAssessedItems(studentId: UUID): Promise<DbResult<Row[]>>;
  /** `patterns`. Their `status` is read for "faced", NEVER for "resolved". */
  listPatterns(studentId: UUID): Promise<DbResult<Row[]>>;
  /** `confirmed_occurrences`. Unconfirmed rows are not in the record. */
  listConfirmedOccurrences(studentId: UUID): Promise<DbResult<Row[]>>;
  /** `mistake_resolutions` — the proof Recovery is actually paid from. */
  listResolutions(studentId: UUID): Promise<DbResult<Row[]>>;
}

export type ScoreInputsResult =
  | { ok: true; built: BuiltInputs }
  | { ok: false; error: DbError };

/**
 * Read the record and build the inputs. Six queries, no writes.
 *
 * `declaredSubjects` is a PARAMETER rather than a seventh verb: the caller
 * already holds the student profile (M5's `getStudentContext`) on every path
 * that computes a score, and a second read of it here would be the duplication
 * this milestone is about.
 */
export async function loadScoreInputs(
  db: ScoreInputsDb,
  studentId: UUID,
  opts: { asOfMs: number; declaredSubjects?: readonly string[] },
): Promise<ScoreInputsResult> {
  const [sessions, records, items, patterns, occurrences, resolutions] = await Promise.all([
    db.listSessions(studentId),
    db.listRecordedConcepts(studentId),
    db.listAssessedItems(studentId),
    db.listPatterns(studentId),
    db.listConfirmedOccurrences(studentId),
    db.listResolutions(studentId),
  ]);

  for (const r of [sessions, records, items, patterns, occurrences, resolutions]) {
    if (r.error) return { ok: false, error: r.error };
  }

  return {
    ok: true,
    built: buildScoreInputs({
      studentId,
      asOfMs: opts.asOfMs,
      declaredSubjects: opts.declaredSubjects,
      sessionRows: sessions.data ?? [],
      recordRows: records.data ?? [],
      attemptRows: items.data ?? [],
      patternRows: patterns.data ?? [],
      occurrenceRows: occurrences.data ?? [],
      resolutionRows: resolutions.data ?? [],
    }),
  };
}

export type { OccurrenceRecord, PatternRecord, ISOTimestamp, UUID, CoverageState, SessionState, CloseReason };
