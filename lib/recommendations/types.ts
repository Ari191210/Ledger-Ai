/**
 * M20 — RECOMMENDATION ENGINE. Shared types. Pure, I/O-free.
 *
 * Architecture Part K in full; C.3 `Recommendation` / `RecommendationOutcome`;
 * B.11 (Recommendation Engine).
 *
 * RULES THIS FILE OBEYS, WITHOUT EXCEPTION (same discipline as
 * `lib/mistakes/engine.ts`, `lib/score-engine.ts`, `lib/personal-model.ts`):
 *   · Pure. No I/O, no database, no framework, no clock, no randomness.
 *   · Deterministic. Every time-dependent decision takes an explicit timestamp.
 *   · Non-mutating. Inputs are never written to; outputs are frozen.
 *   · Bounded. `RECOMMENDATION_KINDS` is the one and only list — mirrors
 *     `recommendation_kind` in `supabase/migrations/032_recommendations.sql`,
 *     cross-checked by `tests/recommendations.test.mjs`.
 *
 * K.3 IS AN ABSENCE, NOT A RULE: no type below has a `blocks`, `required`,
 * `gates`, or `locks` field. There is nothing here for a future contributor
 * to accidentally read as permission to gate an action on a recommendation's
 * state — the shape itself does not support it.
 */

// ═══════════════════════════════════════════════════════════════════════════
// K.1 — THE BOUNDED CANDIDATE-KIND LIST
// ═══════════════════════════════════════════════════════════════════════════

export const RECOMMENDATION_KINDS = [
  "work_open_pattern",
  "take_due_retest",
  "pattern_recurred",
  "verify_unverified_session",
  "coverage_hole",
  "subject_no_proven_concept",
  "concept_decaying",
  "exam_weak_coverage",
  "dormant_session_reaping",
  "personal_model_confirm",
  "correction_request_pending",
] as const;

export type RecommendationKind = (typeof RECOMMENDATION_KINDS)[number];

const KIND_SET: ReadonlySet<string> = new Set(RECOMMENDATION_KINDS);

export const isRecommendationKind = (v: unknown): v is RecommendationKind =>
  typeof v === "string" && KIND_SET.has(v);

/** K.1's source column, transcribed. Used only for provenance/debugging —
 *  priority (K.2) never branches on source, only on the candidate's own
 *  benefit/urgency/fit numbers. */
export const RECOMMENDATION_SOURCES = [
  "mistake_dna",
  "assessment",
  "academic_record",
  "goals",
  "session_engine",
  "personal_model",
  "data_ownership",
] as const;

export type RecommendationSource = (typeof RECOMMENDATION_SOURCES)[number];

// ═══════════════════════════════════════════════════════════════════════════
// C.3 — STATE AND OUTCOME
// ═══════════════════════════════════════════════════════════════════════════

export const RECOMMENDATION_STATES = [
  "active",
  "dismissed",
  "ignored",
  "superseded",
  "acted_on",
  "expired",
] as const;

export type RecommendationState = (typeof RECOMMENDATION_STATES)[number];

/** K.4 — once a recommendation leaves `active`, it is closed. Mirrors the
 *  database trigger `recommendations_state_is_append_only` (032 §2). */
export const isTerminalState = (s: RecommendationState): boolean => s !== "active";

export const RECOMMENDATION_OUTCOME_KINDS = [
  "acted_on",
  "dismissed",
  "ignored_expired",
  "superseded",
] as const;

export type RecommendationOutcomeKind = (typeof RECOMMENDATION_OUTCOME_KINDS)[number];

// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE — V.7.4's TypeScript-side mirror of the database CHECK
// ═══════════════════════════════════════════════════════════════════════════

/** A pointer at the record that justifies a candidate. `refKind` names the
 *  table/domain object (`"pattern"`, `"occurrence"`, `"session"`,
 *  `"concept"`, `"academic_record"`, `"personal_model_signal"`,
 *  `"correction_request"`, `"academic_event"`) and `id` is that object's own
 *  identifier — never a synthetic or fabricated string. */
export interface EvidenceRef {
  readonly refKind: string;
  readonly id: string;
}

export const isNonEmptyEvidenceRefs = (
  refs: readonly EvidenceRef[] | null | undefined,
): refs is readonly EvidenceRef[] =>
  Array.isArray(refs) &&
  refs.length >= 1 &&
  refs.every(r => typeof r?.refKind === "string" && r.refKind.length > 0 && typeof r?.id === "string" && r.id.length > 0);

// ═══════════════════════════════════════════════════════════════════════════
// CANDIDATE — K.1's output, before priority/decay/persistence are applied
// ═══════════════════════════════════════════════════════════════════════════

export interface Candidate {
  readonly kind: RecommendationKind;
  readonly source: RecommendationSource;
  /** Identity for dedupe (K.4/C.3's `UNIQUE(student_id, dedupe_key) WHERE
   *  state = 'active'`). Deterministic from the underlying condition — the
   *  SAME condition must always produce the SAME dedupe_key, so re-running
   *  candidate generation never creates a duplicate active row. */
  readonly dedupeKey: string;
  readonly subject: string | null;
  readonly conceptId: string | null;
  readonly patternId: string | null;
  readonly reasonTemplate: string;
  readonly evidenceRefs: readonly EvidenceRef[];
  /** K.2 — measured in ACADEMIC terms (marks at risk, concepts unproven,
   *  patterns open), 0..1. NEVER score points (PRODUCT_PRINCIPLES:281-284). */
  readonly expectedAcademicBenefit: number;
  /** K.2 — goal/exam proximity, 0..1. For mistake-severity-derived
   *  candidates this is 0 by construction (K.2's double-weighting note:
   *  severity already includes exam proximity, so urgency must not multiply
   *  it again — see `URGENCY_APPLIES_TO`). */
  readonly urgency: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// RECOMMENDATION — a persisted, prioritised Candidate
// ═══════════════════════════════════════════════════════════════════════════

export interface Recommendation extends Candidate {
  readonly recommendationId: string | null; // null before insertion
  readonly priority: number;
  readonly fit: number;
  readonly fatigue: number;
  readonly state: RecommendationState;
  readonly surfacedCount: number;
  readonly expiresAt: string; // ISO
  readonly createdAt: string; // ISO
}

export interface RecommendationOutcome {
  readonly outcomeId: string | null;
  readonly recommendationId: string;
  readonly outcome: RecommendationOutcomeKind;
  readonly at: string; // ISO
  readonly resultingSessionId: string | null;
  readonly resultingResolutionId: string | null;
  readonly benefitObserved: number | null;
}
