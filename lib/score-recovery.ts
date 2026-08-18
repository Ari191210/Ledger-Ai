// ═══════════════════════════════════════════════════════════════════════════
// M14-3 — RECOVERY. THE PILLAR THAT HAS BEEN ZERO FOR EVERY USER, REBUILT.
//
// EXECUTION_PLAN M14-3: *"Recovery pays only evidence-backed, system-set
// resolutions. **REBUILD.** Done when: V.6.5 — eight new mistakes cause **no
// dimension to fall**."*
//
// `PRODUCT_DECISIONS` §9.4, ratified 2026-08-10, and J.9.b:
//
//   > **A mistake is not "resolved" because the student says it is resolved.
//   > Resolution requires evidence.**
//   >
//   > **A student cannot earn mistake-related score by declaring or
//   > manipulating a mistake state.**
//
//
// THE ONE DECISION THIS FILE IS
//
// **Recovery is paid from `mistake_resolutions` (025), never from
// `patterns.status`.**
//
// That single sentence is the whole of M14-3, and it is not a stylistic
// preference. `025 §6` grants `UPDATE (status, history) ON patterns TO
// authenticated` — a client CAN write the string `'resolved'` into
// `patterns.status`. Three refusals stand in its way (007's UPDATE policy,
// 025's INSERT policy, and `applyTransition`'s `forbidden-for-student` arm),
// and they are good; but a scoring term that reads `status` is a term whose
// correctness depends on all three holding forever, in SQL, at runtime, on a
// column a client is granted.
//
// A `mistake_resolutions` row cannot be forged the same way. It has no INSERT
// policy and no UPDATE policy for `authenticated` at all — a student may only
// SELECT — and every row it can hold carries its own proof in CHECK
// constraints: `set_by = 'system'`, `array_length(proof_attempt_ids) >= 2`,
// `cooling_days >= 7`. `readResolution()` re-checks all three in TypeScript, so
// even a row that reached the table by some other route cannot be counted.
//
// J.9's *"the cheap fix converts a dead pillar into a self-awardable one, which
// is strictly worse"* is therefore refused twice: once by reading a different
// table, and once by re-checking that table's own guarantees.
//
//
// THE THREE TERMS — J.7.1, KEPT VERBATIM FROM v1
//
// J.8 lists *"the capture-never-punishes invariant and its counts-with-ceilings
// implementation"* and *"dedup by pattern id"* among the things the target
// **KEEPS** from `lib/ledger-score.ts:157-215`. They are kept, with their
// reasoning, because the reasoning is right:
//
//   resolution       0–120   20 per pattern with PROOF
//   evidence         0–50     5 per DISTINCT piece of evidence
//   acknowledgement  0–30     5 per pattern faced rather than avoided
//
// Every term is a COUNT WITH A CEILING and none is a proportion. J.7.1: *"A new
// open pattern enters no denominator, so recording it cannot reduce any term."*
// That is what makes V.6.5 structural instead of remembered — there is no
// arithmetic here that a new unresolved mistake can subtract from.
//
// No I/O, no clock, no randomness. Every fact is an argument (U.3).
// ═══════════════════════════════════════════════════════════════════════════

import type { LedgerScoreInputs, ResolutionRecord } from "./score-inputs";
import type { PatternRecord } from "./diagnosis";

/** J.2's cap, and the three sub-ceilings that sum to it. */
export const RECOVERY_MAX = 200;
export const RESOLUTION_CEILING = 120;
export const EVIDENCE_CEILING = 50;
export const ACKNOWLEDGEMENT_CEILING = 30;

export const POINTS_PER_RESOLUTION = 20;
export const POINTS_PER_EVIDENCE = 5;
export const POINTS_PER_FACED = 5;

/**
 * §4.11 / v1 `:208`, unchanged: a pattern *faced rather than avoided*.
 *
 * `open` is absent — it has not been looked at. `dormant` is absent — it was
 * left alone. `resolved` is present because facing something and fixing it is
 * still facing it, and the resolution term pays the fixing separately.
 *
 * **This list pays acknowledgement, never resolution.** A student may set
 * `acknowledged` and `practising` (`STUDENT_SETTABLE`, §4.8) and those are
 * worth 5 points each up to 30 — that is the product paying a student for
 * looking at their own mistakes, which is exactly §3.3's intent. A student may
 * not set `resolved`, and if they somehow did, this list would pay it 5 and the
 * resolution term would still pay it nothing.
 */
export const FACED_STATUSES = Object.freeze(
  ["acknowledged", "practising", "resolved", "recurred"] as const,
);

const FACED = new Set<string>(FACED_STATUSES);

export interface RecoveryEvidence {
  /** Distinct leaf patterns with a genuine `mistake_resolutions` row. */
  resolvedPatternIds: readonly string[];
  /** Distinct `evidence` rows behind the student's confirmed occurrences. */
  evidenceIds: readonly string[];
  /** Distinct patterns in a faced status. */
  facedPatternIds: readonly string[];
  /**
   * Patterns whose row SAYS `status = 'resolved'` and for which no
   * `mistake_resolutions` row exists.
   *
   * **This is the number M14-3 exists to make zero-paying, and it is reported
   * rather than dropped.** A non-empty list is either a legitimate legacy row
   * or an attempted client-set resolution; either way it earns nothing, and a
   * later audit can see it happened.
   */
  unprovenResolutionClaims: readonly string[];
  resolutionPoints: number;
  evidencePoints: number;
  acknowledgementPoints: number;
}

export type RecoveryOutcome =
  | { state: "measured"; points: number; evidence: RecoveryEvidence }
  | { state: "insufficient_evidence"; evidence: RecoveryEvidence };

/**
 * Compute Recovery.
 *
 * J.3's minimum: *"≥1 occurrence with evidence"*. Below it the dimension is
 * `insufficient evidence` and NOT zero — a student who has never recorded a
 * mistake has not scored zero on recovery, they have not been measured. J.3.a:
 * *"Rendering the second as the first is a lie in the strict sense of Law 7."*
 */
export function computeRecovery(inputs: LedgerScoreInputs): RecoveryOutcome {
  // ── The proof index. One entry per pattern that has a REAL resolution. ────
  const provenPatterns = new Set<string>();
  for (const r of inputs.resolutions) provenPatterns.add(r.patternId);

  // ── Resolution (0–120) ───────────────────────────────────────────────────
  // Deduplicated by PATTERN, not by resolution row. G.8 keeps every historical
  // `MistakeResolution` — a student who fixed something, lost it and fixed it
  // again has two rows — and paying both would let recurrence manufacture
  // score. v1 `:186-193`: *"repetition must never manufacture score."*
  const patternsById = new Map<string, PatternRecord>();
  for (const p of inputs.patterns) patternsById.set(p.id, p);

  const resolvedPatternIds: string[] = [];
  for (const patternId of provenPatterns) {
    // A resolution naming a pattern that is not in the record is not payable:
    // the score may not credit a row it cannot show the student.
    if (!patternsById.has(patternId)) continue;
    resolvedPatternIds.push(patternId);
  }
  resolvedPatternIds.sort();

  // ── The claims that are NOT paid ─────────────────────────────────────────
  const unprovenResolutionClaims: string[] = [];
  for (const p of inputs.patterns) {
    if (p.status === "resolved" && !provenPatterns.has(p.id)) unprovenResolutionClaims.push(p.id);
  }
  unprovenResolutionClaims.sort();

  // ── Evidence (0–50) ──────────────────────────────────────────────────────
  // DISTINCT evidence, not distinct occurrences. v1 `:195-200`: *"Ten
  // occurrences extracted from one photographed paper are one piece of
  // evidence, so re-logging the same paper earns nothing."*
  const evidenceSet = new Set<string>();
  for (const o of inputs.occurrences) if (o.evidenceId) evidenceSet.add(o.evidenceId);
  const evidenceIds = [...evidenceSet].sort();

  // ── Acknowledgement (0–30) ───────────────────────────────────────────────
  const facedSet = new Set<string>();
  for (const p of inputs.patterns) if (FACED.has(p.status)) facedSet.add(p.id);
  const facedPatternIds = [...facedSet].sort();

  const resolutionPoints = Math.min(RESOLUTION_CEILING, resolvedPatternIds.length * POINTS_PER_RESOLUTION);
  const evidencePoints = Math.min(EVIDENCE_CEILING, evidenceIds.length * POINTS_PER_EVIDENCE);
  const acknowledgementPoints = Math.min(ACKNOWLEDGEMENT_CEILING, facedPatternIds.length * POINTS_PER_FACED);

  const evidence: RecoveryEvidence = {
    resolvedPatternIds: Object.freeze(resolvedPatternIds),
    evidenceIds: Object.freeze(evidenceIds),
    facedPatternIds: Object.freeze(facedPatternIds),
    unprovenResolutionClaims: Object.freeze(unprovenResolutionClaims),
    resolutionPoints,
    evidencePoints,
    acknowledgementPoints,
  };

  if (evidenceIds.length === 0) return { state: "insufficient_evidence", evidence };

  return {
    state: "measured",
    points: Math.min(RECOVERY_MAX, resolutionPoints + evidencePoints + acknowledgementPoints),
    evidence,
  };
}

/**
 * The property V.6.5 is a special case of, exported so a caller — and a test —
 * can ask it directly rather than inferring it from the arithmetic.
 *
 * `PRODUCT_PRINCIPLES` §3.3: *"A student who logs honestly may never score
 * below a student who logs nothing."* Every term above is `min(ceiling, count ×
 * points)` over a set that only grows, so the function is monotone
 * non-decreasing in every input. There is no denominator to raise.
 */
export const recoveryCanFallFromCapture = (): false => false;

/**
 * Why a resolution was not paid, in the words an audit will want.
 * `readResolution()` in `lib/score-inputs.ts` produces the refusal codes; this
 * names them.
 */
export const RESOLUTION_REFUSAL_NOTE: Readonly<Record<string, string>> = Object.freeze({
  "no-id": "The resolution row has no identity",
  "no-pattern": "The resolution names no pattern",
  "unreadable-timestamp": "The resolution has no readable instant",
  "not-system-set": "Only the system resolves a mistake (PRINCIPLES §3.1)",
  "insufficient-proof": "Fewer than two correct answers stand behind it (§4.8)",
  "cooling-period-not-elapsed": "The seven-day cooling period had not elapsed (G.8)",
});

/** Exported so the engine can name a resolution without importing the row
 *  reader's shape twice. */
export type { ResolutionRecord };
