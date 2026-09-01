// ═══════════════════════════════════════════════════════════════════════════
// M11-1 — THE SERVER DATA-ACCESS LAYER OVER `007_mistakes.sql`.
//
// EXECUTION_PLAN M11-1: *"Server data-access layer over `007_mistakes.sql`.
// **CREATE**. Done when: `lib/mistakes/engine.ts` is called by production; T12
// retired for `lib/mistakes/*`."*
//
// G.1's verdict, in full, is what shapes this file:
//
//   > *"**CURRENT FACT: zero production importers.** … What is missing is a
//   > server data-access layer and a capture path — **not domain logic.**"*
//   > *"**Overall verdict: KEEP / ADAPT-additively. Do not rebuild.**"*
//
// So this module contains NO domain logic. It does not decide which leaf an
// occurrence joins (`mergeOccurrence`), it does not compute severity
// (`computeSeverity`, through `lib/mistake-severity.ts`), it does not decide a
// transition (`applyTransition`) and it does not decide resolution
// (`canResolve`, through `lib/mistake-retest.ts`). It reads rows, hands them to
// the engine, and writes what the engine returned.
//
// The split is the one `lib/ingest/supabase-store.ts` made over
// `lib/ingest/runner.ts` in M8-3, for the reason stated there: *"the column
// mapping is the part that can be silently **wrong**, so it is the part a test
// must reach with no database in the room."* The client is injected as verbs
// (`MistakeDnaDb`), never as a `SupabaseClient`.
//
//
// THE TWO REFUSALS THIS FILE IS ACCOUNTABLE FOR
//
// V.4.8 — *"A cognitive `misconception` on Torque creates a **separate leaf** —
// never merged across error class."* The engine's merge key already carries
// `errorClass` (`engine.ts:240-247`, and `types.ts:59-63`: *"a misconception
// about signs and a careless sign slip look identical on paper and require
// opposite fixes"*). The failure mode this file could still introduce is
// handing the engine a CANDIDATE LIST that has already lost the distinction —
// a `SELECT ... WHERE concept_id = $1` that the engine then trusts. So the
// candidates are filtered on class here as well, and `assertNoClassMixing()`
// re-checks the engine's answer against the occurrence before anything is
// written. Three chances to notice, none of them a comment.
//
// V.4.9 — *"An occurrence with both a cognitive and an execution error returns
// `ambiguous-error-classification` and is **not silently assigned** to either."*
// `mergeKeyFor` returns exactly that failure, and this file's response to it is
// to WRITE NOTHING and report `unclassified`. `007` permits it: `pattern_id` is
// nullable and *"an occurrence may exist before merge assigns it"*. An
// unclassified occurrence is therefore a legal, queryable, permanent state —
// the same posture as M6's `unresolved` concept and M9's unverified
// declaration. It is never a guess and never a dropped row.
//
// No Supabase client, no clock, no `next/*`, no randomness. Ids and timestamps
// are injected (U.3).
// ═══════════════════════════════════════════════════════════════════════════

import {
  mergeKeyFor,
  mergeOccurrence,
  type MergeKey,
  type MergeOutcome,
  type Result,
} from "./engine";
import type {
  ErrorClass,
  ErrorType,
  ISOTimestamp,
  Occurrence,
  Pattern,
  PatternTier,
  UUID,
} from "./types";
import {
  deriveSeverity,
  RECURRENCE_WINDOW_DAYS,
  SEVERITY_FACTORS_VERSION,
  type SeverityDerivationInput,
} from "../mistake-severity";
import { scheduleFirstRetest } from "../mistake-retest";
import type { RetestSchedule } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// M11-3's VOCABULARY, NAMED WHERE IT IS READ
// ═══════════════════════════════════════════════════════════════════════════

/** `025` §1's addition to `007`'s `source` CHECK. */
export const IN_SESSION_ASSESSMENT_SOURCE = "in-session-assessment" as const;
/** `025` §1's addition to `007`'s `evidence.type` CHECK — G.3's *"the evidence
 *  is the assessment attempt itself"*. */
export const ASSESSMENT_ATTEMPT_EVIDENCE_TYPE = "assessment_attempt" as const;

/** True for an occurrence that was made inside this product's own assessment,
 *  under either the value M10 shipped (`origin = 'assessment'`, `source =
 *  'self-test'`) or `025`'s precise one. Both are read; neither is rewritten. */
export const isAssessmentOriginated = (row: Row): boolean =>
  row.origin === "assessment" || row.source === IN_SESSION_ASSESSMENT_SOURCE;

// ═══════════════════════════════════════════════════════════════════════════
// INJECTION
// ═══════════════════════════════════════════════════════════════════════════

export type Row = Record<string, unknown>;

export interface DbError {
  code?: string | null;
  message: string;
}

export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
}

export interface PatternKey {
  studentId: UUID;
  tier: PatternTier;
  subject: string | null;
  errorClass: ErrorClass;
  errorType: ErrorType;
}

/**
 * The verbs Mistake DNA needs. Deliberately narrow, and deliberately without a
 * general `update` — `lib/occurrences.ts` states the reason and it holds here:
 * *"A general update verb in this interface is an invitation for a later edit to
 * write any column."* `updatePatternDerived` may write only the derived columns
 * a merge produces; a STATUS change goes through `applyTransition` and its own
 * verb, so no caller can move a pattern to `resolved` through this interface by
 * writing a column.
 */
export interface MistakeDnaDb {
  /** Leaves for one student and one concept. Candidates for `mergeOccurrence`. */
  listLeafCandidates(studentId: UUID, conceptId: UUID): Promise<DbResult<Row[]>>;
  /** The one pattern for a parent key, or null. `007`'s partial unique indexes
   *  are what make this single-valued. */
  findPattern(key: PatternKey): Promise<DbResult<Row | null>>;
  insertPattern(row: Row): Promise<DbResult<Row>>;
  /** Derived columns only: severity, severity_version, severity_factors,
   *  recurrence_count, first_seen_at, last_seen_at. NEVER `status`. */
  updatePatternDerived(patternId: UUID, patch: Row): Promise<DbResult<Row>>;
  /** `007`'s composite FK refuses a non-leaf target; this verb does not
   *  re-check it, it relies on it. */
  linkOccurrence(occurrenceId: UUID, patternId: UUID): Promise<DbResult<Row[]>>;

  /** `Σ marks_lost` on one leaf. */
  leafMarksLost(patternId: UUID): Promise<DbResult<number>>;
  /** `Σ marks_lost` across the student's OPEN leaves. */
  openLeavesMarksLost(studentId: UUID): Promise<DbResult<number>>;
  /** Occurrences on this leaf since an ISO instant. */
  countOccurrencesSince(patternId: UUID, sinceIso: ISOTimestamp): Promise<DbResult<number>>;
  /** `concepts.exam_weight` for the concept, and the max across its subject. */
  conceptExamWeights(conceptId: UUID): Promise<DbResult<{ concept: number; maxInSubject: number }>>;

  upsertRetestSchedule(row: Row): Promise<DbResult<Row>>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROW → DOMAIN
// ═══════════════════════════════════════════════════════════════════════════

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : Number(v ?? 0));

/**
 * `occurrences` row → the engine's `Occurrence`.
 *
 * It returns `null` rather than a partially-populated object when a NOT NULL
 * column is missing: a row that cannot be mapped is a row the caller read from
 * somewhere the schema does not describe, and merging half of one is worse than
 * merging none.
 */
export function rowToOccurrence(row: Row): Occurrence | null {
  const id = str(row.id);
  const studentId = str(row.student_id);
  const evidenceId = str(row.evidence_id);
  const conceptId = str(row.concept_id);
  if (!id || !studentId || !evidenceId || !conceptId) return null;

  const cognitive = (str(row.cognitive_error) ?? null) as Occurrence["cognitiveError"];
  const execution = (str(row.execution_error) ?? null) as Occurrence["executionError"];

  return {
    id,
    studentId,
    evidenceId,
    conceptId,
    source: (str(row.source) ?? "self-test") as Occurrence["source"],
    subject: str(row.subject) ?? "",
    chapter: str(row.chapter) ?? "",
    topic: str(row.topic) ?? "",
    questionRef: str(row.question_ref) ?? "",
    marksLost: num(row.marks_lost),
    marksAvailable: num(row.marks_available),
    confidenceBefore: (row.confidence_before ?? null) as Occurrence["confidenceBefore"],
    studentAnswer: (row.student_answer ?? { kind: "text", text: "" }) as Occurrence["studentAnswer"],
    expectedAnswer: str(row.expected_answer),
    markerNote: str(row.marker_note),
    patternId: str(row.pattern_id),
    supersedes: str(row.supersedes),
    createdAt: str(row.created_at) ?? "",
    cognitiveError: cognitive,
    executionError: execution,
  } as Occurrence;
}

/** `patterns` row → the engine's `Pattern`. */
export function rowToPattern(row: Row): Pattern | null {
  const id = str(row.id);
  const studentId = str(row.student_id);
  const tier = str(row.tier) as PatternTier | null;
  if (!id || !studentId || !tier) return null;

  return {
    id,
    studentId,
    tier,
    conceptId: str(row.concept_id),
    parentPatternId: str(row.parent_pattern_id),
    subject: str(row.subject),
    errorClass: str(row.error_class) as ErrorClass,
    errorType: str(row.error_type) as ErrorType,
    label: str(row.label) ?? "",
    occurrenceIds: Array.isArray(row.occurrence_ids) ? (row.occurrence_ids as UUID[]) : [],
    recurrenceCount: num(row.recurrence_count),
    firstSeenAt: str(row.first_seen_at),
    lastSeenAt: str(row.last_seen_at),
    severity: row.severity === null || row.severity === undefined ? null : num(row.severity),
    systemConfidence:
      row.system_confidence === null || row.system_confidence === undefined ? null : num(row.system_confidence),
    status: (str(row.status) ?? "open") as Pattern["status"],
    remediationPlan: str(row.remediation_plan),
    history: Array.isArray(row.history) ? (row.history as Pattern["history"]) : [],
    resolvedAt: str(row.resolved_at),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// V.4.9 — CLASSIFICATION, AND THE LEGAL STATE OF NOT HAVING ONE
// ═══════════════════════════════════════════════════════════════════════════

export type ClassificationState =
  | { kind: "classified"; errorClass: ErrorClass; errorType: ErrorType }
  /** Both arms set. The merge key is UNDEFINED, not defaulted. */
  | { kind: "ambiguous"; detail: string }
  /** Neither arm set. `007`'s `occurrences_has_error` should have refused the
   *  row; if one is read anyway, it is reported rather than repaired. */
  | { kind: "unclassified"; detail: string };

/**
 * The classification of one occurrence, decided by the ENGINE.
 *
 * This function is four lines of translation over `mergeKeyFor()`. It exists so
 * that "unclassified" has a NAME in this layer — the state a row is left in when
 * the product declines to guess, which V.4.9 requires be representable rather
 * than avoided.
 */
export function classifyOccurrence(occurrence: Occurrence): ClassificationState {
  const key: Result<MergeKey> = mergeKeyFor(occurrence);
  if (key.ok) {
    return { kind: "classified", errorClass: key.value.errorClass, errorType: key.value.errorType };
  }
  if (key.error.failure === "ambiguous-error-classification") {
    return { kind: "ambiguous", detail: key.error.detail };
  }
  return { kind: "unclassified", detail: key.error.detail };
}

/**
 * V.4.8, checked against the written row rather than assumed from the query.
 *
 * A leaf whose class differs from the occurrence's is not a merge to fix up —
 * it is a leaf the candidate query should never have returned, and joining it
 * would fuse *"you do not understand signs"* with *"you slipped on a sign"* into
 * one pattern with one remediation, which is the exact conflation §4.7 forbids.
 */
export function assertNoClassMixing(
  occurrenceClass: ErrorClass,
  occurrenceType: ErrorType,
  leaf: Pattern,
): { ok: true } | { ok: false; detail: string } {
  if (leaf.errorClass !== occurrenceClass) {
    return {
      ok: false,
      detail: `leaf ${leaf.id} is '${leaf.errorClass}' and the occurrence is '${occurrenceClass}'; patterns are never mixed across this boundary (§4.7, V.4.8)`,
    };
  }
  if (leaf.errorType !== occurrenceType) {
    return {
      ok: false,
      detail: `leaf ${leaf.id} is '${leaf.errorType}' and the occurrence is '${occurrenceType}'`,
    };
  }
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// LABELS
// ═══════════════════════════════════════════════════════════════════════════

const HUMAN: Readonly<Record<string, string>> = Object.freeze({
  "not-known": "Not known",
  misconception: "Misconception",
  "wrong-method": "Wrong method",
  "incomplete-understanding": "Incomplete understanding",
  "misapplied-rule": "Misapplied rule",
  "cannot-recall-formula": "Cannot recall the formula",
  "misread-question": "Misread question",
  "arithmetic-slip": "Arithmetic slip",
  "sign-error": "Sign error",
  "unit-error": "Unit error",
  "ran-out-of-time": "Ran out of time",
  "incomplete-answer": "Incomplete answer",
  "missed-working": "Missed working",
  transcription: "Transcription",
  presentation: "Presentation",
});

/** §4.4's *"Human sentence"*. Built from facts already on the row — the error
 *  type and the concept path — and never from a model. A label is presentation,
 *  and a generated one would be a sentence about the student that nothing in the
 *  record supports. */
export function labelFor(tier: PatternTier, errorType: ErrorType, subject: string | null, topic: string | null): string {
  const head = HUMAN[errorType] ?? errorType;
  if (tier === "global") return head;
  if (tier === "subject") return `${head} in ${subject ?? "this subject"}`;
  return topic ? `${head}: ${topic}` : head;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE INGEST — one confirmed occurrence becomes Mistake DNA
// ═══════════════════════════════════════════════════════════════════════════

export type DnaRefusal =
  | "unreadable-occurrence"
  | "ambiguous-classification"
  | "unclassified"
  | "class-mixing-refused"
  | "duplicate-leaf-patterns"
  | "read-failed"
  | "write-failed"
  | "severity-refused";

export interface DnaOutcome {
  /** `new-leaf` or `joined`, from the ENGINE. Never decided here. */
  merge: MergeOutcome["kind"];
  patternId: UUID;
  globalPatternId: UUID;
  subjectPatternId: UUID;
  severity: number;
  severityVersion: string;
  /** Null when the leaf is not in a retestable state. */
  retest: RetestSchedule | null;
}

export type DnaResult =
  | { ok: true; value: DnaOutcome }
  | { ok: false; refusal: DnaRefusal; detail: string };

const no = (refusal: DnaRefusal, detail: string): DnaResult => ({ ok: false, refusal, detail });

export interface DnaIngestInput {
  /** A CONFIRMED occurrence row. M8-5's gate decides what is confirmed; this
   *  module does not re-litigate it and must not be handed a draft. */
  occurrence: Row;
  /** Injected ids for the rows this may create, so the module stays free of
   *  randomness (U.3). Unused ids are simply not written. */
  ids: { leaf: UUID; subject: UUID; global: UUID };
  at: ISOTimestamp;
  /** G.6's `examProximity` input. `null` when no goal exam is known — which is
   *  V1's only case, because nothing in the schema stores an exam DATE. */
  daysToGoalExam?: number | null;
}

/**
 * **THE PRODUCTION PATH.** One confirmed occurrence in, Mistake DNA out.
 *
 * Order: classify (engine) → merge (engine) → parents → leaf → severity
 * (engine, via `lib/mistake-severity.ts`) → link → schedule the retest.
 *
 * Every failure is a typed refusal and NOTHING PARTIAL IS LEFT CLAIMING TO BE
 * COMPLETE: a refusal before the link means the occurrence keeps
 * `pattern_id = NULL`, which `007` permits and which is exactly the honest
 * state — the fact happened and no inference has been drawn from it yet.
 *
 * It never throws. Its caller is on the critical path of a student answering a
 * question (`app/api/assessment/answer/route.ts`), and F.6's ordering guarantee
 * is about the OCCURRENCE, which is already written before this runs. A pattern
 * that cannot be built must not cost the student their answer.
 */
export async function ingestOccurrenceIntoDna(db: MistakeDnaDb, input: DnaIngestInput): Promise<DnaResult> {
  const occurrence = rowToOccurrence(input.occurrence);
  if (!occurrence) return no("unreadable-occurrence", "the row is missing a column 007 declares NOT NULL");

  // ── 1 · CLASSIFY. V.4.9 lives here ───────────────────────────────────────
  const classification = classifyOccurrence(occurrence);
  if (classification.kind === "ambiguous") {
    // NOT SILENTLY ASSIGNED TO EITHER. The occurrence stands, unmerged, with
    // `pattern_id = NULL` — a legal state, not a lost row.
    return no("ambiguous-classification", classification.detail);
  }
  if (classification.kind === "unclassified") {
    return no("unclassified", classification.detail);
  }
  const { errorClass, errorType } = classification;

  // ── 2 · MERGE. The engine decides; the candidates are pre-filtered on class
  //        so a widened query cannot quietly hand it the wrong ones (V.4.8) ──
  const candidatesRead = await db.listLeafCandidates(occurrence.studentId, occurrence.conceptId);
  if (candidatesRead.error) return no("read-failed", candidatesRead.error.message);

  const candidates: Pattern[] = (candidatesRead.data ?? [])
    .map(rowToPattern)
    .filter((p): p is Pattern => p !== null)
    .filter((p) => p.errorClass === errorClass && p.errorType === errorType);

  const merged = mergeOccurrence(occurrence, candidates);
  if (!merged.ok) {
    if (merged.error.failure === "duplicate-leaf-patterns") {
      return no("duplicate-leaf-patterns", merged.error.detail);
    }
    if (merged.error.failure === "ambiguous-error-classification") {
      return no("ambiguous-classification", merged.error.detail);
    }
    return no("unclassified", merged.error.detail);
  }

  // ── 3 · PARENTS, deterministic and idempotent (§4.7.1) ───────────────────
  const globalRow = await ensurePattern(db, {
    key: { studentId: occurrence.studentId, tier: "global", subject: null, errorClass, errorType },
    ids: input.ids,
    at: input.at,
    topic: occurrence.topic,
    parentId: null,
  });
  if (!globalRow.ok) return globalRow.result;

  const subjectRow = await ensurePattern(db, {
    key: { studentId: occurrence.studentId, tier: "subject", subject: occurrence.subject, errorClass, errorType },
    ids: input.ids,
    at: input.at,
    topic: occurrence.topic,
    parentId: str(globalRow.row.id),
  });
  if (!subjectRow.ok) return subjectRow.result;

  // ── 4 · THE LEAF ─────────────────────────────────────────────────────────
  let leaf: Pattern | null = null;

  // Hoisted out of `merged` before the discriminant is read. TypeScript discards
  // the narrowing of a nested property path (`merged.value.kind`) inside a
  // closure, so `candidates.find(c => … merged.value.patternId)` would not
  // compile against the `new-leaf` arm. A local const narrows and STAYS narrowed.
  const outcome: MergeOutcome = merged.value;

  if (outcome.kind === "joined") {
    const existing = candidates.find((c) => c.id === outcome.patternId) ?? null;
    if (!existing) return no("read-failed", "the engine joined a leaf that is not in the candidate list");
    const check = assertNoClassMixing(errorClass, errorType, existing);
    if (!check.ok) return no("class-mixing-refused", check.detail);
    leaf = existing;
  } else {
    const created = await db.insertPattern({
      id: input.ids.leaf,
      student_id: occurrence.studentId,
      tier: "concept",
      concept_id: occurrence.conceptId,
      parent_pattern_id: str(subjectRow.row.id),
      subject: occurrence.subject,
      error_class: errorClass,
      error_type: errorType,
      label: labelFor("concept", errorType, occurrence.subject, occurrence.topic),
      recurrence_count: 0,
      first_seen_at: occurrence.createdAt || input.at,
      last_seen_at: occurrence.createdAt || input.at,
      // `patterns_tier_shape` requires a NON-NULL severity on a leaf, so a
      // placeholder 0 is written and immediately replaced by the derivation in
      // step 5. It is 0 and not a guess: an unweighted new leaf ranks last,
      // which is the safe direction if step 5 ever fails.
      severity: 0,
      severity_version: SEVERITY_FACTORS_VERSION,
      // §4.7: exact-key matching is deterministic, so confidence is 1.
      system_confidence: 1,
      status: "open",
      history: [],
    });
    if (created.error || !created.data) return no("write-failed", created.error?.message ?? "leaf insert returned nothing");
    leaf = rowToPattern(created.data);
    if (!leaf) return no("write-failed", "the inserted leaf did not read back");
  }

  // ── 5 · SEVERITY, derived and STAMPED (M11-2) ────────────────────────────
  const severity = await deriveAndStore(db, {
    leaf,
    occurrenceCreatedAt: occurrence.createdAt || input.at,
    at: input.at,
    daysToGoalExam: input.daysToGoalExam ?? null,
    newOccurrence: true,
  });
  if (!severity.ok) return severity.result;

  // ── 6 · THE LINK ─────────────────────────────────────────────────────────
  const linked = await db.linkOccurrence(occurrence.id, leaf.id);
  if (linked.error) return no("write-failed", linked.error.message);

  // ── 7 · THE RETEST (M11-4) ───────────────────────────────────────────────
  let retest: RetestSchedule | null = null;
  const scheduled = scheduleFirstRetest({ ...leaf, lastSeenAt: occurrence.createdAt || input.at });
  if (scheduled.ok) {
    const written = await db.upsertRetestSchedule({
      pattern_id: scheduled.schedule.patternId,
      student_id: scheduled.schedule.studentId,
      due_at: scheduled.schedule.dueAt,
      interval_days: scheduled.schedule.intervalDays,
      attempt_count: scheduled.schedule.attemptCount,
      last_result: scheduled.schedule.lastResult,
      last_attempt_at: scheduled.schedule.lastAttemptAt,
    });
    // A schedule that did not land is a retest that happens later, not a
    // mistake that was lost. The pattern stands either way.
    if (!written.error) retest = scheduled.schedule;
  }

  return {
    ok: true,
    value: {
      merge: outcome.kind,
      patternId: leaf.id,
      globalPatternId: str(globalRow.row.id) ?? "",
      subjectPatternId: str(subjectRow.row.id) ?? "",
      severity: severity.severity,
      severityVersion: SEVERITY_FACTORS_VERSION,
      retest,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNALS
// ═══════════════════════════════════════════════════════════════════════════

async function ensurePattern(
  db: MistakeDnaDb,
  args: {
    key: PatternKey;
    ids: DnaIngestInput["ids"];
    at: ISOTimestamp;
    topic: string;
    parentId: UUID | null;
  },
): Promise<{ ok: true; row: Row } | { ok: false; result: DnaResult }> {
  const found = await db.findPattern(args.key);
  if (found.error) return { ok: false, result: no("read-failed", found.error.message) };
  if (found.data) return { ok: true, row: found.data };

  const id = args.key.tier === "global" ? args.ids.global : args.ids.subject;
  const created = await db.insertPattern({
    id,
    student_id: args.key.studentId,
    tier: args.key.tier,
    concept_id: null,
    parent_pattern_id: args.parentId,
    subject: args.key.subject,
    error_class: args.key.errorClass,
    error_type: args.key.errorType,
    label: labelFor(args.key.tier, args.key.errorType, args.key.subject, args.topic),
    recurrence_count: 0,
    first_seen_at: args.at,
    last_seen_at: args.at,
    // §4.6.2 / §4.7.1 — parents carry NEITHER. Parent severity is MAX of
    // descendants, derived on demand and never persisted; parent attachment is
    // deterministic and asks no question, so it has no confidence. `007`'s tier
    // shape CHECK refuses a parent that carries either.
    severity: null,
    system_confidence: null,
    status: "open",
    history: [],
  });
  if (created.error || !created.data) {
    return { ok: false, result: no("write-failed", created.error?.message ?? `${args.key.tier} parent insert returned nothing`) };
  }
  return { ok: true, row: created.data };
}

async function deriveAndStore(
  db: MistakeDnaDb,
  args: {
    leaf: Pattern;
    occurrenceCreatedAt: ISOTimestamp;
    at: ISOTimestamp;
    daysToGoalExam: number | null;
    newOccurrence: boolean;
  },
): Promise<{ ok: true; severity: number } | { ok: false; result: DnaResult }> {
  const since = new Date(Date.parse(args.at) - RECURRENCE_WINDOW_DAYS * 86_400_000).toISOString();

  const [leafMarks, openMarks, recurrence, weights] = await Promise.all([
    db.leafMarksLost(args.leaf.id),
    db.openLeavesMarksLost(args.leaf.studentId),
    db.countOccurrencesSince(args.leaf.id, since),
    db.conceptExamWeights(args.leaf.conceptId ?? ""),
  ]);

  for (const r of [leafMarks, openMarks, recurrence, weights]) {
    if (r.error) return { ok: false, result: no("read-failed", r.error.message) };
  }

  const derivation: SeverityDerivationInput = {
    leafMarksLost: leafMarks.data ?? 0,
    openLeavesMarksLost: Math.max(openMarks.data ?? 0, leafMarks.data ?? 0),
    occurrencesInWindow: recurrence.data ?? 0,
    daysToGoalExam: args.daysToGoalExam,
    conceptExamWeight: weights.data?.concept ?? 0,
    maxSubjectExamWeight: weights.data?.maxInSubject ?? 0,
    at: args.at,
  };

  const derived = deriveSeverity(derivation);
  if (!derived.ok) return { ok: false, result: no("severity-refused", `${derived.refusal}: ${derived.detail}`) };

  const updated = await db.updatePatternDerived(args.leaf.id, {
    severity: derived.value.severity,
    severity_version: derived.value.provenance.factorsVersion,
    severity_factors: derived.value.provenance,
    recurrence_count: derivation.occurrencesInWindow,
    last_seen_at: args.occurrenceCreatedAt,
    first_seen_at: args.leaf.firstSeenAt ?? args.occurrenceCreatedAt,
  });
  if (updated.error) return { ok: false, result: no("write-failed", updated.error.message) };

  return { ok: true, severity: derived.value.severity };
}
