// ═══════════════════════════════════════════════════════════════════════════
// M10-6 — PROVENANCE, AND THE RETROACTIVE REVOCATION PATH.
//
// EXECUTION_PLAN M10-6: *"Provenance on every generated item + the retroactive
// revocation path. Done when: T4 mitigation; F.4.b."*
//
// T4: *"AI-generated assessment questions are wrong. A wrong answer key creates
// a false `occurrence`, a false pattern, a false severity ranking, and a false
// score movement — and Mistake DNA's whole value is that its diagnoses are
// trustworthy. Mitigation: the seven gates (F.4), closed-form-only in V1
// (F.4.a), MANDATORY PROVENANCE, and THE RETROACTIVE REVOCATION PATH (F.4.b)."*
//
// F.4.b: *"If prompt version *v* is later found defective,
// `AssessmentQuestion.provenance.prompt_version = v` identifies every affected
// question; the affected attempts are marked `evidence_revoked` by appending
// `EVENT_SUPERSEDED` events; and every `ScoreSnapshot` whose
// `input_watermark_event_id` postdates the first affected event is recomputed.
// **Nothing is edited in place, and the history shows that a revocation
// happened.** This is the capability the current architecture cannot offer at
// all — today's `ai_history` stores output but no prompt version."*
//
//
// THE HALF THAT ALREADY SHIPPED, AND THE HALF THAT IS HERE
//
// M10-2 and M10-3 already write `provenance` AT ADMISSION — `capability`,
// `prompt_version`, `model`, `rederiver_model`, `origin`, `manifest_hash` and
// `gates_passed` — on every question, generated or banked, and `023` §2 makes
// the column `NOT NULL` with a CHECK that it names a prompt version and an
// origin. That was deliberate and is stated in M10-2's own header: *"provenance
// added retroactively is not provenance."*
//
// So M10-6's work is not to add the field. It is to make the field DO SOMETHING,
// and this module is the two things that turns provenance into a capability:
//
//   1. THE SELECTOR. `selectForRevocation()` turns *"prompt version 1 was
//      defective"* into the exact set of questions that ran under it, and —
//      just as importantly — refuses to sweep up the ones that did not. A bank
//      question carries `model: "bank"` precisely so a revocation of a prompt
//      it never ran under cannot take it (M10-3's own note); this is the
//      function that honours that.
//   2. THE APPEND. `buildRevocation()` produces a NEW ROW and a superseding
//      EVENT. It produces no edit, no patch and no deletion of anything.
//
//
// APPEND-ONLY, PROVEN RATHER THAN PROMISED
//
// PRINCIPLES §3.2: *"Facts are immutable and never deleted; a correction
// APPENDS A SUPERSEDING FACT rather than editing history."*
//
// This module cannot express an edit:
//
//   · `buildRevocation()` takes the question and returns a revocation. It never
//     returns the question, modified or otherwise, and a test asserts the input
//     object is byte-identical afterwards.
//   · The ONE field that moves on the question itself is `retained`, which F.8
//     already specifies (*"the question is withdrawn from the bank"*) and which
//     `023` §9's immutability trigger already singles out as the only column an
//     admitted question may change. `withdrawalPatch()` returns exactly that one
//     key, and a test asserts its key list is `["retained"]`.
//   · `evidence_revoked` on an already-graded attempt is DERIVED, never stored:
//     `024` §3's `assessment_attempt_evidence` view computes it from the
//     revocation append. There is no column to edit, so "nothing is edited in
//     place" is a property of the schema rather than of this file's manners.
//
//
// WHAT HAPPENS TO AN ANSWER A STUDENT ALREADY GAVE
//
// This is the question F.4.b and F.8 answer together, and it is worth stating
// plainly because the instinct is wrong in both directions.
//
//   · The grade is NOT reversed. It happened. The student sat there, answered,
//     and the system computed a verdict; un-writing that would be editing
//     history to make the product look like it had never been wrong.
//   · The grade STOPS BEING EVIDENCE. `evidence_revoked` is true from the
//     moment the revocation is appended, so every downstream consumer — the
//     coverage gate (`024` §3 excludes revoked questions), the record, the score
//     — reads it as no longer proving anything. F.8's first row says the same
//     for an upheld complaint about a question: *"the attempt is superseded and
//     EXCLUDED from every dimension."*
//   · The occurrence created from it is SUPERSEDED, not deleted. F.8's second
//     row: *"a superseding attempt … is appended; the occurrence created from it
//     is superseded (`occurrences.supersedes`)."* `007` has carried the
//     `supersedes` column since M1 for exactly this. This module emits the
//     supersession INSTRUCTION; M11 owns the pattern recompute that follows it,
//     and inventing that here would be this pass reaching into the next
//     milestone.
//
// A student is never told their answer was retroactively marked wrong, because
// it was not. The question was withdrawn, and what it proved was withdrawn with
// it. That is a fact about the product, not a verdict about the student (§4).
//
// No I/O, no clock (`at` is injected), no randomness, no model, no `next/*`.
// ═══════════════════════════════════════════════════════════════════════════

import type { AdmittedQuestion, QuestionProvenance } from "./assessment-generation";

/**
 * What was found defective. THREE scopes, and the distinction is load-bearing:
 * *"this one question was wrong"* and *"everything this prompt ever wrote was
 * wrong"* are different facts about the product and must not compress into one.
 */
export const REVOCATION_SCOPES = ["question", "prompt_version", "manifest_hash"] as const;
export type RevocationScope = (typeof REVOCATION_SCOPES)[number];

/**
 * Who decided. `student_dispute` is F.8's first grievance; `operator` is a
 * human sweep; `system` is an automated one.
 *
 * There is deliberately NO `'ai'` value. A model may not revoke evidence any
 * more than it may award it — P.3.a in the other direction, and the reason is
 * the same: a model's opinion about whether a question was fair is an opinion.
 */
export const REVOKED_BY = ["student_dispute", "operator", "system"] as const;
export type RevokedBy = (typeof REVOKED_BY)[number];

export interface RevocationRecord {
  revocation_id: string;
  question_id: string;
  student_id: string;
  scope: RevocationScope;
  selector: string;
  reason: string;
  revoked_by: RevokedBy;
  revoked_at: string;
  superseding_event_id: string | null;
}

export interface RevocationInput {
  revocation_id: string;
  question: Pick<AdmittedQuestion, "question_id" | "student_id" | "provenance">;
  scope: RevocationScope;
  selector: string;
  /** Written by whoever decided. Never generated, never inferred, never empty. */
  reason: string;
  revoked_by: RevokedBy;
  /** ISO. Injected — this module owns no clock. */
  at: string;
}

export type RevocationRefusal =
  | "empty_reason"
  | "empty_selector"
  | "unknown_scope"
  | "unknown_actor"
  | "selector_does_not_match";

export type RevocationOutcome =
  | { ok: true; revocation: RevocationRecord }
  | { ok: false; refusal: RevocationRefusal; detail: string };

/** What the named scope selects on, read out of the question's own provenance.
 *  One function, so the selector that BUILDS a revocation and the predicate
 *  that FINDS the affected questions cannot drift apart. */
export function provenanceSelector(
  scope: RevocationScope,
  q: Pick<AdmittedQuestion, "question_id" | "provenance">,
): string {
  switch (scope) {
    case "question": return q.question_id;
    case "prompt_version": return q.provenance.prompt_version;
    default: return q.provenance.manifest_hash;
  }
}

/**
 * Build one revocation. **It cannot throw**, and it returns a NEW OBJECT and
 * nothing else — the question it names is not touched, not copied back, and not
 * returned.
 *
 * A revocation with no stated reason is refused. That is not tidiness: a
 * revocation is the one operation in this subsystem that removes something from
 * the record's standing, and one with no reason is a deletion with paperwork.
 */
export function buildRevocation(input: RevocationInput): RevocationOutcome {
  if (!(REVOCATION_SCOPES as readonly string[]).includes(input.scope)) {
    return { ok: false, refusal: "unknown_scope", detail: `'${input.scope}' is not a revocation scope` };
  }
  if (!(REVOKED_BY as readonly string[]).includes(input.revoked_by)) {
    return { ok: false, refusal: "unknown_actor", detail: `'${input.revoked_by}' may not revoke` };
  }
  if (typeof input.reason !== "string" || input.reason.trim().length === 0) {
    return {
      ok: false,
      refusal: "empty_reason",
      detail: "a revocation states why; one that does not is a deletion with paperwork",
    };
  }
  if (typeof input.selector !== "string" || input.selector.length === 0) {
    return { ok: false, refusal: "empty_selector", detail: "a revocation names what it swept on" };
  }

  // The selector must actually select this question. Without this a sweep for
  // prompt version 2 could file a revocation against a question written under
  // version 1, and the audit trail would record a fact that never happened.
  if (provenanceSelector(input.scope, input.question) !== input.selector) {
    return {
      ok: false,
      refusal: "selector_does_not_match",
      detail: `question ${input.question.question_id} does not match ${input.scope}=${input.selector}`,
    };
  }

  return {
    ok: true,
    revocation: {
      revocation_id: input.revocation_id,
      question_id: input.question.question_id,
      student_id: input.question.student_id,
      scope: input.scope,
      selector: input.selector,
      reason: input.reason.trim(),
      revoked_by: input.revoked_by,
      revoked_at: input.at,
      superseding_event_id: null,
    },
  };
}

/**
 * F.4.b's sweep: *"`provenance.prompt_version = v` identifies every affected
 * question."*
 *
 * The pure predicate half. `023` §3's
 * `assessment_questions_prompt_version_idx` is the query half — *"a sweep that
 * has to scan every question in the product is a sweep nobody runs."*
 *
 * A `bank` question is only ever selected by `scope: 'question'` or by a
 * `manifest_hash` it really carries. M10-3 wrote `model: "bank"` as a sentinel
 * for exactly this reason, and `prompt_version` alone is NOT enough to protect
 * it — a bank row carries the current `GENERATION_PROMPT_VERSION` too — so the
 * `origin` check below is what does the work.
 */
export function selectForRevocation<T extends Pick<AdmittedQuestion, "question_id" | "provenance">>(
  questions: readonly T[],
  scope: RevocationScope,
  selector: string,
): readonly T[] {
  return questions.filter(q => {
    if (scope === "prompt_version" && q.provenance.origin !== "generated") {
      // A prompt this row never ran under cannot have made it wrong.
      return false;
    }
    return provenanceSelector(scope, q) === selector;
  });
}

/**
 * F.8: *"the question is WITHDRAWN FROM THE BANK."* The one and only patch this
 * module produces, and it names one key.
 *
 * `023` §9's immutability trigger permits `retained` to move and refuses every
 * other column, so this object is the complete set of edits the database would
 * accept on an admitted question — which is what makes "append-only" mean
 * something here rather than being a convention.
 */
export function withdrawalPatch(): { retained: false } {
  return { retained: false };
}

/**
 * D.2's `EVENT_SUPERSEDED` draft that carries the revocation into the event
 * stream. F.4.b: *"the affected attempts are marked `evidence_revoked` BY
 * APPENDING `EVENT_SUPERSEDED` EVENTS."*
 *
 * Returned as a plain draft rather than emitted, because M7 owns the outbox and
 * M7's `validateEventDraft()` is what decides whether it is well-formed. A test
 * runs every draft this function builds through that validator rather than
 * against a fixture of what this file believes the contract to be.
 *
 * `source: "system"` — `SOURCE_RESTRICTIONS` permits `EVENT_SUPERSEDED` only
 * from `system` or `migration`, which is D.2.a refusing to let a tool or a
 * student declaration revoke evidence.
 *
 * `supersedes_event_id` is REQUIRED, not optional. D.3's `MISSING_SUPERSEDES`
 * refuses an `EVENT_SUPERSEDED` that does not name what it supersedes — *"the
 * only edit (C.2)"* — and a revocation that cannot say which fact it withdraws
 * is not a correction, it is a gap.
 */
export function supersedingEventDraft(input: {
  client_event_id: string;
  revocation: RevocationRecord;
  /** The attempt whose evidence this revocation withdraws. */
  attempt_id: string;
  /** The `QUESTION_WRONG` (or `QUESTION_CORRECT`) event this supersedes. */
  supersedes_event_id: string;
  occurred_at: string;
}): Record<string, unknown> {
  return {
    client_event_id: input.client_event_id,
    schema_version: 1,
    occurred_at: input.occurred_at,
    event_type: "EVENT_SUPERSEDED",
    surface: "cron",
    source: "system",
    question_id: input.revocation.question_id,
    supersedes_event_id: input.supersedes_event_id,
    payload: {
      // D.2's required key for this type.
      reason: input.revocation.reason,
      revocation_id: input.revocation.revocation_id,
      scope: input.revocation.scope,
      selector: input.revocation.selector,
      revoked_by: input.revocation.revoked_by,
      attempt_id: input.attempt_id,
      evidence_revoked: true,
    },
  };
}

/**
 * F.8's second row, as an INSTRUCTION rather than a write: *"the occurrence
 * created from it is superseded (`occurrences.supersedes`)."*
 *
 * The superseding occurrence itself is M11's — it must re-run the merge and
 * recompute the pattern's `recurrenceCount`, and both of those are Mistake DNA
 * and not this milestone. What this pass owes is that the instruction EXISTS
 * and names the row, so nothing is lost between the revocation and the
 * milestone that acts on it.
 */
export interface OccurrenceSupersessionRequest {
  occurrence_id: string;
  /** Why the occurrence stopped being evidence — the revocation's own reason,
   *  carried rather than restated. */
  reason: string;
  revocation_id: string;
  requested_at: string;
}

export function occurrenceSupersessionFor(
  revocation: RevocationRecord,
  occurrenceId: string,
): OccurrenceSupersessionRequest {
  return {
    occurrence_id: occurrenceId,
    reason: revocation.reason,
    revocation_id: revocation.revocation_id,
    requested_at: revocation.revoked_at,
  };
}

/**
 * F.4.b's `evidence_revoked`, as a predicate over the appends. Derived, never
 * stored — `024` §3's view computes the same thing in SQL, and this is the
 * TypeScript reader's copy of one predicate rather than a second source of
 * truth about a stored column.
 */
export function isRevoked(
  questionId: string,
  revocations: readonly Pick<RevocationRecord, "question_id">[],
): boolean {
  return revocations.some(r => r.question_id === questionId);
}

export type AttemptEvidenceState = "evidence" | "evidence_revoked";

/**
 * What an already-graded attempt is worth now.
 *
 * Note what this function does NOT return: it never says the attempt was
 * `incorrect_after_all`, `ungraded` or `void`. The grade stands as a historical
 * fact; only its standing as evidence changes, and the two words are chosen so
 * a reader cannot confuse them.
 */
export function attemptEvidenceState(
  attempt: { question_id: string },
  revocations: readonly Pick<RevocationRecord, "question_id">[],
): AttemptEvidenceState {
  return isRevoked(attempt.question_id, revocations) ? "evidence_revoked" : "evidence";
}

/** The row `024` §2 stores. Named keys, never a spread. */
export function revocationRowFor(r: RevocationRecord): Record<string, unknown> {
  return {
    revocation_id: r.revocation_id,
    question_id: r.question_id,
    student_id: r.student_id,
    scope: r.scope,
    selector: r.selector,
    reason: r.reason,
    revoked_by: r.revoked_by,
    revoked_at: r.revoked_at,
    superseding_event_id: r.superseding_event_id,
  };
}

/**
 * T4's mitigation list, as a checkable statement rather than a paragraph: every
 * admitted question carries provenance that can be swept on.
 *
 * `023` §2's CHECK requires `prompt_version`, `model` and `origin` at the
 * database; this is the same requirement where a caller can ask it of a value
 * in hand, before writing.
 */
export function hasRevocableProvenance(p: QuestionProvenance | null | undefined): boolean {
  return !!p
    && typeof p.prompt_version === "string" && p.prompt_version.length > 0
    && typeof p.model === "string" && p.model.length > 0
    && (p.origin === "generated" || p.origin === "bank")
    && typeof p.manifest_hash === "string" && p.manifest_hash.length === 64;
}
