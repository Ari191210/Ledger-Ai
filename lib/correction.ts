// ═══════════════════════════════════════════════════════════════════════════
// M18-2 — THE ONE ENTRY POINT FOR CORRECTION AND DISPUTE.
//
// Architecture O.3: "One entry point, three outcomes." A student raises
// `CorrectionRequest{target_type, target_id, claim, reason}`; it resolves to
// exactly one of:
//
//   auto_accepted        target is student-declared (O.2's second evidence
//                         class) — the student is the authority on their own
//                         claim, so a superseding record is appended with no
//                         adjudication.
//   accepted_mechanical   target is verified evidence AND the claim is
//                         mechanically checkable (the answer key was wrong,
//                         the grader mis-parsed a numeric answer) — appended
//                         after a check, never a model's opinion (O.3.b: "AI
//                         may help the student phrase a dispute; it may never
//                         adjudicate one").
//   disputed              target is verified evidence AND the claim is a
//                         judgement. The original stands. A `disputed` marker
//                         is attached and is visible everywhere the record is
//                         shown, and it is excluded from every score dimension
//                         in BOTH directions (V.10.1) until a human resolves
//                         it. Never silently rejected, never silently wins
//                         (O.3.a).
//
// WHAT ALREADY EXISTS, AND WHAT THIS FILE ADDS
//
// M10-6's `lib/assessment-revocation.ts` already builds the "question was
// wrong" / "answer marked wrong but is right" append path for assessment
// evidence (F.8's rows 1–2) — `buildRevocation`, `supersedingEventDraft`,
// `occurrenceSupersessionFor`. This file does not duplicate it; the server
// wiring (`lib/correction-server.ts`) calls into that module directly for
// `target_type ∈ {question, assessment_attempt}` when the outcome is
// accepted. What was missing, and what this file supplies:
//
//   1. THE CLASSIFIER — the O.3 diagram itself, generalised over every
//      target type, so "declaration" and "occurrence" corrections and the
//      DISPUTE arm (which M10 never built — M10 only ever upholds) go
//      through the same decision.
//   2. THE DECLARATION-CORRECTION DRAFT — F.8's third grievance path onto a
//      student-declared record ("that was Friday, not Thursday"): a plain
//      `EVENT_SUPERSEDED` append, auto-accepted.
//   3. THE OCCURRENCE-MISCLASSIFICATION DRAFT — F.8's third row ("this
//      mistake is misclassified"): a superseding occurrence is appended
//      (`occurrences.supersedes`, already a column since M1/007).
//   4. THE DISPUTE RECORD — the one outcome nothing before M18 could express
//      at all.
//
// No I/O, no clock (`at` is injected), no randomness. The same split as
// `lib/assessment-revocation.ts` and for the same reason (U.3).
// ═══════════════════════════════════════════════════════════════════════════

export const CORRECTION_TARGET_TYPES = [
  "question", // F.8 row 1 — "the question was wrong / ambiguous"
  "assessment_attempt", // F.8 row 2 — "my answer was marked wrong but is right"
  "occurrence", // F.8 row 3 — "this mistake is misclassified"
  "declaration", // O.3's student-declared class — EXTERNAL_STUDY_DECLARED, CONCEPT_ADDED, profile fields, manual mistake entries
] as const;
export type CorrectionTargetType = (typeof CORRECTION_TARGET_TYPES)[number];

/** O.2's evidence classes, restated as the property the classifier reads.
 *  `declaration` targets are always student-declared; the other three are
 *  always verified evidence. There is no target type that is sometimes one
 *  and sometimes the other — O.2's table is exhaustive. */
export function evidenceClassFor(
  targetType: CorrectionTargetType,
): "student_declared" | "verified" {
  return targetType === "declaration" ? "student_declared" : "verified";
}

/**
 * Whether a claim against VERIFIED evidence is mechanically checkable or a
 * judgement. This is the one fact this module cannot derive on its own — it
 * is what a human (or a deterministic checker upstream, e.g. "the numeric
 * grader mis-parsed 3.0 as 30") decided, and the caller states it rather than
 * this module guessing. O.3.b: AI may phrase, never adjudicate.
 */
export const CLAIM_KINDS = ["mechanical", "judgement"] as const;
export type ClaimKind = (typeof CLAIM_KINDS)[number];

export const CORRECTION_OUTCOMES = ["auto_accepted", "accepted_mechanical", "disputed"] as const;
export type CorrectionOutcome = (typeof CORRECTION_OUTCOMES)[number];

/**
 * O.3's diagram, as a pure function. `claimKind` is ignored for a
 * student-declared target — O.2: the student is the authority on their own
 * claim, and asking whether their own correction is "mechanical" or a
 * "judgement" is a category error the caller must not be able to express.
 */
export function classifyOutcome(
  targetType: CorrectionTargetType,
  claimKind: ClaimKind,
): CorrectionOutcome {
  if (evidenceClassFor(targetType) === "student_declared") return "auto_accepted";
  return claimKind === "mechanical" ? "accepted_mechanical" : "disputed";
}

export interface CorrectionRequestInput {
  correction_id: string;
  student_id: string;
  target_type: CorrectionTargetType;
  target_id: string;
  /** What the student says is true. Never empty — a correction with no
   *  stated claim is not a correction. */
  claim: string;
  /** Why. Distinct from `claim` — "the claim" is the assertion, "the reason"
   *  is the justification for it. Both required (same discipline as
   *  `buildRevocation`'s `reason`). */
  reason: string;
  /** Ignored when the target is student-declared; see `classifyOutcome`. */
  claim_kind: ClaimKind;
  /** ISO. Injected — this module owns no clock. */
  at: string;
}

export type CorrectionRefusal =
  | "unknown_target_type"
  | "unknown_claim_kind"
  | "empty_claim"
  | "empty_reason";

export interface CorrectionRequestRecord {
  correction_id: string;
  student_id: string;
  target_type: CorrectionTargetType;
  target_id: string;
  claim: string;
  reason: string;
  claim_kind: ClaimKind;
  outcome: CorrectionOutcome;
  requested_at: string;
}

export type CorrectionOutcomeResult =
  | { ok: true; record: CorrectionRequestRecord }
  | { ok: false; refusal: CorrectionRefusal; detail: string };

/**
 * Build one correction request, WITH its outcome already decided. Nothing
 * downstream re-derives the outcome from a different reading of the target —
 * this is the single place `classifyOutcome` is called from a request, so the
 * request row and the action taken on it can never disagree about why.
 */
export function buildCorrectionRequest(input: CorrectionRequestInput): CorrectionOutcomeResult {
  if (!(CORRECTION_TARGET_TYPES as readonly string[]).includes(input.target_type)) {
    return { ok: false, refusal: "unknown_target_type", detail: `'${input.target_type}' is not a correction target` };
  }
  if (!(CLAIM_KINDS as readonly string[]).includes(input.claim_kind)) {
    return { ok: false, refusal: "unknown_claim_kind", detail: `'${input.claim_kind}' is not a claim kind` };
  }
  if (typeof input.claim !== "string" || input.claim.trim().length === 0) {
    return { ok: false, refusal: "empty_claim", detail: "a correction states what is claimed to be true" };
  }
  if (typeof input.reason !== "string" || input.reason.trim().length === 0) {
    return { ok: false, refusal: "empty_reason", detail: "a correction states why; one that does not is a demand with no argument" };
  }

  return {
    ok: true,
    record: {
      correction_id: input.correction_id,
      student_id: input.student_id,
      target_type: input.target_type,
      target_id: input.target_id,
      claim: input.claim.trim(),
      reason: input.reason.trim(),
      claim_kind: input.claim_kind,
      outcome: classifyOutcome(input.target_type, input.claim_kind),
      requested_at: input.at,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE DECLARATION-CORRECTION DRAFT — auto-accepted, always
// ═══════════════════════════════════════════════════════════════════════════

/**
 * F.8 row 3 onto a student-declared record: "that was Friday, not Thursday."
 * `EVENT_SUPERSEDED` is D.2's own "only edit" (C.2); this is that edit,
 * carrying the correction's own words rather than a system-generated
 * paraphrase. `event-contract.ts`'s `SOURCE_RESTRICTIONS` permits
 * `EVENT_SUPERSEDED` from `system` or `migration` only — never `tool` or
 * `student_declaration` — because the SUPERSESSION is a system act even
 * though the correction that caused it came from the student.
 */
export function declarationCorrectionEventDraft(input: {
  client_event_id: string;
  correction: CorrectionRequestRecord;
  supersedes_event_id: string;
  occurred_at: string;
}): Record<string, unknown> {
  return {
    client_event_id: input.client_event_id,
    schema_version: 1,
    occurred_at: input.occurred_at,
    event_type: "EVENT_SUPERSEDED",
    surface: "web",
    source: "system",
    supersedes_event_id: input.supersedes_event_id,
    payload: {
      reason: input.correction.reason,
      correction_id: input.correction.correction_id,
      claim: input.correction.claim,
      target_type: "declaration",
      target_id: input.correction.target_id,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE OCCURRENCE-MISCLASSIFICATION DRAFT
//
// F.8 row 3, verbatim: "a superseding occurrence with the corrected
// `error_type` is appended; the merge re-runs; the old pattern's
// `recurrenceCount` recomputes." `occurrences.supersedes` (007:275) has
// carried this since M1; nothing wrote to it until now.
// ═══════════════════════════════════════════════════════════════════════════

export interface OccurrenceCorrectionInput {
  /** The corrected occurrence's own new id, generated by the caller so the
   *  row and its event can share it. */
  new_occurrence_id: string;
  original_occurrence_id: string;
  correction: CorrectionRequestRecord;
}

/** The ONE field this correction may change on a fresh row: the error
 *  classification. Every other field is copied from the original by the
 *  caller — this function does not see the original row's other columns,
 *  so it cannot invent a change to them. */
export interface OccurrenceCorrectionPatch {
  supersedes: string;
  cognitive_error: string | null;
  execution_error: string | null;
}

export function occurrenceCorrectionPatch(
  correctedCognitiveError: string | null,
  correctedExecutionError: string | null,
  originalOccurrenceId: string,
): OccurrenceCorrectionPatch {
  return {
    supersedes: originalOccurrenceId,
    cognitive_error: correctedCognitiveError,
    execution_error: correctedExecutionError,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE DISPUTE — never silently rejected, never silently wins (O.3.a)
// ═══════════════════════════════════════════════════════════════════════════

export interface DisputeRecordInput {
  dispute_id: string;
  correction: CorrectionRequestRecord;
  /** For a `question`/`assessment_attempt` dispute, the attempt it stands
   *  against. `null` for an `occurrence` dispute. */
  attempt_id: string | null;
  at: string;
}

export interface DisputeRecord {
  dispute_id: string;
  correction_id: string;
  student_id: string;
  target_type: CorrectionTargetType;
  target_id: string;
  attempt_id: string | null;
  reason: string;
  status: "open";
  opened_at: string;
}

/** A dispute is built, never adjudicated, here. `status` is always `"open"`
 *  at construction — resolving one (upholding or standing it down) is a
 *  separate, human/curation act O.3.b reserves, and this module cannot
 *  express that act at all. */
export function buildDispute(input: DisputeRecordInput): DisputeRecord {
  return {
    dispute_id: input.dispute_id,
    correction_id: input.correction.correction_id,
    student_id: input.correction.student_id,
    target_type: input.correction.target_type,
    target_id: input.correction.target_id,
    attempt_id: input.attempt_id,
    reason: input.correction.reason,
    status: "open",
    opened_at: input.at,
  };
}
