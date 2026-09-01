// ═══════════════════════════════════════════════════════════════════════════
// M14-2 / M14-4 — THE LEDGER SCORE. FOUR DIMENSIONS, ONE FORMULA.
//
// Architecture **Part J** is this file's specification and the section numbers
// below are its. `lib/ledger-score.ts` is the engine this replaces; it survives
// this pass only as the pre-cutover engine the untouched M0–M13 surfaces still
// call, with its streak term deleted (M14-2), and it is retired by M14-6.
//
//
// WHY A NEW FILE RATHER THAN AN EDIT IN PLACE — recorded, not assumed
//
// M14's scope permits either. The rebuild is a new file for three reasons, in
// order of weight:
//
//   1. **The old file is still live.** M14-6 — *"cut over via the existing
//      shadow-mode cron"* — is a SEPARATE task, deliberately. Rewriting
//      `lib/ledger-score.ts` in place would perform the cutover silently, on
//      the way past, which O.4.3 forbids by name: *"an explicit restatement,
//      never a silent recompute."* Two engines existing side by side, with the
//      new one not yet wired, is precisely the state M14-6 was scheduled to
//      resolve.
//   2. **The two have different input types and different output types.** The
//      old engine returns a `ScoreBreakdown` in which every dimension is a
//      number; this one returns dimensions that can say *"not measured"*
//      (J.3.a). Those cannot be the same type, and a file exporting both under
//      names one character apart is how a consumer picks the wrong one.
//   3. **Seven prior milestones fenced `lib/ledger-score.ts` by content.** M7,
//      M9, M10 and M12 each assert that the score engines do not mention their
//      modules — the boundary each milestone held. Putting event-substrate
//      reads inside that file would break four suites that are correctly
//      asserting a fact about the past.
//
// The unified-inputs discipline is NOT weakened by the split — it is where it
// belongs. `lib/score-inputs.ts` is the single builder; this file is the single
// formula; and no consumer of either computes a term. See M14-1's header.
//
//
// THE FOUR DIMENSIONS (J.2) — read from Part J, not inherited from the old
// three-pillars-plus-a-streak shape:
//
//   Verified Performance  400   assessment outcomes, weighted by depth, decayed
//   Proven Coverage       250   how much of the DECLARED syllabus is PROVEN
//   Recovery              200   mistakes faced, evidenced, closed WITH PROOF
//   Continuity            150   whether verification is keeping pace with study
//
// There is no fifth dimension and there is no streak. `Momentum` does not exist
// here under that name or any other (§9.3, M14-2).
//
// No I/O, no clock, no randomness. `asOfMs` is an input (U.3).
// ═══════════════════════════════════════════════════════════════════════════

import type { AssessedItem, InputCounts, LedgerScoreInputs, Row } from "./score-inputs";
import { buildScoreInputs } from "./score-inputs";
import { computeContinuity, CONTINUITY_MAX, type ContinuityOutcome } from "./score-continuity";
import { computeRecovery, RECOVERY_MAX, type RecoveryOutcome } from "./score-recovery";
import { coverageRank, type CoverageState } from "./coverage-state";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * S.2 / J.6: a stored number whose meaning depends on a formula is meaningless
 * without the formula's identity beside it. Every snapshot M14-5 writes carries
 * this string; a bulk recompute on a change of it writes NEW rows (J.6).
 */
export const FORMULA_VERSION = "ledger-score/3.0.0";

export const VERIFIED_PERFORMANCE_MAX = 400;
export const PROVEN_COVERAGE_MAX = 250;
export const SCORE_MAX = VERIFIED_PERFORMANCE_MAX + PROVEN_COVERAGE_MAX + RECOVERY_MAX + CONTINUITY_MAX; // 1000

/** J.7's anti-gaming caps, *"applied identically client- and server-side"* —
 *  v2's invariant I4, KEPT. The numbers are v2's and are not new ones. */
export const DAILY_QUESTION_CAP = 60;
export const MIN_SESSION_QUESTIONS = 5;

/** F.3's ladder, priced. A transfer question answered correctly is stronger
 *  evidence of competence than a recall question answered correctly, and J.2
 *  says the dimension is *"weighted by depth"*. The weights apply to BOTH sides
 *  of the accuracy ratio, so a student who only ever sits recall questions is
 *  not penalised — they simply cannot out-earn one who sits transfer ones. */
export const DEPTH_WEIGHT: Readonly<Record<string, number>> = Object.freeze({
  recall: 1,
  application: 1.2,
  transfer: 1.4,
});

/** v2 `:81`, KEPT. Exponential decay with **no window cutoff**, which is what
 *  makes the accuracy term shift-invariant (v2 invariant I2, V.6.6). */
export const ACCURACY_HALF_LIFE_DAYS = 21;

/** v2 `:80`, KEPT — 300 counted questions ≈ full volume weight. */
export const VOLUME_FULL_AT = 300;

/**
 * J.4's baseline thresholds. Part J calls these *"ARCHITECTURAL INFERENCE — the
 * exact thresholds are a product decision"*, so they are decided here, in the
 * open, with the reasoning attached:
 *
 *   3 verified sessions — J.4's own justification is that *"a first score
 *     computed from one assessment is dominated by noise"*. Three is the
 *     smallest number from which a trend is arithmetically expressible.
 *   1 subject — the syllabus is declared per subject and a student sitting
 *     their first exam may legitimately be working in one.
 *  14 days — the "whichever comes first" escape, so a student who studies
 *     genuinely slowly is not held at "no score" indefinitely. Two weeks is the
 *     shortest span over which "elapsed with any verified evidence" is a
 *     different claim from "today".
 */
export const BASELINE_SESSIONS = 3;
export const BASELINE_SUBJECTS = 1;
export const BASELINE_DAYS = 14;

const DAY_MS = 86_400_000;

// ═══════════════════════════════════════════════════════════════════════════
// J.3.a — `insufficient evidence` IS A STATE, NOT A ZERO
//
//   > Zero means *measured, and the measurement is zero.* Insufficient means
//   > *not measured.* Rendering the second as the first is a lie in the strict
//   > sense of Law 7.
//
// The old engine could not express this: `EMPTY` set every pillar to 0 and the
// `catch` returned `EMPTY`, so a student with no data, a student whose
// computation threw and a student who scored zero were indistinguishable
// (J.3.a, `lib/ledger-score.ts:29-34, :263`).
//
// Here the two are different ARMS of a union. A consumer that wants a number
// has to handle the arm that has none — the type will not let it render a
// missing measurement as zero by accident.
// ═══════════════════════════════════════════════════════════════════════════

export const DIMENSION_KEYS = [
  "verifiedPerformance",
  "provenCoverage",
  "recovery",
  "continuity",
] as const;
export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export type DimensionValue =
  | { key: DimensionKey; max: number; state: "measured"; points: number; note: string }
  | { key: DimensionKey; max: number; state: "insufficient_evidence"; points: null; needs: string };

export const isMeasured = (
  d: DimensionValue,
): d is Extract<DimensionValue, { state: "measured" }> => d.state === "measured";

/** J.3's table, verbatim — what each dimension needs before it can be a
 *  number. Shown to the student in place of a figure, per J.4's *"the product
 *  shows evidence collected so far and what remains."* */
export const DIMENSION_NEEDS: Readonly<Record<DimensionKey, string>> = Object.freeze({
  verifiedPerformance: `One completed assessment with at least ${MIN_SESSION_QUESTIONS} graded questions`,
  provenCoverage: "A declared subject list, and one concept proven in a verified session",
  recovery: "One recorded mistake with evidence behind it",
  continuity: `${2} concepts whose verification is settled`,
});

export const DIMENSION_LABEL: Readonly<Record<DimensionKey, string>> = Object.freeze({
  verifiedPerformance: "Verified Performance",
  provenCoverage: "Proven Coverage",
  recovery: "Recovery",
  continuity: "Continuity",
});

const measured = (key: DimensionKey, max: number, points: number, note: string): DimensionValue => ({
  key,
  max,
  state: "measured",
  points: Math.max(0, Math.min(max, Math.round(points))),
  note,
});

const unmeasured = (key: DimensionKey, max: number): DimensionValue => ({
  key,
  max,
  state: "insufficient_evidence",
  points: null,
  needs: DIMENSION_NEEDS[key],
});

// ═══════════════════════════════════════════════════════════════════════════
// DIMENSION 1 — VERIFIED PERFORMANCE (0–400)
// ═══════════════════════════════════════════════════════════════════════════

export interface PerformanceEvidence {
  /** Assessments with ≥ MIN_SESSION_QUESTIONS graded items. V.6.2's gate. */
  qualifyingAssessments: number;
  /** Distinct questions counted, after the latest-attempt reduction. */
  questionsCounted: number;
  decayedAccuracy: number;
  volumeFactor: number;
  improvementBonus: number;
}

/**
 * J.7.2: *"Verified Performance is computed over **assessed items only**. An
 * unresolved mistake is not an assessed item, so it has no weight there."* That
 * sentence is the whole reason this function's only input is `inputs.items`.
 */
export function computePerformance(
  inputs: LedgerScoreInputs,
): { outcome: DimensionValue; evidence: PerformanceEvidence } {
  // F.5 makes answers append-only — a correction is a NEW row — so a question
  // is reduced to its LATEST attempt before anything is counted. Counting
  // attempts would let one question answered wrong four times and right once
  // read as four wrong answers and one right one.
  const latest = new Map<string, AssessedItem>();
  for (const it of inputs.items) {
    const prev = latest.get(it.questionId);
    if (!prev || it.attemptNo > prev.attemptNo) latest.set(it.questionId, it);
  }

  // J.3 / V.6.2 — an assessment below the per-session minimum is NOT COUNTED.
  const perAssessment = new Map<string, AssessedItem[]>();
  for (const it of latest.values()) {
    const list = perAssessment.get(it.assessmentId);
    if (list) list.push(it);
    else perAssessment.set(it.assessmentId, [it]);
  }
  const qualifying = [...perAssessment.entries()].filter(([, xs]) => xs.length >= MIN_SESSION_QUESTIONS);
  const counted = qualifying.flatMap(([, xs]) => xs);

  // Depth-weighted accuracy under pure exponential decay, no cutoff (I2).
  let wCorrect = 0;
  let wTotal = 0;
  for (const it of counted) {
    const w = (DEPTH_WEIGHT[it.depth] ?? 1) * decay(it.gradedAtMs, inputs.asOfMs);
    wTotal += w;
    if (it.isCorrect) wCorrect += w;
  }
  const decayedAccuracy = wTotal > 0 ? wCorrect / wTotal : 0;

  // Volume, with J.7's per-day cap. **LIFETIME, not a trailing window** — and
  // this is a deliberate divergence from v2 `:117-126`, recorded rather than
  // slipped in: v2 counts the trailing 90 days, so three quiet weeks shrink the
  // window and the figure falls. V.6.6 forbids exactly that — *"the score does
  // not rise and does not fall from inactivity alone."* A lifetime count with
  // the same per-day cap is monotone non-decreasing, which is the property
  // V.6.6 is asking for; the recency signal V.6.6 does allow lives in the decay
  // above and in `confidence`, where falling is honest rather than punitive.
  const byDay = new Map<string, number>();
  for (const [, xs] of qualifying) {
    for (const it of xs) {
      const day = Math.floor(it.gradedAtMs / DAY_MS);
      byDay.set(String(day), (byDay.get(String(day)) ?? 0) + 1);
    }
  }
  let questionsCounted = 0;
  for (const n of byDay.values()) questionsCounted += Math.min(DAILY_QUESTION_CAP, n);

  const volumeFactor =
    questionsCounted > 0
      ? Math.min(1, Math.log10(1 + questionsCounted) / Math.log10(1 + VOLUME_FULL_AT))
      : 0;

  const improvementBonus = improvement(qualifying.map(([, xs]) => xs));

  const evidence: PerformanceEvidence = {
    qualifyingAssessments: qualifying.length,
    questionsCounted,
    decayedAccuracy,
    volumeFactor,
    improvementBonus,
  };

  if (qualifying.length === 0) {
    return { outcome: unmeasured("verifiedPerformance", VERIFIED_PERFORMANCE_MAX), evidence };
  }

  const points = decayedAccuracy * 340 * volumeFactor + improvementBonus;
  return {
    outcome: measured(
      "verifiedPerformance",
      VERIFIED_PERFORMANCE_MAX,
      points,
      "Measured on assessed questions only",
    ),
    evidence,
  };
}

/** v2 `:132-145`, KEPT: last 15 assessments against the 15 before, **by
 *  sequence rather than wall-clock**, so the bonus is inactivity-invariant. */
function improvement(assessments: readonly (readonly AssessedItem[])[]): number {
  if (assessments.length < 10) return 0;
  const asc = [...assessments].sort(
    (a, b) => Math.min(...a.map(x => x.gradedAtMs)) - Math.min(...b.map(x => x.gradedAtMs)),
  );
  const recent = asc.slice(-15);
  const prior = asc.slice(Math.max(0, asc.length - 30), asc.length - 15);
  if (prior.length < 5) return 0;

  const acc = (xs: readonly (readonly AssessedItem[])[]) => {
    const flat = xs.flat();
    return flat.length > 0 ? flat.filter(i => i.isCorrect).length / flat.length : 0;
  };
  return Math.round(Math.max(0, Math.min(60, (acc(recent) - acc(prior)) * 300)));
}

function decay(atMs: number, asOfMs: number): number {
  const ageDays = Math.max(0, (asOfMs - atMs) / DAY_MS);
  return Math.pow(0.5, ageDays / ACCURACY_HALF_LIFE_DAYS);
}

// ═══════════════════════════════════════════════════════════════════════════
// DIMENSION 2 — PROVEN COVERAGE (0–250)
//
// J.2: *"how much of the declared syllabus has been **proven**, not merely
// touched."* The rung weights below are v2's proof-gating (`PROOF_SESSION_MIN_Q`
// / `PROOF_SESSION_MIN_ACC`) expressed in M12's own vocabulary — J.8 calls that
// pair *"the direct ancestor of `coverage_state = 'proven'` in the target
// model"*, so the ancestor is retired and the descendant is read instead.
//
// The denominator is the DECLARED SUBJECT LIST, which the student sets in
// onboarding. It does not grow when a student studies, captures or records
// anything, so §3.3 holds here without a carve-out.
//
// J.8's *"Coverage stops being a 10-item rolling window"* is satisfied by
// construction: `academic_record` holds every concept, and nothing here slices.
// ═══════════════════════════════════════════════════════════════════════════

export const RUNG_WEIGHT: Readonly<Record<CoverageState, number>> = Object.freeze({
  untouched: 0,
  declared: 0,
  studied: 0.25,
  assessed: 0.5,
  proven: 1,
});

export interface CoverageEvidenceSummary {
  subjectsDeclared: number;
  subjectsProven: number;
  subjectsAssessed: number;
  subjectsStudied: number;
  conceptsProven: number;
}

export function computeCoverage(
  inputs: LedgerScoreInputs,
): { outcome: DimensionValue; evidence: CoverageEvidenceSummary } {
  const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().trim();

  /** The highest rung any concept of this subject has reached. */
  const best = new Map<string, CoverageState>();
  let conceptsProven = 0;
  for (const c of inputs.concepts) {
    if (c.coverageState === "proven") conceptsProven += 1;
    const key = norm(c.subject);
    if (!key) continue;
    const prev = best.get(key);
    if (!prev || coverageRank(c.coverageState) > coverageRank(prev)) best.set(key, c.coverageState);
  }

  const declared = inputs.declaredSubjects.map(norm).filter(Boolean);
  let weight = 0;
  let subjectsProven = 0;
  let subjectsAssessed = 0;
  let subjectsStudied = 0;
  for (const s of declared) {
    const rung = best.get(s);
    if (!rung) continue;
    weight += RUNG_WEIGHT[rung];
    if (rung === "proven") subjectsProven += 1;
    else if (rung === "assessed") subjectsAssessed += 1;
    else if (rung === "studied") subjectsStudied += 1;
  }

  const evidence: CoverageEvidenceSummary = {
    subjectsDeclared: declared.length,
    subjectsProven,
    subjectsAssessed,
    subjectsStudied,
    conceptsProven,
  };

  // J.3's minimum, both halves: a declared subject list AND ≥1 proven concept.
  if (declared.length === 0 || conceptsProven === 0) {
    return { outcome: unmeasured("provenCoverage", PROVEN_COVERAGE_MAX), evidence };
  }

  const points = (weight / declared.length) * PROVEN_COVERAGE_MAX;
  return {
    outcome: measured("provenCoverage", PROVEN_COVERAGE_MAX, points, "Proven, not merely touched"),
    evidence,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// J.4 — THE BASELINE PERIOD
//
//   > A new student has **no score**, displayed as such, until the baseline
//   > conditions are met: at least `BASELINE_SESSIONS` verified sessions across
//   > at least `BASELINE_SUBJECTS` subjects, or `BASELINE_DAYS` elapsed with any
//   > verified evidence — whichever comes first. Before that, the product shows
//   > *evidence collected so far* and what remains.
//
// V.6.1 is this, and it is a claim about a TYPE: below baseline the score has no
// total, so a surface cannot render one. `computeTemporaryScore`'s
// self-report-derived figure (J.4's *"CURRENT FACT — the cold-start path that
// must not survive"*) has no successor here; its `gapTopics` output survives as
// a diagnostic under M14-7, which is a separate task.
// ═══════════════════════════════════════════════════════════════════════════

export interface BaselineProgress {
  met: boolean;
  /** Which clause met it, for the explanation J.4 asks the product to show. */
  metBy: "sessions" | "elapsed" | null;
  verifiedSessions: number;
  subjectsWithVerifiedEvidence: number;
  daysSinceFirstVerified: number | null;
  /**
   * J.4's *"elapsed **with any verified evidence**"*. A session that opened and
   * closed is not evidence; a graded, counted answer or a concept that reached
   * `assessed` is. This is the flag V.6.2 turns on: an assessment below
   * `MIN_SESSION_QUESTIONS` *"is not counted"*, so it does not make this true,
   * and the elapsed clause therefore cannot mature on the strength of a session
   * that produced nothing measurable.
   */
  hasVerifiedEvidence: boolean;
  needs: readonly string[];
}

/**
 * @param perf `computePerformance`'s evidence, passed in rather than recomputed
 * — the same discipline `computeConfidence` follows. The qualifying-assessment
 * count is decided in ONE place (M14-1), and the baseline reads that decision
 * instead of making a second one that could disagree with it.
 */
export function computeBaseline(
  inputs: LedgerScoreInputs,
  perf: PerformanceEvidence,
): BaselineProgress {
  const verified = inputs.sessions.filter(s => s.state === "VERIFIED");
  const verifiedSessions = verified.length;

  const subjects = new Set<string>();
  let assessedConcepts = 0;
  for (const c of inputs.concepts) {
    if (coverageRank(c.coverageState) >= coverageRank("assessed")) {
      assessedConcepts += 1;
      if (c.subject) subjects.add(c.subject.toLowerCase().trim());
    }
  }

  const firstVerifiedMs = verified.reduce<number | null>(
    (min, s) => (min === null || s.openedAtMs < min ? s.openedAtMs : min),
    null,
  );
  const daysSinceFirstVerified =
    firstVerifiedMs === null ? null : Math.floor((inputs.asOfMs - firstVerifiedMs) / DAY_MS);

  // V.6.2, structurally: the ONLY two things that count as verified evidence
  // are an assessment that cleared `MIN_SESSION_QUESTIONS` and a concept the
  // record has carried to `assessed` or beyond. Neither can be produced by a
  // student clicking through a session.
  const hasVerifiedEvidence = perf.qualifyingAssessments > 0 || assessedConcepts > 0;

  const bySessions =
    hasVerifiedEvidence && verifiedSessions >= BASELINE_SESSIONS && subjects.size >= BASELINE_SUBJECTS;
  const byElapsed =
    hasVerifiedEvidence && verifiedSessions >= 1 && (daysSinceFirstVerified ?? 0) >= BASELINE_DAYS;

  const needs: string[] = [];
  if (!bySessions && !byElapsed) {
    if (!hasVerifiedEvidence) {
      needs.push(`one assessment of at least ${MIN_SESSION_QUESTIONS} graded questions`);
    }
    if (verifiedSessions < BASELINE_SESSIONS) {
      needs.push(`${BASELINE_SESSIONS - verifiedSessions} more assessed session${BASELINE_SESSIONS - verifiedSessions === 1 ? "" : "s"}`);
    }
    if (subjects.size < BASELINE_SUBJECTS) needs.push("assessed work in one subject");
  }

  return {
    met: bySessions || byElapsed,
    metBy: bySessions ? "sessions" : byElapsed ? "elapsed" : null,
    verifiedSessions,
    subjectsWithVerifiedEvidence: subjects.size,
    daysSinceFirstVerified,
    hasVerifiedEvidence,
    needs: Object.freeze(needs),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// J.5 — CONFIDENCE
//
//   > Confidence is a first-class output, computed from evidence volume,
//   > recency, and breadth across subjects … A 700 built on three assessments
//   > and a 700 built on forty are not the same claim.
// ═══════════════════════════════════════════════════════════════════════════

export function computeConfidence(inputs: LedgerScoreInputs, perf: PerformanceEvidence): number {
  const volume = perf.volumeFactor;

  // Recency: the decay weight of the most recent counted item. It FALLS with
  // inactivity, and that is correct — a figure built on evidence from March is
  // a weaker claim in August, which is a statement about the claim and not a
  // punishment of the student (V.6.6 constrains the SCORE, not the confidence).
  let newest: number | null = null;
  for (const it of inputs.items) if (newest === null || it.gradedAtMs > newest) newest = it.gradedAtMs;
  const recency = newest === null ? 0 : decay(newest, inputs.asOfMs);

  const assessedSubjects = new Set<string>();
  for (const c of inputs.concepts) {
    if (coverageRank(c.coverageState) >= coverageRank("assessed") && c.subject) {
      assessedSubjects.add(c.subject.toLowerCase().trim());
    }
  }
  const declared = inputs.declaredSubjects.length;
  const breadth = declared > 0 ? Math.min(1, assessedSubjects.size / declared) : assessedSubjects.size > 0 ? 1 : 0;

  return Math.round(((volume + recency + breadth) / 3) * 1000) / 1000;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE SCORE
// ═══════════════════════════════════════════════════════════════════════════

export interface ScoreEvidenceSummary {
  performance: PerformanceEvidence;
  coverage: CoverageEvidenceSummary;
  recovery: RecoveryOutcome["evidence"];
  continuity: ContinuityOutcome["evidence"];
}

export interface LedgerScore {
  formulaVersion: string;
  studentId: string;
  asOfMs: number;
  /** `baseline` — J.4: no score yet, and that is a state, not a zero. */
  state: "baseline" | "scored";
  /** NULL while `state === "baseline"`. A surface cannot render what is not
   *  there, which is V.6.1 expressed as a type rather than as a convention. */
  total: number | null;
  /** The ceiling the measured dimensions actually add up to. A total of 640 out
   *  of a measured 850 is a different claim from 640 out of 1000, and J.3.a
   *  requires the difference to be visible. */
  measuredMax: number;
  dimensions: Readonly<Record<DimensionKey, DimensionValue>>;
  confidence: number | null;
  baseline: BaselineProgress;
  evidence: ScoreEvidenceSummary;
}

/**
 * THE ONE FORMULA. Every consumer calls this, and no consumer computes a term.
 *
 * There is no `try`/`catch` returning an EMPTY score. J.3.a records what that
 * cost the old engine: *"a student with no data and a student whose score
 * computation threw are indistinguishable from a student who scored zero."*
 * Every function this calls is total over its inputs — the readers in
 * `lib/score-inputs.ts` refuse unreadable rows before they reach here — so a
 * throw would be a bug, and a bug must surface rather than be rendered as a
 * measurement of zero.
 */
export function computeLedgerScore(inputs: LedgerScoreInputs): LedgerScore {
  const perf = computePerformance(inputs);
  const cov = computeCoverage(inputs);
  const rec = computeRecovery(inputs);
  const con = computeContinuity(inputs);

  const dimensions: Record<DimensionKey, DimensionValue> = {
    verifiedPerformance: perf.outcome,
    provenCoverage: cov.outcome,
    recovery:
      rec.state === "measured"
        ? measured("recovery", RECOVERY_MAX, rec.points, "Faced, evidenced, and closed with proof")
        : unmeasured("recovery", RECOVERY_MAX),
    continuity:
      con.state === "measured"
        ? measured("continuity", CONTINUITY_MAX, con.points, "Verification has kept pace with your study")
        : unmeasured("continuity", CONTINUITY_MAX),
  };

  const baseline = computeBaseline(inputs, perf.evidence);

  let total = 0;
  let measuredMax = 0;
  for (const key of DIMENSION_KEYS) {
    const d = dimensions[key];
    if (isMeasured(d)) {
      total += d.points;
      measuredMax += d.max;
    }
  }

  const evidence: ScoreEvidenceSummary = {
    performance: perf.evidence,
    coverage: cov.evidence,
    recovery: rec.evidence,
    continuity: con.evidence,
  };

  if (!baseline.met) {
    return {
      formulaVersion: FORMULA_VERSION,
      studentId: inputs.studentId,
      asOfMs: inputs.asOfMs,
      state: "baseline",
      total: null,
      measuredMax,
      dimensions: Object.freeze(dimensions),
      confidence: null,
      baseline,
      evidence,
    };
  }

  return {
    formulaVersion: FORMULA_VERSION,
    studentId: inputs.studentId,
    asOfMs: inputs.asOfMs,
    state: "scored",
    total: Math.min(SCORE_MAX, total),
    measuredMax,
    dimensions: Object.freeze(dimensions),
    confidence: computeConfidence(inputs, perf.evidence),
    baseline,
    evidence,
  };
}

/**
 * J.5's trajectory is *"suppressed entirely below BASELINE"* — `lib/score-market.ts`'s
 * "newly listed" guard is the precedent and is KEPT. This is the predicate that
 * guard should ask, exported so a surface asks a question instead of comparing
 * a string.
 */
export const hasScore = (s: LedgerScore): boolean => s.state === "scored" && s.total !== null;

/** `scoreTier` is NOT re-exported here. It is a pure function of a number
 *  (`lib/ledger-score.ts:360-366`, J.8 **KEEP**) and calling it on a score that
 *  does not exist is the exact confusion J.3.a bans. A caller must pass through
 *  `hasScore` first, and it therefore has to reach for the tier deliberately. */

// ═══════════════════════════════════════════════════════════════════════════
// M14-5 — THE SNAPSHOT, AND WHY IT IS REPRODUCIBLE
//
// EXECUTION_PLAN M14-5: *"Snapshots: `formula_version`, `confidence`,
// `evidence_counts`, `input_watermark_event_id`. **ADAPT.** Done when: V.6.3,
// V.6.8 — replay into an empty database reproduces every snapshot."*
//
// V.6.8 is the hard one, and it is a claim about ARGUMENTS, not about storage:
// a row reproduces only if a replay can recover every argument the formula saw.
// The formula's arguments are `LedgerScoreInputs` — which is derived from rows
// the replay itself rebuilds — and `asOfMs`, which is not. So the snapshot
// stores `asOf` to the millisecond alongside M14-5's four named columns. A DATE
// would have been enough to reproduce the DAY and not the ROW: the accuracy
// term is an exponential decay in `asOfMs`, so the same student computed twice
// on one calendar day gives two different, equally correct numbers.
//
// The four named columns then answer the four remaining questions:
//
//   formula_version           WHICH arithmetic ran (J.6 — a change of it writes
//                             new rows, never edits old ones)
//   confidence                J.5's first-class output, stored beside the number
//   evidence_counts           WHAT the number is a sum of, per dimension
//   input_watermark_event_id  WHERE in the event stream it was computed from
//                             (R.9, O.4.2), carried with its `seq` because R.10
//                             orders by server `seq` and never by a client stamp
//
// `replayScoreSnapshot` below is the whole of V.6.8 as a callable function: give
// it a stored row and the rows the replay rebuilt, and it returns the row the
// engine produces now. Bit-identical means reproduced. A test asserts it.
//
// No I/O and no clock here either — `capturedOn`, `asOfMs` and the watermark are
// all arguments (U.3).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The event-stream position a snapshot was computed from.
 *
 * Both halves are nullable together: a student with no events yet has no
 * watermark, and inventing one would be a claim. `academic_events` is
 * HASH-partitioned with PRIMARY KEY `(student_id, event_id)` (015), so this is
 * carried as data rather than as a foreign key — the same reason
 * `occurrences.supersedes` is.
 */
export interface SnapshotWatermark {
  eventId: string | null;
  seq: number | null;
}

export const NO_WATERMARK: SnapshotWatermark = Object.freeze({ eventId: null, seq: null });

/**
 * What the row is a sum of. Counts only — every field is an integer, and every
 * one of them is a thing that was COUNTED rather than a factor that was
 * derived, so an auditor reading this JSON is reading evidence and not a second
 * copy of the arithmetic.
 */
export interface SnapshotEvidenceCounts {
  /** Assessments that cleared `MIN_SESSION_QUESTIONS`. V.6.2's gate. */
  qualifyingAssessments: number;
  /** Distinct questions counted after the latest-attempt reduction and the
   *  per-day cap. */
  questionsCounted: number;
  subjectsDeclared: number;
  subjectsProven: number;
  subjectsAssessed: number;
  subjectsStudied: number;
  conceptsProven: number;
  /** Patterns with a real `mistake_resolutions` row behind them. */
  resolvedPatterns: number;
  /** Distinct `evidence` rows. */
  evidencePieces: number;
  facedPatterns: number;
  /** Patterns claiming `resolved` with no resolution behind them. M14-3 pays
   *  these nothing and reports them rather than dropping them. */
  unprovenResolutionClaims: number;
  settledConcepts: number;
  verifiedConcepts: number;
  opportunitySessions: number;
  conceptsExcludedForMistake: number;
  verifiedSessions: number;
  /** How many rows of each kind the builder read, and how many it refused.
   *  A refusal count that moves between two replays of the same data is a bug
   *  in the readers, and this is where it becomes visible. */
  rows: InputCounts;
}

export function snapshotEvidenceCounts(score: LedgerScore, counts: InputCounts): SnapshotEvidenceCounts {
  const e = score.evidence;
  return {
    qualifyingAssessments: e.performance.qualifyingAssessments,
    questionsCounted: e.performance.questionsCounted,
    subjectsDeclared: e.coverage.subjectsDeclared,
    subjectsProven: e.coverage.subjectsProven,
    subjectsAssessed: e.coverage.subjectsAssessed,
    subjectsStudied: e.coverage.subjectsStudied,
    conceptsProven: e.coverage.conceptsProven,
    resolvedPatterns: e.recovery.resolvedPatternIds.length,
    evidencePieces: e.recovery.evidenceIds.length,
    facedPatterns: e.recovery.facedPatternIds.length,
    unprovenResolutionClaims: e.recovery.unprovenResolutionClaims.length,
    settledConcepts: e.continuity.settledCount,
    verifiedConcepts: e.continuity.verifiedCount,
    opportunitySessions: e.continuity.opportunitySessions,
    conceptsExcludedForMistake: e.continuity.excludedForMistake.length,
    verifiedSessions: score.baseline.verifiedSessions,
    rows: counts,
  };
}

/**
 * One `score_history` row, in the column vocabulary 005 established and 027
 * extends.
 *
 * The J.2 dimension names are mapped onto 005's column names rather than
 * renamed, because five surfaces outside M14's scope read `pqa`, `syllabus`,
 * `mistakes` and `consistency` by name. 027's COMMENTs record which dimension
 * each column now carries, so the mapping is written down in the database and
 * not only here.
 *
 * Every dimension column is `number | null`, and the NULL is J.3.a: *"zero
 * means measured and the measurement is zero; insufficient means not
 * measured."* 027 drops the NOT NULL constraints that made the second
 * inexpressible.
 */
export interface ScoreSnapshotRow {
  user_id: string;
  /** The trading day, `YYYY-MM-DD`. `UNIQUE (user_id, captured_on)` makes the
   *  daily close idempotent — 005's property, kept. */
  captured_on: string;
  /** The exact instant, ISO-8601. THIS is what makes V.6.8 exact. */
  as_of: string;
  formula_version: string;
  score_state: LedgerScore["state"];
  total: number | null;
  /** J.2 Verified Performance (0–400). */
  pqa: number | null;
  /** J.2 Proven Coverage (0–250). */
  syllabus: number | null;
  /** J.2 Recovery (0–200). */
  mistakes: number | null;
  /** J.2 Continuity (0–150). NOT the retired streak term. */
  consistency: number | null;
  confidence: number | null;
  evidence_counts: SnapshotEvidenceCounts;
  input_watermark_event_id: string | null;
  input_watermark_seq: number | null;
  restatement_of: number | null;
  restatement_reason: string | null;
  // 005's consecutive-day column is ABSENT FROM THIS TYPE, not written as a
  // zero. §9.3 deleted the term from scoring and M14-2 deleted it from both
  // engines; a writer that still named the column — even to set it to nothing —
  // would be the rename §9.3 refuses, one layer down. The column survives in
  // the table because pre-M14 rows hold real values and §3.2 forbids erasing
  // them; it takes its `DEFAULT 0` on every row this engine writes, and 027's
  // COMMENT records that it is retired.
  /** 005's "supporting fundamentals". `papers_count` is the count of
   *  assessments that actually counted, which is what the column has always
   *  meant. `recent_mistakes` was a 7-day window on a blob this engine does not
   *  read and there is no honest successor, so it is written as 0 and 027
   *  documents it as retired — a wrong number would be worse than a retired one. */
  papers_count: number;
  recent_mistakes: number;
  /** M14-8's corroborated activity flag. Never the client's claim alone. */
  active: boolean;
}

/**
 * O.4.3 / V.6.9 / T3 — RESTATEMENT, NEVER A SILENT RECOMPUTE.
 *
 *   > **L3 snapshots are NOT rewritten.** A new snapshot is appended with a
 *   > `restatement_of` pointer and a reason. The history shows both the number
 *   > we believed and the correction — which is how a financial ledger handles
 *   > a restatement, and it is the only treatment compatible with Law 7.
 *
 * T3 names the cutover as the case this exists for: *"some students will move
 * by hundreds of points in either direction, and the score's credibility is the
 * product's credibility."* So the FIRST row a student receives under a new
 * `formula_version` carries a pointer at their last row under the old one, and
 * a sentence saying why the number moved. A formula change with no pointer is
 * precisely the silent recompute O.4.3 forbids, and this function is what makes
 * writing one require deleting a line rather than forgetting one.
 */
export interface PriorSnapshot {
  id: number;
  formulaVersion: string | null;
  capturedOn: string;
}

export interface RestatementDecision {
  restatementOf: number | null;
  reason: string | null;
}

export const NO_RESTATEMENT: RestatementDecision = Object.freeze({
  restatementOf: null,
  reason: null,
});

/**
 * @param prior the student's most recent existing snapshot, or `null` if this
 * is their first. A pre-M14 row has `formulaVersion: null`, and that NULL is
 * treated as *"a different formula"* — which is true: it was.
 */
export function decideRestatement(
  prior: PriorSnapshot | null,
  nextFormulaVersion: string,
): RestatementDecision {
  if (!prior) return NO_RESTATEMENT;
  if (prior.formulaVersion === nextFormulaVersion) return NO_RESTATEMENT;

  const from = prior.formulaVersion ?? "an unversioned formula";
  return {
    restatementOf: prior.id,
    // States facts and no verdict, and never implies the student did anything.
    // PRINCIPLES: a figure may not move without the student being able to find
    // out why; §4.2 forbids the streak's framing even in its obituary.
    reason:
      `Recalculated under a new Ledger Score formula (${from} → ${nextFormulaVersion}). ` +
      `Continuity replaced the retired consecutive-day term, and the mistake pillar became ` +
      `measurable instead of a disclosed zero. The figure from ${prior.capturedOn} is kept ` +
      `and has not been overwritten.`,
  };
}

/**
 * Build the row. Pure: every fact is an argument.
 *
 * The dimension columns come from `score.dimensions` and NOT from a second
 * traversal of `score.evidence` — M14-1's rule applies to the snapshot writer
 * too, and a snapshot that re-derived a dimension would be a second formula.
 */
export function buildScoreSnapshot(args: {
  score: LedgerScore;
  counts: InputCounts;
  capturedOn: string;
  watermark?: SnapshotWatermark;
  restatement?: RestatementDecision;
  active?: boolean;
}): ScoreSnapshotRow {
  const { score, counts, capturedOn } = args;
  const wm = args.watermark ?? NO_WATERMARK;
  const rs = args.restatement ?? NO_RESTATEMENT;

  const pts = (key: DimensionKey): number | null => {
    const d = score.dimensions[key];
    return isMeasured(d) ? d.points : null;
  };

  return {
    user_id: score.studentId,
    captured_on: capturedOn,
    as_of: new Date(score.asOfMs).toISOString(),
    formula_version: score.formulaVersion,
    score_state: score.state,
    total: score.total,
    pqa: pts("verifiedPerformance"),
    syllabus: pts("provenCoverage"),
    mistakes: pts("recovery"),
    consistency: pts("continuity"),
    confidence: score.confidence,
    evidence_counts: snapshotEvidenceCounts(score, counts),
    input_watermark_event_id: wm.eventId,
    input_watermark_seq: wm.seq,
    restatement_of: rs.restatementOf,
    restatement_reason: rs.reason,
    papers_count: score.evidence.performance.qualifyingAssessments,
    recent_mistakes: 0,
    active: args.active ?? false,
  };
}

/**
 * V.6.8, AS A FUNCTION.
 *
 *   > Replay the whole event stream into an empty database. **Every snapshot
 *   > reproduces**, given its `formula_version` and watermark.
 *
 * Give it a stored row and the rows a replay rebuilt from the stream up to that
 * row's watermark; it returns the row this engine produces now. Bit-identical
 * to the stored row means the snapshot reproduced.
 *
 * Everything the recomputation needs that is NOT in the replayed rows is taken
 * from the SNAPSHOT ITSELF — `as_of`, `captured_on`, the watermark, the
 * restatement pointer, the corroborated-activity flag — which is the point of
 * storing them. Nothing is read from a clock, and `formula_version` is checked
 * rather than assumed: a row written by a different engine is REFUSED rather
 * than silently recomputed under this one, because "reproduced under a formula
 * that did not write it" is not reproduction (J.6).
 */
export type ReplayResult =
  | { ok: true; recomputed: ScoreSnapshotRow; matches: boolean }
  | { ok: false; refusal: "formula-version-mismatch" | "unreadable-as-of"; detail: string };

export function replayScoreSnapshot(args: {
  snapshot: ScoreSnapshotRow;
  declaredSubjects?: readonly string[];
  sessionRows?: readonly Row[];
  recordRows?: readonly Row[];
  attemptRows?: readonly Row[];
  patternRows?: readonly Row[];
  occurrenceRows?: readonly Row[];
  resolutionRows?: readonly Row[];
}): ReplayResult {
  const snap = args.snapshot;

  if (snap.formula_version !== FORMULA_VERSION) {
    return {
      ok: false,
      refusal: "formula-version-mismatch",
      detail: `snapshot was written by ${snap.formula_version}; this engine is ${FORMULA_VERSION}`,
    };
  }

  const asOfMs = Date.parse(snap.as_of);
  if (!Number.isFinite(asOfMs)) {
    return { ok: false, refusal: "unreadable-as-of", detail: `as_of = ${String(snap.as_of)}` };
  }

  const built = buildScoreInputs({
    studentId: snap.user_id,
    asOfMs,
    declaredSubjects: args.declaredSubjects,
    sessionRows: args.sessionRows,
    recordRows: args.recordRows,
    attemptRows: args.attemptRows,
    patternRows: args.patternRows,
    occurrenceRows: args.occurrenceRows,
    resolutionRows: args.resolutionRows,
  });

  const recomputed = buildScoreSnapshot({
    score: computeLedgerScore(built.inputs),
    counts: built.counts,
    capturedOn: snap.captured_on,
    watermark: { eventId: snap.input_watermark_event_id, seq: snap.input_watermark_seq },
    restatement: { restatementOf: snap.restatement_of, reason: snap.restatement_reason },
    active: snap.active,
  });

  return { ok: true, recomputed, matches: snapshotsIdentical(snap, recomputed) };
}

/**
 * Structural equality over the row, key by key.
 *
 * Deliberately not a JSON string comparison: two objects with the same content
 * and a different key order are the same row, and a test that failed on key
 * order would be testing the serialiser. `evidence_counts` is compared by its
 * own keys for the same reason.
 */
export function snapshotsIdentical(a: ScoreSnapshotRow, b: ScoreSnapshotRow): boolean {
  const scalarKeys = [
    "user_id", "captured_on", "as_of", "formula_version", "score_state",
    "total", "pqa", "syllabus", "mistakes", "consistency", "confidence",
    "input_watermark_event_id", "input_watermark_seq",
    "restatement_of", "restatement_reason",
    "papers_count", "recent_mistakes", "active",
  ] as const;

  for (const k of scalarKeys) {
    if (a[k] !== b[k]) return false;
  }
  return sameJson(a.evidence_counts, b.evidence_counts);
}

function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const ka = Object.keys(a as object).sort();
  const kb = Object.keys(b as object).sort();
  if (ka.length !== kb.length) return false;
  for (let i = 0; i < ka.length; i += 1) if (ka[i] !== kb[i]) return false;
  for (const k of ka) {
    if (!sameJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  }
  return true;
}
