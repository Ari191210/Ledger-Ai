// ═══════════════════════════════════════════════════════════════════════════
// M10-4 — THE TRANSITION GATE. COVERAGE FAILURE REFUSES TO VERIFY.
//
// EXECUTION_PLAN M10-4: *"The transition gate — coverage failure **refuses to
// verify**. Done when: V.3.4, V.3.5. T5 mitigation: the guarantee fails
// **closed**."*
//
// V.3.4: *"Bank is also empty for concept 3. **The session cannot become
// `VERIFIED`.** It goes `CLOSED_UNVERIFIED` … concepts 1, 2, 4 are `studied`,
// and **nothing is presented as verified.**"*
// V.3.5: *"Attempt to force `ASSESSING → VERIFIED` via a direct API call with
// concept 3 unanswered. **Refused server-side**, with a typed error."*
//
// F.2 layer 4: *"`ASSESSING → VERIFIED` is refused unless `∀ c ∈
// coverage_manifest : ∃ answered question with concept_id = c`. This is a
// server-side precondition on the state transition, so no client path and no
// model behaviour can produce a `VERIFIED` session with a coverage hole."*
//
// T5, the threat this file exists against: *"The coverage guarantee fails open.
// If generation cannot fill a slot and the assessment silently shrinks, 'every
// confirmed concept is assessed' becomes false while the UI still says
// verified."* Its mitigation is named and ranked: *"F.2's four layers, OF WHICH
// THE TRANSITION GATE IS THE LOAD-BEARING ONE."*
//
//
// FAILING CLOSED IS A SHAPE, NOT A DILIGENCE
//
// The cheap version of "fails closed" is a careful function that returns
// `false` on every error path it thought of. It survives until somebody adds a
// path nobody thought of. So the shape here is the other way round:
//
//   · `evaluateVerificationGate()` COLLECTS REASONS TO REFUSE and returns
//     `satisfied` only when the collection is empty. There is no `return
//     satisfied` inside a branch — there is exactly one, at the end, guarded by
//     `refusals.length === 0`. A new failure mode is added by pushing a reason,
//     and a failure mode nobody handled leaves the manifest entry unaccounted
//     for, which is itself counted as a hole.
//   · Every manifest entry must be POSITIVELY MATCHED to a coverage row. An
//     entry with no row is a hole; it is never "no evidence of a problem".
//   · The gate is fed the FROZEN manifest, not the coverage rows' own idea of
//     what the manifest was. A projection that lost a row cannot shrink the
//     obligation, because the obligation is read from the thing 023 §7 made
//     immutable.
//   · `VerifiedTransition` is a BRANDED type minted only by
//     `applyVerificationTransition()` on a satisfied gate. An endpoint cannot
//     write "verify this session" without holding one, and it cannot construct
//     one — the same mechanism `FrozenBlueprint` uses to make V.3.1's ordering
//     unrepresentable, pointed at V.3.5's forced transition.
//   · And none of that is the last line of defence: `024` §9 puts the same
//     predicate in a trigger on `study_sessions`, which binds the service role,
//     a repair script, and the next endpoint somebody writes in a hurry.
//
//
// IT DOES NOT REPLACE M9's STATE MACHINE — IT STANDS IN FRONT OF IT
//
// `applyVerificationTransition()` calls M9's own `applySessionTransition()` and
// returns whatever it returns. It adds a precondition and subtracts nothing:
// the edge, the close reason, the terminal check, the ABANDONED evidence guard
// and the noop-on-a-stale-tab behaviour are all still E.2's and still
// `lib/study-session.ts`'s. This file holds no second copy of the machine.
//
// A test fences the other direction: nothing outside this module may call
// `applySessionTransition` with `"assessment_completed"`.
//
// No I/O, no clock, no Supabase, no `next/*`.
// ═══════════════════════════════════════════════════════════════════════════

import type { ManifestEntry } from "./assessment-blueprint";
import {
  applySessionTransition,
  type SessionAction,
  type SessionFacts,
  type SessionState,
  type TransitionOutcome,
} from "./study-session";

/** F.2.a's reason string, as a constant so it is spelled once.
 *
 *  **IT IS AN ASSESSMENT-LEVEL REASON, NOT A SESSION `close_reason`, AND THAT
 *  IS A RECORDED DIVERGENCE FROM V.3.4's LITERAL WORDING.** F.2.a writes
 *  *"`CLOSED_UNVERIFIED` with `reason = 'coverage_unfillable'`"*; M9 shipped
 *  `CLOSE_REASONS` without it and `021`'s CHECK holds the same six values, so
 *  adding it means editing verified M9 work and an applied-migration checksum.
 *  The refusal is therefore recorded where 023 already has a home for it —
 *  `assessments.status = 'unfillable'` — and the session closes through the
 *  edge E.2 already draws for a session that could not produce an assessment.
 *  The student-facing wording is identical either way (`CLOSE_REASON_NOTE`
 *  renders both as *"Closed without an assessment"*), so nothing a student sees
 *  changes; what changes is which table the precise reason lives in. */
export const COVERAGE_UNFILLABLE = "coverage_unfillable";

/** The session action that closes a session whose coverage could not be filled.
 *  Named here so the mapping above is a value a test can assert rather than a
 *  paragraph a reader must trust. */
export const UNFILLABLE_CLOSE_ACTION: SessionAction = "generation_failed";

/**
 * One row of `024` §3's `assessment_verification_coverage`, or of any equivalent
 * a caller computes in memory.
 *
 * `covered` is carried AND recomputed here. Trusting it would make this gate a
 * restatement of the view, so a disagreement between the view's verdict and the
 * counts it was derived from is itself a refusal (`coverage_inconsistent`) —
 * the same posture `admit()` takes when it re-hashes a manifest it was handed.
 */
export interface CoverageRow {
  assessment_id: string;
  session_id: string;
  concept_ref: string;
  questions_required: number;
  questions_bound: number;
  questions_answered: number;
  covered: boolean;
}

export type VerificationRefusalReason =
  /** The session is not in a state from which verification is even a question. */
  | "not_assessing"
  /** No assessment exists for the session. F.1: assessment is the only
   *  manufacturer of verified evidence, so no assessment is no verification. */
  | "no_assessment"
  /** The frozen manifest names nothing. 023 §1 refuses to store one; if one
   *  arrives anyway it is refused here rather than satisfied vacuously (T5). */
  | "empty_manifest"
  /** A manifest entry has fewer bound questions than it requires — F.2.a's
   *  unfillable slot, arriving at the transition. */
  | "coverage_hole"
  /** A manifest entry is bound but not answered. F.2 layer 4 asks for an
   *  ANSWERED question; a presented-but-skipped question proves nothing. */
  | "unanswered_coverage"
  /** The coverage rows and the frozen manifest disagree, in either direction. */
  | "coverage_inconsistent";

export interface VerificationRefusal {
  reason: VerificationRefusalReason;
  /** The manifest entry this refusal is about, where there is one. Named so a
   *  refusal can say WHICH concept is unproven — V.3.4's *"concept 3"* — rather
   *  than only that something is. */
  concept_ref: string | null;
  detail: string;
}

export type VerificationVerdict =
  | { satisfied: true; assessment_id: string; entries: number }
  | { satisfied: false; refusals: readonly VerificationRefusal[] };

export interface VerificationGateInput {
  session_state: SessionState;
  /** The assessment's id, or `null` when the session has none. */
  assessment_id: string | null;
  /** THE FROZEN MANIFEST — 023 §7 made it immutable after INSERT, which is what
   *  makes it safe to treat as the obligation rather than as one more input. */
  manifest: readonly ManifestEntry[];
  coverage: readonly CoverageRow[];
}

/**
 * **THE GATE.** Total, pure, and it cannot throw.
 *
 * Read the return path before the branches: there is exactly one
 * `satisfied: true` in this function and it is the last statement, reachable
 * only when nothing was pushed onto `refusals`. Every other exit is a refusal.
 */
export function evaluateVerificationGate(input: VerificationGateInput): VerificationVerdict {
  const refusals: VerificationRefusal[] = [];
  const refuse = (reason: VerificationRefusalReason, concept_ref: string | null, detail: string) =>
    refusals.push({ reason, concept_ref, detail });

  // E.2: VERIFIED is reachable from ASSESSING and from nowhere else. Checked
  // here as well as in `applySessionTransition` so a caller that reads only the
  // verdict still learns why.
  if (input.session_state !== "ASSESSING") {
    refuse("not_assessing", null, `a session in ${input.session_state} is not being assessed`);
  }

  if (!input.assessment_id) {
    refuse("no_assessment", null, "the session has no assessment; verification is manufactured by assessment alone (F.1)");
  }

  if (input.manifest.length === 0) {
    refuse(
      "empty_manifest",
      null,
      "the coverage manifest names nothing, which would make 'every confirmed concept is assessed' vacuously true (T5)",
    );
  }

  // Index the rows by concept, and refuse a duplicate rather than picking one.
  // Two rows for one obligation is a projection defect, and choosing between
  // them would be this gate deciding which reading of the evidence it prefers.
  const byRef = new Map<string, CoverageRow>();
  for (const row of input.coverage) {
    if (input.assessment_id && row.assessment_id !== input.assessment_id) {
      refuse("coverage_inconsistent", row.concept_ref, "a coverage row belongs to another assessment");
      continue;
    }
    if (byRef.has(row.concept_ref)) {
      refuse("coverage_inconsistent", row.concept_ref, "two coverage rows for one manifest entry");
      continue;
    }
    byRef.set(row.concept_ref, row);
  }

  const manifestRefs = new Set(input.manifest.map(e => e.concept_ref));
  for (const ref of byRef.keys()) {
    if (!manifestRefs.has(ref)) {
      // A coverage row for a concept the frozen manifest does not name cannot
      // discharge any obligation, and its presence means the projection and the
      // freeze disagree. F.2 layer 3's refusal, one layer later.
      refuse("coverage_inconsistent", ref, "a coverage row names a concept the frozen manifest does not");
    }
  }

  // EVERY MANIFEST ENTRY MUST BE POSITIVELY DISCHARGED. This loop is where
  // "fails closed" actually lives: an entry with no row falls into the first
  // branch, not through the bottom.
  for (const entry of input.manifest) {
    const required = Math.max(1, Math.floor(entry.questions_required));
    const row = byRef.get(entry.concept_ref);

    if (!row) {
      refuse(
        "coverage_hole",
        entry.concept_ref,
        `${entry.concept_ref} has no coverage row at all; an obligation with no evidence is a hole, not an absence of a problem`,
      );
      continue;
    }

    if (row.questions_bound < required) {
      refuse(
        "coverage_hole",
        entry.concept_ref,
        `${entry.concept_ref} needs ${required} question(s) and has ${row.questions_bound} — F.2.a's unfillable slot`,
      );
      continue;
    }

    if (row.questions_answered < required) {
      refuse(
        "unanswered_coverage",
        entry.concept_ref,
        `${entry.concept_ref} has ${row.questions_bound} question(s) and ${row.questions_answered} answered; F.2 layer 4 requires an ANSWERED question`,
      );
      continue;
    }

    // The view's own verdict, cross-checked against the counts it came from.
    const recomputed = row.questions_bound >= required && row.questions_answered >= required;
    if (row.covered !== recomputed) {
      refuse(
        "coverage_inconsistent",
        entry.concept_ref,
        `the coverage row says covered=${row.covered} while its own counts say ${recomputed}`,
      );
    }
  }

  if (refusals.length > 0) return { satisfied: false, refusals };
  // Unreachable without an id — `no_assessment` above would have refused — and
  // narrowed here so the satisfied arm carries a string rather than a maybe.
  if (!input.assessment_id) {
    return { satisfied: false, refusals: [{ reason: "no_assessment", concept_ref: null, detail: "no assessment" }] };
  }
  return { satisfied: true, assessment_id: input.assessment_id, entries: input.manifest.length };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE TRANSITION — V.3.5's "refused server-side, with a typed error"
// ═══════════════════════════════════════════════════════════════════════════

declare const VERIFIED_BY_GATE: unique symbol;

/**
 * Permission to write `VERIFIED`. The brand is `declare`d and never emitted, so
 * it costs nothing at runtime and cannot be produced by an object literal —
 * only `applyVerificationTransition()` applies it, and only on a satisfied
 * gate.
 *
 * An endpoint that writes the state takes one of these. There is no expression
 * a caller can write that verifies a session without the gate having said yes,
 * which is V.3.5 at the type level and `024` §9 at the database level.
 */
export type VerifiedTransition = {
  readonly outcome: TransitionOutcome;
  readonly assessment_id: string;
  readonly entries_covered: number;
  readonly [VERIFIED_BY_GATE]: true;
};

export type VerificationOutcome =
  | { ok: true; transition: VerifiedTransition }
  | {
      ok: false;
      /** V.3.5's *"typed error"*. */
      refusals: readonly VerificationRefusal[];
      /** The state the session is still in. Nothing moved. */
      state: SessionState;
      /** F.2.a's honest ending, offered rather than performed: this pass
       *  reports the action a caller should take to close the session without
       *  verifying it. Performing it here would make a REFUSAL also a
       *  CLOSURE, and a student who is one answer short of coverage should be
       *  able to answer it, not find their session closed by the check. */
      close_with: SessionAction | null;
      assessment_reason: typeof COVERAGE_UNFILLABLE | null;
    };

/**
 * The only route to `VERIFIED`.
 *
 * **It cannot throw**, and it does not decide the edge — `applySessionTransition`
 * does, and a session that is terminal, or in a state with no
 * `assessment_completed` edge, comes back from M9 as a `noop` exactly as it
 * would have without this function in front of it.
 */
export function applyVerificationTransition(
  session: SessionFacts,
  input: Omit<VerificationGateInput, "session_state">,
): VerificationOutcome {
  const verdict = evaluateVerificationGate({ ...input, session_state: session.state });

  if (!verdict.satisfied) {
    // Only a hole in coverage is F.2.a's unfillable ending. A session that is
    // simply not being assessed, or whose projection is inconsistent, is not
    // something to close — it is something to refuse and leave alone.
    const unfillable = verdict.refusals.some(r => r.reason === "coverage_hole");
    return {
      ok: false,
      refusals: verdict.refusals,
      state: session.state,
      close_with: unfillable ? UNFILLABLE_CLOSE_ACTION : null,
      assessment_reason: unfillable ? COVERAGE_UNFILLABLE : null,
    };
  }

  const outcome = applySessionTransition(session, "assessment_completed");

  // M9 may still say no — a stale tab, a session already closed, a state with
  // no such edge. Its answer is final and is passed through unchanged; this
  // function narrows what may reach VERIFIED and never widens it.
  if (outcome.kind !== "transition" || outcome.to !== "VERIFIED") {
    return {
      ok: false,
      refusals: [{
        reason: "not_assessing",
        concept_ref: null,
        detail: `the session machine refused the edge: ${outcome.kind === "noop" ? outcome.why : outcome.to}`,
      }],
      state: session.state,
      close_with: null,
      assessment_reason: null,
    };
  }

  return {
    ok: true,
    transition: {
      outcome,
      assessment_id: verdict.assessment_id,
      entries_covered: verdict.entries,
    } as VerifiedTransition,
  };
}

/**
 * F.2.a's *"the concept is recorded as `studied`, NOT `assessed`"*, as a
 * per-concept reading a caller can render or project.
 *
 * `proven` is deliberately ABSENT from this union. M12-1 owns
 * `coverage_state`, and a second module deciding when a concept becomes proven
 * would be the second source of truth H.1.a forbids. What this function answers
 * is narrower and is entirely within M10's evidence: *"did this assessment
 * discharge this obligation?"*
 */
export type ConceptAssessmentState = "assessed" | "studied";

export function conceptAssessmentStates(
  input: Pick<VerificationGateInput, "manifest" | "coverage">,
): Record<string, ConceptAssessmentState> {
  const byRef = new Map(input.coverage.map(r => [r.concept_ref, r]));
  const out: Record<string, ConceptAssessmentState> = {};
  for (const entry of input.manifest) {
    const required = Math.max(1, Math.floor(entry.questions_required));
    const row = byRef.get(entry.concept_ref);
    out[entry.concept_ref] =
      row && row.questions_bound >= required && row.questions_answered >= required
        ? "assessed"
        : "studied";
  }
  return out;
}

/**
 * E.2.a / F.7, restated where the transition happens.
 *
 * A refused verification moves NO score, in either direction. There is no arm
 * of this type carrying a number, so a later milestone cannot pay a penalty for
 * a coverage hole without first widening a type whose header says why it must
 * not. `sessionScoreContribution()` in `lib/study-session.ts` says the same
 * thing about the session; this says it about the refusal.
 */
export type RefusalScoreEffect = { kind: "none" };

export const refusalScoreEffect = (_v: VerificationVerdict): RefusalScoreEffect => ({ kind: "none" });

/** F.7's *"non-consequences, guaranteed: no score penalty … no notification
 *  that shames"*, as a lexicon a test can read — §4's discipline, reused from
 *  `SESSION_STATE_NOTE`. Every string states a fact and offers a move. */
export const REFUSAL_NOTE: Readonly<Record<VerificationRefusalReason, string>> = {
  not_assessing: "This session is not in an assessment",
  no_assessment: "No assessment has been built for this session yet",
  empty_manifest: "There is nothing to assess in this session",
  coverage_hole: "One concept has no question yet",
  unanswered_coverage: "One concept is still unanswered",
  coverage_inconsistent: "The assessment record needs checking",
};
