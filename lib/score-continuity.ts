// ═══════════════════════════════════════════════════════════════════════════
// M14-2 — CONTINUITY. THE DIMENSION THAT REPLACES THE STREAK.
//
// EXECUTION_PLAN M14-2: *"Delete the consecutive-day term from scoring
// (`lib/ledger-score.ts:218`, `lib/ledger-score-v2.ts:220`); four dimensions,
// **no streak**; Continuity computed from verified sessions and assessment
// participation. Done when: **the term is deleted, not renamed.** Continuity
// does not read `ledger-focus-streak`; renaming would not have implemented
// this (§9.3)."*
//
// `PRODUCT_DECISIONS` §9.3, ratified 2026-08-10:
//
//   > No consecutive-day mechanic is a core academic scoring input. …
//   > **This is a rebuild, not a rename.** … Renaming the existing streak
//   > variable to `continuity` is explicitly **not** an implementation of this
//   > decision.
//
// So this file contains no day index, no `lastDate`, no "yesterday", no
// `Date.toDateString()`, no sort-and-walk over calendar days, and no reference
// to `ledger-focus-streak` or to `lib/streak.ts`. A test asserts all of that by
// pattern over this file's source, and would fail if any of it reappeared under
// any name.
//
//
// WHAT IT MEASURES INSTEAD (J.2)
//
//   > **Continuity** · 150 · *whether verification is keeping pace with study*
//   > · ratio of verified to studied concepts over a trailing window
//
// J.2.a: *"it falls when a student studies a lot and verifies none of it, and
// it is **unaffected by a day off**. A student who studies twice a week and
// verifies both sessions has full Continuity."*
//
//
// THE FOUR PROPERTIES THE FORMULA HAD TO HAVE AT ONCE — AND THE ONE
// SUBSTITUTION J.2.a.4 AUTHORISED IN ADVANCE
//
//   P1  A day off moves nothing.                          (§9.3, §4.2)
//   P2  Three weeks of inactivity neither raises it nor    (V.6.6)
//       lowers it.
//   P3  Capture never lowers it.                           (§3.3, J.7.3)
//   P4  Abandoning a session is never a deduction and      (E.2, M9's
//       never a completion-rate denominator.               SESSION_SCORE_CONTRACT)
//
// A *trailing-window count* fails P2: after three weeks the window empties and
// the figure falls from inactivity alone. A *ratio* passes P2 — uniform ageing
// scales numerator and denominator by the same factor, so a decayed ratio is
// shift-invariant, which is v2's invariant I2 applied to a second term. The
// ratio is therefore the shape, as J.2 proposed.
//
// The ratio's hazard is its DENOMINATOR, and J.7.3 says so outright: *"a
// denominator that grows with capture is the exact shape §3.3 forbids."* J.2.a.4
// then authorises the fix in advance: *"If the J.7.3 carve-out cannot be made
// airtight in implementation, **the formula changes and the definition does
// not**."*
//
// The carve-out IS made airtight here, by one substitution:
//
//   J.7.3 admits a concept to the denominator once it has been *"confirmed and
//   had a fair opportunity to be assessed."* The obvious reading of "fair
//   opportunity" is a CLOCK — *N days have passed* — and a clock breaks P2: a
//   concept studied three weeks ago would cross the grace line during the
//   inactivity of V.6.6 and drop the ratio without the student doing anything.
//
//   So the opportunity is read from the SESSION'S OWN CLOSE REASON instead,
//   which is a fact, not an elapsed interval:
//
//     assessment_completed / VERIFIED  → the opportunity was TAKEN
//     assessment_skipped               → the opportunity was OFFERED AND DECLINED
//     reaped · discarded · generation_failed · review_skipped · still live
//                                      → the opportunity DID NOT ARISE
//
//   Only the first two admit a concept. That is §9.3's own sentence — Continuity
//   counts what the student *"confirmed and then declined to verify"* — with no
//   clock in it. Declaring five concepts from a coaching class tonight and going
//   to bed moves nothing, because the session was reaped and no assessment was
//   ever offered (E.5, §3.5, J.7.3's extension). Being offered the assessment and
//   pressing skip is *declining to verify*, which is precisely and only what this
//   dimension exists to see (J.2.a).
//
// Recorded as a divergence from J.2's literal wording rather than resolved by
// judgement, the way M12-1 and M13-1 recorded theirs. The definition (§9.3) is
// unchanged; one clause of the proposed formula is.
//
//
// THE SUFFICIENCY GATE, AND ITS OWN DIVERGENCE
//
// J.3 requires *"≥2 sessions in the trailing window"* below which Continuity is
// `insufficient evidence`. The window in that sentence has the same P2 problem:
// after three weeks of inactivity a windowed gate would flip a measured
// dimension to unmeasured, which V.6.6 reads as a fall. The gate here is
// therefore over the SETTLED SET rather than over a window: **two concepts whose
// verification fate is decided.** Recorded, and the number (2) is J.3's own.
// ═══════════════════════════════════════════════════════════════════════════

import type { LedgerScoreInputs, RecordedConcept, SessionRecord } from "./score-inputs";
import { coverageRank } from "./coverage-state";

/** J.2's cap. */
export const CONTINUITY_MAX = 150;

/** J.3's *"≥2"*, applied to settled concepts rather than to a window. */
export const CONTINUITY_MIN_SETTLED = 2;

/** v2's `ACCURACY_HALF_LIFE_DAYS`, reused so recency means one thing in this
 *  engine. The ratio is shift-invariant with ANY common half-life; this one is
 *  chosen so a concept settled last term weighs less than one settled last week
 *  without either ever reaching zero (v2 I2: no window cutoff). */
export const CONTINUITY_HALF_LIFE_DAYS = 21;

const DAY_MS = 86_400_000;

/**
 * The close reasons under which an assessment opportunity EXISTED.
 *
 * `reaped` is absent, and its absence is the whole of P4: M9's
 * SESSION_SCORE_CONTRACT says *"M14 MUST NOT derive Continuity … from
 * CLOSED_UNVERIFIED / ABANDONED / DORMANT counts as a DEDUCTION, a ratio
 * denominator that punishes abandonment, or a 'completion rate'."* A reaped
 * session contributes to neither side of this ratio.
 *
 * `generation_failed` is absent because the product failed, not the student.
 * `review_skipped` is absent because nothing was confirmed to verify.
 */
export const OPPORTUNITY_CLOSE_REASONS = Object.freeze(
  ["assessment_completed", "assessment_skipped"] as const,
);

const OPPORTUNITY = new Set<string>(OPPORTUNITY_CLOSE_REASONS);

/** Did this session put an assessment in front of the student? */
export function sessionOfferedAssessment(s: SessionRecord): boolean {
  if (s.state === "VERIFIED") return true;
  return s.closeReason !== null && OPPORTUNITY.has(s.closeReason);
}

/**
 * One concept's contribution, with the reason it is where it is. Carried so a
 * figure can name the rows it is a sum of (M13-1's instrument, reused).
 */
export interface ContinuityConcept {
  conceptRef: string;
  /** `assessed` or `proven` — verification happened. */
  verified: boolean;
  /** Exponential recency weight in (0, 1]. */
  weight: number;
}

export interface ContinuityEvidence {
  /** Concepts whose verification fate is settled — the denominator. */
  settled: readonly ContinuityConcept[];
  settledCount: number;
  verifiedCount: number;
  /** Σ weight of the verified subset. */
  verifiedWeight: number;
  /** Σ weight of the settled set. */
  settledWeight: number;
  /** Concepts held out of the denominator because a mistake was recorded on
   *  them (J.7.3). Reported so the carve-out is visible rather than silent. */
  excludedForMistake: readonly string[];
  /** Sessions that offered an assessment at all. J.3's countable "sessions". */
  opportunitySessions: number;
}

export type ContinuityOutcome =
  | { state: "measured"; points: number; ratio: number; evidence: ContinuityEvidence }
  | { state: "insufficient_evidence"; evidence: ContinuityEvidence };

/**
 * Compute Continuity.
 *
 * @remarks
 * There is no `streak` parameter, no `days` parameter and no calendar anywhere
 * in the body. The only time arithmetic is an exponential weight on a single
 * instant per concept, and it cancels between numerator and denominator.
 */
export function computeContinuity(inputs: LedgerScoreInputs): ContinuityOutcome {
  // Which sessions put an assessment in front of the student.
  const opportunity = new Set<string>();
  for (const s of inputs.sessions) if (sessionOfferedAssessment(s)) opportunity.add(s.sessionId);

  // J.7.3's carve-out set: concepts on which a mistake was RECORDED.
  // *"Recording a mistake is verification, not avoidance of it."*
  const mistakeConcepts = new Set<string>();
  for (const o of inputs.occurrences) if (o.conceptId) mistakeConcepts.add(o.conceptId);

  const settled: ContinuityConcept[] = [];
  const excludedForMistake: string[] = [];

  for (const c of inputs.concepts) {
    const rung = coverageRank(c.coverageState);
    // Below `studied` nothing was confirmed; there is nothing to verify yet.
    if (rung < coverageRank("studied")) continue;

    const verified = rung >= coverageRank("assessed");

    if (!verified) {
      // DENOMINATOR-ONLY. Two refusals apply here and NOWHERE ELSE, which is
      // what makes capture monotone: a carve-out that also removed verified
      // concepts could lower the ratio, and this one structurally cannot.
      //
      //   1. No assessment was ever offered for it → the opportunity did not
      //      arise, so the student has not declined anything.
      if (!hadOpportunity(c, opportunity)) continue;
      //   2. A mistake was recorded on it → J.7.3, verbatim.
      if (c.conceptId && mistakeConcepts.has(c.conceptId)) {
        excludedForMistake.push(c.conceptRef);
        continue;
      }
    }

    settled.push({
      conceptRef: c.conceptRef,
      verified,
      weight: recencyWeight(c.lastStudiedAtMs, inputs.asOfMs),
    });
  }

  let verifiedWeight = 0;
  let settledWeight = 0;
  let verifiedCount = 0;
  for (const c of settled) {
    settledWeight += c.weight;
    if (c.verified) {
      verifiedWeight += c.weight;
      verifiedCount += 1;
    }
  }

  const evidence: ContinuityEvidence = {
    settled: Object.freeze(settled),
    settledCount: settled.length,
    verifiedCount,
    verifiedWeight,
    settledWeight,
    excludedForMistake: Object.freeze(excludedForMistake),
    opportunitySessions: opportunity.size,
  };

  if (settled.length < CONTINUITY_MIN_SETTLED || settledWeight <= 0) {
    return { state: "insufficient_evidence", evidence };
  }

  const ratio = Math.min(1, verifiedWeight / settledWeight);
  return { state: "measured", points: Math.round(CONTINUITY_MAX * ratio), ratio, evidence };
}

/**
 * Was an assessment ever offered for this concept?
 *
 * A `studied` concept names the session that carried it there (026's
 * `evidence_refs.studied_in_session_id`). When the record does not name one,
 * the answer is NO — an unnamed session is not evidence that an opportunity
 * arose, and inventing one would put a fact in the denominator that never
 * happened.
 */
function hadOpportunity(c: RecordedConcept, opportunity: ReadonlySet<string>): boolean {
  return c.studiedInSessionId !== null && opportunity.has(c.studiedInSessionId);
}

/**
 * Pure exponential decay, no window cutoff (v2's invariant I2).
 *
 * A concept with no `last_studied_at` weighs 1: the record does not say when,
 * and guessing "long ago" would be a claim. Ageing alone cannot change the
 * RATIO these weights feed, because a uniform shift multiplies every weight by
 * the same factor.
 */
function recencyWeight(lastStudiedAtMs: number | null, asOfMs: number): number {
  if (lastStudiedAtMs === null) return 1;
  const ageDays = Math.max(0, (asOfMs - lastStudiedAtMs) / DAY_MS);
  return Math.pow(0.5, ageDays / CONTINUITY_HALF_LIFE_DAYS);
}

/**
 * The sentence this dimension is allowed to be said in (§9.3).
 *
 * > Target sentence: ***"Your learning has been consistent."***
 * > Never: *"You haven't broken your chain."*
 *
 * Kept here, next to the formula, for the reason M0-3 put the parent-digest
 * copy in one place: a lexicon a test can read is a ban that holds.
 */
export const CONTINUITY_NOTE = "Verification has kept pace with your study";
export const CONTINUITY_INSUFFICIENT_NOTE = "Not enough settled concepts to say yet";
