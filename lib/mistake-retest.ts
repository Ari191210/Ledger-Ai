// ═══════════════════════════════════════════════════════════════════════════
// M11-4 — SPACED RETESTING, AND THE GATE THAT WILL NOT LET AN IMMEDIATE RETRY
// COUNT AS A FIX.
//
// EXECUTION_PLAN M11-4: *"Retest scheduling and the `RESOLUTION_COOLING_DAYS =
// 7` gate. Done when: V.4.3, V.4.5, V.4.6."*
//
//   V.4.3  *"Student immediately retries and gets it right. `MISTAKE_CORRECTED`
//           with `immediate_retry_correct: true`. **The pattern is not
//           resolved** — zero days have elapsed against `RESOLUTION_COOLING_DAYS
//           = 7`."*
//   V.4.5  *"Two days later, one correct answer on Torque. **Still not
//           resolved** (`insufficient-correct-answers` → then
//           `cooling-period-not-elapsed`)."*
//   V.4.6  *"Day 9: a second correct answer, ≥7 days after `lastSeenAt`. **The
//           system** applies `practising → resolved`, writes a
//           `MistakeResolution` with both proof attempt IDs, and emits
//           `MISTAKE_RESOLVED`."*
//
//
// THE COOLING PERIOD IS NOT A COOLDOWN. IT IS THE MEASUREMENT.
//
// G.8: *"Immediate retry … is a **useful signal and not proof.** It cannot
// contribute to resolution, because `canResolve` requires a correct answer
// ≥`RESOLUTION_COOLING_DAYS = 7` after the last occurrence … and an immediate
// retry is by definition zero days later. **This is the fluency-illusion guard
// and it is already correct in code.**"*
//
// PRINCIPLES §3.1 is the principle underneath: a student may never mark their
// own mistake fixed. Seven days is what turns "I can do it right now, having
// just been told" into "I could still do it after forgetting the telling" —
// which is the only version of the claim worth storing.
//
//
// WHAT THIS MODULE ADDS, AND WHAT IT REFUSES TO RE-IMPLEMENT
//
// `canResolve()` in `lib/mistakes/engine.ts` ALREADY enforces the two proof
// conditions (≥2 correct on the concept, ≥1 of them ≥7 days after the last
// occurrence) and `applyTransition()` already refuses a student actor and a
// resolution without proof. **This module calls both and re-implements
// neither.** G.1's verdict on the engine is KEEP, and a second copy of the
// cooling arithmetic living here would be the first thing to drift.
//
// What is genuinely missing — and what this module is — is the SCHEDULE: G.8's
// *"`RetestSchedule` entry per open leaf: `{pattern_id, due_at, attempt_count,
// last_result}`. Intervals expand on success and reset on failure."* Nothing in
// the repository decided when a retest is due.
//
// PURE. No I/O, no clock. Every timestamp is passed in.
// ═══════════════════════════════════════════════════════════════════════════

import {
  applyTransition,
  canResolve,
  RESOLUTION_COOLING_DAYS,
  RESOLUTION_MIN_CORRECT,
  type CorrectAnswer,
  type EngineError,
} from "./mistakes/engine";
import type {
  ISOTimestamp,
  MistakeResolution,
  Pattern,
  RetestSchedule,
  UUID,
} from "./mistakes/types";

const DAY_MS = 86_400_000;

// ═══════════════════════════════════════════════════════════════════════════
// THE LADDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * G.8: *"Intervals expand on success and reset on failure."*
 *
 * **The first rung is `RESOLUTION_COOLING_DAYS` and is not a separate number.**
 * If the first retest were due at 3 days, the student would sit a retest that
 * cannot contribute to resolution no matter how they do — the schedule would be
 * asking a question whose answer the resolution gate has already agreed to
 * ignore. Deriving the first rung from the engine's own constant makes the two
 * incapable of disagreeing.
 */
export const RETEST_INTERVALS_DAYS: readonly number[] = Object.freeze([
  RESOLUTION_COOLING_DAYS, // 7
  14,
  30,
  60,
]);

/** The rung a failed retest resets to. Index 0 — G.8's *"reset on failure"*. */
export const RETEST_RESET_INTERVAL_DAYS = RETEST_INTERVALS_DAYS[0];

export type RetestResult = "pass" | "fail";

const addDays = (iso: ISOTimestamp, days: number): string | null => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t + days * DAY_MS).toISOString() : null;
};

const daysBetween = (from: ISOTimestamp, to: ISOTimestamp): number | null => {
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return (b - a) / DAY_MS;
};

/** The next rung up, saturating at the top. A pattern that keeps passing is
 *  checked ever less often and never stops being checked — G.8 gives no
 *  terminal rung, and inventing one would be inventing a retirement policy. */
export function nextIntervalDays(current: number): number {
  const idx = RETEST_INTERVALS_DAYS.indexOf(current);
  if (idx === -1) return RETEST_RESET_INTERVAL_DAYS;
  return RETEST_INTERVALS_DAYS[Math.min(idx + 1, RETEST_INTERVALS_DAYS.length - 1)];
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULING
// ═══════════════════════════════════════════════════════════════════════════

export type ScheduleRefusal =
  | "invalid-timestamp"
  | "not-a-leaf"
  | "no-last-occurrence"
  | "pattern-not-retestable";

export type ScheduleResult =
  | { ok: true; schedule: RetestSchedule }
  | { ok: false; refusal: ScheduleRefusal; detail: string };

/** Statuses a retest is meaningful for. A `resolved` leaf is not retested — it
 *  is REOPENED by a new occurrence (`resolved → recurred`, G.7), which is a
 *  different event with different evidence. A `dormant` leaf is not retested
 *  either: G.7 says dormant reopens rather than recurs, so there is nothing a
 *  retest could confirm. */
export const RETESTABLE_STATUSES = Object.freeze(["open", "acknowledged", "practising", "recurred"] as const);

/**
 * The first retest for a leaf, scheduled from the occurrence it must outlast.
 *
 * **`dueAt` is `lastSeenAt + RESOLUTION_COOLING_DAYS`, never `correctedAt + 7`
 * and never `now + 7`.** The engine measures the cooling period from
 * `pattern.lastSeenAt` (`canResolve`: *"≥7 days after the last occurrence"*), so
 * a schedule measured from anything else would produce due dates that pass the
 * schedule and fail the gate. One clock, one origin.
 *
 * G.8's *"immediate retry"* is therefore never a retest: it happens at
 * `lastSeenAt + ~0`, which is before `dueAt` by exactly seven days.
 */
export function scheduleFirstRetest(pattern: Pattern): ScheduleResult {
  if (pattern.tier !== "concept") {
    return { ok: false, refusal: "not-a-leaf", detail: `pattern ${pattern.id} is tier '${pattern.tier}'; only leaves carry evidence (§4.4.2)` };
  }
  if (!RETESTABLE_STATUSES.includes(pattern.status as (typeof RETESTABLE_STATUSES)[number])) {
    return { ok: false, refusal: "pattern-not-retestable", detail: `status '${pattern.status}' is not retested (G.7)` };
  }
  if (pattern.lastSeenAt === null) {
    return { ok: false, refusal: "no-last-occurrence", detail: "a leaf with no lastSeenAt has nothing to measure a cooling period from" };
  }

  const dueAt = addDays(pattern.lastSeenAt, RETEST_INTERVALS_DAYS[0]);
  if (dueAt === null) {
    return { ok: false, refusal: "invalid-timestamp", detail: `unparseable lastSeenAt: ${pattern.lastSeenAt}` };
  }

  return {
    ok: true,
    schedule: Object.freeze({
      patternId: pattern.id,
      studentId: pattern.studentId,
      dueAt,
      intervalDays: RETEST_INTERVALS_DAYS[0],
      attemptCount: 0,
      lastResult: null,
      lastAttemptAt: null,
    }),
  };
}

/**
 * A retest happened. Expand on success, reset on failure (G.8).
 *
 * The returned schedule is a NEW frozen value — the same non-mutating posture
 * `applyTransition` holds, and for the same reason: a schedule that can be
 * edited in place is a schedule whose history nobody can reconstruct.
 */
export function recordRetest(
  schedule: RetestSchedule,
  outcome: { result: RetestResult; at: ISOTimestamp },
): ScheduleResult {
  if (!Number.isFinite(Date.parse(outcome.at))) {
    return { ok: false, refusal: "invalid-timestamp", detail: `unparseable retest timestamp: ${outcome.at}` };
  }

  const interval =
    outcome.result === "pass"
      ? nextIntervalDays(schedule.intervalDays)
      : RETEST_RESET_INTERVAL_DAYS;

  const dueAt = addDays(outcome.at, interval);
  if (dueAt === null) {
    return { ok: false, refusal: "invalid-timestamp", detail: `unparseable retest timestamp: ${outcome.at}` };
  }

  return {
    ok: true,
    schedule: Object.freeze({
      ...schedule,
      dueAt,
      intervalDays: interval,
      attemptCount: schedule.attemptCount + 1,
      lastResult: outcome.result,
      lastAttemptAt: outcome.at,
    }),
  };
}

/** Which schedules are due at `now`. F.2.b injects these into the NEXT
 *  session's assessment as above-manifest additions, *"so retesting rides on
 *  study the student was doing anyway rather than becoming a separate chore"*
 *  (G.8). Sorted by how overdue they are, so the oldest debt is paid first. */
export function dueRetests(schedules: readonly RetestSchedule[], now: ISOTimestamp): RetestSchedule[] {
  const t = Date.parse(now);
  if (!Number.isFinite(t)) return [];
  return schedules
    .filter((s) => {
      const due = Date.parse(s.dueAt);
      return Number.isFinite(due) && due <= t;
    })
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

/**
 * G.8: *"The retest question is generated by the Assessment Engine with
 * `targets_pattern_id` set, and is injected into the *next* session's
 * assessment as an above-manifest addition (F.2.b)."*
 *
 * Structurally identical to `RetestSlotRequest` in `lib/assessment-blueprint.ts`
 * and deliberately NOT imported from it: M11 owns pattern selection and M10 owns
 * slot placement (the blueprint's own comment says so — *"Supplied by the
 * caller (M11 owns pattern selection); this module only places them."*). A test
 * asserts the two shapes still line up, which is a cheaper coupling than an
 * import that would drag the blueprint's dependencies into this module.
 */
export interface RetestSlot {
  concept_ref: string;
  concept_id: string | null;
  depth: "recall" | "application" | "transfer";
  pattern_id: string;
  error_type: string | null;
}

/** Build the slot request for one due retest. `depth` is `application` — F.3's
 *  ladder escalates during the assessment, and a retest that opened at `recall`
 *  would confirm only that the student remembers the correction was made. */
export function retestSlotFor(
  schedule: RetestSchedule,
  pattern: Pick<Pattern, "id" | "conceptId" | "errorType">,
  conceptRef: string,
): RetestSlot {
  return {
    concept_ref: conceptRef,
    concept_id: pattern.conceptId,
    depth: "application",
    pattern_id: schedule.patternId,
    error_type: pattern.errorType,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE GATE — M11-4's second half, and half of M11-5's second refusal
// ═══════════════════════════════════════════════════════════════════════════

/** One retest, as it comes back from the Assessment Engine. `attemptId` is what
 *  makes the resolution CONSTRUCTIBLE: G.8 — *"a resolution that cannot name
 *  them is not constructible."* */
export interface RetestAttempt {
  attemptId: UUID;
  conceptId: UUID;
  answeredAt: ISOTimestamp;
  isCorrect: boolean;
  /** TRUE for G.8's *"immediate retry"* — right after the wrong answer, same
   *  session. Carried so the refusal can SAY that is what happened, rather than
   *  reporting a generic cooling failure. */
  immediateRetry?: boolean;
}

export type ResolutionRefusal =
  | "forbidden-for-student"
  | "not-a-leaf"
  | "no-last-occurrence"
  | "insufficient-correct-answers"
  | "cooling-period-not-elapsed"
  | "immediate-retry-is-not-proof"
  | "retest-not-yet-due"
  | "invalid-transition"
  | "engine-refused";

export interface ResolutionProof {
  pattern: Pattern;
  resolution: MistakeResolution;
}

export type ResolutionOutcome =
  | { ok: true; value: ResolutionProof }
  | { ok: false; refusal: ResolutionRefusal; detail: string; engineError?: EngineError };

const deny = (refusal: ResolutionRefusal, detail: string, engineError?: EngineError): ResolutionOutcome =>
  ({ ok: false, refusal, detail, engineError });

export interface ResolutionRequest {
  pattern: Pattern;
  /** Every retest attempt on this pattern. Wrong ones are kept in the input so
   *  the count that matters is computed HERE from facts, not supplied by a
   *  caller who could supply a different one. */
  attempts: readonly RetestAttempt[];
  /** The schedule, when one exists. Its `dueAt` is a SECOND, independent floor
   *  under the cooling period. */
  schedule?: RetestSchedule | null;
  /** Who is asking. `'student'` is refused here before the engine ever sees it
   *  — see the note below on why the check is duplicated deliberately. */
  actor: "system" | "student";
  resolutionId: UUID;
  at: ISOTimestamp;
}

/**
 * **THE RESOLUTION GATE.** V.4.6, and the middle refusal of V.4.4.
 *
 * Order matters and is the specification's:
 *
 *   1. a student actor is refused OUTRIGHT, before any evidence is examined.
 *      PRINCIPLES §3.1 is not a conclusion reached after weighing proof; it is
 *      a rule about who may ask. `applyTransition` refuses this too
 *      (`STUDENT_SETTABLE`), and the duplication is deliberate: this function
 *      may one day be called with a transition the engine would permit for a
 *      student, and §3.1 must not depend on that never happening.
 *   2. immediate retries are STRIPPED. G.8: *"a useful signal and not proof."*
 *      They are stripped rather than ignored so that a pattern whose ONLY
 *      correct answers are immediate retries produces
 *      `immediate-retry-is-not-proof` — V.4.3's answer, in words — instead of a
 *      count the student cannot interpret.
 *   3. the engine decides. `canResolve()` applies §4.8 in full and this function
 *      does not second-guess it.
 *   4. the schedule's `dueAt` is checked as an additional floor.
 *   5. `applyTransition()` performs the transition, with `actor: 'system'`, and
 *      REFUSES anything the graph does not permit (`open → resolved` is not a
 *      legal edge; only `practising → resolved` is).
 *   6. only then is a `MistakeResolution` built, naming its proof attempts.
 */
export function attemptResolution(request: ResolutionRequest): ResolutionOutcome {
  const { pattern, attempts, actor, at } = request;

  // ── 1 · WHO IS ASKING ────────────────────────────────────────────────────
  if (actor !== "system") {
    return deny(
      "forbidden-for-student",
      "a mistake is not resolved because the student says it is resolved (PRINCIPLES §3.1, DECISIONS §9.4)",
    );
  }

  if (pattern.tier !== "concept") {
    return deny("not-a-leaf", `pattern ${pattern.id} is tier '${pattern.tier}'; parent resolution is derived (§4.4.4)`);
  }
  if (pattern.lastSeenAt === null) {
    return deny("no-last-occurrence", "nothing to measure recovery from");
  }

  // ── 2 · IMMEDIATE RETRIES ARE NOT PROOF ──────────────────────────────────
  const correct = attempts.filter((a) => a.isCorrect);
  const admissible = correct.filter((a) => a.immediateRetry !== true);

  if (correct.length > 0 && admissible.length === 0) {
    return deny(
      "immediate-retry-is-not-proof",
      `every correct answer on this pattern was an immediate retry; zero days have elapsed against RESOLUTION_COOLING_DAYS = ${RESOLUTION_COOLING_DAYS} (G.8, V.4.3)`,
    );
  }

  // ── 3 · THE ENGINE DECIDES ───────────────────────────────────────────────
  const correctAnswers: CorrectAnswer[] = admissible.map((a) => ({
    conceptId: a.conceptId,
    answeredAt: a.answeredAt,
  }));

  const proof = canResolve(pattern, correctAnswers);
  if (!proof.ok) {
    const failure = proof.error.failure;
    const refusal: ResolutionRefusal =
      failure === "insufficient-correct-answers" ? "insufficient-correct-answers"
      : failure === "cooling-period-not-elapsed" ? "cooling-period-not-elapsed"
      : failure === "not-a-leaf" ? "not-a-leaf"
      : "engine-refused";
    return deny(refusal, proof.error.detail, proof.error);
  }

  // ── 4 · THE SCHEDULE IS A SECOND FLOOR ───────────────────────────────────
  // `canResolve` measures from `lastSeenAt`; the schedule measures from the last
  // retest. After a FAILED retest the schedule resets to 7 days, so a pattern
  // that was got wrong three days ago cannot be resolved by an old correct
  // answer that happens to clear the original cooling boundary.
  if (request.schedule) {
    const due = Date.parse(request.schedule.dueAt);
    const passingOnOrAfterDue = admissible.some((a) => {
      const t = Date.parse(a.answeredAt);
      return Number.isFinite(t) && Number.isFinite(due) && t >= due;
    });
    if (!passingOnOrAfterDue) {
      return deny(
        "retest-not-yet-due",
        `no passing retest at or after the scheduled ${request.schedule.dueAt}`,
      );
    }
  }

  // ── 5 · THE TRANSITION, BY THE SYSTEM ────────────────────────────────────
  const transitioned = applyTransition(pattern, {
    to: "resolved",
    actor: "system",
    cause: `retest proof: ${admissible.length} correct answers on this concept, ≥1 at least ${RESOLUTION_COOLING_DAYS} days after the last occurrence`,
    at,
    correctAnswers,
  });

  if (!transitioned.ok) {
    const failure = transitioned.error.failure;
    return deny(
      failure === "invalid-transition" ? "invalid-transition" : "engine-refused",
      transitioned.error.detail,
      transitioned.error,
    );
  }

  // ── 6 · THE RESOLUTION, NAMING ITS PROOF ─────────────────────────────────
  const measuredFrom = pattern.lastSeenAt;
  const latest = admissible.reduce((acc, a) => (Date.parse(a.answeredAt) > Date.parse(acc.answeredAt) ? a : acc), admissible[0]);
  const elapsed = daysBetween(measuredFrom, latest.answeredAt) ?? 0;

  return {
    ok: true,
    value: {
      pattern: transitioned.value,
      resolution: Object.freeze({
        id: request.resolutionId,
        patternId: pattern.id,
        studentId: pattern.studentId,
        resolvedAt: at,
        // G.8: *"appends a `MistakeResolution` row with the proof attempt IDs"*.
        proofAttemptIds: admissible.map((a) => a.attemptId),
        measuredFrom,
        coolingDaysElapsed: elapsed,
        setBy: "system" as const,
      }),
    },
  };
}

/**
 * G.8's immediate retry, as a value rather than as a hole in the schedule.
 *
 * V.4.3 wants `MISTAKE_CORRECTED{immediate_retry_correct}` emitted and the
 * pattern NOT resolved. This says both halves at once: the signal is recorded,
 * `resolves` is `false`, and the reason is quotable.
 */
export interface ImmediateRetryOutcome {
  immediateRetryCorrect: boolean;
  resolves: false;
  reason: string;
}

export function recordImmediateRetry(isCorrect: boolean): ImmediateRetryOutcome {
  return {
    immediateRetryCorrect: isCorrect,
    resolves: false,
    reason: `an immediate retry is zero days after the occurrence; resolution needs ${RESOLUTION_MIN_CORRECT} correct answers with at least one ≥${RESOLUTION_COOLING_DAYS} days later (G.8)`,
  };
}
