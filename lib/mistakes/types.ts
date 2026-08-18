/**
 * THE MISTAKE SCHEMA — type definitions
 *
 * The single TypeScript definition of the mistake record. Mirrors
 * `PRODUCT_DECISIONS.md` §4.2–4.9 exactly.
 *
 * Types only. No runtime logic, no validation, no helpers. Every value in this
 * file erases at compile time.
 *
 * STATUS: D1 (ratification of the schema) is an OPEN governance decision. This
 * file is the current implementation target, not proof that the schema is
 * permanently correct. Until D1 is closed, treat every shape here as revisable.
 *
 * Consumers (none yet, by design):
 *   M1-3  supabase/migrations/007_mistakes.sql  — must mirror these field-for-field
 *   M1-5  lib/mistakes/engine.ts                — operates on these
 *   M1-6  lib/ledger-score.ts                   — reads PatternStatus
 */

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/** A UUID. Stable, never reused. */
export type UUID = string;

/** An ISO-8601 timestamp. */
export type ISOTimestamp = string;

// ─────────────────────────────────────────────────────────────────────────────
// THE ERROR TAXONOMY — §4.5
//
// The single most important split in the schema. A student losing 30 marks to
// misconceptions and a student losing 30 marks to misreading questions have
// nothing in common and need opposite interventions.
// ─────────────────────────────────────────────────────────────────────────────

/** COGNITIVE — *you did not know*. Fix by learning. Slow to close. */
export type CognitiveError =
  | 'not-known'
  | 'misconception'
  | 'wrong-method'
  | 'incomplete-understanding'
  | 'misapplied-rule'
  | 'cannot-recall-formula';

/** EXECUTION — *you knew and lost the mark anyway*. Fix by process. Fast to close. */
export type ExecutionError =
  | 'misread-question'
  | 'arithmetic-slip'
  | 'sign-error'
  | 'unit-error'
  | 'ran-out-of-time'
  | 'incomplete-answer'
  | 'missed-working'
  | 'transcription'
  | 'presentation';

/**
 * Patterns are never mixed across this boundary (§4.7). A misconception about
 * signs and a careless sign slip look identical on paper and require opposite
 * fixes.
 */
export type ErrorClass = 'cognitive' | 'execution';

export type ErrorType = CognitiveError | ExecutionError;

// ─────────────────────────────────────────────────────────────────────────────
// CONCEPT — the taxonomy spine (§4.2)
//
// The company's durable asset. Cannot be generated from textbooks, because
// textbooks describe success and this describes failure.
// ─────────────────────────────────────────────────────────────────────────────

export interface Concept {
  id: UUID;

  /** Display path: subject → chapter → topic → name. */
  subject: string;
  chapter: string;
  topic: string;
  name: string;

  /** Tree link. Enables roll-up to any level. */
  parentId: UUID | null;

  /** CBSE/ICSE/state syllabus references. */
  boardCodes: string[];

  /** Historical marks allocation. Feeds severity (§4.6). */
  examWeight: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE — immutable (§4.9)
//
// What makes the record trustworthy in 2036. Never deleted while any occurrence
// references it; deleting it retroactively invalidates every diagnosis built on
// it.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * M11-3 — EXTENDED ADDITIVELY, NEVER REWRITTEN.
 *
 * `'photo' | 'pdf' | 'manual'` are M1's three and are untouched. Architecture
 * G.1 names the two additions and G.3 says why the first is non-negotiable:
 * *"for an in-session mistake the evidence is the assessment attempt itself,
 * which is why `EvidenceType` must gain `'assessment_attempt'`. Without that,
 * the engine's own principle would force fabricating evidence, which
 * `migrate-legacy.ts:8-18` correctly refused to do."*
 *
 *   `assessment_attempt` — the graded attempt IS the evidence (F.4.a, G.3).
 *   `declaration`        — a student's own statement, admissible as evidence of
 *                          the STATEMENT and never of the fact (M9's
 *                          declaration-vs-verified split).
 *
 * The SQL side is `025_mistake_dna.sql` §1. `007_mistakes.sql` is not edited —
 * it is checksum-registered in M1's ledger, and editing an applied migration is
 * the drift class that ledger exists to prevent.
 */
export type EvidenceType = 'photo' | 'pdf' | 'manual' | 'assessment_attempt' | 'declaration';

export type EvidenceVerifier = 'ai' | 'student' | 'both';

/**
 * A rectangular region of an evidence item.
 *
 * NOTE: §4.9 names `cropRegions[]` but does not specify its shape. This is the
 * minimal faithful rendering — normalised 0–1 coordinates relative to the source
 * image. Confirm at D1.
 */
export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Evidence {
  id: UUID;
  type: EvidenceType;
  storageRef: string;

  /** Dedupes re-uploads of the same paper. */
  contentHash: string;

  cropRegions: CropRegion[];
  capturedAt: ISOTimestamp;
  sourceDescription: string;
  verifiedBy: EvidenceVerifier;
}

// ─────────────────────────────────────────────────────────────────────────────
// OCCURRENCE — the immutable fact (§4.3)
//
// One mark lost, one time. A FACT, not an inference. Never updated after
// verification. Never deleted. Corrections append a superseding occurrence
// rather than editing history.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * M11-3 — EXTENDED ADDITIVELY, NEVER REWRITTEN.
 *
 * The seven original values are M1's and are untouched. G.1 names the addition:
 * `'in-session-assessment'` — a mistake made inside this product's own
 * assessment, which is not `mock` and not `past-paper` (those name real papers
 * a student sat elsewhere, and borrowing one would put a school exam in the
 * record that never happened) and is not quite `self-test` either (that is a
 * paper the student set themselves).
 *
 * The SQL side is `025_mistake_dna.sql` §1, which EXTENDS `007`'s `source`
 * CHECK. Existing rows keep the value they were written with; see
 * `025` §1's note on why M10's already-shipped `self-test` is not re-pointed
 * here — that is a data correction (Part O.4), not an additive extension.
 */
export type OccurrenceSource =
  | 'board-exam'
  | 'school-exam'
  | 'mock'
  | 'coaching-test'
  | 'homework'
  | 'past-paper'
  | 'self-test'
  | 'in-session-assessment';

/** What the student *thought* before answering. Feeds calibration. */
export type ConfidenceLevel = 0 | 1 | 2 | 3;

/**
 * What the student wrote. §4.3 types this as `text | crop` — either transcribed
 * text or a region of the evidence image.
 */
export type StudentAnswer =
  | { kind: 'text'; text: string }
  | { kind: 'crop'; region: CropRegion };

interface OccurrenceBase {
  id: UUID;
  studentId: UUID;

  /**
   * Required. No occurrence without proof.
   *
   * An unevidenced mistake is a claim, and the product does not store claims
   * (`PRODUCT_PRINCIPLES` §3.2). Non-optional by design — the type system is
   * the first line of enforcement.
   */
  evidenceId: UUID;

  source: OccurrenceSource;

  /** Denormalised from Concept for query speed. */
  subject: string;
  chapter: string;
  topic: string;

  conceptId: UUID;

  /** e.g. "Q7(b)" */
  questionRef: string;

  marksLost: number;
  marksAvailable: number;

  confidenceBefore: ConfidenceLevel | null;
  studentAnswer: StudentAnswer;

  /** From the mark scheme. */
  expectedAnswer: string | null;

  /** What the teacher wrote in red. */
  markerNote: string | null;

  /** Assigned by merge (§4.7). Null until a pattern claims it. */
  patternId: UUID | null;

  /** Corrections append, never edit. */
  supersedes: UUID | null;

  createdAt: ISOTimestamp;
}

/**
 * OCCURRENCE — one mark lost, one time.
 *
 * The union enforces the §4.3 invariant at the type level: **at least one of
 * `cognitiveError` / `executionError` must be non-null.** A mark lost with
 * neither classification is not a diagnosable event.
 */
export type Occurrence = OccurrenceBase &
  (
    | { cognitiveError: CognitiveError; executionError: ExecutionError | null }
    | { cognitiveError: CognitiveError | null; executionError: ExecutionError }
  );

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN — the revisable inference (§4.4)
//
// A student does not want a list of 340 wrong answers. They want the nine
// things they keep getting wrong. Occurrences are what we hold; Patterns are
// what we return.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * §4.8 lifecycle.
 *
 * `resolved` is set by the SYSTEM ONLY. A student may set `acknowledged` and
 * `practising`; they may never mark their own mistake fixed
 * (`PRODUCT_PRINCIPLES` §3.1).
 */
export type PatternStatus =
  | 'open'
  | 'acknowledged'
  | 'practising'
  | 'dormant'
  | 'resolved'
  | 'recurred';

/**
 * One entry in a pattern's append-only history.
 *
 * NOTE: §4.4 requires "every status transition, with cause" but does not
 * specify the entry shape. This is the minimal faithful rendering. Confirm at D1.
 */
export interface PatternTransition {
  at: ISOTimestamp;
  from: PatternStatus | null;
  to: PatternStatus;
  cause: string;
}

/**
 * The three tiers of the pattern hierarchy (§4.4.1).
 *
 *   GLOBAL    "You make sign errors"                conceptId null, subject null
 *     └─ SUBJECT  "...in Physics"                   conceptId null, subject set
 *          └─ CONCEPT "...applying the chain rule"  conceptId set      ← LEAF
 */
export type PatternTier = 'concept' | 'subject' | 'global';

export interface Pattern {
  id: UUID;
  studentId: UUID;

  /** Which tier this pattern occupies. Leaves are `concept`. */
  tier: PatternTier;

  /**
   * Non-null on leaves. Null on parents — "you misread questions" is a real,
   * global pattern that belongs to no single concept (§4.7.2).
   */
  conceptId: UUID | null;

  /** Null only on the root of a tree (`global` tier). */
  parentPatternId: UUID | null;

  /** Null on the `global` tier only. */
  subject: string | null;

  /** Never mixed (§4.7). */
  errorClass: ErrorClass;
  errorType: ErrorType;

  /** Human sentence: *"Sign error when applying the chain rule"*. */
  label: string;

  /** The evidence trail. **Leaves only — always empty on parents** (§4.4.2). */
  occurrenceIds: UUID[];

  /**
   * Occurrences in the trailing 180 days. Leaves: counted.
   * Parents: derived from descendants (§4.4).
   */
  recurrenceCount: number;

  /** Parents: min/max across descendants. Null until the first occurrence. */
  firstSeenAt: ISOTimestamp | null;
  lastSeenAt: ISOTimestamp | null;

  /**
   * 0–100. DERIVED, never entered (§4.6.1):
   *   40·marksWeight + 30·recurrenceWeight + 20·examProximity + 10·conceptExamWeight
   *
   * **LEAVES ONLY.** Null on parents — parent severity is the MAX of descendant
   * leaves, derived on demand and NEVER persisted (§4.6.2).
   *
   * Derived so it cannot be gamed, so formula improvements upgrade every
   * existing pattern retroactively, and so ranking is explainable.
   */
  severity: number | null;

  /**
   * 0–1. How sure we are this is *one* pattern. Merges below 0.8 are
   * provisional (§4.7). **Leaves only** — parent attachment is deterministic
   * and asks no question, so it has no confidence (§4.7.1).
   */
  systemConfidence: number | null;

  status: PatternStatus;

  remediationPlan: UUID | null;

  /** Append-only. Every status transition, with cause. */
  history: PatternTransition[];

  resolvedAt: ISOTimestamp | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// M11 ADDITIONS — appended, never interleaved.
//
// Everything above this line is M1's file, unchanged apart from the two enum
// widenings marked `M11-3`. Everything below is new and additive: no existing
// shape gained a required field, so every value that type-checked before still
// type-checks.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * G.8 — *"A `RetestSchedule` entry per open leaf: `{pattern_id, due_at,
 * attempt_count, last_result}`. Intervals expand on success and reset on
 * failure."*
 */
export interface RetestSchedule {
  patternId: UUID;
  studentId: UUID;
  /** Never earlier than `lastSeenAt + RESOLUTION_COOLING_DAYS`. */
  dueAt: ISOTimestamp;
  /** The interval that produced `dueAt`, retained so the next one is derived
   *  from the schedule rather than recomputed from a guess. */
  intervalDays: number;
  attemptCount: number;
  lastResult: 'pass' | 'fail' | null;
  lastAttemptAt: ISOTimestamp | null;
}

/**
 * C.3 / G.8 — the resolution, as its own entity.
 *
 * Separate from the pattern ON PURPOSE: *"a new occurrence merging into a
 * `resolved` leaf drives `resolved → recurred` … **the prior resolution is not
 * deleted** — its `MistakeResolution` row stands."* A student who fixed
 * something, lost it and fixed it again has a better record than one who never
 * fixed it, and the model must be able to say so.
 *
 * `proofAttemptIds` is NOT optional. G.8: *"a resolution that cannot name them
 * is not constructible."*
 */
export interface MistakeResolution {
  id: UUID;
  patternId: UUID;
  studentId: UUID;
  resolvedAt: ISOTimestamp;
  /** The attempts that prove it. At least `RESOLUTION_MIN_CORRECT` of them. */
  proofAttemptIds: UUID[];
  /** The occurrence timestamp the cooling period was measured from. */
  measuredFrom: ISOTimestamp;
  coolingDaysElapsed: number;
  /** Always `'system'`. The column exists so the record STATES that no student
   *  set it, rather than leaving it to be inferred from the absence of a
   *  student-facing route. */
  setBy: 'system';
}

/**
 * G.6 / M11-2 — how a severity score was arrived at, stamped with the version
 * of the derivation that produced it.
 *
 * The same discipline as `TAXONOMY_VERSION` (M6) and `GENERATION_PROMPT_VERSION`
 * (M10): a stored number whose meaning depends on a formula is meaningless
 * without the formula's identity beside it. `SEVERITY_WEIGHTS` in `engine.ts`
 * is the formula and does not change; this versions the DERIVATION of its four
 * inputs, which G.6 deliberately made a separate concern.
 */
export interface SeverityProvenance {
  factorsVersion: string;
  factors: {
    marksWeight: number;
    recurrenceWeight: number;
    examProximity: number;
    conceptExamWeight: number;
  };
  /** FALSE when no goal exam is known. The factor is then 0 because the product
   *  does not know of an exam — never because it guessed one (V.4.9's posture,
   *  applied to a number). */
  examProximityKnown: boolean;
  derivedAt: ISOTimestamp;
}
