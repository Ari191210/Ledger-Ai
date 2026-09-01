// ═══════════════════════════════════════════════════════════════════════════
// M9-4 — EXTERNAL STUDY, DECLARED.
//
// EXECUTION_PLAN M9-4: *"`EXTERNAL_STUDY_DECLARED` with `declared_text`
// verbatim; `origin = 'declaration'`. Done when: V.2.1."*
//
// This module is architecture E.5, transcribed. It is not a new design; where
// this file and Part E disagree, this file is the defect.
//
// Governing statement, ratified 2026-08-10 — `PRODUCT_PRINCIPLES` §3.5,
// recorded as a decision at `PRODUCT_DECISIONS` §9.1: *"A student's learning
// counts wherever it happened… StudyLedger owns the academic memory, never the
// student's physical learning environment."*
//
// It holds the DECISION and no I/O — no Supabase client, no clock, no network,
// no `next/*`. `lib/event-outbox.ts` assigns the `client_event_id`,
// `lib/events.ts` writes the event, `lib/session-resolver.ts` decides the
// session, and `lib/session-concepts.ts` builds the proposals. This file
// decides only what a declaration IS.
//
//
// THE ONE RULE THIS FILE EXISTS TO KEEP: `declared_text` IS THE STUDENT'S,
// BYTE FOR BYTE
//
// V.2.1: *"Student types 'I did Torque in coaching tonight.' →
// `EXTERNAL_STUDY_DECLARED` with `declared_text` VERBATIM."*
//
// So this module VALIDATES and REFUSES; it never repairs. That is D.3's own
// posture — *"each step rejects rather than repairs … it is never coerced into
// validity"* — applied to the one string in this product that belongs to the
// student rather than to the system. Concretely:
//
//   · no `.trim()`. Leading and trailing whitespace is what they typed.
//   · no `.slice()`. An over-long declaration is REFUSED, with its length
//     reported, and never silently truncated into a shorter claim.
//   · no `.normalize()`, no case folding, no punctuation stripping. All three
//     happen in `normaliseConceptText()` — on a COPY, for comparison, in
//     `conceptRefFor()` — and the copy never becomes the record.
//   · no default. There is no "untitled declaration"; an empty one is refused.
//
// `emptinessOf()` is the one place a trimmed form is computed, and it is used
// only to answer "did they type anything at all?" — the trimmed string is
// discarded, never returned and never stored.
//
// This is consistent with M7 by construction rather than by intention:
// `validateEventDraft()` in `lib/event-contract.ts` passes `declared_text`
// through untouched (it checks type and a 2000-character cap and nothing else),
// and M7 part 2's backfill preserves the student's words verbatim in
// `payload.legacy.original` for exactly this reason. A test asserts that the
// bytes this module emits are `===` the bytes it was given, over a corpus that
// includes leading and trailing spaces, newlines, Devanagari, emoji, combining
// marks, and both apostrophe forms.
//
//
// AND THE RULE THAT SHAPES EVERYTHING ELSE: A DECLARATION MOVES NO SCORE
//
// V.2.5, the milestone's load-bearing assertion: *"the score has not moved. A
// declaration is not evidence."* §9.1: *"It scores nothing by itself."* E.5.a
// calls the property STRUCTURAL and says why:
//
//     *"A student cannot inflate their record by declaring study, because a
//      declaration is not `E`-class (D.2.b) and the only route from declaration
//      to score movement runs through an assessment they must actually pass.
//      The system trusts the student about WHAT they studied, and never about
//      whether they LEARNED it."*
//
// Three independent mechanisms, none of which is "we did not write the scoring
// code":
//
//   1. `EXTERNAL_STUDY_DECLARED` is ABSENT from `EVIDENCE_BEARING_TYPES` and
//      PRESENT in `CONFIRMATION_REQUIRED_TYPES` in `lib/event-contract.ts`
//      (M7's file, unedited by this pass). D.1.d: no downstream subsystem may
//      treat an `unconfirmed` event as evidence.
//   2. Every event this module builds carries `confirmation: 'unconfirmed'`
//      and `confidence: null`, and `DECLARATION_CONFIRMATION` is a constant of
//      literal type so a caller cannot widen it.
//   3. `DeclarationScoreEffect` is a union of EXACTLY ONE ARM, `{ kind:
//      'none' }`, carrying no sign, no magnitude and no weight —
//      `SESSION_SCORE_CONTRACT`'s shape in `lib/study-session.ts`, reused. M14
//      cannot pay a term for a declaration because there is no term to read,
//      and adding one means widening a type whose header says why it must not
//      happen.
//
// This is the same integrity posture as M8's draft-occurrence gate and M9-1's
// reaping contract: a claim is not evidence until something independent
// verifies it, and the verifier is M10.
//
// No imports beyond `./concept-resolution`, `./session-concepts` and
// `./session-resolver` types. No clock. No network. No randomness. No AI call.
// ═══════════════════════════════════════════════════════════════════════════

import {
  resolveConceptText,
  type ConceptResolutionResult,
  type ResolutionIndex,
} from "./concept-resolution";
import {
  buildProposal,
  type ProposalOutcome,
  type SessionConceptDraft,
} from "./session-concepts";
import type { SessionOrigin } from "./study-session";

// ═══════════════════════════════════════════════════════════════════════════
// THE CONSTANTS, AS LITERAL TYPES
// ═══════════════════════════════════════════════════════════════════════════

export const EXTERNAL_STUDY_DECLARED = "EXTERNAL_STUDY_DECLARED" as const;

/** E.5.2: *"If no session is live, the declaration OPENS ONE (`origin =
 *  'declaration'`). If one is live, it JOINS it."* This is that value, and it
 *  is the same string `defaultOriginFor()` in `lib/session-resolver.ts` already
 *  returns for this event type — a test asserts the two agree rather than
 *  letting a second literal drift. */
export const DECLARATION_ORIGIN: SessionOrigin = "declaration";

/** D.1's `source` for a thing the student said. */
export const DECLARATION_SOURCE = "student_declaration" as const;

/** D.1.d. Typed as the literal so `DECLARATION_CONFIRMATION` cannot be widened
 *  to `'student_confirmed'` by a caller who finds the refusal inconvenient. A
 *  declaration is a CLAIM; §3.5 depends on §3.1 and §3.2 rather than relaxing
 *  them, and the confirmation state is where that dependence is written down. */
export const DECLARATION_CONFIRMATION = "unconfirmed" as const;

/**
 * The cap `lib/event-contract.ts` enforces on `declared_text`, restated here so
 * this module can REFUSE at its own boundary rather than let the contract
 * quarantine the event later. Duplicated deliberately and asserted equal by a
 * test — the alternative is exporting a constant from M7's file, which is an
 * edit to M7's file.
 *
 * Refusal and not truncation: a truncated declaration is a claim the student
 * did not make.
 */
export const DECLARED_TEXT_MAX_CHARS = 2000;

// ═══════════════════════════════════════════════════════════════════════════
// THE TEXT
// ═══════════════════════════════════════════════════════════════════════════

export type DeclaredTextRefusal =
  /** Not a string at all. */
  | "not_a_string"
  /** Nothing but whitespace. There is no honest concept in an empty claim. */
  | "empty"
  /** Over the cap. REFUSED, never truncated. */
  | "too_long";

export type DeclaredTextCheck =
  | {
      ok: true;
      /** `===` the input. This module returns the caller's own string object,
       *  not a copy and not a repair. */
      text: string;
    }
  | { ok: false; reason: DeclaredTextRefusal; length: number };

/** The ONE place a trimmed form is computed. The trimmed string answers a
 *  question and is then discarded; it is never returned, never stored and never
 *  compared against anything else. */
function emptinessOf(text: string): boolean {
  return text.trim().length === 0;
}

/**
 * Validate a declaration's text without touching it.
 *
 * Every branch either returns the input unchanged or refuses. There is no third
 * branch, and there is deliberately no `normalise` option: a caller that wanted
 * one would be asking this function to edit the record.
 */
export function checkDeclaredText(raw: unknown): DeclaredTextCheck {
  if (typeof raw !== "string") return { ok: false, reason: "not_a_string", length: 0 };
  if (emptinessOf(raw)) return { ok: false, reason: "empty", length: raw.length };
  if (raw.length > DECLARED_TEXT_MAX_CHARS) {
    return { ok: false, reason: "too_long", length: raw.length };
  }
  return { ok: true, text: raw };
}

// ═══════════════════════════════════════════════════════════════════════════
// E.5.1 — THE EVENT
//
// *"The student declares: free text, a subject, optionally a time window
// ('Torque, from the coaching class this evening'). This emits
// `EXTERNAL_STUDY_DECLARED` with `declared_text` verbatim."*
// ═══════════════════════════════════════════════════════════════════════════

export interface DeclarationInput {
  /** Exactly what the student typed. */
  declared_text: unknown;
  /** E.5.1's optional context. Neither is inferred from the text — inferring a
   *  subject from free text is a guess, and B.4 refuses guesses. */
  subject?: string | null;
  chapter?: string | null;
  /** D.1.b's client claim. ISO. This module owns no clock. */
  occurred_at: string;
  device_id?: string | null;
  /** E.5.1's *"optionally a time window"*, retained as facts in the payload and
   *  never used to fabricate an `occurred_at`. */
  window_start?: string | null;
  window_end?: string | null;
}

/**
 * The `OutboxDraft` shape (M7) for one declaration.
 *
 * NOT a `ClientEventDraft`: `client_event_id` is derived by
 * `lib/event-outbox.ts` from the draft plus a persisted nonce, and a module
 * that minted its own id would break the retry stability that file exists to
 * provide. This is the same boundary `confirmationEventDraft()` observes.
 */
export interface DeclarationEventDraft {
  event_type: typeof EXTERNAL_STUDY_DECLARED;
  surface: "web";
  source: typeof DECLARATION_SOURCE;
  occurred_at: string;
  /** VERBATIM, on the envelope. */
  declared_text: string;
  subject: string | null;
  chapter: string | null;
  device_id: string | null;
  /** B.4's legal null. A declaration NEVER carries a resolved `concept_id`:
   *  resolution is a later, separately-recorded inference (E.5.3), and stamping
   *  a guess on the raw claim would make the claim and the inference
   *  indistinguishable forever. */
  concept_id: null;
  /** D.1.c — the SYSTEM's confidence in a student's claim about their own
   *  evening. There is none to state, and null is the honest value. */
  confidence: null;
  confirmation: typeof DECLARATION_CONFIRMATION;
  payload: {
    /** D.2's required core for this type, read from
     *  `REQUIRED_PAYLOAD_KEYS.EXTERNAL_STUDY_DECLARED` in
     *  `lib/event-contract.ts` rather than guessed. VERBATIM, again — the
     *  envelope and the payload carry the same bytes, so a reader of either is
     *  reading the student's words and not a processed form of them. */
    declared_text: string;
    subject: string | null;
    chapter: string | null;
    window_start: string | null;
    window_end: string | null;
    /** M9-4's origin, on the event itself, so a projection rebuilding the
     *  session from the stream (B.3) can see it without loading a row. */
    origin: SessionOrigin;
  };
}

export type DeclarationOutcome =
  | { ok: true; event: DeclarationEventDraft }
  | { ok: false; reason: DeclaredTextRefusal; length: number };

/**
 * Build the declaration event. **It cannot throw**, for the reason every
 * decision function in this milestone cannot: the caller is an endpoint.
 */
export function buildDeclarationEvent(input: DeclarationInput): DeclarationOutcome {
  const check = checkDeclaredText(input.declared_text);
  if (!check.ok) return { ok: false, reason: check.reason, length: check.length };

  const text = check.text;

  return {
    ok: true,
    event: {
      event_type: EXTERNAL_STUDY_DECLARED,
      surface: "web",
      source: DECLARATION_SOURCE,
      occurred_at: input.occurred_at,
      declared_text: text,
      subject: input.subject ?? null,
      chapter: input.chapter ?? null,
      device_id: input.device_id ?? null,
      concept_id: null,
      confidence: null,
      confirmation: DECLARATION_CONFIRMATION,
      payload: {
        declared_text: text,
        subject: input.subject ?? null,
        chapter: input.chapter ?? null,
        window_start: input.window_start ?? null,
        window_end: input.window_end ?? null,
        origin: DECLARATION_ORIGIN,
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// E.5.3 — THE PROPOSALS
//
// *"The AI boundary proposes concept resolutions from `declared_text` against
// the taxonomy. These land as `SessionConcept` rows with `detection_source =
// 'ai_proposed'`, `confirmation_state = 'proposed'`. AN UNRESOLVED DECLARATION
// IS LEGAL: `concept_id = NULL`, `declared_text` retained (B.4)."*
//
// THE PROPOSER IS M6'S DETERMINISTIC RESOLVER, NOT A MODEL, AND THAT IS A
// SCOPE DECISION RATHER THAN AN OMISSION. `lib/concept-resolution.ts`'s header
// argues it at length and the argument is unchanged here: every model call
// belongs to the typed capability boundary (Part Q / M15), which does not
// exist; B.4 requires resolution to be DETERMINISTIC, and an embedding is
// reproducible only against a pinned model, so a model swap would silently
// re-resolve history. The `detection_source` value stays `'ai_proposed'`
// because the CONFIRMATION SEMANTICS are what the value governs — E.6:
// *"inferred from free text or activity … auto-confirms NEVER"* — and those are
// identical whichever proposer is behind it. When M15 lands, the proposer is
// substituted and no schema, no state and no caller changes.
//
// WHY AN EXACT MATCH IS STILL `ai_proposed`, WHICH IS THE SUBTLE PART. V.2.2
// has the AI propose *Torque* — a concept whose name the student typed exactly
// — and requires it to land `proposed`, not `confirmed`. E.6's `student_declared`
// row (*"the student NAMED it"*, auto-confirms) is for a student PICKING a
// taxonomy node from a list: an explicit act, with the node in front of them.
// Reading a node out of a sentence is an INFERENCE regardless of how strong the
// match is — the tier says how confident, not whether inference occurred — so
// every proposal derived from free text enters as `ai_proposed`/`proposed`,
// including the exact ones. `declareConceptExplicitly()` below is the other
// path, and it is the only one that auto-confirms.
// ═══════════════════════════════════════════════════════════════════════════

export interface ProposalContext {
  session_id: string;
  student_id: string;
  /** The `client_event_id` of the `EXTERNAL_STUDY_DECLARED` event these
   *  proposals came from. Stamped on every row (022 §1) so a concept is always
   *  traceable back to the exact claim that produced it. */
  source_client_event_id: string;
  /** ISO. Owned by the caller. */
  at: string;
  /** M9-4's *"`origin = 'declaration'` should propagate downstream"*. Defaulted
   *  rather than required, because the only correct value for a proposal built
   *  from a declaration is `'declaration'`. */
  origin?: SessionOrigin;
}

/**
 * One declaration → the `SessionConcept` drafts it proposes.
 *
 * Takes the M6 resolution index rather than a database: the whole of E.5.3 is a
 * pure function of (the student's words, the taxonomy), which is what makes
 * V.2.2 and V.2.4 provable with no Supabase project in reach.
 *
 * V.2.4 IS THE CASE THAT MATTERS AND IT IS NOT AN ERROR PATH. *"Student types
 * 'and the thing about wobbling tops' — no taxonomy match. A `SessionConcept`
 * EXISTS with `concept_id = NULL` and `declared_text` preserved. The system does
 * NOT guess a match."* An unresolved declaration therefore produces a proposal
 * exactly like a resolved one, differing only in a null — and it goes on to earn
 * assessment coverage in the ordinary way (V.2.6, M10). Returning nothing here
 * would be the product quietly deciding that what it could not name did not
 * happen.
 */
export function proposalsFromDeclaration(
  declaredText: string,
  index: ResolutionIndex,
  ctx: ProposalContext,
): { proposals: SessionConceptDraft[]; resolution: ConceptResolutionResult; refusals: ProposalOutcome[] } {
  const resolution = resolveConceptText(declaredText, index);
  const refusals: ProposalOutcome[] = [];

  const outcome = buildProposal({
    session_id: ctx.session_id,
    student_id: ctx.student_id,
    // B.4's legal null flows straight through. `resolveConceptText()` returns
    // `conceptId: null` on `unresolved` and never a best guess — the refusal is
    // M6's, and this module does not second-guess it.
    concept_id: resolution.status === "resolved" ? resolution.conceptId : null,
    // VERBATIM. `resolution.declaredText` is documented by M6 as *"the student's
    // words, VERBATIM. Never normalised, never discarded"*, and a test asserts
    // it is `===` the input on both branches.
    declared_text: resolution.declaredText,
    detection_source: "ai_proposed",
    origin: ctx.origin ?? DECLARATION_ORIGIN,
    at: ctx.at,
    source_client_event_id: ctx.source_client_event_id,
  });

  if (!outcome.ok) {
    refusals.push(outcome);
    return { proposals: [], resolution, refusals };
  }

  return { proposals: [outcome.draft], resolution, refusals };
}

/**
 * E.6's `student_declared` row: *"the student NAMED it … the student is
 * authoritative about WHAT they studied"*, auto-confirms **yes**.
 *
 * The other path, and the only one that produces a confirmed row without a
 * review step. It requires a `concept_id` — a taxonomy node the student picked,
 * not a string this module resolved — and it still emits a `CONCEPT_CONFIRMED`
 * event, whose `client_event_id` the caller passes in. *"Events, not UI flags"*
 * has no exemption for a confirmation the machine made on the student's behalf.
 */
export function declareConceptExplicitly(input: {
  session_id: string;
  student_id: string;
  concept_id: string;
  /** What the student typed alongside their pick, if anything. Verbatim. */
  declared_text?: string | null;
  origin?: SessionOrigin;
  at: string;
  source_client_event_id: string;
  decision_client_event_id: string;
}): ProposalOutcome {
  return buildProposal({
    session_id: input.session_id,
    student_id: input.student_id,
    concept_id: input.concept_id,
    declared_text: input.declared_text ?? null,
    detection_source: "student_declared",
    origin: input.origin ?? DECLARATION_ORIGIN,
    at: input.at,
    source_client_event_id: input.source_client_event_id,
    decision_client_event_id: input.decision_client_event_id,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// V.2.5 — *"THE SCORE HAS NOT MOVED. A DECLARATION IS NOT EVIDENCE."*
//
// The header argues the three mechanisms. This is the third, and the only one
// that is a type.
//
// A UNION OF EXACTLY ONE ARM. Not two arms where one happens to be zero — a
// zero is a number, and a number is something a later pass can change without
// changing a shape. There is no sign here, no magnitude, no weight, no
// dimension name and no second arm, so the sentence *"a declaration moved the
// score by X"* has no representation in this codebase. Widening it is a visible
// edit to a file whose header says why it must not happen, which is the same
// mechanism `SESSION_SCORE_CONTRACT` uses in `lib/study-session.ts` and for the
// same audience: M14.
//
// **M14 MUST NOT** derive any dimension from a declaration count, a declared-
// concept count, a declaration-to-confirmation ratio, or a "declared but not
// verified" deficit. §3.3 is the binding rule — *"a student who logs honestly
// may never score below a student who logs nothing"* — and §9.1 states the
// positive half: *"It scores nothing by itself. A declared concept is unverified
// until it has been ASSESSED; only then does it become verified academic
// evidence and reach the record or the Ledger Score."*
// ═══════════════════════════════════════════════════════════════════════════

/** One arm. Not two. */
export type DeclarationScoreEffect = { kind: "none" };

export function declarationScoreEffect(_event: DeclarationEventDraft): DeclarationScoreEffect {
  return { kind: "none" };
}

/** D.2.b, restated where a reader of this module will look for it.
 *  `EXTERNAL_STUDY_DECLARED` is absent from `EVIDENCE_BEARING_TYPES` in
 *  `lib/event-contract.ts`; a test reads that list and asserts it. */
export const DECLARATION_IS_EVIDENCE_BEARING = false as const;

/** The same fact phrased the way a reviewer will ask it. */
export const declaringExternalStudyMovesScore = (): false => false;

/**
 * E.5.a's split, as one function, because it is the sentence the whole feature
 * turns on: *"The system trusts the student about WHAT they studied, and never
 * about whether they LEARNED it."*
 *
 * A declaration is authoritative about the first and silent about the second,
 * and the only thing that can speak to the second is an assessment (M10).
 */
export function whatADeclarationEstablishes(): {
  studied: "student_authoritative";
  learned: "requires_assessment";
} {
  return { studied: "student_authoritative", learned: "requires_assessment" };
}
