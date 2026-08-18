// ═══════════════════════════════════════════════════════════════════════════
// M18-3 — REPLAY-FROM-CHECKPOINT ON CORRECTION, AND THE `restatement_of` IT
// LEAVES BEHIND.
//
// EXECUTION_PLAN M18-3: "Replay-from-checkpoint on correction; snapshots
// carry `restatement_of`. Done when: V.6.9, V.10.2. T8 mitigation."
//
// Architecture O.4: "Every L2 projection whose `input_watermark_event_id` is
// at or beyond the affected event is invalidated and rebuilt by replay from a
// safe checkpoint... L3 snapshots are NOT rewritten. A new snapshot is
// appended with a `restatement_of` pointer and a reason."
//
// `lib/score-engine.ts` (M14) already carries every mechanism this needs —
// `buildScoreSnapshot`, `PriorSnapshot`, `RestatementDecision` — and its own
// `decideRestatement()` already does exactly this shape of thing for ONE
// cause: a formula-version change. This module does not touch that file (M14
// is frozen for this pass); it adds the SECOND cause a restatement can have —
// a correction — as its own decision function, because the two causes have
// different questions behind them and must not be compressed into one:
//
//   decideRestatement()            "did the FORMULA that produced the prior
//   (lib/score-engine.ts, M14)      row change since it was written?"
//
//   decideCorrectionRestatement()   "did an L1 record the prior row was
//   (this file, M18)                 computed from just get superseded?"
//
// A correction under the SAME formula_version must still restate — O.4.a's
// worked example disputes a question "from three months ago" with no formula
// change anywhere in the story — so `decideRestatement`'s
// `prior.formulaVersion === next` early return is exactly wrong for this
// cause, and reusing it here would silently suppress the one case M18-3
// exists for.
//
// The recomputation itself (re-reading L1 and calling
// `computeLedgerScore`/`buildScoreSnapshot`) is UNCHANGED M14 machinery,
// wired in `app/api/corrections/route.ts` the same way
// `app/api/cron/score-snapshot/route.ts` already wires it for the daily
// close. "Replay from a safe checkpoint" here means: recompute the whole
// score from L1 as of now, under the current formula — the same computation
// the daily close performs, forced to run once, immediately, for one
// student, with an explicit reason attached. There is no separate
// partial-replay engine to build; `lib/mistakes/engine.ts` being pure and
// clock-free (O.4.2) is what already makes the FULL recompute cheap enough
// to run synchronously on a correction.
//
// No I/O, no clock (`at` / `capturedOn` are injected).
// ═══════════════════════════════════════════════════════════════════════════

import type { PriorSnapshot, RestatementDecision } from "./score-engine";

export interface CorrectionRestatementInput {
  /** The student's most recent existing snapshot, or `null` if they have
   *  none yet — a correction against a record with no score to restate
   *  produces no restatement at all; there is nothing standing to point at. */
  prior: PriorSnapshot | null;
  correctionId: string;
  /** Plain language — O.4.a: "the trajectory chart shows a step and can
   *  explain it." Never a code, always a sentence a student can read. */
  reason: string;
}

/**
 * O.4.3 / V.6.9 / V.10.2, for the CORRECTION cause specifically.
 *
 * Unlike `decideRestatement()`, this ALWAYS restates when there is a prior
 * snapshot to point at — a correction changed an L1 record the prior number
 * was computed from, regardless of whether the formula also changed. When
 * there is no prior snapshot, there is nothing to restate: the next snapshot
 * is simply the student's first, and `restatement_of: null` is the honest
 * reading, not a suppressed restatement.
 */
export function decideCorrectionRestatement(input: CorrectionRestatementInput): RestatementDecision {
  if (!input.prior) return { restatementOf: null, reason: null };

  return {
    restatementOf: input.prior.id,
    reason:
      `Recalculated after a correction (${input.correctionId}). ${input.reason} ` +
      `The figure from ${input.prior.capturedOn} is kept and has not been overwritten — ` +
      `only today's snapshot carries the correction.`,
  };
}
