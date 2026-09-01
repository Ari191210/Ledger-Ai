// ═══════════════════════════════════════════════════════════════════════════
// M10-7 — IMMEDIATE MISTAKE LOGGING. THE OCCURRENCE EXISTS BEFORE THE NEXT
// QUESTION RENDERS.
//
// EXECUTION_PLAN M10-7: *"Immediate mistake logging on a wrong answer. Done
// when: V.4.1 — the occurrence exists **before the next question renders**."*
//
// V.4.1: *"Wrong answer on Torque, classified `sign-error` (execution).
// **Before the next question renders**, an `occurrence` exists with a non-null
// `evidence_id` pointing at the attempt."*
//
// F.6: *"`QUESTION_WRONG` is emitted **at grade time, before the next question
// renders.** … **Why 'immediate' is architectural and not cosmetic:**
// PRINCIPLES:106-112 requires evidence to accompany a claim. If mistake creation
// were deferred to assessment completion, A STUDENT WHO CLOSED THE TAB
// MID-ASSESSMENT WOULD PRODUCE ANSWERED-AND-WRONG QUESTIONS WITH NO OCCURRENCE
// — an evidence gap the record could never reconstruct."*
//
//
// "BEFORE" IS AN ORDERING, SO IT IS ENFORCED AS ONE
//
// The cheap reading of M10-7 is "call the logging function on a wrong answer".
// It passes review and it does not survive the failure F.6 names: a fire-and-
// forget call is *started* before the next question renders and may complete
// after the tab is gone.
//
// So the guarantee here is a DATA DEPENDENCY rather than a call order.
// `submitAnswer()` returns an `AdvanceDecision`, and the value that says
// "you may render the next question" is CONSTRUCTED FROM the occurrence write's
// resolved result. A caller cannot obtain permission to advance without the
// write having already resolved, because permission is downstream of it in the
// promise graph — not because the calls happen to be in that order in the
// source.
//
// It is proven as an ordering, not as a call:
//
//   · the returned `steps[]` trace records each completion IN COMPLETION ORDER,
//     and a test asserts `indexOf('occurrence_written') < indexOf('advance')`;
//   · `deps.insertOccurrences` is given a promise the test controls, and the
//     test asserts `permitAdvance` has NOT fired while that promise is still
//     pending — which a call-order assertion cannot detect and an await can;
//   · a write that FAILS produces `permitted: false`. The student is not
//     advanced past a question whose evidence was lost, which is F.6's whole
//     argument. **The refusal costs the student nothing** — F.7: a session that
//     does not complete moves no score in either direction.
//
//
// WHY THIS OCCURRENCE IS CONFIRMED BY THE SYSTEM, AND EXACTLY HOW FAR
//
// M8-5's confirmation gate exists for a stated reason (`020`'s header): a draft
// is *"a reading of a photographed paper"* — a model's inference over an image
// — and *"an inference is not a fact"* (L1). The student confirms because only
// the student holds the paper.
//
// A graded assessment answer is a different kind of object. F.4.a: closed-form
// items are *"graded 100% deterministically against `answer_key`. NO MODEL IN
// THE PATH."* The system does not BELIEVE the student got it wrong; it computed
// that they did. There is nothing for the student to attest to.
//
// **But only the half that is actually deterministic.** F.6's classifier is
// explicitly two-tiered — *"1. DETERMINISTIC FIRST where the question format
// allows it … 2. AI-PROPOSED OTHERWISE, PRESENTED TO THE STUDENT FOR
// CONFIRMATION. 3. Student's classification ALWAYS WINS."* So:
//
//   the answer was wrong             computed        never in doubt
//   WHY, where a rule decides        computed        auto-confirmed
//   WHY, where no rule decides       a proposal      M8-5's gate, unchanged
//
// The occurrence exists in BOTH cases, which is what V.4.1 requires. What
// differs is what it claims, and `024` §7 tells the two apart in the schema
// (`confirmed_by`) rather than averaging them. V1 has no AI classifier at all,
// so tier 2 is a DRAFT AWAITING THE STUDENT rather than a model's guess —
// strictly more conservative than F.6 permits, and deliberately so.
//
//
// WHAT THIS MODULE DOES NOT DO
//
// No merge, no pattern, no severity, no `pattern_id`. M11 owns Mistake DNA;
// `007` explicitly permits an occurrence to exist before merge claims it. This
// module creates individual occurrences and stops.
//
// No clock, no randomness, no Supabase client, no `next/*`. The writes are
// injected (U.3), the same split `lib/occurrences.ts` and `lib/evidence.ts`
// use.
// ═══════════════════════════════════════════════════════════════════════════

import { sha256Hex } from "./sha256";
import {
  buildDraftOccurrence,
  type DbError,
  type OccurrenceDb,
  type Row,
} from "./occurrences";
import type { CognitiveError, ExecutionError } from "./mistakes/types";
import type { AdmittedQuestion } from "./assessment-generation";
import type { Grade, SubmittedAnswer } from "./assessment-grading";

/** `007`'s `occurrences_source` value for a mistake made inside this product's
 *  own assessment. Not `mock` and not `past-paper` — those name real papers a
 *  student sat elsewhere, and borrowing one would put a school exam in the
 *  record that never happened. */
export const ASSESSMENT_OCCURRENCE_SOURCE = "self-test" as const;

/** `020` §1's reserved value, claimed. */
export const ASSESSMENT_OCCURRENCE_ORIGIN = "assessment" as const;

/** `024` §7's `confirmed_by` value for a system-confirmed occurrence. */
export const ASSESSMENT_CONFIRMER = "assessment" as const;

// ═══════════════════════════════════════════════════════════════════════════
// F.6 — THE CLASSIFIER, DETERMINISTIC TIER ONLY
// ═══════════════════════════════════════════════════════════════════════════

export interface Classification {
  cognitive: CognitiveError | null;
  execution: ExecutionError | null;
  /** Which rule decided, so a classification can be explained. */
  rule: string;
  /**
   * TRUE when a rule computed this from the answer and the key, FALSE when it
   * is the conservative default.
   *
   * This one boolean is the whole confirmation decision (see the header), so it
   * is a field on the classification rather than a judgement made later by a
   * caller who may not know which rule ran.
   */
  deterministic: boolean;
}

/** F.6: *"a blank is `not-known` or `ran-out-of-time` BY TIMING."* The
 *  threshold is a policy value, server-owned and constant, for E.3's reason
 *  about `IDLE_MINUTES`: a machine whose thresholds vary is a machine no test
 *  can pin. A blank that arrives after this long is a student who ran out of
 *  time; one that arrives immediately is a student who did not know. */
export const BLANK_TIMEOUT_MS = 120_000;

/**
 * F.6's tier 1, exhaustively.
 *
 * **It never returns both a cognitive and an execution error.** F.6's own note
 * records that `mergeKeyFor` answers `ambiguous-error-classification` for an
 * occurrence carrying both, and calls the product decision OPEN. An open
 * decision is not something this pass closes by accident, so this function
 * simply cannot produce the shape that would force it — one arm is always null.
 */
export function classifyWrongAnswer(
  question: Pick<AdmittedQuestion, "format" | "answer_key">,
  submitted: SubmittedAnswer,
  grade: Pick<Grade, "rule" | "answered">,
  timing: { time_ms: number | null },
): Classification {
  // ── A BLANK ──────────────────────────────────────────────────────────────
  if (submitted.kind === "blank" || !grade.answered) {
    const ms = timing.time_ms;
    if (typeof ms === "number" && Number.isFinite(ms) && ms >= BLANK_TIMEOUT_MS) {
      return { cognitive: null, execution: "ran-out-of-time", rule: "blank-after-timeout", deterministic: true };
    }
    return { cognitive: "not-known", execution: null, rule: "blank", deterministic: true };
  }

  // ── THE WRONG UNIT, RIGHT NUMBER ─────────────────────────────────────────
  // The grader already decided this one (`rule: "unit_mismatch"`), so there is
  // no second parse here and no chance of the two disagreeing.
  if (grade.rule === "unit_mismatch") {
    return { cognitive: null, execution: "unit-error", rule: "unit-mismatch", deterministic: true };
  }

  // ── A SIGN ERROR ─────────────────────────────────────────────────────────
  // F.6: *"a numeric answer OFF BY A SIGN is `sign-error`."* Magnitude within
  // the question's own tolerance, sign opposite. It is checked against the
  // NEGATED key rather than by comparing `Math.sign`, so a student who answered
  // `-0.0` against a key of `0` is not accused of a sign error on a zero.
  if (
    question.answer_key.kind === "numeric"
    && submitted.kind === "numeric"
    && typeof submitted.value === "number"
    && Number.isFinite(submitted.value)
  ) {
    const key = question.answer_key;
    if (key.value !== 0 && Math.abs(-key.value - submitted.value) <= key.tolerance) {
      return { cognitive: null, execution: "sign-error", rule: "numeric-negated", deterministic: true };
    }
  }

  // ── EVERYTHING ELSE ──────────────────────────────────────────────────────
  // F.6 tier 2. V1 has no classifier, so this is a PROPOSAL and not a verdict:
  // `not-known` is the weakest available reading of "wrong answer, no further
  // signal", and it is deliberately marked `deterministic: false` so it enters
  // the record as a draft the student decides on (M8-5's gate) rather than as
  // a fact the system asserts about how their mind works.
  return { cognitive: "not-known", execution: null, rule: "unclassified", deterministic: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE EVIDENCE — V.4.1's *"pointing at the attempt"*
// ═══════════════════════════════════════════════════════════════════════════

/** The evidence row for an attempt.
 *
 *  `type` is `'manual'` because `007`'s CHECK holds three values and this pass
 *  does not edit M1's frozen schema (`024`'s header states the compromise in
 *  the open). The identity is in `storage_ref`, and `content_hash` is DERIVED
 *  from the attempt id, so `007`'s `evidence_student_hash_unique` makes a
 *  retried submit idempotent — M8-2's dedup argument, reused rather than
 *  reinvented: *"the constraint decides; this file only interprets the
 *  verdict."*
 *
 *  `source_description` is empty. §4.9 gives it no default meaning and M8 fills
 *  it with the student's own words; inventing a sentence here would be the
 *  product narrating a student's answer back at them. */
export function attemptEvidenceRow(input: {
  evidence_id: string;
  student_id: string;
  attempt_id: string;
  captured_at: string;
}): Row {
  return {
    id: input.evidence_id,
    student_id: input.student_id,
    type: "manual",
    storage_ref: `attempt:${input.attempt_id}`,
    content_hash: sha256Hex(`assessment-attempt:v1:${input.attempt_id}`),
    captured_at: input.captured_at,
    source_description: "",
    // The student produced this answer and submitted it; there was no reading,
    // no inference and nothing for anyone else to verify.
    verified_by: "student",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE OCCURRENCE
// ═══════════════════════════════════════════════════════════════════════════

/** The concept's display path, read from the taxonomy by the caller. `007`
 *  denormalises all three onto the occurrence *"for query speed"* (§4.3), and
 *  they are `NOT NULL` — so an unknown path is a REFUSAL and never an empty
 *  string, because a blank subject is a row nothing can ever group. */
export interface ConceptPath {
  concept_id: string;
  subject: string;
  chapter: string;
  topic: string;
}

export type MistakeRefusal =
  /** The answer was right. Not an error — the caller asked the wrong question. */
  | "not_a_mistake"
  /** C.3 / V.2.4's unresolved declaration: `concept_ref` is `text:…` and there
   *  is no concept UUID. `007` requires one and the record does not guess
   *  (B.4). The wrong answer is still recorded as an ATTEMPT; what cannot exist
   *  is an occurrence hung off a concept nobody named. */
  | "unresolved_concept"
  | "no_concept_path"
  | "draft_refused"
  | "evidence_write_failed"
  | "occurrence_write_failed"
  | "confirm_failed";

export interface MistakeInput {
  question: Pick<
    AdmittedQuestion,
    "question_id" | "assessment_id" | "session_id" | "student_id" | "slot_index"
    | "concept_ref" | "concept_id" | "format" | "answer_key" | "marks"
  >;
  attempt_id: string;
  evidence_id: string;
  submitted: SubmittedAnswer;
  grade: Grade;
  time_ms: number | null;
  /** The taxonomy path for `question.concept_id`. */
  path: ConceptPath | null;
  /** ISO. Injected. */
  at: string;
}

export type MistakeBuild =
  | { ok: true; row: Row; classification: Classification }
  | { ok: false; refusal: MistakeRefusal; detail: string };

/**
 * Build the occurrence row for one wrong answer. **Pure, and it cannot throw.**
 *
 * It goes through M8's `buildDraftOccurrence()` rather than assembling a row
 * itself, so `007`'s four structural invariants and `020`'s refusals apply to
 * an assessment-originated occurrence exactly as they apply to a photographed
 * one. A second row builder would be a second place for those invariants to
 * rot.
 */
export function buildAssessmentOccurrence(input: MistakeInput): MistakeBuild {
  if (input.grade.is_correct) {
    return { ok: false, refusal: "not_a_mistake", detail: "the answer was correct" };
  }
  if (!input.question.concept_id) {
    return {
      ok: false,
      refusal: "unresolved_concept",
      detail: `${input.question.concept_ref} has no concept id; the record does not guess one (B.4, V.2.4)`,
    };
  }
  const path = input.path;
  if (!path || !path.subject || !path.chapter || !path.topic || path.concept_id !== input.question.concept_id) {
    return {
      ok: false,
      refusal: "no_concept_path",
      detail: "the concept's subject/chapter/topic could not be resolved, and an empty one is not a value",
    };
  }

  const classification = classifyWrongAnswer(
    input.question,
    input.submitted,
    input.grade,
    { time_ms: input.time_ms },
  );

  const built = buildDraftOccurrence({
    studentId: input.question.student_id,
    evidenceId: input.evidence_id,
    conceptId: input.question.concept_id,
    subject: path.subject,
    chapter: path.chapter,
    topic: path.topic,
    source: ASSESSMENT_OCCURRENCE_SOURCE,
    // §4.3's `questionRef` — *"Q7(b)"*. The slot is the question's position in
    // this assessment, so `Q<n>` is a fact rather than a label.
    questionRef: `Q${input.question.slot_index + 1}`,
    // Closed-form and all-or-nothing (M10-5): a wrong answer loses the whole
    // mark, and there is no partial credit to represent.
    marksLost: input.question.marks,
    marksAvailable: input.question.marks,
    cognitiveError: classification.cognitive,
    executionError: classification.execution,
    // `student_answer` is the submission, serialised. It is the student's own
    // act and §4.3 keeps it; it is not shown to a parent (§3.4) and this module
    // writes it nowhere else.
    studentAnswer: { kind: "text", text: JSON.stringify(input.submitted) },
    expectedAnswer: null,
    markerNote: null,
    origin: ASSESSMENT_OCCURRENCE_ORIGIN,
    ingestionRunId: null,
    // NO `proposalConfidence`. A deterministic grade has no confidence, and a
    // number here would be inventing a judgement — `020`'s own reason for
    // refusing one on a manual entry.
    proposalConfidence: null,
  });

  if (!built.ok) {
    return { ok: false, refusal: "draft_refused", detail: `${built.refusal}: ${built.detail}` };
  }

  return {
    ok: true,
    row: {
      ...built.row,
      // `024` §7's two additive columns. `assessment_attempt_id` is V.4.1's
      // structural link and the idempotency key for the partial UNIQUE index.
      assessment_attempt_id: input.attempt_id,
    },
    classification,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE ORDERING — M10-7's done-when, as a data dependency
// ═══════════════════════════════════════════════════════════════════════════

export interface MistakeDb extends OccurrenceDb {
  /** `007`'s `evidence` INSERT. Idempotent by `evidence_student_hash_unique`;
   *  a duplicate resolves to the existing row rather than failing the submit. */
  insertAttemptEvidence(row: Row): Promise<{ data: Row | null; error: DbError | null }>;
  /** `024` §7's system confirmation. A separate verb from `confirm` because
   *  `confirm` is M8-5's STUDENT path, whose whole point is that the student's
   *  own credentials decide; conflating them would let one refactor turn a
   *  student gate into a service-role one. */
  confirmAsSystem(occurrenceId: string, studentId: string, at: string): Promise<{ data: Row[] | null; error: DbError | null }>;
}

/** Each step, recorded when it COMPLETES. The trace is returned so the ordering
 *  M10-7 promises is something a test reads rather than something a reviewer
 *  believes. */
export const MISTAKE_STEPS = [
  "graded",
  "evidence_written",
  "occurrence_written",
  "occurrence_confirmed",
  "advance",
] as const;
export type MistakeStep = (typeof MISTAKE_STEPS)[number];

export type AdvanceDecision =
  | { permitted: true }
  | { permitted: false; reason: MistakeRefusal; detail: string };

export interface LogMistakeResult {
  /** Null when there was nothing to log (a correct answer) or when the
   *  occurrence was refused. Never a silent absence — `advance` says why. */
  occurrence: Row | null;
  classification: Classification | null;
  /** True when a rule decided the classification and `024` §7 confirmed it. */
  confirmed: boolean;
  steps: readonly MistakeStep[];
  advance: AdvanceDecision;
}

/**
 * **THE ORDERING GUARANTEE.**
 *
 * Every `await` below is load-bearing. `advance` is the LAST value constructed
 * and it is constructed from the results of the writes above it, so there is no
 * interleaving in which a caller holds `permitted: true` while the occurrence
 * write is still in flight. That is what "before the next question renders"
 * means once the client is on the other side of a network.
 *
 * **It cannot throw.** A rejected write is a refusal to advance, not a 500: the
 * caller is an endpoint on the critical path of a student answering a question,
 * and an exception there is a student staring at a spinner.
 *
 * F.7 is why refusing to advance is safe to do: a session that does not finish
 * moves no score in either direction, so a student who hits this loses nothing
 * but a click. A student who did NOT hit it, in a version that logged
 * asynchronously, would lose the evidence — which is the failure F.6 is written
 * against, and it is the irreversible one.
 */
export async function logAssessmentMistake(
  db: MistakeDb,
  input: MistakeInput,
): Promise<LogMistakeResult> {
  const steps: MistakeStep[] = ["graded"];

  const nothingToLog = (): LogMistakeResult =>
    ({ occurrence: null, classification: null, confirmed: false, steps: [...steps, "advance"], advance: { permitted: true } });

  // A correct answer has no occurrence, and the student advances. F.6 logs a
  // mistake on a WRONG answer; there is nothing here to be strict about.
  if (input.grade.is_correct) return nothingToLog();

  const built = buildAssessmentOccurrence(input);
  if (!built.ok) {
    // AN UNRESOLVED CONCEPT DOES NOT BLOCK THE STUDENT. V.2.4 / B.4: the
    // taxonomy refused to guess, so there is no concept to hang an occurrence
    // on — that is a known and accepted gap in the record, recorded as an
    // ATTEMPT (which is already written) and not a lost write. Blocking here
    // would strand a student behind a question the product itself could not
    // classify.
    const softRefusals: MistakeRefusal[] = ["not_a_mistake", "unresolved_concept", "no_concept_path"];
    if (softRefusals.includes(built.refusal)) {
      return {
        occurrence: null,
        classification: null,
        confirmed: false,
        steps: [...steps, "advance"],
        advance: { permitted: true },
      };
    }
    return {
      occurrence: null,
      classification: null,
      confirmed: false,
      steps: [...steps, "advance"],
      advance: { permitted: false, reason: built.refusal, detail: built.detail },
    };
  }

  // ── 1 · EVIDENCE. No occurrence without proof (PRINCIPLES §3.2) ──────────
  const evidence = await db.insertAttemptEvidence(
    attemptEvidenceRow({
      evidence_id: input.evidence_id,
      student_id: input.question.student_id,
      attempt_id: input.attempt_id,
      captured_at: input.at,
    }),
  );
  if (evidence.error) {
    return {
      occurrence: null,
      classification: built.classification,
      confirmed: false,
      steps: [...steps, "advance"],
      advance: { permitted: false, reason: "evidence_write_failed", detail: evidence.error.message },
    };
  }
  steps.push("evidence_written");

  // ── 2 · THE OCCURRENCE ───────────────────────────────────────────────────
  const written = await db.insertOccurrences([built.row]);
  if (written.error || !written.data || written.data.length === 0) {
    return {
      occurrence: null,
      classification: built.classification,
      confirmed: false,
      steps: [...steps, "advance"],
      advance: {
        permitted: false,
        reason: "occurrence_write_failed",
        detail: written.error?.message ?? "the occurrence was not written",
      },
    };
  }
  steps.push("occurrence_written");
  let occurrence = written.data[0];

  // ── 3 · CONFIRMATION, where and only where a rule decided ────────────────
  let confirmed = false;
  if (built.classification.deterministic) {
    const occurrenceId = typeof occurrence.id === "string" ? occurrence.id : "";
    const result = await db.confirmAsSystem(occurrenceId, input.question.student_id, input.at);
    if (result.error) {
      // The occurrence EXISTS — V.4.1 is satisfied — and it is a draft. A
      // failed confirmation is not a lost fact, so the student advances and the
      // row waits, which is strictly the conservative direction.
      return {
        occurrence,
        classification: built.classification,
        confirmed: false,
        steps: [...steps, "advance"],
        advance: { permitted: true },
      };
    }
    if (result.data && result.data.length > 0) {
      occurrence = result.data[0];
      confirmed = true;
      steps.push("occurrence_confirmed");
    }
  }

  // ── 4 · ONLY NOW ─────────────────────────────────────────────────────────
  steps.push("advance");
  return { occurrence, classification: built.classification, confirmed, advance: { permitted: true }, steps };
}

/**
 * D.2's `QUESTION_WRONG` draft. F.6: *"emitted AT GRADE TIME, before the next
 * question renders. It carries `attempt_id` and the evidence reference."*
 *
 * Built here and emitted by the endpoint, for `supersedingEventDraft()`'s
 * reason: M7 owns the outbox, and a draft this module hands over is one M7's
 * own `validateEventDraft()` gets to judge.
 */
export function questionWrongEventDraft(input: {
  client_event_id: string;
  question: Pick<AdmittedQuestion, "question_id" | "assessment_id" | "concept_id">;
  attempt_id: string;
  evidence_id: string;
  occurred_at: string;
  classification: Classification | null;
}): Record<string, unknown> {
  return {
    client_event_id: input.client_event_id,
    schema_version: 1,
    occurred_at: input.occurred_at,
    event_type: "QUESTION_WRONG",
    surface: "web",
    // D.1: this event is the assessment's own statement about a graded answer.
    source: "assessment",
    assessment_id: input.question.assessment_id,
    question_id: input.question.question_id,
    concept_id: input.question.concept_id,
    evidence_id: input.evidence_id,
    // D.2's required keys for this type.
    payload: {
      question_id: input.question.question_id,
      attempt_id: input.attempt_id,
      // B.6: the classification is carried as a SIGNAL on the event and is
      // never the thing that overwrites a student's own. Null where no rule
      // decided, rather than a guess dressed as a reading.
      cognitive_error: input.classification?.cognitive ?? null,
      execution_error: input.classification?.execution ?? null,
      classification_rule: input.classification?.rule ?? null,
      classification_deterministic: input.classification?.deterministic ?? false,
    },
  };
}

/**
 * §3.3, restated where a mistake is created: recording one moves no score
 * downward. Two arms, neither carrying a number — `sessionScoreContribution()`'s
 * shape, for its reason.
 *
 * *"A student who logs honestly may never score below a student who logs
 * nothing."* An assessment-originated occurrence is the most automatic logging
 * in the product, so this is the point at which a penalty would be easiest to
 * introduce and hardest to notice.
 */
export type MistakeScoreEffect = { kind: "none" };
export const mistakeScoreEffect = (_c: Classification | null): MistakeScoreEffect => ({ kind: "none" });
export const loggingAMistakeLowersScore = (): false => false;
