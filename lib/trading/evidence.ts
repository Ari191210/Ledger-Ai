// Evidence and confidence for a trading signal.
//
// A prior instruction set for this engine ("the constitution") laid out
// rules for how a recommendation should reason: separate fact from
// assumption from inference; never let confidence rise because two
// indicators agree when they measure the same underlying thing; disclose
// what would prove the call wrong, what a different reading of the same
// facts would look like, and what data is missing. This module is the
// smallest thing that satisfies those rules for THIS engine's one strategy.
//
// It is deliberately not a general Bayesian framework. The opening-range
// breakout strategy (lib/trading/strategy.ts) has exactly one directional
// thesis — price is trending, and the breakout confirms it — read off two
// indicators that are both proxies for the same phenomenon. The honest
// output of that is a single, low, structurally-capped confidence, not an
// invented spread that would look more sophisticated than the underlying
// reasoning actually is. Confidence here is a property of the evidence
// structure, not a calibrated probability of the trade working — nothing
// in this codebase has verified that calibration against real fills.

export type EvidenceKind = "fact" | "assumption" | "inference";

export interface EvidenceLine {
  kind: EvidenceKind;
  /** Human-readable statement, surfaced in the trade log and on /terminal. */
  statement: string;
  /**
   * Signals that share a correlationGroup are read from the same underlying
   * phenomenon and must not each add to confidence. Two trend proxies
   * agreeing is one observation, not two — this is the field that enforces
   * that. Lines with no group are each their own singleton group.
   */
  correlationGroup?: string;
}

export interface SignalAssessment {
  /**
   * 0–1. How much independent support exists for the call, per
   * confidenceFromEvidence — not a win probability. Treat this as a
   * structural score until it has been checked against realised outcomes.
   */
  confidence: number;
  evidence: EvidenceLine[];
  /** What would prove this signal wrong, distinct from the stop being hit. */
  invalidation: string;
  /** A different, equally defensible reading of the same facts. */
  alternative: string;
  /** Data that would change this call, if this engine had access to it. */
  missingInformation: string;
  /** A risk this signal does not protect against, stated plainly. */
  knownRisk: string;
}

/** Weight a single fact contributes to confidence, before grouping. */
const FACT_WEIGHT = 0.5;
/** Weight a single inference contributes — less than an observed fact. */
const INFERENCE_WEIGHT = 0.3;
// Assumptions contribute nothing: they are premises the call depends on,
// not support for it, and Law 3 requires them labelled as such rather than
// smuggled in as evidence.

/**
 * Confidence never exceeds this, unconditionally. A single-strategy,
 * single-thesis system should not present as near-certain regardless of how
 * much evidence it manages to assemble for one trade.
 */
export const MAX_CONFIDENCE = 0.7;

/**
 * Confidence from evidence lines: each distinct correlation group is
 * credited once, at its strongest line, rather than summed line-by-line.
 * Two facts in the same group score the same as one fact in that group —
 * that is the mechanism that stops correlated indicators from inflating
 * confidence just because there happen to be more of them.
 */
export function confidenceFromEvidence(evidence: readonly EvidenceLine[]): number {
  const groupWeights = new Map<string, number>();
  let ungroupedIndex = 0;

  for (const line of evidence) {
    if (line.kind === "assumption") continue;
    const weight = line.kind === "fact" ? FACT_WEIGHT : INFERENCE_WEIGHT;
    const group = line.correlationGroup ?? `__ungrouped_${ungroupedIndex++}`;
    groupWeights.set(group, Math.max(groupWeights.get(group) ?? 0, weight));
  }

  const total = [...groupWeights.values()].reduce((a, b) => a + b, 0);
  return Math.min(total, MAX_CONFIDENCE);
}
