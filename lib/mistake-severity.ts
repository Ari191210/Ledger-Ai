// ═══════════════════════════════════════════════════════════════════════════
// M11-2 — SEVERITY FACTOR DERIVATION. THE ONE GENUINE SPECIFICATION GAP,
// CLOSED, AND VERSIONED SO CLOSING IT AGAIN IS NOT A SILENT REWRITE.
//
// EXECUTION_PLAN M11-2: *"Severity-factor derivation, versioned. Done when: G.6
// — the one genuine specification gap is closed."*
//
// THE GAP, QUOTED
//
// G.1.a: *"`severity` is computed from four normalised factors the caller must
// supply (`SeverityFactors`, `engine.ts:300-305`), and the engine's own TODO at
// `:293-298` records that **how those factors are derived from raw domain data
// is not specified**. That derivation is the missing piece, and Part G.6
// specifies it — deliberately as a separate, versioned function so the engine
// stays pure."*
//
// The engine's own TODO says the same thing in the first person: *"how each
// factor is DERIVED from raw domain data is not specified. Deliberately not
// invented here."* This module is where it is no longer not-invented.
//
//
// WHAT THIS MODULE MAY NOT DO
//
// G.6 opens: *"**TARGET DESIGN.** The formula is fixed and must not be
// touched: `40·marksWeight + 30·recurrenceWeight + 20·examProximity +
// 10·conceptExamWeight`."* So this file DOES NOT CONTAIN THAT ARITHMETIC. It
// derives the four 0–1 factors and hands them to `computeSeverity()` in
// `lib/mistakes/engine.ts`, which is the single place the coefficients live. A
// second implementation of the sum would be a second thing to keep in step, and
// the first one to drift.
//
//
// WHY IT IS VERSIONED
//
// `patterns.severity` is a stored number. A number whose meaning depends on a
// formula is meaningless without the formula's identity stored beside it —
// exactly the argument M6 made for `TAXONOMY_VERSION` and M10 for
// `GENERATION_PROMPT_VERSION`, and M14-5 will make again for
// `ScoreSnapshot.formula_version`.
//
// Without a version, a later improvement to (say) `recurrenceWeight` would
// silently reinterpret every severity ever stored: a 62 written under v1 and a
// 62 written under v2 would be indistinguishable and would not mean the same
// thing. §4.6 wants *"formula improvements upgrade every existing pattern
// retroactively"* — which is a RECOMPUTE, and a recompute you cannot detect the
// need for is a recompute that never happens.
//
// So `SEVERITY_FACTORS_VERSION` is written on the row (`025` §3), and the
// derivation asserts nothing about rows stamped with a version it does not
// recognise.
//
//
// G.6.a — INHERITED AND DELIBERATELY NOT FIXED
//
// *"`examProximity` contributes 20% of severity, and `PRODUCT_DECISIONS §4.10`
// then ranks by `severity × examProximity`, applying it twice. **Verified in the
// source comment. This document does not fix it** … **Flagged for founder
// decision before ranking ships.**"* This module does not fix it either; it
// re-states it where the factor is produced, so the next person to read the
// derivation reads the defect with it.
//
// PURE. No I/O, no clock, no randomness. Every time-dependent input is passed
// in. The same determinism boundary (U.3) `engine.ts` holds.
// ═══════════════════════════════════════════════════════════════════════════

import {
  computeSeverity,
  type Result,
  type SeverityFactors,
} from "./mistakes/engine";
import type { ISOTimestamp, SeverityProvenance } from "./mistakes/types";

// ═══════════════════════════════════════════════════════════════════════════
// THE VERSION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The identity of the DERIVATION below — not of `SEVERITY_WEIGHTS`, which is
 * §4.6.1's and does not change.
 *
 * Bump this when any constant or rule in this file changes. A bump is a
 * statement that severities stamped with the previous version were computed
 * under different rules and must be recomputed before they are compared with
 * new ones.
 */
export const SEVERITY_FACTORS_VERSION = "sf_v1";

/** Every version this build can still INTERPRET. A stored severity stamped with
 *  anything else is readable as a number and NOT comparable as a severity. */
export const SUPPORTED_SEVERITY_VERSIONS: readonly string[] = Object.freeze([
  SEVERITY_FACTORS_VERSION,
]);

// ═══════════════════════════════════════════════════════════════════════════
// THE CONSTANTS G.6 NAMES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * G.6: *"`min(1, occurrences_in_trailing_180d / RECURRENCE_FULL_AT)`"*.
 *
 * The window is 180 days *"because 180 days matches `Pattern.recurrenceCount`'s
 * definition (`types.ts:296-299`)"* — and `types.ts` does say *"Occurrences in
 * the trailing 180 days"*, so this is transcription rather than a new choice.
 *
 * `RECURRENCE_FULL_AT = 4` is the one number G.6 leaves to implementation. Four
 * is chosen because §4.4 defines a pattern as *"more than once"*: the second
 * occurrence is what makes it a pattern at all, so 2 must not already be the
 * maximum or the factor would saturate at the moment of definition and could
 * never distinguish a twice-made error from a weekly one.
 */
export const RECURRENCE_FULL_AT = 4;
export const RECURRENCE_WINDOW_DAYS = 180;

/** G.6: *"`1` at ≤3 days to a goal exam covering this subject, decaying to `0`
 *  at ≥60 days"*. Linear between the two — G.6 specifies the endpoints and the
 *  word *"decaying"*, and a curve it did not name would be an invention. */
export const EXAM_PROXIMITY_FULL_WITHIN_DAYS = 3;
export const EXAM_PROXIMITY_ZERO_AT_DAYS = 60;

// ═══════════════════════════════════════════════════════════════════════════
// THE INPUT — raw domain data, exactly as G.6's table names it
// ═══════════════════════════════════════════════════════════════════════════

export interface SeverityDerivationInput {
  /** `Σ marks_lost` on THIS leaf. */
  leafMarksLost: number;
  /**
   * `Σ marks_lost` across the student's OPEN leaves, this one included.
   *
   * G.6: *"relative, so a student with small papers is not systematically
   * low-severity."* The denominator is the student's own record, which is why
   * this is not a proportion of anything that grows with capture (G.9's rule
   * governs what reaches the SCORE; severity is a ranking input and is bounded
   * by construction because the numerator is one of the denominator's terms).
   */
  openLeavesMarksLost: number;

  /** Occurrences on this leaf in the trailing `RECURRENCE_WINDOW_DAYS`. */
  occurrencesInWindow: number;

  /**
   * Whole days from now to the nearest goal exam covering this subject.
   *
   * `null` when the product does not know of one — and V1's schema has no goal
   * exam DATE anywhere (`012` carries `target_exam` as a name, not a date). A
   * null yields `examProximity = 0` and sets `examProximityKnown: false`, so
   * "no exam is near" and "we have no idea" are distinguishable on the stored
   * row instead of being averaged into the same 0.
   *
   * Negative days (an exam already sat) are treated as 0 days away rather than
   * refused: the exam is not in the future, the pressure is gone, and the
   * factor decays from the boundary like any other date.
   */
  daysToGoalExam: number | null;

  /** `concepts.exam_weight` for this leaf's concept (`007_mistakes.sql:50`). */
  conceptExamWeight: number;
  /** The maximum `exam_weight` across this concept's SUBJECT. G.6:
   *  *"normalised against the max in the subject"*. */
  maxSubjectExamWeight: number;

  /** Injected, never read from a clock. Stamped into the provenance. */
  at: ISOTimestamp;
}

export type SeverityRefusal =
  | "negative-marks"
  | "negative-occurrences"
  | "negative-exam-weight"
  | "concept-weight-exceeds-subject-max"
  | "leaf-marks-exceed-open-total"
  | "not-a-number";

export interface DerivedSeverity {
  /** 0–100, from `computeSeverity()`. Never computed in this file. */
  severity: number;
  provenance: SeverityProvenance;
}

export type SeverityResult =
  | { ok: true; value: DerivedSeverity }
  | { ok: false; refusal: SeverityRefusal; detail: string };

const refuse = (refusal: SeverityRefusal, detail: string): SeverityResult =>
  ({ ok: false, refusal, detail });

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Clamp into [0,1]. Applied after each factor, because G.6 says *"clamped"* of
 *  `marksWeight` and every factor `computeSeverity` accepts is 0–1 anyway — the
 *  engine REFUSES an out-of-range factor, and a derivation that could produce
 *  one would be a caller bug expressed as a runtime failure. */
const unit = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

// ═══════════════════════════════════════════════════════════════════════════
// THE FOUR FACTORS — one exported function each, so each is testable alone
// ═══════════════════════════════════════════════════════════════════════════

/**
 * G.6: *"`Σ marks_lost` on this leaf ÷ `Σ marks_lost` across the student's open
 * leaves, clamped."*
 *
 * A student whose only open leaf is this one gets 1 — correctly: it is the
 * whole of what they are currently losing marks to.
 *
 * A zero denominator returns 0 rather than dividing. Zero marks lost across
 * every open leaf means there is nothing to be relatively severe about, and
 * `0/0` is the shape that puts a `NaN` in a database column.
 */
export function marksWeightFactor(leafMarksLost: number, openLeavesMarksLost: number): number {
  if (openLeavesMarksLost <= 0) return 0;
  return unit(leafMarksLost / openLeavesMarksLost);
}

/** G.6: *"`min(1, occurrences_in_trailing_180d / RECURRENCE_FULL_AT)`"*. */
export function recurrenceWeightFactor(occurrencesInWindow: number): number {
  return unit(occurrencesInWindow / RECURRENCE_FULL_AT);
}

/**
 * G.6: *"`1` at ≤3 days to a goal exam covering this subject, decaying to `0`
 * at ≥60 days."*
 *
 * **G.6.a, restated at the site.** This factor is worth 20% of severity here,
 * and `PRODUCT_DECISIONS §4.10` then ranks `/next` by `severity ×
 * examProximity`. That is the same factor applied twice. It is inherited, it is
 * real, and it is NOT fixed here — G.6.a: *"the engine is right that it is a
 * product decision, not an engine bug. Flagged for founder decision before
 * ranking ships."* Fixing it in this file would be a plan silently amending a
 * decision, which `CLAUDE.md`'s precedence rule forbids.
 */
export function examProximityFactor(daysToGoalExam: number | null): number {
  if (daysToGoalExam === null) return 0;
  const days = daysToGoalExam < 0 ? 0 : daysToGoalExam;
  if (days <= EXAM_PROXIMITY_FULL_WITHIN_DAYS) return 1;
  if (days >= EXAM_PROXIMITY_ZERO_AT_DAYS) return 0;
  const span = EXAM_PROXIMITY_ZERO_AT_DAYS - EXAM_PROXIMITY_FULL_WITHIN_DAYS;
  return unit((EXAM_PROXIMITY_ZERO_AT_DAYS - days) / span);
}

/** G.6: *"`concepts.exam_weight` normalised against the max in the subject"* —
 *  *"uses the column already defined at `007_mistakes.sql:50`."* */
export function conceptExamWeightFactor(conceptExamWeight: number, maxSubjectExamWeight: number): number {
  if (maxSubjectExamWeight <= 0) return 0;
  return unit(conceptExamWeight / maxSubjectExamWeight);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE DERIVATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Derive the four factors, or refuse.
 *
 * It REFUSES rather than repairs, the posture every boundary in this codebase
 * takes (`lib/occurrences.ts`: *"A coerced draft is a claim wearing a fact's
 * clothes."*). A negative mark count is not a small severity — it is a caller
 * that read the wrong column, and a clamped 0 would hide that forever.
 */
export function deriveSeverityFactors(
  input: SeverityDerivationInput,
): { ok: true; factors: SeverityFactors; examProximityKnown: boolean } | { ok: false; refusal: SeverityRefusal; detail: string } {
  const numbers: Array<[string, unknown]> = [
    ["leafMarksLost", input.leafMarksLost],
    ["openLeavesMarksLost", input.openLeavesMarksLost],
    ["occurrencesInWindow", input.occurrencesInWindow],
    ["conceptExamWeight", input.conceptExamWeight],
    ["maxSubjectExamWeight", input.maxSubjectExamWeight],
  ];
  for (const [name, v] of numbers) {
    if (!finite(v)) {
      return { ok: false, refusal: "not-a-number", detail: `${name} must be a finite number; received ${String(v)}` };
    }
  }
  if (input.daysToGoalExam !== null && !finite(input.daysToGoalExam)) {
    return { ok: false, refusal: "not-a-number", detail: "daysToGoalExam must be a finite number or null" };
  }

  if (input.leafMarksLost < 0 || input.openLeavesMarksLost < 0) {
    return { ok: false, refusal: "negative-marks", detail: "marks lost cannot be negative" };
  }
  if (input.occurrencesInWindow < 0) {
    return { ok: false, refusal: "negative-occurrences", detail: "an occurrence count cannot be negative" };
  }
  if (input.conceptExamWeight < 0 || input.maxSubjectExamWeight < 0) {
    // `007:50` already declares `CHECK (exam_weight >= 0)`; a negative here means
    // the caller is not reading that column.
    return { ok: false, refusal: "negative-exam-weight", detail: "exam_weight is CHECK (>= 0) in 007" };
  }
  if (input.conceptExamWeight > input.maxSubjectExamWeight) {
    // The concept is inside the subject, so its weight is one of the values the
    // max was taken over. Greater means the two were read over different sets,
    // and clamping would produce a plausible 1 from an incoherent pair.
    return {
      ok: false,
      refusal: "concept-weight-exceeds-subject-max",
      detail: `${input.conceptExamWeight} > ${input.maxSubjectExamWeight}; the concept's own weight is inside the max`,
    };
  }
  if (input.leafMarksLost > input.openLeavesMarksLost) {
    return {
      ok: false,
      refusal: "leaf-marks-exceed-open-total",
      detail: `${input.leafMarksLost} > ${input.openLeavesMarksLost}; this leaf is one of the open leaves`,
    };
  }

  return {
    ok: true,
    examProximityKnown: input.daysToGoalExam !== null,
    factors: Object.freeze({
      marksWeight: marksWeightFactor(input.leafMarksLost, input.openLeavesMarksLost),
      recurrenceWeight: recurrenceWeightFactor(input.occurrencesInWindow),
      examProximity: examProximityFactor(input.daysToGoalExam),
      conceptExamWeight: conceptExamWeightFactor(input.conceptExamWeight, input.maxSubjectExamWeight),
    }),
  };
}

/**
 * The whole of M11-2: raw domain data in, a stamped severity out.
 *
 * The arithmetic is `computeSeverity()`'s and is reached through the ENGINE —
 * which is what makes this module one of `lib/mistakes/engine.ts`'s production
 * importers (M11-1, T12).
 */
export function deriveSeverity(input: SeverityDerivationInput): SeverityResult {
  const derived = deriveSeverityFactors(input);
  if (!derived.ok) return refuse(derived.refusal, derived.detail);

  const computed: Result<number> = computeSeverity(derived.factors);
  if (!computed.ok) {
    // Unreachable: every factor above is clamped into [0,1]. If it ever fires,
    // the derivation broke its own contract and the engine caught it — which is
    // the engine doing exactly what it is for.
    return refuse("not-a-number", `engine refused the derived factors: ${computed.error.detail}`);
  }

  return {
    ok: true,
    value: {
      severity: computed.value,
      provenance: Object.freeze({
        factorsVersion: SEVERITY_FACTORS_VERSION,
        factors: derived.factors,
        examProximityKnown: derived.examProximityKnown,
        derivedAt: input.at,
      }),
    },
  };
}

/**
 * Is a stored severity comparable with one this build would produce?
 *
 * The question a ranking surface must ask before sorting rows written months
 * apart. `false` is not an error — it means RECOMPUTE, which §4.6 already
 * promises: *"formula improvements upgrade every existing pattern
 * retroactively."*
 */
export const isSeverityCurrent = (storedVersion: string | null | undefined): boolean =>
  storedVersion === SEVERITY_FACTORS_VERSION;

/** True for a version this build can still read at all. */
export const isSeverityVersionSupported = (storedVersion: string | null | undefined): boolean =>
  typeof storedVersion === "string" && SUPPORTED_SEVERITY_VERSIONS.includes(storedVersion);
