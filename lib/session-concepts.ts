// ═══════════════════════════════════════════════════════════════════════════
// M9-5 — CONCEPT PROPOSAL AND CONFIRMATION, AS EVENTS.
//
// EXECUTION_PLAN M9-5: *"Concept proposal and confirmation as **events**, not
// UI flags; rejections retained. Done when: V.2.2, V.2.3 — nothing proposed
// reaches the record unconfirmed."*
//
// This module is architecture E.6 and C.3's `SessionConcept`, transcribed. It
// is not a new design; where this file and Part E disagree, this file is the
// defect.
//
// It holds the DECISION and no I/O — no Supabase client, no clock, no network,
// no `next/*`. `supabase/migrations/022_session_concepts.sql` holds the same
// rules in SQL for the writers this module cannot see, and
// `lib/external-study.ts` is its first caller. The same split M4's
// `lib/auth-routes.ts`, M6's `lib/concept-resolution.ts`, M7's
// `lib/event-contract.ts` and M9-1's `lib/study-session.ts` already use.
//
//
// "EVENTS, NOT UI FLAGS" — WHAT THAT ACTUALLY COSTS, AND WHY IT IS PAID
//
// The cheap version of this feature is a checkbox bound to a boolean column.
// Every failure it produces is silent: nobody can say who proposed a concept,
// nothing records that a student was ever shown one they rejected, and the
// review step — the one place in the product where a student corrects the
// machine — leaves no trace at all. E.6 names that last one: *"silently
// dropping proposals would make the review step UNAUDITABLE."*
//
// So proposal and confirmation are each an APPEND to the academic event stream
// (M7), and the row is a projection of those appends:
//
//   proposal   → the event that carried the claim (an `EXTERNAL_STUDY_DECLARED`
//                for a declaration, a `CONCEPT_ADDED` for a student addition),
//                whose `client_event_id` is stamped on the row FOREVER as
//                `source_client_event_id`.
//   decision   → a `CONCEPT_CONFIRMED` event, `payload.accepted` true or false,
//                whose `client_event_id` becomes `decision_client_event_id`.
//
// 022 §7's decision guard refuses any change of `confirmation_state` that does
// not name a NEW decision event. A confirmation with no event behind it is not
// merely discouraged — the database will not store one.
//
//
// REJECTIONS ARE RETAINED, IN BOTH PLACES
//
// E.6: *"Removing a concept … emits `CONCEPT_CONFIRMED{accepted: false}` — THE
// PROPOSAL AND ITS REJECTION ARE BOTH RETAINED, because the rejection is a
// training signal for concept detection."* §3.2: *"facts are immutable and
// never deleted."*
//
// `rejected` is therefore a STATE and never an absence. There is no delete path
// in this module, and 022 §6's trigger refuses `DELETE` for every writer
// including the service role. `rejectionsIn()` exists so that "retained" is
// something a caller can read rather than a claim in a comment.
//
//
// THE GATE — M9-5's DONE-WHEN, MADE STRUCTURAL
//
// *"Nothing proposed reaches the record unconfirmed."* 022 §4 is the database
// half (`confirmed_session_concepts`, the 020 `confirmed_occurrences` pattern
// reused). `RecordConcept` below is the TypeScript half: a branded type whose
// brand only `confirmedSessionConcepts()` and `asRecordConcept()` can apply, so
// a downstream reader that types its input as `RecordConcept[]` cannot be
// handed a proposal without a deliberate, visible cast. M10's coverage manifest
// is the first such reader.
//
// No imports beyond `./study-session` and `./concept-resolution`. No clock. No
// network. No randomness.
// ═══════════════════════════════════════════════════════════════════════════

import { normaliseConceptText } from "./concept-resolution";
import type { SessionOrigin } from "./study-session";

// ═══════════════════════════════════════════════════════════════════════════
// E.6 — THE FOUR SOURCES, AND WHICH ONES AUTO-CONFIRM
// ═══════════════════════════════════════════════════════════════════════════

export const DETECTION_SOURCES = [
  "tool_tagged",
  "ai_proposed",
  "student_declared",
  "student_added",
] as const;
export type DetectionSource = (typeof DETECTION_SOURCES)[number];

/** C.3's `confirmation_state` enum, verbatim. `rejected` is a state, not an
 *  absence — see the header. */
export const SESSION_CONCEPT_STATES = ["proposed", "confirmed", "rejected"] as const;
export type SessionConceptState = (typeof SESSION_CONCEPT_STATES)[number];

/** C.3's `confirmed_by` enum, verbatim — two values. There is deliberately no
 *  `'ai'`: E.6 says an `ai_proposed` concept auto-confirms *"never — an
 *  inference is not a fact (L1)"*, so a model may never be the confirmer of
 *  anything, and the vocabulary makes that unsayable. */
export const CONFIRMED_BY = ["student", "rule"] as const;
export type ConfirmedBy = (typeof CONFIRMED_BY)[number];

/**
 * E.6's table, as data rather than as a chain of `if`s, so that its one
 * load-bearing row — *"`ai_proposed` … Auto-confirms? **never**"* — is provable
 * by lookup in a test rather than by reading branches.
 *
 *   tool_tagged       yes   the mapping is deterministic; no inference occurred
 *   student_declared  yes   the student is authoritative about WHAT they studied
 *   student_added     yes   same
 *   ai_proposed       NEVER an inference is not a fact (L1)
 */
export const AUTO_CONFIRMS: Readonly<Record<DetectionSource, boolean>> = {
  tool_tagged: true,
  student_declared: true,
  student_added: true,
  ai_proposed: false,
};

/** Who is recorded as having confirmed, per source. `tool_tagged` is a
 *  deterministic lookup, so the confirmer is the RULE; the student's own three
 *  sources record the student. `ai_proposed` has no auto-confirmer at all,
 *  which is why this is `null` and not a fourth enum value. */
export const AUTO_CONFIRMED_BY: Readonly<Record<DetectionSource, ConfirmedBy | null>> = {
  tool_tagged: "rule",
  student_declared: "student",
  student_added: "student",
  ai_proposed: null,
};

// ═══════════════════════════════════════════════════════════════════════════
// C.3 — IDENTITY
//
// *"Identity: `(session_id, concept_ref)` where `concept_ref` is either
// `concept_id UUID` or, when unresolved, a NORMALISED `declared_text`."*
//
// The normalisation is for DEDUPLICATION ONLY and never touches the record.
// `declared_text` is stored verbatim in its own column; `concept_ref` is the
// comparison key. Keeping them apart is the same discipline
// `lib/concept-resolution.ts` keeps between `normaliseConceptText()` (tunable,
// lossy on purpose) and the taxonomy slug (byte-stable forever): a tweak to how
// two strings are compared must never be able to edit what a student said.
// ═══════════════════════════════════════════════════════════════════════════

/** The prefix that keeps an unresolved ref from ever colliding with a UUID. */
export const UNRESOLVED_REF_PREFIX = "text:";

export function conceptRefFor(conceptId: string | null, declaredText: string | null): string | null {
  if (typeof conceptId === "string" && conceptId.length > 0) return conceptId;
  if (typeof declaredText !== "string") return null;
  const normalised = normaliseConceptText(declaredText);
  return normalised.length > 0 ? `${UNRESOLVED_REF_PREFIX}${normalised}` : null;
}

export const isUnresolvedRef = (ref: string): boolean => ref.startsWith(UNRESOLVED_REF_PREFIX);

// ═══════════════════════════════════════════════════════════════════════════
// THE ROW
// ═══════════════════════════════════════════════════════════════════════════

/** 022's table, as this module needs it. */
export interface SessionConceptRow {
  session_concept_id: string;
  session_id: string;
  student_id: string;
  /** B.4's LEGAL NULL (V.2.4). The system does not invent a match to avoid it. */
  concept_id: string | null;
  /** The student's own words, VERBATIM. Never normalised, never trimmed here,
   *  never truncated here, and immutable once written (022 §7). */
  declared_text: string | null;
  concept_ref: string;
  detection_source: DetectionSource;
  confirmation_state: SessionConceptState;
  /** M9-4's `origin = 'declaration'`, propagated to the concept. */
  origin: SessionOrigin;
  proposed_at: string;
  confirmed_at: string | null;
  rejected_at: string | null;
  confirmed_by: ConfirmedBy | null;
  assessment_required: boolean;
  /** The `client_event_id` of the event that PROPOSED this concept. */
  source_client_event_id: string;
  /** The `client_event_id` of the `CONCEPT_CONFIRMED` event that decided it. */
  decision_client_event_id: string | null;
}

/** What is INSERTed. `session_concept_id`, `created_at` and `updated_at` are
 *  the table's (022 §1), so they are absent even from this type. */
export type SessionConceptDraft = Omit<SessionConceptRow, "session_concept_id">;

export interface ProposalInput {
  session_id: string;
  student_id: string;
  concept_id: string | null;
  /** Verbatim, as the student typed it. Passed through untouched. */
  declared_text: string | null;
  detection_source: DetectionSource;
  origin: SessionOrigin;
  /** ISO. Supplied by the caller — this module owns no clock. */
  at: string;
  /** The `client_event_id` of the proposing event. */
  source_client_event_id: string;
  /** Required when the source auto-confirms: the `CONCEPT_CONFIRMED` event that
   *  records the auto-confirmation. E.6's three auto-confirming sources still
   *  produce an event, because *"as events, not UI flags"* has no exemption for
   *  a decision the machine made on the student's behalf. */
  decision_client_event_id?: string | null;
}

export type ProposalOutcome =
  | { ok: true; draft: SessionConceptDraft }
  | {
      ok: false;
      /** `unidentifiable` — neither a concept id nor usable declared text, so
       *  022's `session_concepts_identifiable` CHECK would refuse it anyway.
       *  `missing_decision_event` — an auto-confirming source with no event to
       *  point at, which 022 §7's birth guard refuses. */
      reason: "unidentifiable" | "missing_decision_event";
    };

/**
 * E.6's table, applied. **It cannot throw**, for `applySessionTransition()`'s
 * reason: the caller is an endpoint, and an endpoint that must wrap this in a
 * `try` is one refactor away from swallowing the refusal.
 *
 * The three invariants it establishes, each of which 022 also refuses at the
 * row level so that a writer skipping this function gains nothing:
 *
 *   1. `ai_proposed` is BORN `proposed`. E.6: auto-confirms *"never"*.
 *   2. `confirmation_state = 'confirmed'` IMPLIES `assessment_required = true`.
 *      C.3 calls this *"a database CHECK, not a code convention"*, and it is
 *      both: 022 §2 is the CHECK and this is the code that never violates it.
 *      F.2 is the rule it protects — every confirmed concept must appear in the
 *      assessment with at least one question.
 *   3. A decided row names the event that decided it.
 */
export function buildProposal(input: ProposalInput): ProposalOutcome {
  const ref = conceptRefFor(input.concept_id, input.declared_text);
  if (ref === null) return { ok: false, reason: "unidentifiable" };

  const auto = AUTO_CONFIRMS[input.detection_source] === true;
  const decision = input.decision_client_event_id ?? null;

  if (auto && (decision === null || decision.length === 0)) {
    return { ok: false, reason: "missing_decision_event" };
  }

  const state: SessionConceptState = auto ? "confirmed" : "proposed";

  return {
    ok: true,
    draft: {
      session_id: input.session_id,
      student_id: input.student_id,
      concept_id: input.concept_id,
      // Verbatim. Not `.trim()`, not `.slice()`, not `.normalize()`.
      declared_text: input.declared_text,
      concept_ref: ref,
      detection_source: input.detection_source,
      confirmation_state: state,
      origin: input.origin,
      proposed_at: input.at,
      confirmed_at: auto ? input.at : null,
      rejected_at: null,
      confirmed_by: auto ? AUTO_CONFIRMED_BY[input.detection_source] : null,
      // INVARIANT 2. Written from the state rather than from a parameter, so a
      // caller cannot supply a confirmed concept that is not assessed.
      assessment_required: state === "confirmed",
      source_client_event_id: input.source_client_event_id,
      decision_client_event_id: auto ? decision : null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// V.2.3 — THE DECISION
//
// *"Student confirms Torque, rejects Moment of Inertia. TWO `CONCEPT_CONFIRMED`
// events, one `accepted: true`, one `accepted: false`. The rejection is
// retained."*
//
// One event type for both outcomes, which is E.6's own choice and worth naming:
// a separate `CONCEPT_REJECTED` type would let a reader count confirmations
// without ever loading rejections, and the asymmetry is exactly how a rejection
// becomes invisible. `payload.accepted` is a boolean on one type, so any reader
// of the decision stream sees both halves or neither.
// ═══════════════════════════════════════════════════════════════════════════

/** The `payload` core `lib/event-contract.ts` requires for `CONCEPT_CONFIRMED`
 *  — `["session_concept_ref", "accepted"]` — read from that file rather than
 *  guessed, and re-declared here so a test can compare the two. */
export const CONCEPT_CONFIRMED_PAYLOAD_KEYS = ["session_concept_ref", "accepted"] as const;

export interface ConfirmationEventInput {
  /** C.3's `concept_ref`. Not the row's surrogate id: the ref is derivable from
   *  what the student saw, and the surrogate id is not, so a retry from a second
   *  tab produces the same event rather than a second one. */
  session_concept_ref: string;
  accepted: boolean;
  session_id: string;
  occurred_at: string;
  /** Carried so a rejection is legible without a join — E.6's *"training signal
   *  for concept detection"* is worth nothing if reading it needs the row. */
  detection_source: DetectionSource;
  declared_text?: string | null;
  concept_id?: string | null;
}

/**
 * The `OutboxDraft` (M7) for one decision. Deliberately NOT a
 * `ClientEventDraft`: `client_event_id` is derived by the outbox from the draft
 * plus a persisted nonce, and a module that assigned its own id would break the
 * retry-stability `lib/event-outbox.ts` exists to provide.
 *
 * `source: 'student_declaration'` because the decision IS the student — E.6's
 * whole point is that the review step is where the human corrects the machine.
 * `confirmation: 'student_confirmed'` on an acceptance and `'unconfirmed'` on a
 * rejection: D.1.d says no downstream subsystem may treat an `unconfirmed`
 * event as evidence, and a rejection is the one decision that must never look
 * like a confirmation to a careless reader.
 */
export function confirmationEventDraft(input: ConfirmationEventInput): {
  event_type: "CONCEPT_CONFIRMED";
  surface: "web";
  source: "student_declaration";
  occurred_at: string;
  concept_id: string | null;
  declared_text: string | null;
  confidence: null;
  confirmation: "student_confirmed" | "unconfirmed";
  payload: Record<string, unknown>;
} {
  return {
    event_type: "CONCEPT_CONFIRMED",
    surface: "web",
    source: "student_declaration",
    occurred_at: input.occurred_at,
    concept_id: input.concept_id ?? null,
    // Verbatim, again. The event and the row carry the same bytes.
    declared_text: input.declared_text ?? null,
    // D.1.c — the SYSTEM's confidence. A student's decision is not a
    // probability, and null is the honest value.
    confidence: null,
    confirmation: input.accepted ? "student_confirmed" : "unconfirmed",
    payload: {
      session_concept_ref: input.session_concept_ref,
      accepted: input.accepted,
      session_id: input.session_id,
      detection_source: input.detection_source,
    },
  };
}

/** The columns a decision writes. Nothing else on the row may move — 022 §7
 *  refuses every other change, including to `declared_text`. */
export interface SessionConceptPatch {
  confirmation_state: SessionConceptState;
  confirmed_at?: string;
  rejected_at?: string;
  confirmed_by?: ConfirmedBy;
  assessment_required: boolean;
  decision_client_event_id: string;
}

export type DecisionOutcome =
  | { kind: "decided"; from: SessionConceptState; to: SessionConceptState; patch: SessionConceptPatch }
  | {
      kind: "noop";
      /** Where the row actually is. E.7.1's shape, one level down: a second tab
       *  pressing the same button is told the state, never given an error. */
      state: SessionConceptState;
      why: "unchanged" | "same_decision_event";
    };

/**
 * Apply one student decision to one row. **It cannot throw.**
 *
 * A student who changes their mind is not an error and not a rollback: E.6
 * permits removing a concept at REVIEWING, so `confirmed → rejected` is a real
 * edge, and re-adding one is `rejected → confirmed`. What is refused — here and
 * by 022 §7 — is a return to `proposed`. "Nobody has decided yet" is a fact
 * about the past, and §3.2 does not let the product edit those; the row
 * accumulates both timestamps so the history is legible from the row as well as
 * from the stream.
 */
export function applyConceptDecision(
  row: Pick<SessionConceptRow, "confirmation_state" | "confirmed_at" | "rejected_at" | "decision_client_event_id">,
  accepted: boolean,
  atIso: string,
  decisionClientEventId: string,
): DecisionOutcome {
  const from = row.confirmation_state;
  const to: SessionConceptState = accepted ? "confirmed" : "rejected";

  if (from === to) return { kind: "noop", state: from, why: "unchanged" };

  // The same event applied twice is a retry, not a second decision (D.3.6 —
  // *"retry-safe by construction"*).
  if (row.decision_client_event_id === decisionClientEventId) {
    return { kind: "noop", state: from, why: "same_decision_event" };
  }

  const patch: SessionConceptPatch = {
    confirmation_state: to,
    // INVARIANT 2 again, on the other write path. A confirmation always carries
    // its assessment obligation; a rejection always drops it, because F.2's
    // guarantee is about the CONFIRMED set and a rejected concept is not in it.
    assessment_required: to === "confirmed",
    decision_client_event_id: decisionClientEventId,
  };

  // Written once each, never overwritten — 022 §7 refuses a second write to
  // either, so a re-confirmation keeps the FIRST confirmation's timestamp and
  // the record still says when the student first said yes.
  if (to === "confirmed") {
    if (row.confirmed_at === null) patch.confirmed_at = atIso;
    patch.confirmed_by = "student";
  } else if (row.rejected_at === null) {
    patch.rejected_at = atIso;
  }

  return { kind: "decided", from, to, patch };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE GATE — *"nothing proposed reaches the record unconfirmed"*
//
// 022 §4's `confirmed_session_concepts` view is the database half and binds
// every SQL reader. This is the TypeScript half and binds every code reader, by
// the only mechanism a structural type system offers: a brand no caller can
// forge without writing a cast that a reviewer can see.
//
// M10's coverage manifest, M12's record projection and M14's score all type
// their input as `RecordConcept[]`. A proposal is a `SessionConceptRow` and is
// not assignable to it. Passing one requires `as unknown as RecordConcept`,
// which is a visible, greppable act — and a test greps for it.
// ═══════════════════════════════════════════════════════════════════════════

declare const RECORD_FACT: unique symbol;

/**
 * A `SessionConceptRow` that has been through the gate. The brand is
 * `declare`d and never emitted, so it costs nothing at runtime and cannot be
 * constructed by an object literal.
 */
export type RecordConcept = SessionConceptRow & { readonly [RECORD_FACT]: true };

export const isConfirmed = (row: SessionConceptRow): boolean =>
  row.confirmation_state === "confirmed";

/**
 * 022 §4's confirmed-only view, named ONCE, here.
 *
 * Additive, and it changes no behaviour — it exists because the gate has two
 * halves and only one of them was previously reachable from another module. A
 * SQL reader elsewhere in the codebase had to spell the view out as a string
 * literal, and a view name that contains the raw table's name as a substring
 * makes "does this file reach past the view?" unanswerable by inspection. With
 * the name exported, every downstream reader imports the view rather than
 * retyping it, and the raw table appears in exactly two places in the repo:
 * 022, and this module.
 *
 * M10's `app/api/assessment/generate/route.ts` is the first such reader.
 */
export const CONFIRMED_SESSION_CONCEPTS_VIEW = "confirmed_session_concepts";

/**
 * The ONLY way to obtain `RecordConcept`s in bulk. Mirrors
 * `SELECT * FROM confirmed_session_concepts` exactly, and a test asserts the
 * two predicates agree by reading 022's view definition.
 */
export function confirmedSessionConcepts(rows: readonly SessionConceptRow[]): RecordConcept[] {
  return rows.filter(isConfirmed) as RecordConcept[];
}

/** The single-row form. Returns `null` rather than throwing — a proposal
 *  reaching a record reader is a programming error, but the honest answer to
 *  "is this a fact?" is "no", not an exception. */
export function asRecordConcept(row: SessionConceptRow): RecordConcept | null {
  return isConfirmed(row) ? (row as RecordConcept) : null;
}

/** E.6's retained rejections, readable. 022 §4's `rejected_session_concepts`
 *  view is the SQL half. Deliberately NOT branded: a rejection is retained
 *  evidence of a decision, and it is never coverage. */
export function rejectionsIn(rows: readonly SessionConceptRow[]): SessionConceptRow[] {
  return rows.filter(r => r.confirmation_state === "rejected");
}

export function proposalsIn(rows: readonly SessionConceptRow[]): SessionConceptRow[] {
  return rows.filter(r => r.confirmation_state === "proposed");
}

/** V.2.4's legal unresolved state, counted. B.4: *"an unresolved concept must be
 *  representable"* — and a curator needs to find them. */
export function unresolvedIn(rows: readonly SessionConceptRow[]): SessionConceptRow[] {
  return rows.filter(r => r.concept_id === null);
}

/**
 * F.2's coverage guarantee, at its input. The confirmed set is what M10-1
 * freezes into `Assessment.coverage_manifest` *before any model call*, so this
 * is the function that decides what the assessment must cover.
 *
 * It returns refs and not rows on purpose: a manifest is a list of things to
 * be covered, and handing M10 the whole row would invite it to read
 * `declared_text` into a prompt, which is a different subsystem's decision.
 */
export function coverageRefsFor(rows: readonly SessionConceptRow[]): string[] {
  return confirmedSessionConcepts(rows).map(r => r.concept_ref);
}

// ═══════════════════════════════════════════════════════════════════════════
// WHAT A SESSION CONCEPT CONTRIBUTES TO THE SCORE
//
// Nothing. Not a positive term, not a negative one, not a count.
//
// V.2.5 is the load-bearing assertion of this whole milestone — *"the score has
// not moved. A declaration is not evidence."* — and E.5.a says why it holds:
// *"a declaration is not `E`-class (D.2.b) and the only route from declaration
// to score movement runs through an assessment they must actually pass. The
// system trusts the student about WHAT they studied, and never about whether
// they LEARNED it."*
//
// The guarantee is structural in the same way `SessionScoreContribution` is:
// this type is a union of exactly ONE arm, carrying no sign, no magnitude and
// no weight. There is nothing for M14 to read. Paying a term for a confirmed
// concept requires first widening a type whose header says why it must not
// happen — a visible edit, in a reviewed file, rather than a line of arithmetic
// somewhere else.
// ═══════════════════════════════════════════════════════════════════════════

/** One arm. Not two. */
export type ConceptScoreEffect = { kind: "none" };

export function conceptScoreEffect(_row: SessionConceptRow): ConceptScoreEffect {
  return { kind: "none" };
}

/** The same fact phrased the way a reviewer will ask it, for both directions. */
export const confirmingAConceptMovesScore = (): false => false;
export const rejectingAConceptMovesScore = (): false => false;
