// ═══════════════════════════════════════════════════════════════════════════
// M9-2 / M9-3 — THE SESSION RESOLVER, AND THE GUARDED TRANSITION.
//
// EXECUTION_PLAN M9-2: *"The session resolver; partial unique index for one
// live session. Done when: V.1.3 — two tabs produce exactly one session."*
// EXECUTION_PLAN M9-3: *"Liveness across tabs, devices and days. Done when:
// V.1.6 — resuming on another device returns the same session."*
//
// This module is E.4 and E.7, and it has **no Supabase client**. It reaches the
// database through a `SessionStore` adapter, exactly as `lib/event-compaction.ts`
// (M7-7) reaches it through `CompactionAdapters` and for the identical reason:
// M9-2's done-when is a claim about behaviour UNDER CONCURRENCY, and a race is
// only testable when the test can control both racers. `tests/study-session.
// test.mjs` supplies a fake store that enforces the same partial unique index
// `021` does and lets two `resolveSession()` calls interleave inside one tick.
// `app/api/cron/session-reaping/route.ts` supplies the real one, built inline
// against `supabaseServer` — the shape M7-7's compaction route established. A
// shared `lib/sessions.ts` arrives with M9's second pass, when the declaration
// and confirmation endpoints give the adapter a second caller.
//
//
// WHY THE RACE IS WON BY THE DATABASE AND NOT BY THIS FILE
//
// The tempting shape is: read the live session, and if there is none, create
// one. That has a window between the read and the write, and two tabs opened
// together sit in it together. E.7 is explicit that the fix is structural —
// *"the partial unique index in C.3, NOT client state"*.
//
// So `openSession()` here does not check first. It INSERTS, and treats the
// unique violation as the ordinary path rather than as an error: the loser of
// the race re-reads and attaches to the winner's session. There is no window,
// because there is no read to be stale. `SessionStore.insertOpen` is typed to
// return `{ conflict: true }` rather than to reject, so a caller cannot forget.
//
//
// WHY THERE IS NO HEARTBEAT
//
// E.3: *"Liveness is a property of the EVENT STREAM, not of a socket, a
// heartbeat or a timer."* Checked for both readings and both are refused by the
// same sentence — a heartbeat would make a tab left open on a locked phone
// indistinguishable from a student working, which is the "sessions studied
// measures app-opening" failure E.1 exists to prevent. `last_activity_at`
// advances on a qualifying event and at no other time. `GET /session/current`
// is a READ and moves nothing.
//
// No imports beyond `./study-session`. No clock. No network.
// ═══════════════════════════════════════════════════════════════════════════

import {
  applySessionTransition,
  isLive,
  isQualifyingEventType,
  livenessOf,
  type CloseReason,
  type SessionAction,
  type SessionOrigin,
  type SessionState,
} from "./study-session";

/** The materialised projection C.3 describes, as this module needs it. */
export interface SessionRow {
  session_id: string;
  student_id: string;
  state: SessionState;
  origin: SessionOrigin;
  opened_at: string;
  last_activity_at: string;
  finish_requested_at: string | null;
  closed_at: string | null;
  close_reason: CloseReason | null;
  evidence_event_count: number;
  input_watermark_event_id: string | null;
}

export interface OpenSessionDraft {
  student_id: string;
  origin: SessionOrigin;
  opened_at: string;
  last_activity_at: string;
}

/**
 * The four database operations the resolver needs, and no fifth.
 *
 * `transition` is a CONDITIONAL update — `WHERE session_id = ? AND state = from`
 * — which is E.7.1 verbatim: *"a second tab's identical request affects zero
 * rows and receives the current state instead of an error."* It returns `null`
 * for zero rows, and the caller re-reads rather than raising.
 */
export interface SessionStore {
  /** The student's one live session, or null. Reads the same predicate the
   *  partial unique index is defined over. */
  findLive(studentId: string): Promise<SessionRow | null>;
  findById(sessionId: string): Promise<SessionRow | null>;
  /** INSERT. `{ conflict: true }` means the partial unique index refused it
   *  because a live session already exists — the ordinary path, not a fault. */
  insertOpen(draft: OpenSessionDraft): Promise<{ row: SessionRow } | { conflict: true }>;
  /** Conditional update. `null` when zero rows matched. */
  transition(
    sessionId: string,
    from: SessionState,
    patch: SessionPatch,
    expect?: TransitionExpectation,
  ): Promise<SessionRow | null>;
}

/**
 * Extra columns the conditional update must match, beyond `state`.
 *
 * This exists for exactly one caller and one hazard. The reaper reads a batch
 * of rows, decides, and writes — and a student can answer a question inside
 * that window. Guarding only on `state` is not enough for that case: the
 * student's own write leaves the session ACTIVE with a NEW `last_activity_at`,
 * so a sweep that read it 200ms earlier would still match `state = 'ACTIVE'`
 * and put a session the student is sitting in to sleep — or, one action later,
 * close it.
 *
 * Adding `last_activity_at` to the WHERE clause turns the sweep's write into an
 * ordinary optimistic-concurrency update against the exact row it read. The
 * student's write always lands first or the sweep's write matches zero rows;
 * there is no third outcome, and the student wins by construction rather than
 * by timing. It is optional because no other caller needs it: a student-driven
 * transition is guarded by `state` alone, which is what E.7.1 specifies.
 */
export interface TransitionExpectation {
  last_activity_at?: string;
}

export interface SessionPatch {
  state: SessionState;
  last_activity_at?: string;
  finish_requested_at?: string | null;
  closed_at?: string | null;
  close_reason?: CloseReason | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// E.4 — THE RESOLVER
//
//   resolve(student_id, event) →
//     1. live session exists (ACTIVE | DORMANT)?  → attach; if DORMANT → ACTIVE
//     2. event is qualifying (E.1)?               → open a new session, attach
//     3. otherwise                                → attach nothing
//
// *"Case 3 is important and must not be optimised away: a CONCEPT_VIEWED with
// no session is a legitimate event."*
// ═══════════════════════════════════════════════════════════════════════════

export type ResolveOutcome =
  | { outcome: "attached"; session: SessionRow; woke: boolean; opened: boolean }
  | { outcome: "none"; reason: "not_qualifying" | "store_unavailable" };

export interface ResolveInput {
  studentId: string;
  eventType: string;
  /** E.4: *"The resolver … HAS NO CLOCK OF ITS OWN (it takes `received_at`)"* —
   *  which is the property that makes replaying the stream reconstruct
   *  identical session boundaries. */
  receivedAtMs: number;
  /** E.5's `origin = 'declaration'` when a declaration opens the session. The
   *  caller decides; the resolver records. */
  origin?: SessionOrigin;
}

export async function resolveSession(
  store: SessionStore,
  input: ResolveInput,
): Promise<ResolveOutcome> {
  const live = await store.findLive(input.studentId);

  // ── step 1 · attach to the live session ──────────────────────────────────
  if (live && isLive(live.state)) {
    return attachTo(store, live, input);
  }

  // ── step 2 · open one, if the event earns it (E.1) ───────────────────────
  if (!isQualifyingEventType(input.eventType)) {
    return { outcome: "none", reason: "not_qualifying" };
  }

  const at = new Date(input.receivedAtMs).toISOString();
  const created = await store.insertOpen({
    student_id: input.studentId,
    origin: input.origin ?? defaultOriginFor(input.eventType),
    opened_at: at,
    last_activity_at: at,
  });

  if ("row" in created) {
    return { outcome: "attached", session: created.row, woke: false, opened: true };
  }

  // ── the race, resolved by re-reading rather than by retrying the write ────
  // V.1.3. The index refused a second live session, which means another tab
  // won between this call's `findLive` and its INSERT. The winner's session is
  // the answer; there is exactly one, by construction.
  const winner = await store.findLive(input.studentId);
  if (!winner) {
    // Vanishingly rare and deliberately NOT retried in a loop: the winner would
    // have to have reached a terminal state in the microseconds since it was
    // created. Returning `none` loses a session attachment, never an event —
    // `session_id` is nullable and D.1 marks that legal.
    return { outcome: "none", reason: "store_unavailable" };
  }
  return attachTo(store, winner, input);
}

/**
 * E.4 step 1's second half — *"if DORMANT → ACTIVE"*.
 *
 * REVIEWING and ASSESSING attach WITHOUT a state change. E.4 names only ACTIVE
 * and DORMANT for the wake, and waking a session that is being assessed would
 * be a backwards transition the machine does not draw: the events an assessment
 * produces belong to the session, but they do not reopen it.
 */
async function attachTo(
  store: SessionStore,
  live: SessionRow,
  input: ResolveInput,
): Promise<ResolveOutcome> {
  if (!isQualifyingEventType(input.eventType)) {
    // A non-qualifying event still attaches to an OPEN session — E.3's
    // cross-tool rule — it simply cannot open one and does not move the
    // liveness clock. Only study refreshes the study clock.
    return { outcome: "attached", session: live, woke: false, opened: false };
  }

  const outcome = applySessionTransition(
    { state: live.state, evidence_event_count: live.evidence_event_count },
    "qualifying_activity",
  );

  if (outcome.kind === "noop") {
    return { outcome: "attached", session: live, woke: false, opened: false };
  }

  const at = new Date(input.receivedAtMs).toISOString();
  const updated = await store.transition(live.session_id, live.state, {
    state: outcome.to,
    last_activity_at: at,
  });

  // Zero rows: a concurrent tab moved the state first. Its write is as valid as
  // this one would have been, so this call reads the result instead of fighting
  // for it (E.7.3 — *"a stale tab renders stale, never writes stale"*).
  const session = updated ?? (await store.findById(live.session_id)) ?? live;
  return {
    outcome: "attached",
    session,
    woke: live.state === "DORMANT" && session.state === "ACTIVE",
    opened: false,
  };
}

/** V.1.2: answering a practice question opens a session with
 *  `origin = 'tool_activity'`. E.5.2: a declaration opens one with
 *  `origin = 'declaration'`. */
export function defaultOriginFor(eventType: string): SessionOrigin {
  return eventType === "EXTERNAL_STUDY_DECLARED" ? "declaration" : "tool_activity";
}

// ═══════════════════════════════════════════════════════════════════════════
// E.7.1 — THE GUARDED TRANSITION
//
// *"Session transitions are server-side and guarded. `ACTIVE → REVIEWING` is a
// conditional update (`WHERE state = 'ACTIVE'`); a second tab's identical
// request affects zero rows and receives the current state instead of an
// error."*
//
// V.1.8 is this function and nothing else: press finish, press it again from a
// stale tab, and the second call returns `{ changed: false, session }` with the
// session in REVIEWING. There is no error path for a stale request, because a
// stale request is not a fault — it is two tabs agreeing.
// ═══════════════════════════════════════════════════════════════════════════

export interface GuardedResult {
  changed: boolean;
  session: SessionRow | null;
  /** Present when nothing changed and the machine says why. Never rendered to
   *  a student — E.2.a — and never an HTTP error. */
  why?: "terminal" | "not_permitted" | "has_evidence" | "lost_race" | "not_found";
}

export async function applyGuarded(
  store: SessionStore,
  sessionId: string,
  action: SessionAction,
  atMs: number,
  expect?: TransitionExpectation,
): Promise<GuardedResult> {
  const current = await store.findById(sessionId);
  if (!current) return { changed: false, session: null, why: "not_found" };

  const decision = applySessionTransition(
    { state: current.state, evidence_event_count: current.evidence_event_count },
    action,
  );

  if (decision.kind === "noop") {
    return { changed: false, session: current, why: decision.why };
  }

  const at = new Date(atMs).toISOString();
  const patch: SessionPatch = { state: decision.to };
  if (decision.touches_activity) patch.last_activity_at = at;
  if (action === "finish_requested") patch.finish_requested_at = at;
  if (decision.closes) {
    patch.closed_at = at;
    patch.close_reason = decision.close_reason;
  }

  const updated = await store.transition(sessionId, decision.from, patch, expect);
  if (updated) return { changed: true, session: updated };

  // Zero rows. Another writer moved first; report where the session actually
  // is. This is the V.1.8 path.
  return { changed: false, session: await store.findById(sessionId), why: "lost_race" };
}

// ═══════════════════════════════════════════════════════════════════════════
// E.3 — *"Tab close, reload, crash: nothing happens … On return, the client
// asks `GET /session/current` and resumes."*
//
// V.1.6 kills the browser and returns on a phone. This is what that call runs,
// and it is a pure read: no device is recorded as owning the session, no
// heartbeat is restarted, nothing is written. The session is the STUDENT's, and
// `device_id` lives on the EVENT (D.1) precisely so the distinction survives
// without fragmenting the unit.
// ═══════════════════════════════════════════════════════════════════════════

export async function currentSession(
  store: SessionStore,
  studentId: string,
): Promise<SessionRow | null> {
  const live = await store.findLive(studentId);
  return live && isLive(live.state) ? live : null;
}

/** For the reaper and for `/session/current`'s diagnostics: how quiet is it? */
export function sessionLiveness(session: SessionRow, nowMs: number) {
  return livenessOf(Date.parse(session.last_activity_at), nowMs);
}
