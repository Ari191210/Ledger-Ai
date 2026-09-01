// ═══════════════════════════════════════════════════════════════════════════
// M10-5 — DETERMINISTIC GRADING. A MODEL OPINION IS NEVER A GRADE.
//
// EXECUTION_PLAN M10-5: *"Deterministic grading against a stored `answer_key`;
// closed-form only in V1. Done when: F.4.a. A model opinion is never a grade
// (P.3.a)."*
//
// F.4.a: *"**Closed-form** (MCQ, numeric, ordering, match): graded **100%
// deterministically** against `answer_key`. **No model in the path.** These are
// the only formats whose results are `E`-class by default."*
//
// P.3.a: *"A tool that asks a model 'was that right?' and writes the answer is
// at Level 1 regardless of how confident it sounds."*
//
//
// WHY THIS FILE IS SO SMALL, AND WHY THAT IS THE POINT
//
// The whole of M10-5 is one pure function over two arguments. Everything that
// would make it bigger has already been refused upstream and is worth naming,
// because each refusal is what buys the simplicity here:
//
//   · `short_text` is not a format (`CLOSED_FORM_FORMATS`), so there is no arm
//     that needs a rubric and therefore no arm that needs a judgement.
//   · `answer_key` is a discriminated union parsed by gate 2, so there is no
//     free-text key to interpret.
//   · gate 4 has already refused a zero or swallowing tolerance and a key
//     outside the option set, so the comparisons below cannot be handed a key
//     that no answer could ever match — or one that every answer matches.
//   · 023 §9 makes `answer_key` immutable after admission, so the key this
//     function reads is the key the question was admitted with.
//
// **THERE IS NO MODEL IN THIS FILE AND NO WAY TO PUT ONE IN IT.** It imports
// three TYPES from `lib/assessment-generation.ts` and nothing else — not
// `GenerationModel`, not `Rederiver`, not `Moderator`, not `runGates`. It makes
// no call of any kind: no `fetch`, no `await`, no promise. `gradeAttempt` is
// SYNCHRONOUS, which is the strongest available statement of the guarantee —
// an asynchronous grader is one that could have gone somewhere, and this one
// demonstrably cannot.
//
//
// F.3.a — THE PREFERENCE/GRADING FIREWALL, BY SIGNATURE
//
// *"Enforced by construction: the grading function's signature takes
// `(question, attempt)` and has no access to the personal model at all."*
//
// Taken literally. `gradeAttempt(question, submitted)` has exactly two
// parameters, `GradableQuestion` is a `Pick` of the four fields grading needs,
// and `PersonalModelInput` is not imported. Two students with different
// preferences grade identically because there is no third argument through
// which they could differ.
//
// No I/O, no clock, no randomness, no Supabase, no `next/*`.
// ═══════════════════════════════════════════════════════════════════════════

import type { QuestionFormat } from "./assessment-blueprint";
import type { AdmittedQuestion, AnswerKey } from "./assessment-generation";

/**
 * Exactly what grading needs, and deliberately nothing else.
 *
 * `provenance` is absent, so a grade cannot come out differently for a
 * bank-sourced question than for a generated one. `student_id` is absent, so a
 * grade cannot come out differently for one student than for another. Both are
 * F.3.a's firewall stated as a type rather than as a rule.
 */
export type GradableQuestion = Pick<
  AdmittedQuestion,
  "question_id" | "format" | "answer_key" | "marks" | "options"
>;

/**
 * What a student may send back. One arm per closed-form format, plus `blank`.
 *
 * `blank` is a FIRST-CLASS ANSWER and not an absence, because F.6's classifier
 * needs to tell "answered wrongly" from "left empty" — *"a blank is
 * `not-known` or `ran-out-of-time` by timing"* — and a `null` cannot carry that
 * distinction into an immutable record.
 */
export type SubmittedAnswer =
  | { kind: "mcq"; selected_index: number }
  | { kind: "numeric"; value: number; unit?: string | null }
  | { kind: "ordering"; order: readonly number[] }
  | { kind: "match"; pairs: readonly (readonly [number, number])[] }
  | { kind: "blank" };

/** Which comparison decided the grade. Stored on the attempt so a grade can be
 *  explained without re-running it, and read by M10-7's classifier — a wrong
 *  answer decided by `unit_mismatch` is an execution error and a wrong answer
 *  decided by `exact` usually is not. */
export const GRADE_RULES = [
  "exact",
  "tolerance",
  "unit_mismatch",
  "sequence",
  "pairs",
  "blank",
] as const;
export type GradeRule = (typeof GRADE_RULES)[number];

/** P.3.a, as a vocabulary of one. F.4.a's `ai_proposed_student_confirmed` is
 *  absent because short text is not a V1 format; adding it would mean adding a
 *  format first, which the schema also refuses. */
export const GRADERS = ["deterministic"] as const;
export type Grader = (typeof GRADERS)[number];

export interface Grade {
  question_id: string;
  is_correct: boolean;
  /** All-or-nothing on a closed-form item. There is no partial credit in V1
   *  and no place to put one: a partial mark on an MCQ is a judgement, and a
   *  judgement is what this function exists not to make. */
  marks_awarded: number;
  grader: Grader;
  rule: GradeRule;
  /** True when the answer was structurally in range but simply wrong; false
   *  when it was blank. Not a score input — a classifier input (F.6). */
  answered: boolean;
}

export type GradeOutcome =
  | { ok: true; grade: Grade }
  | { ok: false; reason: GradeRefusal; detail: string };

/**
 * Why grading DECLINED, which is not the same as marking an answer wrong.
 *
 * A submission whose `kind` does not match the question's format is a client
 * bug or a forged request, not a wrong answer, and recording it as one would
 * put a mistake in a student's record that they did not make — the exact defect
 * T4 describes one door along. F.2.a's posture, applied to grading: refusing to
 * grade is always available; grading something that is not an answer never is.
 */
export type GradeRefusal =
  | "format_mismatch"
  | "not_an_index"
  | "not_a_number"
  | "malformed_key";

const refuse = (reason: GradeRefusal, detail: string): GradeOutcome =>
  ({ ok: false, reason, detail });

const isIndex = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;

/** Units compare on shape, not on physics. Whitespace and case are noise a
 *  student's keyboard adds; `N m`, `Nm` and `nm` are the same three characters
 *  once that noise is removed. This is deliberately NOT a unit converter —
 *  converting would mean deciding that `0.003 kN` answers a question keyed in
 *  `N`, which is a marking judgement and belongs to a human. */
const normaliseUnit = (u: string | null | undefined): string =>
  typeof u === "string" ? u.replace(/\s+/g, "").toLowerCase() : "";

/**
 * **THE GRADE.** Pure, synchronous, total over the union, and it cannot throw.
 *
 * It cannot throw for `applySessionTransition()`'s reason: the caller is an
 * endpoint on the path that must complete before the next question renders
 * (F.6), and an endpoint that has to wrap this in a `try` is one refactor away
 * from swallowing a refusal and advancing anyway.
 */
export function gradeAttempt(
  question: GradableQuestion,
  submitted: SubmittedAnswer,
): GradeOutcome {
  const key: AnswerKey = question.answer_key;

  // A key whose `kind` disagrees with the question's format cannot be graded
  // against that question. 023's `assessment_questions_key_matches_format`
  // CHECK makes this unreachable through the database; it is checked anyway,
  // because "unreachable through the database" is a claim about one writer.
  if (key.kind !== (question.format as QuestionFormat)) {
    return refuse("malformed_key", `a ${question.format} question carries a ${key.kind} key`);
  }

  const award = (is_correct: boolean, rule: GradeRule, answered: boolean): GradeOutcome => ({
    ok: true,
    grade: {
      question_id: question.question_id,
      is_correct,
      marks_awarded: is_correct ? question.marks : 0,
      grader: "deterministic",
      rule,
      answered,
    },
  });

  // ── BLANK ────────────────────────────────────────────────────────────────
  // A blank is WRONG, not ungraded. F.7 already guarantees the student pays no
  // score penalty for an unverified session, so marking a blank wrong costs
  // them nothing and buys the record an honest fact: this concept was put in
  // front of them and produced nothing.
  if (submitted.kind === "blank") return award(false, "blank", false);

  if (submitted.kind !== key.kind) {
    return refuse(
      "format_mismatch",
      `question ${question.question_id} is ${key.kind}; the submission is ${submitted.kind}`,
    );
  }

  switch (key.kind) {
    // ── MCQ ────────────────────────────────────────────────────────────────
    case "mcq": {
      if (submitted.kind !== "mcq") return refuse("format_mismatch", "unreachable arm");
      if (!isIndex(submitted.selected_index)) {
        return refuse("not_an_index", "an MCQ selection is a whole option index");
      }
      // Gate 3 already refused a key with 0 or ≥2 correct options, so this list
      // has exactly one member for every admitted question. `includes` rather
      // than `[0] ===` so a key that somehow arrived with more than one is
      // graded against ALL of them rather than silently against the first.
      return award(key.correct_indices.includes(submitted.selected_index), "exact", true);
    }

    // ── NUMERIC ────────────────────────────────────────────────────────────
    case "numeric": {
      if (submitted.kind !== "numeric") return refuse("format_mismatch", "unreachable arm");
      if (typeof submitted.value !== "number" || !Number.isFinite(submitted.value)) {
        return refuse("not_a_number", "a numeric answer is a finite number");
      }

      // THE UNIT IS CHECKED BEFORE THE VALUE, and the order matters. A student
      // who writes the right number in the wrong unit has made a DIFFERENT
      // mistake from one who wrote the wrong number, and F.6 turns that
      // distinction into `unit-error` rather than a cognitive gap. Grading it as
      // a plain wrong answer would erase the one signal that makes it fixable.
      //
      // A submission with NO unit is not penalised: the surface renders the
      // question's unit beside the field, so an absent unit is the interface
      // supplying it, not the student omitting it. Inventing a mistake out of a
      // UI convention is the fabrication law 7 bans.
      const expected = normaliseUnit(key.unit);
      const given = normaliseUnit(submitted.unit);
      if (expected !== "" && given !== "" && expected !== given) {
        return award(false, "unit_mismatch", true);
      }

      // F.4's gate 4 has already guaranteed `tolerance > 0` and, for a non-zero
      // key, `tolerance < |value|`. So this comparison is neither vacuous nor
      // impossible, and the tolerance is the QUESTION'S — never a global
      // constant, because precision is a property of the physics and not of the
      // grader.
      return award(Math.abs(key.value - submitted.value) <= key.tolerance, "tolerance", true);
    }

    // ── ORDERING ───────────────────────────────────────────────────────────
    case "ordering": {
      if (submitted.kind !== "ordering") return refuse("format_mismatch", "unreachable arm");
      if (!Array.isArray(submitted.order) || !submitted.order.every(isIndex)) {
        return refuse("not_an_index", "an ordering is a list of whole option indices");
      }
      // Position by position. An ordering that is right except for two adjacent
      // items is WRONG — partial credit on a sequence is a marking judgement.
      const same =
        submitted.order.length === key.order.length
        && key.order.every((v, i) => v === submitted.order[i]);
      return award(same, "sequence", true);
    }

    // ── MATCH ──────────────────────────────────────────────────────────────
    default: {
      if (submitted.kind !== "match") return refuse("format_mismatch", "unreachable arm");
      if (
        !Array.isArray(submitted.pairs)
        || !submitted.pairs.every(p => Array.isArray(p) && p.length === 2 && p.every(isIndex))
      ) {
        return refuse("not_an_index", "a match is a list of index pairs");
      }
      // Order-insensitive: a matching exercise has no first pair. Canonicalised
      // the same way `agreesWithKey()` canonicalises a re-derivation, so the
      // gate that admitted the key and the grader that reads it agree by
      // construction rather than by coincidence.
      const norm = (ps: readonly (readonly [number, number])[]) =>
        [...ps].map(([a, b]) => `${a}:${b}`).sort().join(",");
      return award(norm(key.pairs) === norm(submitted.pairs), "pairs", true);
    }
  }
}

/**
 * F.5's *"answers are append-only with `attempt_no`; changing an answer
 * appends."* The next number, derived from what already exists rather than
 * supplied by a caller who might reuse one.
 */
export const nextAttemptNo = (existingForQuestion: number): number =>
  Math.max(0, Math.floor(existingForQuestion)) + 1;

/** The row `024` §1 stores. Named keys, never a spread — `toEnvelope()`'s
 *  allowlist discipline, so a field on the grade or the input cannot ride into
 *  the insert. */
export function attemptRowFor(input: {
  attempt_id: string;
  question_id: string;
  assessment_id: string;
  session_id: string;
  student_id: string;
  attempt_no: number;
  submitted: SubmittedAnswer;
  grade: Grade;
  time_ms: number | null;
  graded_at: string;
}): Record<string, unknown> {
  return {
    attempt_id: input.attempt_id,
    question_id: input.question_id,
    assessment_id: input.assessment_id,
    session_id: input.session_id,
    student_id: input.student_id,
    attempt_no: input.attempt_no,
    submitted_answer: input.submitted,
    is_correct: input.grade.is_correct,
    marks_awarded: input.grade.marks_awarded,
    grader: input.grade.grader,
    grade_rule: input.grade.rule,
    time_ms: input.time_ms,
    graded_at: input.graded_at,
  };
}

/**
 * What an assessment contributed, as figures. E.8.a's discipline, reused: there
 * is no `message`, no `summary` and no verdict — a caller that wants a sentence
 * writes it where sentences belong.
 */
export interface AssessmentTally {
  questions_graded: number;
  correct: number;
  wrong: number;
  marks_awarded: number;
  marks_available: number;
}

export function tally(
  graded: readonly { grade: Grade; marks: number }[],
): AssessmentTally {
  let correct = 0;
  let marksAwarded = 0;
  let marksAvailable = 0;
  for (const g of graded) {
    if (g.grade.is_correct) correct++;
    marksAwarded += g.grade.marks_awarded;
    marksAvailable += g.marks;
  }
  return {
    questions_graded: graded.length,
    correct,
    wrong: graded.length - correct,
    marks_awarded: marksAwarded,
    marks_available: marksAvailable,
  };
}
