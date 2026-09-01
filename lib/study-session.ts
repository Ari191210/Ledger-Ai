// ═══════════════════════════════════════════════════════════════════════════
// M9-1 / M9-3 — THE STUDY SESSION STATE MACHINE, WITH NO I/O.
//
// This module is architecture Part E.1–E.4, transcribed. It is not a new
// design; where this file and Part E disagree, this file is the defect.
//
// It holds the DECISION and no I/O — no Supabase client, no clock, no network,
// no `next/*`, and (deliberately) no imports at all. `lib/session-resolver.ts`
// adds the adapter-driven resolver, `lib/session-reaping.ts` plans the sweep,
// and `app/api/cron/session-reaping/route.ts` supplies the only Supabase-backed
// `SessionStore` this pass ships. The same split M4's
// `lib/auth-routes.ts`, M6's `lib/concept-resolution.ts` and M7's
// `lib/event-contract.ts` already use, and for the same reason: the done-when
// conditions of M9-1/2/3 are properties of a decision, and a decision with no
// I/O is provable without a live database (U.3, the determinism boundary).
//
//
// TWO DISCREPANCIES IN THE GOVERNING DOCUMENTS, RESOLVED HERE IN THE OPEN
//
// (1) E.2's prose says *"Six states. Three terminal."* Its table and its
//     diagram both list SEVEN — ACTIVE, DORMANT, REVIEWING, ASSESSING,
//     CLOSED_UNVERIFIED, VERIFIED, ABANDONED — and three of those seven are
//     terminal. The table is the normative artefact (it is the thing the
//     diagram draws and the thing every other clause references by name), so
//     the count sentence is the stale half: E.2 says it *corrected* a six-state
//     skeleton by adding DORMANT, adding ABANDONED and merging two states, and
//     6 − 1 + 2 = 7. All seven are implemented. **Reported, not silently
//     picked** — CLAUDE.md forbids resolving a documentary conflict by
//     judgement in the moment, and the report for this milestone names it.
//
// (2) C.3's `StudySession` entry writes the terminal set as
//     `('completed_unverified','verified','abandoned')` — the *pre-correction*
//     name `COMPLETED_UNVERIFIED`, which E.2 explicitly renames and re-argues
//     ("`COMPLETED_UNVERIFIED` is drawn as a predecessor of `VERIFIED` … it is
//     not"). Part E is the canonical session specification and EXECUTION_PLAN
//     M9-1's done-when names `CLOSED_UNVERIFIED` in its own words. E.2 wins;
//     C.3's enum literal is the defect. Also reported.
//
//
// THE ONE RULE THAT SHAPES THE SCORE HALF OF THIS FILE
//
// A reaped session must never make a score fall. That is not a policy this
// module implements — it is a shape it makes INEXPRESSIBLE:
// `SessionScoreContribution` has exactly two arms, `verified_evidence` and
// `none`, and no arm carries a sign, a magnitude or a penalty. M14 cannot pay a
// negative session term because there is no negative session term to read. See
// SESSION_SCORE_CONTRACT below — that comment is addressed to M14.
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// E.2 — THE SIX(-PLUS-ONE) STATES
// ═══════════════════════════════════════════════════════════════════════════

export const SESSION_STATES = [
  "ACTIVE",
  "DORMANT",
  "REVIEWING",
  "ASSESSING",
  "CLOSED_UNVERIFIED",
  "VERIFIED",
  "ABANDONED",
] as const;

export type SessionState = (typeof SESSION_STATES)[number];

/** E.2: *"Six states. Three terminal."* These are the three. */
export const TERMINAL_STATES: readonly SessionState[] = [
  "CLOSED_UNVERIFIED",
  "VERIFIED",
  "ABANDONED",
];

/**
 * The complement, and the exact predicate the partial unique index in `021`
 * uses. It is derived from `TERMINAL_STATES` rather than written out a second
 * time: "one live session per student" is enforced by the database, and a
 * hand-maintained second list is how the SQL and the code stop agreeing.
 */
export const LIVE_STATES: readonly SessionState[] = SESSION_STATES.filter(
  s => !TERMINAL_STATES.includes(s),
);

export const isTerminal = (s: SessionState): boolean => TERMINAL_STATES.includes(s);
export const isLive = (s: SessionState): boolean => !isTerminal(s);

/** C.3's `origin` enum, verbatim — three values, and no fourth is invented
 *  here. E.1's *"explicit 'start studying' action"* opens a session with
 *  `origin = 'tool_activity'` (it is activity inside the product) and records
 *  the precise trigger in the opening event's `payload.opened_by`, so nothing
 *  is lost and the enum is not widened past its specification. */
export const SESSION_ORIGINS = ["tool_activity", "declaration", "resumed"] as const;
export type SessionOrigin = (typeof SESSION_ORIGINS)[number];

/**
 * Why a session stopped. `close_reason` exists because "closed" alone cannot
 * distinguish a student who chose to skip an assessment from one who walked
 * away from one that failed to generate — and V.1.7 asks for `reason =
 * 'reaped'` by name.
 *
 * Every one of these is a FACT, and none is a verdict. There is deliberately no
 * `'gave_up'`, no `'failed'` and no `'incomplete'` (§4, NEVER SHAME).
 */
export const CLOSE_REASONS = [
  "reaped",
  "review_skipped",
  "assessment_skipped",
  "generation_failed",
  "assessment_completed",
  "discarded",
] as const;
export type CloseReason = (typeof CLOSE_REASONS)[number];

// ═══════════════════════════════════════════════════════════════════════════
// E.1 — WHAT OPENS A SESSION
//
// *"A session opens on the first of these, and on nothing else."* The list is
// here as data rather than as a chain of `if`s so that E.1's closing sentence —
// *"Deliberately non-qualifying: opening a tool, page views, a single
// CONCEPT_VIEWED, scrolling"* — is provable by set difference in a test rather
// than by reading the branches.
//
// `CONCEPT_VIEWED` / `EXPLANATION_READ` are NOT here. E.1 qualifies them only
// as a dwell-gated PAIR followed by a second academic event, which is a
// property of a window of the stream and not of one event; that predicate is
// `qualifiesAsPair()` below, and it is deliberately separate so that no caller
// can mistake a single view for study.
// ═══════════════════════════════════════════════════════════════════════════

export const QUALIFYING_EVENT_TYPES: readonly string[] = [
  "QUESTION_ATTEMPTED",
  "PRACTICE_COMPLETED",
  "EXTERNAL_STUDY_DECLARED",
];

/** E.1's dwell floor for the `CONCEPT_VIEWED` + `EXPLANATION_READ` pair.
 *  Server-owned and constant, for the reason E.3 gives about IDLE_MINUTES: a
 *  machine whose thresholds vary is a machine no test can pin. */
export const PAIR_DWELL_FLOOR_MS = 60_000;

export const isQualifyingEventType = (t: string): boolean =>
  QUALIFYING_EVENT_TYPES.includes(t);

/**
 * E.1's third bullet, in full: a `CONCEPT_VIEWED` / `EXPLANATION_READ` pair on
 * **the same concept**, combined dwell over the floor, **and** followed by any
 * second academic event.
 *
 * All three conjuncts are required. Dropping the third is the "session opens on
 * navigation" failure E.1 names, and it is why this returns false for a pair
 * with nothing after it however long the student stared.
 */
export function qualifiesAsPair(window: {
  conceptRef: string | null;
  viewedDwellMs: number;
  readDwellMs: number;
  hasBothTypes: boolean;
  followedByAcademicEvent: boolean;
}): boolean {
  if (!window.hasBothTypes) return false;
  if (window.conceptRef === null) return false;
  if (window.viewedDwellMs + window.readDwellMs <= PAIR_DWELL_FLOOR_MS) return false;
  return window.followedByAcademicEvent;
}

// ═══════════════════════════════════════════════════════════════════════════
// E.3 — LIVENESS
//
// *"Liveness is a property of the EVENT STREAM, not of a socket, a heartbeat or
// a timer."* Read literally and implemented literally: there is no heartbeat
// endpoint in this milestone and no client ping, because either one would make
// a tab left open on a locked phone look like study. `last_activity_at` moves
// when a qualifying event lands, and at no other time.
//
// E.3's own note: *"`IDLE_MINUTES` and `REAP_HOURS` are policy, not
// architecture. The architecture requires only that they exist, are
// server-owned, are constants … and that REAP_HOURS ≫ IDLE_MINUTES. Sensible
// starting values are 45 minutes and 20 hours; that is a product decision for
// PRODUCT_DECISIONS.md, not for this document."*
//
// Those two values are used here and are NOT yet recorded in
// PRODUCT_DECISIONS. They satisfy the acceptance tests as written (V.1.4 goes
// quiet for 50 minutes and expects DORMANT; V.1.7 leaves for 25 hours and
// expects CLOSED_UNVERIFIED), and the gap is named in this milestone's report
// rather than closed by a plan editing a decision document.
// ═══════════════════════════════════════════════════════════════════════════

export const IDLE_MINUTES = 45;
export const REAP_HOURS = 20;

export const IDLE_MS = IDLE_MINUTES * 60_000;
export const REAP_MS = REAP_HOURS * 3_600_000;

/** The one liveness input. `nowMs` is passed, never read from a clock, so a
 *  25-hour absence is a test that runs in a millisecond. */
export type Liveness = "fresh" | "idle" | "reapable";

export function livenessOf(lastActivityAtMs: number, nowMs: number): Liveness {
  const quiet = nowMs - lastActivityAtMs;
  if (quiet > REAP_MS) return "reapable";
  if (quiet > IDLE_MS) return "idle";
  return "fresh";
}

// ═══════════════════════════════════════════════════════════════════════════
// E.2 — THE TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Everything that can happen TO a session. Note what is absent: there is no
 * `'expire'`, no `'fail'` and no action a client can send that closes a session
 * as a punishment. `discard` is the student's own explicit act and E.2.b gates
 * it on the session holding no evidence.
 */
export const SESSION_ACTIONS = [
  "qualifying_activity",
  "idle_elapsed",
  "reap_elapsed",
  "finish_requested",
  "concepts_changed",
  "concepts_confirmed",
  "review_skipped",
  "assessment_skipped",
  "generation_failed",
  "assessment_completed",
  "discard",
] as const;
export type SessionAction = (typeof SESSION_ACTIONS)[number];

interface Edge {
  to: SessionState;
  close_reason?: CloseReason;
  /** Does this edge advance `last_activity_at`? Only real academic activity
   *  does. A reap must not touch it — a sweep that refreshed the clock it is
   *  reading would never finish anything. */
  touches_activity?: boolean;
}

/**
 * The machine, as data. E.2's table read left to right.
 *
 * `021`'s `study_sessions_transition_guard` trigger holds the same edges in
 * SQL, and `tests/study-session.test.mjs` reads both and fails unless they are
 * the same set — the M7 precedent for a list that exists twice because no
 * compiler sees the SQL.
 *
 * THREE EDGES ARE ARCHITECTURAL INFERENCE, NAMED SO A REVIEWER CAN REFUSE THEM:
 *
 *   · `DORMANT + finish_requested → REVIEWING`. E.2's table gives DORMANT two
 *     exits (wake, or reap) and names `SESSION_FINISH_REQUESTED` only as
 *     REVIEWING's entry. Refusing it strands a student who returns after an
 *     hour and presses finish: they would have to answer another question
 *     before they were allowed to stop. That reading makes the product harder
 *     to leave, which §4 does not permit.
 *
 *   · `REVIEWING + reap_elapsed → CLOSED_UNVERIFIED` and the same from
 *     ASSESSING. E.2 draws the reap edge from DORMANT only. But REVIEWING and
 *     ASSESSING are LIVE states, and the partial unique index allows exactly
 *     one live session per student — so a student who closes their laptop on
 *     the review screen would be locked out of ever opening another session,
 *     permanently, by a rule written to protect them. Both edges reuse the
 *     CLOSED_UNVERIFIED target E.2 already draws from those two states, with
 *     `reason = 'reaped'`.
 *
 * ACTIVE has NO reap edge, deliberately. A quiet-for-25-hours ACTIVE session is
 * also quiet-for-45-minutes, so the reaper walks it ACTIVE → DORMANT →
 * CLOSED_UNVERIFIED in two steps in one sweep (`lib/session-reaping.ts`). The
 * machine E.2 draws is preserved exactly rather than short-circuited.
 */
export const TRANSITIONS: Readonly<
  Record<SessionState, Partial<Record<SessionAction, Edge>>>
> = {
  ACTIVE: {
    qualifying_activity: { to: "ACTIVE", touches_activity: true },
    idle_elapsed: { to: "DORMANT" },
    finish_requested: { to: "REVIEWING" },
    discard: { to: "ABANDONED", close_reason: "discarded" },
  },
  DORMANT: {
    qualifying_activity: { to: "ACTIVE", touches_activity: true },
    reap_elapsed: { to: "CLOSED_UNVERIFIED", close_reason: "reaped" },
    finish_requested: { to: "REVIEWING" },
    discard: { to: "ABANDONED", close_reason: "discarded" },
  },
  REVIEWING: {
    concepts_changed: { to: "REVIEWING" },
    concepts_confirmed: { to: "ASSESSING" },
    review_skipped: { to: "CLOSED_UNVERIFIED", close_reason: "review_skipped" },
    reap_elapsed: { to: "CLOSED_UNVERIFIED", close_reason: "reaped" },
  },
  ASSESSING: {
    assessment_completed: { to: "VERIFIED", close_reason: "assessment_completed" },
    assessment_skipped: { to: "CLOSED_UNVERIFIED", close_reason: "assessment_skipped" },
    generation_failed: { to: "CLOSED_UNVERIFIED", close_reason: "generation_failed" },
    reap_elapsed: { to: "CLOSED_UNVERIFIED", close_reason: "reaped" },
  },
  CLOSED_UNVERIFIED: {},
  VERIFIED: {},
  ABANDONED: {},
};

/** The minimum a transition needs to know about the row it is transitioning. */
export interface SessionFacts {
  state: SessionState;
  /** How many `E`-class (evidence-bearing) events have attached. E.2.b's hard
   *  precondition for ABANDONED reads this and nothing else. */
  evidence_event_count: number;
}

export type TransitionOutcome =
  | {
      kind: "transition";
      from: SessionState;
      to: SessionState;
      close_reason: CloseReason | null;
      touches_activity: boolean;
      /** Set when the target is terminal, so the caller stamps `closed_at`. */
      closes: boolean;
    }
  | {
      kind: "noop";
      /** The state the session is ACTUALLY in. E.7 / V.1.8: *"the second call
       *  affects zero rows and returns the current state, NOT an error."* */
      state: SessionState;
      why: "terminal" | "not_permitted" | "has_evidence";
    };

/**
 * The whole of E.2, in one pure function. **It cannot throw.**
 *
 * That is a requirement, not a style choice. V.1.8 presses "finish" twice from
 * two tabs and demands the second call return the current state rather than an
 * error, and E.7.1 generalises it: *"a second tab's identical request affects
 * zero rows and receives the current state instead of an error."* A function
 * that threw on an unrecognised edge would push that decision out to every
 * caller, and one caller getting it wrong turns a stale tab into a 500.
 */
export function applySessionTransition(
  session: SessionFacts,
  action: SessionAction,
): TransitionOutcome {
  const from = session.state;

  if (isTerminal(from)) {
    return { kind: "noop", state: from, why: "terminal" };
  }

  // `?? {}` is load-bearing, not defensive noise. `SessionFacts.state` comes
  // from a database row, and a row written by a build that knew one more state
  // than this one does would index `TRANSITIONS` to `undefined` — and a
  // property read on `undefined` THROWS, which is the one thing this function
  // has promised not to do. An unrecognised state has no edges, which is the
  // safe answer as well as the honest one: the session does not move.
  const edge = (TRANSITIONS[from] ?? {})[action];
  if (!edge) {
    return { kind: "noop", state: from, why: "not_permitted" };
  }

  // ── E.2.b · ABANDONED's hard precondition ────────────────────────────────
  // *"It is reachable only while the session contains NO E-class event. Once a
  // question has been answered, evidence exists and PRINCIPLES §3.2 forbids
  // discarding it — the session may only be closed, never erased."* This is the
  // architectural fix for the one-click `localStorage.removeItem` at
  // `app/tools/post-exam/page.tsx:140`, and 021 refuses the same thing at the
  // row level with a CHECK, so the guarantee survives a caller that skips this
  // function entirely.
  if (edge.to === "ABANDONED" && session.evidence_event_count > 0) {
    return { kind: "noop", state: from, why: "has_evidence" };
  }

  return {
    kind: "transition",
    from,
    to: edge.to,
    close_reason: edge.close_reason ?? null,
    touches_activity: edge.touches_activity ?? false,
    closes: isTerminal(edge.to),
  };
}

/**
 * E.3's day-boundary rule, as a predicate rather than a comment.
 *
 * *"IDLE_MINUTES is measured in REAL time, not calendar time, so a session
 * started at 23:40 and continued at 00:10 is one session."* This exists so a
 * future reader cannot reintroduce the `lib/active-close.ts` IST/UTC bug by
 * "helpfully" closing sessions at local midnight.
 */
export function crossesDayBoundaryWithoutClosing(
  lastActivityAtMs: number,
  nowMs: number,
): boolean {
  return livenessOf(lastActivityAtMs, nowMs) !== "reapable";
}

// ═══════════════════════════════════════════════════════════════════════════
// E.2.a — WHAT A SESSION CONTRIBUTES TO THE SCORE
//
// SESSION_SCORE_CONTRACT — THIS COMMENT IS ADDRESSED TO M14.
//
// EXECUTION_PLAN M9-1's done-when: *"reaping produces CLOSED_UNVERIFIED, THE
// SCORE DOES NOT FALL, and nothing shames."* PRINCIPLES §3.3: *"a student who
// logs honestly may never score below a student who logs nothing."* E.2.a:
// *"a closed-unverified session still contributes … what it does not contribute
// is PROOF, and the score therefore does not move on it. That distinction is
// honest; a penalty would not be."*
//
// The guarantee is made STRUCTURAL rather than remembered:
//
//   · `SessionScoreContribution` has two arms and neither carries a number, a
//     sign or a weight. There is no penalty arm to read, so M14 cannot pay one
//     without first widening this type — which is a visible edit to a file
//     whose header says why it must not happen.
//   · The function is total over `SessionState` and answers `none` for FIVE of
//     the seven states. Only VERIFIED yields evidence.
//   · A test asserts, for every state in `SESSION_STATES`, that the returned
//     object has no key whose value is a negative number.
//
// **M14 MUST NOT** derive Continuity, or any dimension, from
// CLOSED_UNVERIFIED / ABANDONED / DORMANT counts as a DEDUCTION, a ratio
// denominator that punishes abandonment, or a "completion rate". §9.3 already
// binds Continuity to *verified* engagement; this is the session layer saying
// the same thing in the only vocabulary it exposes.
// ═══════════════════════════════════════════════════════════════════════════

export type SessionScoreContribution =
  /** The session was assessed. This is the ONLY arm M14 may pay. */
  | { kind: "verified_evidence" }
  /** The session contributes nothing to the score. Not less than nothing. */
  | { kind: "none" };

export function sessionScoreContribution(state: SessionState): SessionScoreContribution {
  return state === "VERIFIED" ? { kind: "verified_evidence" } : { kind: "none" };
}

/** A convenience for the same fact, phrased the way a reviewer will ask it. */
export const sessionCanLowerScore = (_state: SessionState): false => false;

// ═══════════════════════════════════════════════════════════════════════════
// E.2.a — HOW A STATE MAY BE NAMED
//
// *"CLOSED_UNVERIFIED is not a failure state and must never be rendered as
// one."* §4: *"State facts; offer the next move; never judge."*
//
// The permitted words live here, in one place, for the reason M0-3 put the
// parent-digest copy in one place: a lexicon a test can read is a ban that
// holds, and a convention spread across components is a ban that lasts until
// somebody is in a hurry. `tests/study-session.test.mjs` asserts every string
// below against the shame lexicon §4 and §4.1 enumerate.
//
// There is no `message` field and no `encouragement` field anywhere in this
// module (E.8.a), and no state has an emoji, an exclamation mark or an adverb.
// ═══════════════════════════════════════════════════════════════════════════

export const SESSION_STATE_NOTE: Readonly<Record<SessionState, string>> = {
  ACTIVE: "Open",
  DORMANT: "Open, quiet",
  REVIEWING: "Confirming what you studied",
  ASSESSING: "Assessment in progress",
  CLOSED_UNVERIFIED: "Closed without an assessment",
  VERIFIED: "Assessed",
  ABANDONED: "Discarded",
};

/** Why a session closed, stated as a fact. `reaped` is the load-bearing one:
 *  V.1.7 requires that nothing shames, and *"You abandoned this"* would. */
export const CLOSE_REASON_NOTE: Readonly<Record<CloseReason, string>> = {
  reaped: "Closed automatically after a quiet day",
  review_skipped: "Closed without confirming concepts",
  assessment_skipped: "Closed without an assessment",
  generation_failed: "Closed without an assessment",
  assessment_completed: "Assessed",
  discarded: "Discarded by you",
};

/**
 * E.2.a's *"it generates a recommendation to verify later"*, as the ONE next
 * move §4 requires a factual state to be paired with. It is an offer, and the
 * wording never refers backwards to what did not happen.
 *
 * Returns null where there is nothing honest to offer — M20 owns
 * recommendations, and inventing one here would be the fabrication Law 7 bans.
 */
export function nextMoveFor(state: SessionState): string | null {
  if (state === "CLOSED_UNVERIFIED") return "Verify these concepts when you're ready";
  return null;
}
