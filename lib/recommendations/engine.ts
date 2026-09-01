/**
 * M20 — RECOMMENDATION ENGINE. Candidate generation, priority, decay,
 * next-best-action. Pure domain logic.
 *
 * Implements Architecture Part K:
 *   K.1  — candidate generation. "Each subsystem exposes a pure
 *          `candidates(context) → Candidate[]` function. The engine unions
 *          them; no subsystem ranks globally."
 *   K.2  — priority = expected_academic_benefit × urgency × fit − fatigue
 *   K.3  — guide, never gate (structural — see types.ts's comment and
 *          `supabase/migrations/032_recommendations.sql` §2)
 *   K.7  — decay. Recommendations expire; `expires_at` is set at creation
 *          from the kind.
 *   K.8  — next-best-action. Exactly one action, deterministic, stably
 *          tie-broken.
 *
 * RULES THIS FILE OBEYS, WITHOUT EXCEPTION (same discipline as
 * `lib/mistakes/engine.ts`, `lib/score-engine.ts`, `lib/personal-model.ts`):
 *   · Pure. No I/O, no database, no framework, no clock, no randomness.
 *   · Deterministic. Every time-dependent decision takes an explicit
 *     timestamp; every "which candidate wins" decision is a total order.
 *   · Non-mutating. Inputs are never written to; outputs are frozen.
 *
 * NOT HERE: fetching the inputs (open patterns, due retests, coverage gaps,
 * …) from Supabase. That is `app/api/recommendations/route.ts`'s job — it
 * queries, shapes the results into this file's input types, calls this file,
 * and persists what comes back. Keeping the query layer OUT of this file is
 * what makes K.1/K.2/K.7/K.8 provable with no Supabase project in reach
 * (U.3, the determinism boundary), the same split 031/`lib/personal-model.ts`
 * draws between extraction (I/O) and aggregation (pure).
 */

import {
  type Candidate,
  type EvidenceRef,
  type Recommendation,
  type RecommendationKind,
  type RecommendationState,
  isNonEmptyEvidenceRefs,
} from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// V.7.4 — "A CANDIDATE THAT CANNOT NAME ITS EVIDENCE IS NOT CONSTRUCTIBLE"
//
// This is the TypeScript-side half of V.7.4. The database CHECK
// (`recommendations_evidence_refs_nonempty`, 032 §2) is the half that holds
// even if this function is bypassed; this function is what makes the
// violation impossible to reach the database with in the first place, and
// gives a caller a clear, immediate, typed refusal instead of an opaque
// Postgres 23514 several layers away.
// ═══════════════════════════════════════════════════════════════════════════

export class EvidenceRequiredError extends Error {
  constructor(kind: string) {
    super(
      `A recommendation of kind "${kind}" was constructed with no evidence_refs. ` +
        `A recommendation with no evidence reference is a bug (B.11) — this is the ` +
        `refusal V.7.4 requires, raised before the candidate exists at all.`,
    );
    this.name = "EvidenceRequiredError";
  }
}

/** The one legal way to build a `Candidate`. Every generator below calls
 *  this — never constructs the object literal directly — so "not
 *  constructible without evidence" is enforced at a single chokepoint. */
export function buildCandidate(input: {
  kind: RecommendationKind;
  source: Candidate["source"];
  dedupeKey: string;
  subject: string | null;
  conceptId: string | null;
  patternId: string | null;
  reasonTemplate: string;
  evidenceRefs: readonly EvidenceRef[];
  expectedAcademicBenefit: number;
  urgency: number;
}): Candidate {
  if (!isNonEmptyEvidenceRefs(input.evidenceRefs)) {
    throw new EvidenceRequiredError(input.kind);
  }
  if (!input.dedupeKey || input.dedupeKey.trim().length === 0) {
    throw new RangeError(`Candidate of kind "${input.kind}" has an empty dedupeKey.`);
  }
  return Object.freeze({
    kind: input.kind,
    source: input.source,
    dedupeKey: input.dedupeKey,
    subject: input.subject,
    conceptId: input.conceptId,
    patternId: input.patternId,
    reasonTemplate: input.reasonTemplate,
    evidenceRefs: Object.freeze(input.evidenceRefs.slice()),
    expectedAcademicBenefit: clamp01(input.expectedAcademicBenefit),
    urgency: clamp01(input.urgency),
  });
}

const clamp01 = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

// ═══════════════════════════════════════════════════════════════════════════
// K.1 — CANDIDATE GENERATORS, ONE PER SOURCE
//
// Each takes only the slice of context it needs (never the whole world),
// and returns Candidate[] via `buildCandidate` alone. None of these ranks
// globally — that is `computePriority`'s job, applied uniformly after the
// union (K.1: "the engine unions them; no subsystem ranks globally").
// ═══════════════════════════════════════════════════════════════════════════

/** Mistake DNA — an open pattern is available to work on. */
export interface OpenPatternInput {
  readonly patternId: string;
  readonly subject: string;
  readonly conceptId: string | null;
  readonly label: string;
  readonly severity: number; // 0..1, already includes exam proximity (G.6)
  readonly occurrenceIds: readonly string[];
}

export function openPatternCandidates(patterns: readonly OpenPatternInput[]): Candidate[] {
  return patterns
    .filter(p => p.occurrenceIds.length > 0)
    .map(p =>
      buildCandidate({
        kind: "work_open_pattern",
        source: "mistake_dna",
        dedupeKey: `work_open_pattern:${p.patternId}`,
        subject: p.subject,
        conceptId: p.conceptId,
        patternId: p.patternId,
        reasonTemplate: `${p.label} in ${p.subject} is still open.`,
        evidenceRefs: p.occurrenceIds.map(id => ({ refKind: "occurrence", id })),
        expectedAcademicBenefit: p.severity,
        // K.2's double-weighting note: severity already includes exam
        // proximity (G.6), so urgency is NOT applied again here.
        urgency: 0,
      }),
    );
}

/** Mistake DNA — a due retest. */
export interface DueRetestInput {
  readonly patternId: string;
  readonly subject: string;
  readonly conceptId: string | null;
  readonly label: string;
  readonly dueAt: string; // ISO
  readonly scheduleId: string;
}

export function dueRetestCandidates(retests: readonly DueRetestInput[], nowMs: number): Candidate[] {
  return retests
    .filter(r => Date.parse(r.dueAt) <= nowMs)
    .map(r =>
      buildCandidate({
        kind: "take_due_retest",
        source: "mistake_dna",
        dedupeKey: `take_due_retest:${r.patternId}`,
        subject: r.subject,
        conceptId: r.conceptId,
        patternId: r.patternId,
        reasonTemplate: `A retest for ${r.label} is due.`,
        evidenceRefs: [{ refKind: "mistake_retest_schedule", id: r.scheduleId }],
        expectedAcademicBenefit: 0.7,
        urgency: 0,
      }),
    );
}

/** Mistake DNA — a pattern has recurred. */
export interface RecurredPatternInput {
  readonly patternId: string;
  readonly subject: string;
  readonly conceptId: string | null;
  readonly label: string;
  readonly recurrenceOccurrenceId: string;
  readonly severity: number;
}

export function patternRecurredCandidates(recurrences: readonly RecurredPatternInput[]): Candidate[] {
  return recurrences.map(r =>
    buildCandidate({
      kind: "pattern_recurred",
      source: "mistake_dna",
      dedupeKey: `pattern_recurred:${r.patternId}:${r.recurrenceOccurrenceId}`,
      subject: r.subject,
      conceptId: r.conceptId,
      patternId: r.patternId,
      reasonTemplate: `${r.label} has recurred in ${r.subject}.`,
      evidenceRefs: [{ refKind: "occurrence", id: r.recurrenceOccurrenceId }],
      expectedAcademicBenefit: r.severity,
      urgency: 0,
    }),
  );
}

/** Assessment — an unverified session. */
export interface UnverifiedSessionInput {
  readonly sessionId: string;
  readonly subject: string;
}

export function unverifiedSessionCandidates(sessions: readonly UnverifiedSessionInput[]): Candidate[] {
  return sessions.map(s =>
    buildCandidate({
      kind: "verify_unverified_session",
      source: "assessment",
      dedupeKey: `verify_unverified_session:${s.sessionId}`,
      subject: s.subject,
      conceptId: null,
      patternId: null,
      reasonTemplate: `Yesterday's session in ${s.subject} is unverified.`,
      evidenceRefs: [{ refKind: "session", id: s.sessionId }],
      expectedAcademicBenefit: 0.5,
      urgency: 0.6,
    }),
  );
}

/** Assessment — a coverage hole exists. */
export interface CoverageHoleInput {
  readonly conceptId: string;
  readonly subject: string;
  readonly label: string;
  readonly academicRecordId: string;
}

export function coverageHoleCandidates(holes: readonly CoverageHoleInput[]): Candidate[] {
  return holes.map(h =>
    buildCandidate({
      kind: "coverage_hole",
      source: "assessment",
      dedupeKey: `coverage_hole:${h.conceptId}`,
      subject: h.subject,
      conceptId: h.conceptId,
      patternId: null,
      reasonTemplate: `${h.label} in ${h.subject} has no coverage yet.`,
      evidenceRefs: [{ refKind: "academic_record", id: h.academicRecordId }],
      expectedAcademicBenefit: 0.4,
      urgency: 0.2,
    }),
  );
}

/** Academic Record — a declared subject has no proven concept. */
export interface SubjectNoProvenConceptInput {
  readonly subject: string;
  readonly academicRecordId: string;
}

export function subjectNoProvenConceptCandidates(
  subjects: readonly SubjectNoProvenConceptInput[],
): Candidate[] {
  return subjects.map(s =>
    buildCandidate({
      kind: "subject_no_proven_concept",
      source: "academic_record",
      dedupeKey: `subject_no_proven_concept:${s.subject}`,
      subject: s.subject,
      conceptId: null,
      patternId: null,
      reasonTemplate: `${s.subject} has no proven concept yet.`,
      evidenceRefs: [{ refKind: "academic_record", id: s.academicRecordId }],
      expectedAcademicBenefit: 0.6,
      urgency: 0.3,
    }),
  );
}

/** Academic Record — a concept is decaying. */
export interface ConceptDecayingInput {
  readonly conceptId: string;
  readonly subject: string;
  readonly label: string;
  readonly academicRecordId: string;
  readonly decayFraction: number; // 0..1, how far decayed
}

export function conceptDecayingCandidates(concepts: readonly ConceptDecayingInput[]): Candidate[] {
  return concepts.map(c =>
    buildCandidate({
      kind: "concept_decaying",
      source: "academic_record",
      dedupeKey: `concept_decaying:${c.conceptId}`,
      subject: c.subject,
      conceptId: c.conceptId,
      patternId: null,
      reasonTemplate: `${c.label} in ${c.subject} is decaying.`,
      evidenceRefs: [{ refKind: "academic_record", id: c.academicRecordId }],
      expectedAcademicBenefit: clamp01(c.decayFraction),
      urgency: 0.1,
    }),
  );
}

/** Goals — an exam approaches with weak coverage in its subjects. */
export interface ExamWeakCoverageInput {
  readonly examId: string;
  readonly examLabel: string;
  readonly subject: string;
  readonly daysToExam: number;
  readonly coverageFraction: number; // 0..1, how much of the subject is proven
}

export function examWeakCoverageCandidates(exams: readonly ExamWeakCoverageInput[]): Candidate[] {
  return exams
    .filter(e => e.coverageFraction < 0.8 && e.daysToExam >= 0)
    .map(e =>
      buildCandidate({
        kind: "exam_weak_coverage",
        source: "goals",
        dedupeKey: `exam_weak_coverage:${e.examId}:${e.subject}`,
        subject: e.subject,
        conceptId: null,
        patternId: null,
        reasonTemplate: `${e.examLabel} is approaching with weak coverage in ${e.subject}.`,
        evidenceRefs: [{ refKind: "goal_exam", id: e.examId }],
        expectedAcademicBenefit: 1 - clamp01(e.coverageFraction),
        urgency: examProximityUrgency(e.daysToExam),
      }),
    );
}

/** K.2's `urgency` — goal/exam proximity, saturating close to the exam and
 *  vanishing far from it. Deliberately simple and monotone (no product
 *  claims are made about the shape). */
function examProximityUrgency(daysToExam: number): number {
  if (daysToExam <= 3) return 1;
  if (daysToExam >= 60) return 0;
  return clamp01(1 - (daysToExam - 3) / 57);
}

/** Session Engine — a DORMANT session is about to be reaped. */
export interface DormantSessionInput {
  readonly sessionId: string;
  readonly subject: string;
  readonly minutesUntilReap: number;
}

export function dormantSessionCandidates(sessions: readonly DormantSessionInput[]): Candidate[] {
  return sessions
    .filter(s => s.minutesUntilReap <= 60)
    .map(s =>
      buildCandidate({
        kind: "dormant_session_reaping",
        source: "session_engine",
        dedupeKey: `dormant_session_reaping:${s.sessionId}`,
        subject: s.subject,
        conceptId: null,
        patternId: null,
        reasonTemplate: `A dormant session in ${s.subject} will close soon.`,
        evidenceRefs: [{ refKind: "session", id: s.sessionId }],
        expectedAcademicBenefit: 0.3,
        urgency: 0.9,
      }),
    );
}

/** Personal Model — a preference is inferred with high confidence; offer to
 *  make it explicit. */
export interface PersonalModelHighConfidenceInput {
  readonly dimension: string;
  readonly signalId: string;
  readonly confidence: number;
  readonly inferredValueLabel: string;
}

const PERSONAL_MODEL_CONFIRM_THRESHOLD = 0.75;

export function personalModelConfirmCandidates(
  dimensions: readonly PersonalModelHighConfidenceInput[],
): Candidate[] {
  return dimensions
    .filter(d => d.confidence >= PERSONAL_MODEL_CONFIRM_THRESHOLD)
    .map(d =>
      buildCandidate({
        kind: "personal_model_confirm",
        source: "personal_model",
        dedupeKey: `personal_model_confirm:${d.dimension}`,
        subject: null,
        conceptId: null,
        patternId: null,
        reasonTemplate: `You seem to prefer ${d.inferredValueLabel} — make it explicit?`,
        evidenceRefs: [{ refKind: "personal_model_signal", id: d.signalId }],
        expectedAcademicBenefit: 0.2,
        urgency: 0,
      }),
    );
}

/** Data Ownership — an open CorrectionRequest awaits the student's input. */
export interface OpenCorrectionRequestInput {
  readonly correctionId: string;
  readonly subject: string | null;
}

export function correctionRequestPendingCandidates(
  requests: readonly OpenCorrectionRequestInput[],
): Candidate[] {
  return requests.map(r =>
    buildCandidate({
      kind: "correction_request_pending",
      source: "data_ownership",
      dedupeKey: `correction_request_pending:${r.correctionId}`,
      subject: r.subject,
      conceptId: null,
      patternId: null,
      reasonTemplate: `A correction request is awaiting your input.`,
      evidenceRefs: [{ refKind: "correction_request", id: r.correctionId }],
      expectedAcademicBenefit: 0.3,
      urgency: 0.4,
    }),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// K.1 — THE UNION. "The engine unions them; no subsystem ranks globally."
// ═══════════════════════════════════════════════════════════════════════════

export function unionCandidates(...groups: readonly (readonly Candidate[])[]): Candidate[] {
  return groups.flat();
}

/** K.4 — at most one ACTIVE candidate per dedupeKey. When two candidates
 *  collide (should not happen if generators are each internally consistent,
 *  but a union across sources is exactly where an accidental collision
 *  would surface), the one with the higher expected academic benefit wins —
 *  deterministic, and never by array order alone. */
export function dedupeCandidates(candidates: readonly Candidate[]): Candidate[] {
  const byKey = new Map<string, Candidate>();
  for (const c of candidates) {
    const existing = byKey.get(c.dedupeKey);
    if (!existing || c.expectedAcademicBenefit > existing.expectedAcademicBenefit) {
      byKey.set(c.dedupeKey, c);
    }
  }
  return [...byKey.values()];
}

// ═══════════════════════════════════════════════════════════════════════════
// K.2 — PRIORITY
// ═══════════════════════════════════════════════════════════════════════════

export interface FitInput {
  readonly kind: RecommendationKind;
  /** Personal Model's `session_length` / `question_format_mix` /
   *  `working_window` effective values, already resolved by
   *  `resolveEffectiveValue` (M19) — this file does not know how they were
   *  derived, only how to score a candidate against them. `null` when no
   *  personal model signal exists yet for the relevant dimension: fit is
   *  then neutral (0.6), never assumed either way. */
  readonly matchesFormatPreference: boolean | null;
  readonly matchesWorkingWindow: boolean | null;
}

/** K.2's `fit` — comes from `PersonalModel`. Neutral (0.6) when there is no
 *  signal to compare against, so a student with no personal model yet is
 *  never penalised OR favoured by a preference the system has not observed. */
export function computeFit(input: FitInput): number {
  const signals = [input.matchesFormatPreference, input.matchesWorkingWindow].filter(
    (v): v is boolean => v !== null,
  );
  if (signals.length === 0) return 0.6;
  const matched = signals.filter(Boolean).length;
  return clamp01(0.4 + 0.6 * (matched / signals.length));
}

/** K.2's `fatigue` — "a penalty from RecommendationOutcome history:
 *  repeatedly ignored kinds lose priority." Counts DISMISSED and
 *  IGNORED_EXPIRED outcomes for the same `kind`, within a lookback window,
 *  and grows the penalty with the count — bounded so fatigue alone can
 *  never make a candidate's priority go to zero on its own (it can only
 *  push an already-low-benefit candidate further down, never silence a
 *  high-benefit one entirely — K.3: fatigue is a RANKING signal, not a
 *  gate). */
export interface FatigueOutcomeInput {
  readonly kind: RecommendationKind;
  readonly outcome: "acted_on" | "dismissed" | "ignored_expired" | "superseded";
  readonly at: string; // ISO
}

const FATIGUE_LOOKBACK_DAYS = 30;
const FATIGUE_PENALTY_PER_IGNORE = 0.08;
const FATIGUE_CAP = 0.5;

export function computeFatigue(
  kind: RecommendationKind,
  outcomes: readonly FatigueOutcomeInput[],
  nowMs: number,
): number {
  const cutoff = nowMs - FATIGUE_LOOKBACK_DAYS * 86_400_000;
  const count = outcomes.filter(
    o =>
      o.kind === kind &&
      (o.outcome === "dismissed" || o.outcome === "ignored_expired") &&
      Date.parse(o.at) >= cutoff,
  ).length;
  return Math.min(FATIGUE_CAP, count * FATIGUE_PENALTY_PER_IGNORE);
}

/** K.2, verbatim: `priority = expected_academic_benefit × urgency × fit − fatigue`.
 *  Urgency of 0 (mistake-severity-derived candidates, per the double-
 *  weighting note) would zero the product entirely, which is wrong — those
 *  candidates are ranked by benefit × fit alone. So `urgency` acts as a
 *  MULTIPLIER ONLY when a candidate actually declares one; a zero-urgency
 *  candidate is treated as urgency-neutral (1), not urgency-absent (0). */
export function computePriority(input: {
  expectedAcademicBenefit: number;
  urgency: number;
  fit: number;
  fatigue: number;
}): number {
  const effectiveUrgency = input.urgency > 0 ? input.urgency : 1;
  const raw = input.expectedAcademicBenefit * effectiveUrgency * input.fit - input.fatigue;
  return Math.round(raw * 10_000) / 10_000;
}

// ═══════════════════════════════════════════════════════════════════════════
// K.7 — DECAY / EXPIRY
//
// "expires_at is set at creation from the kind — a 'verify yesterday's
// session' prompt is worthless in a week, while 'this pattern is open' is
// durable." Deliberately per-kind, not a single global TTL.
// ═══════════════════════════════════════════════════════════════════════════

export const EXPIRY_DAYS_BY_KIND: Readonly<Record<RecommendationKind, number>> = Object.freeze({
  work_open_pattern: 21,
  take_due_retest: 7,
  pattern_recurred: 14,
  verify_unverified_session: 2,
  coverage_hole: 30,
  subject_no_proven_concept: 45,
  concept_decaying: 21,
  exam_weak_coverage: 14,
  dormant_session_reaping: 1,
  personal_model_confirm: 30,
  correction_request_pending: 14,
});

/** K.7 — the cooling window a `dedupe_key` sits in after a recommendation of
 *  that kind closes, before the SAME condition may regenerate it. "This is
 *  what prevents the same suggestion appearing every day for a month, which
 *  is the practical form of shaming." Always at least as long as the kind's
 *  own expiry, so a fast-expiring nudge cannot reappear same-day. */
export const COOLING_DAYS_BY_KIND: Readonly<Record<RecommendationKind, number>> = Object.freeze({
  work_open_pattern: 3,
  take_due_retest: 1,
  pattern_recurred: 2,
  verify_unverified_session: 1,
  coverage_hole: 5,
  subject_no_proven_concept: 7,
  concept_decaying: 5,
  exam_weak_coverage: 2,
  dormant_session_reaping: 1,
  personal_model_confirm: 14,
  correction_request_pending: 3,
});

export function computeExpiresAt(kind: RecommendationKind, nowMs: number): string {
  return new Date(nowMs + EXPIRY_DAYS_BY_KIND[kind] * 86_400_000).toISOString();
}

/** K.4/K.7 — is this dedupeKey still cooling from a recent close? `closedAt`
 *  is the `recommendation_outcomes.at` of the most recent close for that
 *  key, if any. */
export function isCoolingDown(
  kind: RecommendationKind,
  closedAt: string | null,
  nowMs: number,
): boolean {
  if (!closedAt) return false;
  const cooledUntil = Date.parse(closedAt) + COOLING_DAYS_BY_KIND[kind] * 86_400_000;
  return nowMs < cooledUntil;
}

// ═══════════════════════════════════════════════════════════════════════════
// TURNING A CANDIDATE INTO A RECOMMENDATION ROW (pre-insertion shape)
// ═══════════════════════════════════════════════════════════════════════════

export function toRecommendation(
  candidate: Candidate,
  ctx: { fit: number; fatigue: number; nowMs: number },
): Recommendation {
  const priority = computePriority({
    expectedAcademicBenefit: candidate.expectedAcademicBenefit,
    urgency: candidate.urgency,
    fit: ctx.fit,
    fatigue: ctx.fatigue,
  });
  return Object.freeze({
    ...candidate,
    recommendationId: null,
    priority,
    fit: ctx.fit,
    fatigue: ctx.fatigue,
    state: "active" as RecommendationState,
    surfacedCount: 0,
    expiresAt: computeExpiresAt(candidate.kind, ctx.nowMs),
    createdAt: new Date(ctx.nowMs).toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// K.8 — NEXT-BEST-ACTION
//
// "Exactly one action is surfaced as the next move. The selection is
// deterministic: highest priority, tie-broken by earliest expires_at, then
// by lowest recent-surface count. Ties are broken STABLY so the same action
// does not shuffle between page loads."
// ═══════════════════════════════════════════════════════════════════════════

export function selectNextBestAction(
  recommendations: readonly Recommendation[],
): Recommendation | null {
  const active = recommendations
    .map((r, index) => ({ r, index })) // capture original order for the final, stable tie-break
    .filter(({ r }) => r.state === "active");

  if (active.length === 0) return null;

  active.sort((a, b) => {
    if (b.r.priority !== a.r.priority) return b.r.priority - a.r.priority;
    const aExp = Date.parse(a.r.expiresAt);
    const bExp = Date.parse(b.r.expiresAt);
    if (aExp !== bExp) return aExp - bExp;
    if (a.r.surfacedCount !== b.r.surfacedCount) return a.r.surfacedCount - b.r.surfacedCount;
    return a.index - b.index; // stable: original insertion order breaks any remaining tie
  });

  return active[0].r;
}
