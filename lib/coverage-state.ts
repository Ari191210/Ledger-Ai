// ═══════════════════════════════════════════════════════════════════════════
// M12-1 — `coverage_state` PER CONCEPT. THE ACADEMIC RECORD'S ONE PROJECTION.
//
// EXECUTION_PLAN M12-1: *"`coverage_state` per concept: declared → studied →
// proven. Done when: V.2.7 — a concept becomes `proven` only after
// assessment."*
//
// V.2.7: *"The student passes both. **Now** Verified Performance and Proven
// Coverage move, and `AcademicRecord.coverage_state` for Torque becomes
// `proven`."*
//
//
// WHY THIS FILE EXISTS AT ALL, AND WHY IT DID NOT EXIST BEFORE
//
// M10 was asked for V.2.7 and refused the last clause of it, in writing:
// `conceptAssessmentStates()` in `lib/assessment-verification.ts` deliberately
// has **no `proven` arm**, because *"a second module deciding when a concept
// becomes proven would be the second source of truth H.1.a forbids."* Three of
// V.2.7's four clauses became reachable in M10; the fourth was left for exactly
// one module to own. This is that module, and it is the ONLY place in the
// codebase where the word `proven` is a value rather than a comment.
//
//
// IT IS A PROJECTION. IT DECLARES NOTHING.
//
// C.3 `AcademicRecord`: *"Rebuild rule: fully derivable from events + attempts
// + patterns. Stored only as a cache, with the watermark that produced it."*
// H.1 puts it in **L2**, whose defining property is *"rebuildable from L1 by
// replay"* and whose retention rule (H.2) is *"retained but disposable: it may
// be truncated and rebuilt at any time. That property is a hard requirement,
// not an optimisation."*
//
// So every function here is a FOLD OVER FACTS OTHER MILESTONES WROTE:
//
//   declared  ← M9's `session_concepts`, through 022 §4's confirmed-only view.
//               Nothing proposed reaches the record unconfirmed (V.2.2).
//   studied   ← M9's `study_sessions`: the episode actually happened — the
//               session carried evidence, or it left the open states. F.2.a's
//               *"concepts 1, 2, 4 are `studied`"* is this rung.
//   assessed  ← M10's `assessment_verification_coverage` (024 §3): the
//               obligation was BOUND and ANSWERED. Exactly M10's own
//               `conceptAssessmentStates()` verdict, imported rather than
//               re-derived.
//   proven    ← M10's coverage PLUS a `VERIFIED` session PLUS enough CORRECT
//               unrevoked answers. This rung, and only this rung, is new.
//
// There is no `setCoverageState()`, no patch type and no writer in this file.
// A caller can only ask what the facts already say. `026`'s
// `concept_coverage` VIEW holds the identical derivation in SQL, and a test
// reads both and asserts the rungs agree — so a SQL reader and a TypeScript
// reader cannot come to different conclusions about the same student.
//
//
// THE LADDER IS C.3's FIVE, NOT THE PLAN'S THREE — A RECORDED DIVERGENCE
//
// EXECUTION_PLAN M12-1 names three rungs (*"declared → studied → proven"*).
// C.3 `AcademicRecord.coverage_state` names five: *"`{untouched, declared,
// studied, assessed, proven}`"*. The five are implemented, because the plan's
// three are a strict subset of them and because `assessed` is load-bearing
// elsewhere already: F.2.a distinguishes *"recorded as `studied`, NOT
// `assessed`"* on a coverage failure, and H.4's query 4 (*"what have I studied
// but never been tested on?"*) is answerable ONLY if the two are different
// values. Collapsing them to satisfy the plan's shorter phrasing would delete a
// distinction two other parts of the architecture already depend on. Recorded
// here rather than resolved by judgement in the moment (CLAUDE.md).
//
//
// WHAT IT CONTRIBUTES TO THE SCORE: NOTHING. M14 OWNS THAT.
//
// V.2.7 names "Verified Performance and Proven Coverage" moving. Those are
// Ledger Score dimensions (J.2) and they are M14's. This module produces a
// STATE; converting a state into a number is a different milestone's decision,
// and `coverageScoreEffect()` below is the one-armed union that keeps it that
// way — the same fence `sessionScoreContribution()` and `conceptScoreEffect()`
// already put around M9's surfaces.
//
// No I/O, no clock, no randomness, no Supabase, no `next/*`. Imports two types
// from M9 and M10 and nothing else.
// ═══════════════════════════════════════════════════════════════════════════

import type { CoverageRow } from "./assessment-verification";
import type { SessionState } from "./study-session";

// ═══════════════════════════════════════════════════════════════════════════
// C.3's ENUM, AND ITS ORDER
// ═══════════════════════════════════════════════════════════════════════════

/** C.3 `AcademicRecord.coverage_state`, verbatim and in ascending order of
 *  evidence. The order is the meaning: a concept's state is the HIGHEST rung
 *  any single piece of evidence reaches, and evidence never un-happens. */
export const COVERAGE_STATES = [
  "untouched",
  "declared",
  "studied",
  "assessed",
  "proven",
] as const;
export type CoverageState = (typeof COVERAGE_STATES)[number];

const RANK: Readonly<Record<CoverageState, number>> = {
  untouched: 0,
  declared: 1,
  studied: 2,
  assessed: 3,
  proven: 4,
};

export const coverageRank = (s: CoverageState): number => RANK[s];

/**
 * `026` §2's view, named ONCE, here — 022 §4's discipline for
 * `CONFIRMED_SESSION_CONCEPTS_VIEW`, reused.
 *
 * **IT HOLDS RUNGS 3 AND 4 ONLY, AND THIS MODULE HOLDS ALL FOUR.** 022 fences
 * its session-concept relation by substring — the view's own name included —
 * and M9's suite fails if any file outside 022 and `lib/session-concepts.ts`
 * spells it. So 026 does not spell it, `declared` and `studied` are derived
 * here from rows the caller reads through M9's own exported constant, and the
 * SQL half carries the assessment evidence, which needs no session concept at
 * all. `026` §2 records the split and the reason.
 *
 * **THIS MODULE IS THE CANONICAL DERIVATION.** The view is the ceiling a
 * cached row may not exceed, which is the direction T8 cares about.
 */
export const CONCEPT_ASSESSMENT_EVIDENCE_VIEW = "concept_assessment_evidence";

/** `026` §6. Every cached row claiming a rung the evidence does not support. */
export const ACADEMIC_RECORD_DRIFT_VIEW = "academic_record_drift";

/** `026`'s L2 cache table. The view above is the TRUTH; this is the stored copy
 *  with the watermark that produced it, and M12-3 exists to notice when the two
 *  disagree. */
export const ACADEMIC_RECORD_TABLE = "academic_record";

/** The projection's name in `projection_watermarks`. */
export const COVERAGE_PROJECTION = "concept_coverage";

/**
 * E.2's states in which a study episode has demonstrably HAPPENED, as opposed
 * to being in progress.
 *
 * `ABANDONED` is absent and that is the whole point of the list: E.2.b makes
 * `ABANDONED` reachable *"only while the session contains NO E-class event"*,
 * so an abandoned session is by construction one in which nothing was studied.
 * Counting it as `studied` would put a fact in the record that never happened.
 */
export const EPISODE_CONCLUDED_STATES: readonly SessionState[] = [
  "REVIEWING",
  "ASSESSING",
  "CLOSED_UNVERIFIED",
  "VERIFIED",
];

const CONCLUDED = new Set<string>(EPISODE_CONCLUDED_STATES);

// ═══════════════════════════════════════════════════════════════════════════
// THE INPUTS — one struct per underlying fact, each named for the table it
// came from, so a reader can check the derivation against the schema.
// ═══════════════════════════════════════════════════════════════════════════

/** One row of 022's `session_concepts`, narrowed to what a rung needs. */
export interface CoverageSessionConcept {
  session_id: string;
  student_id: string;
  concept_ref: string;
  concept_id: string | null;
  /** V.2.2's gate. Only `'confirmed'` is a fact; `'proposed'` and `'rejected'`
   *  contribute NOTHING, which is why this is carried rather than pre-filtered:
   *  a caller that filtered first could not be checked. */
  confirmation_state: "proposed" | "confirmed" | "rejected";
  confirmed_at: string | null;
}

/** One row of 021's `study_sessions`, narrowed. */
export interface CoverageSession {
  session_id: string;
  state: SessionState;
  /** 021's stored count of E-class events. `> 0` is proof the student did
   *  something in this session, in any state. */
  evidence_event_count: number;
  opened_at: string;
  closed_at: string | null;
}

/**
 * The per-concept answer tally for ONE assessment, built from
 * `assessment_attempts` joined through unrevoked questions.
 *
 * `correct_questions` counts DISTINCT QUESTIONS whose latest unrevoked attempt
 * was correct — not attempts. F.5 makes answers append-only with `attempt_no`,
 * so counting attempts would let a student reach `proven` by answering one
 * question wrong four times and right once, which is precisely the reading of
 * the evidence a record must not take.
 */
export interface CoverageAnswers {
  assessment_id: string;
  concept_ref: string;
  correct_questions: number;
  answered_questions: number;
}

/** Everything the derivation reads for one (student, concept_ref). */
export interface CoverageInput {
  student_id: string;
  concept_ref: string;
  concept_id: string | null;
  subject: string | null;
  concepts: readonly CoverageSessionConcept[];
  sessions: readonly CoverageSession[];
  /** 024 §3's `assessment_verification_coverage` rows for this concept. */
  coverage: readonly CoverageRow[];
  answers: readonly CoverageAnswers[];
}

/** Why a concept is where it is. C.3's *"each carries the identity of the
 *  inputs that produced it so a stale one is detectable rather than merely
 *  wrong"*, as data. */
export interface CoverageEvidence {
  /** The session that first put this concept in the record. */
  declared_in_session_id: string | null;
  /** The session that carried it to `studied`. */
  studied_in_session_id: string | null;
  /** The assessment that discharged the obligation (`assessed`). */
  assessed_in_assessment_id: string | null;
  /** The assessment whose correct answers, inside a VERIFIED session, proved
   *  it. NULL at every rung below `proven`, always. */
  proven_by_assessment_id: string | null;
  proven_in_session_id: string | null;
}

export interface CoverageProjection {
  student_id: string;
  concept_ref: string;
  concept_id: string | null;
  subject: string | null;
  coverage_state: CoverageState;
  evidence: CoverageEvidence;
  /** Counts C.3 names on `AcademicRecord`. Figures only — no verdict, no
   *  message (E.8.a's discipline). */
  session_count: number;
  assessed_count: number;
  first_studied_at: string | null;
  last_studied_at: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE DERIVATION
//
// Read it as a LADDER: each rung is checked only if the one below it held, and
// the function returns the highest rung reached. There is no branch that can
// award a rung without the rungs beneath it — which is what makes *"a concept
// becomes `proven` only after assessment"* a property of the shape rather than
// a rule the code remembers.
// ═══════════════════════════════════════════════════════════════════════════

const EMPTY_EVIDENCE: CoverageEvidence = {
  declared_in_session_id: null,
  studied_in_session_id: null,
  assessed_in_assessment_id: null,
  proven_by_assessment_id: null,
  proven_in_session_id: null,
};

/** The `required` a coverage row must meet, floored at 1 exactly as M10's gate
 *  floors it (`evaluateVerificationGate`), so the two agree by construction. */
const requiredOf = (row: CoverageRow): number =>
  Math.max(1, Math.floor(row.questions_required));

/**
 * **THE PROJECTION.** Pure, total, and it cannot throw.
 *
 * It cannot throw for `applySessionTransition()`'s reason: its callers are a
 * cron job and a read endpoint, and a projection that throws on one odd student
 * is a projection that stops projecting for everybody.
 */
export function deriveCoverageState(input: CoverageInput): CoverageProjection {
  const sessions = new Map(input.sessions.map(s => [s.session_id, s]));

  // ── RUNG 1 · declared ───────────────────────────────────────────────────
  // 022 §4's predicate, applied here rather than assumed of the caller.
  const confirmed = input.concepts.filter(
    c => c.confirmation_state === "confirmed" && c.concept_ref === input.concept_ref,
  );

  if (confirmed.length === 0) {
    return {
      student_id: input.student_id,
      concept_ref: input.concept_ref,
      concept_id: input.concept_id,
      subject: input.subject,
      coverage_state: "untouched",
      evidence: EMPTY_EVIDENCE,
      session_count: 0,
      assessed_count: 0,
      first_studied_at: null,
      last_studied_at: null,
    };
  }

  // Deterministic ordering by the confirmation timestamp, then by session id so
  // two confirmations in the same millisecond still fold the same way on every
  // run (U.3: *"if a value can differ between two runs over the same inputs"*).
  const ordered = [...confirmed].sort((a, b) => {
    const ta = a.confirmed_at ?? "";
    const tb = b.confirmed_at ?? "";
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.session_id < b.session_id ? -1 : 1;
  });

  const evidence: CoverageEvidence = { ...EMPTY_EVIDENCE };
  evidence.declared_in_session_id = ordered[0].session_id;

  let state: CoverageState = "declared";
  let firstStudied: string | null = null;
  let lastStudied: string | null = null;

  // ── RUNG 2 · studied ────────────────────────────────────────────────────
  for (const c of ordered) {
    const session = sessions.get(c.session_id);
    if (!session) continue;
    const happened = session.evidence_event_count > 0 || CONCLUDED.has(session.state);
    if (!happened) continue;

    if (state === "declared") {
      state = "studied";
      evidence.studied_in_session_id = c.session_id;
    }
    const at = c.confirmed_at ?? session.opened_at;
    if (firstStudied === null || at < firstStudied) firstStudied = at;
    if (lastStudied === null || at > lastStudied) lastStudied = at;
  }

  // ── RUNG 3 · assessed ───────────────────────────────────────────────────
  // M10's verdict, not a second reading of it: `covered` is recomputed from the
  // row's own counts exactly as `evaluateVerificationGate` recomputes it, so a
  // view whose stored boolean disagreed with its counts cannot promote anything.
  const coverageRows = input.coverage.filter(r => r.concept_ref === input.concept_ref);
  const discharged = coverageRows.filter(r => {
    const required = requiredOf(r);
    return r.questions_bound >= required && r.questions_answered >= required && r.covered === true;
  });

  if (state === "studied" && discharged.length > 0) {
    state = "assessed";
    evidence.assessed_in_assessment_id = discharged[0].assessment_id;
  }

  // ── RUNG 4 · proven ─────────────────────────────────────────────────────
  //
  // THE THREE CONDITIONS, ALL OF THEM REQUIRED, NONE OF THEM INFERRED:
  //
  //   1. the obligation was discharged (rung 3 held);
  //   2. the session that carried the assessment is `VERIFIED` — which only
  //      M10's `applyVerificationTransition()` can produce, and only through
  //      the gate that refuses a coverage hole (V.3.5, T5);
  //   3. enough of the concept's own questions were answered CORRECTLY, where
  //      "enough" is the manifest's own `questions_required` — the number M10-1
  //      froze before any model call, never a constant chosen here.
  //
  // Condition 2 is what makes V.2.7 true and V.3.4 false at the same time: in
  // V.3.4 the session closes UNVERIFIED, so concepts 1, 2 and 4 stop at
  // `studied`/`assessed` and nothing is *"presented as verified"*.
  if (state === "assessed") {
    const byAssessment = new Map(
      input.answers.filter(a => a.concept_ref === input.concept_ref).map(a => [a.assessment_id, a]),
    );

    for (const row of discharged) {
      const session = sessions.get(row.session_id);
      if (!session || session.state !== "VERIFIED") continue;

      const answers = byAssessment.get(row.assessment_id);
      if (!answers) continue;
      if (answers.correct_questions < requiredOf(row)) continue;

      state = "proven";
      evidence.proven_by_assessment_id = row.assessment_id;
      evidence.proven_in_session_id = row.session_id;
      break;
    }
  }

  return {
    student_id: input.student_id,
    concept_ref: input.concept_ref,
    concept_id: input.concept_id,
    subject: input.subject,
    coverage_state: state,
    evidence,
    session_count: ordered.length,
    assessed_count: discharged.length,
    first_studied_at: firstStudied,
    last_studied_at: lastStudied,
  };
}

/**
 * The same derivation over a whole student, grouped by `concept_ref`.
 *
 * Grouping is by `concept_ref` and NOT by `concept_id`, because B.4 and V.2.4
 * make an unresolved concept a first-class member of the record: *"the thing
 * about wobbling tops"* has `concept_id = NULL` and a `text:` ref, and V.2.6
 * requires the assessment to cover it like any other. A projection keyed on
 * `concept_id` would silently merge every unresolved declaration a student ever
 * made into one NULL bucket.
 */
export function projectCoverage(input: {
  student_id: string;
  concepts: readonly CoverageSessionConcept[];
  sessions: readonly CoverageSession[];
  coverage: readonly CoverageRow[];
  answers: readonly CoverageAnswers[];
  /** `concept_ref → subject`, where the taxonomy knows one. Absent is NULL and
   *  never a guess (B.4). */
  subjects?: Readonly<Record<string, string | null>>;
}): CoverageProjection[] {
  const refs = new Map<string, string | null>();
  for (const c of input.concepts) {
    if (c.confirmation_state !== "confirmed") continue;
    if (!refs.has(c.concept_ref)) refs.set(c.concept_ref, c.concept_id);
  }

  return [...refs.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([concept_ref, concept_id]) =>
      deriveCoverageState({
        student_id: input.student_id,
        concept_ref,
        concept_id,
        subject: input.subjects?.[concept_ref] ?? null,
        concepts: input.concepts,
        sessions: input.sessions,
        coverage: input.coverage,
        answers: input.answers,
      }),
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// READERS OTHER MILESTONES WILL WANT — and one they may not have
// ═══════════════════════════════════════════════════════════════════════════

/** H.4's query 4: *"What have I studied but never been tested on?"* — the query
 *  C.3 says is *"only expressible because coverage state is a first-class
 *  field"*. Written here so M13 reads it rather than re-deriving it. */
export const studiedNotAssessed = (rows: readonly CoverageProjection[]): CoverageProjection[] =>
  rows.filter(r => r.coverage_state === "studied");

export const provenOnly = (rows: readonly CoverageProjection[]): CoverageProjection[] =>
  rows.filter(r => r.coverage_state === "proven");

/** True only at the top rung. Exported so a surface asks a question rather than
 *  comparing a string, and so a widening of the enum cannot silently change
 *  what a caller means by "proven". */
export const isProven = (r: Pick<CoverageProjection, "coverage_state">): boolean =>
  r.coverage_state === "proven";

/**
 * §4's discipline, reused from `SESSION_STATE_NOTE`. Every string states a fact
 * and none of them judges: there is no "incomplete", no "only", no "still".
 */
export const COVERAGE_STATE_NOTE: Readonly<Record<CoverageState, string>> = {
  untouched: "Not in your record yet",
  declared: "You said you studied this",
  studied: "You studied this in a session",
  assessed: "This was assessed",
  proven: "You answered this correctly in a verified session",
};

/**
 * J.2's dimensions are M14's, and this is the fence.
 *
 * One arm, no sign, no magnitude. V.2.7 says Proven Coverage moves when a
 * concept becomes `proven`; deciding BY HOW MUCH is a scoring decision, and a
 * projection that carried a number would be making it. Paying a term for a
 * coverage state requires first widening a type whose header says why it must
 * not happen — a visible edit in a reviewed file, which is the same guarantee
 * `sessionScoreContribution()` and `conceptScoreEffect()` already provide.
 */
export type CoverageScoreEffect = { kind: "none" };

export const coverageScoreEffect = (_r: CoverageProjection): CoverageScoreEffect => ({ kind: "none" });

/** The same fact phrased the way a reviewer will ask it. A declaration moves no
 *  score (V.2.5) and neither does the record row it produces. */
export const coverageStateMovesScore = (): false => false;
