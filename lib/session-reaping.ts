// ═══════════════════════════════════════════════════════════════════════════
// M9-1 — REAPING. The half of the state machine that no student triggers.
//
// EXECUTION_PLAN M9-1's done-when: *"reaping produces `CLOSED_UNVERIFIED`, THE
// SCORE DOES NOT FALL, and NOTHING SHAMES."* V.1.7: *"Leaves for 25 hours (>
// REAP_HOURS). `CLOSED_UNVERIFIED`, with `reason = 'reaped'`. The score does not
// fall. No notification shames."*
//
// Pure planner, adapter-driven runner — the `lib/event-compaction.ts` (M7-7)
// shape, and NOT SCHEDULED for the reason M7-7 states: `vercel.json` is at the
// Hobby cron cap, and scheduling a sweep before any session exists would make
// the first real run also the first tested run of the close path. The logic is
// real, tested code; wiring it to a clock is one line in `vercel.json` or one
// step in the GitHub Actions job, and it is named in the milestone report.
//
//
// THE THREE THINGS THIS FILE MUST NOT DO, AND HOW EACH IS PREVENTED
//
//   1. IT MUST NOT LOWER A SCORE. It cannot: the only state it writes is
//      CLOSED_UNVERIFIED, and `sessionScoreContribution('CLOSED_UNVERIFIED')`
//      is `{ kind: 'none' }` — an arm with no sign and no magnitude. See
//      SESSION_SCORE_CONTRACT in `lib/study-session.ts`, addressed to M14.
//
//   2. IT MUST NOT NOTIFY. This module imports nothing from `lib/notifications.ts`
//      or `lib/push.ts`, and neither does its route. M0-6 deleted the last
//      loss-framed send in this product ("your streak is at risk"); a
//      "you left a session open" push is the same message wearing a new noun.
//      A test asserts the absence of both imports, in both files.
//
//   3. IT MUST NOT WRITE AN AUDIT ENTRY. `016`'s own footnote: *"entries for
//      actions no one observed would be fabrication (Law 7)"*, and
//      `AUDIT_ACTIONS` is a closed set mirrored by a CHECK constraint — there
//      is no `session_reaped` action and adding one would mean editing an M7
//      file and an applied-migration mirror. The reap's record is the
//      `SESSION_CLOSED_UNVERIFIED` academic event, which is where a session's
//      history belongs (B.3: *"the event stream wins on any disagreement"*).
//
//
// WHY A QUIET `ACTIVE` SESSION IS CLOSED IN TWO STEPS
//
// E.2 draws the reap edge from DORMANT only. A session quiet for 25 hours is
// also quiet for 45 minutes, so the plan for it is [idle_elapsed, reap_elapsed]
// — ACTIVE → DORMANT → CLOSED_UNVERIFIED — and the machine E.2 draws is walked
// rather than short-circuited. The intermediate DORMANT is not cosmetic: it is
// the state the student was actually in for the 24 hours before the sweep ran,
// and a projection replaying the stream must be able to say so.
//
// No imports beyond `./study-session` and `./session-resolver`. No clock.
// ═══════════════════════════════════════════════════════════════════════════

import {
  IDLE_MS,
  REAP_MS,
  isTerminal,
  livenessOf,
  type SessionAction,
  type SessionState,
} from "./study-session";
import { applyGuarded, type SessionRow, type SessionStore } from "./session-resolver";

/** One session's plan: the ordered actions the sweep will apply to it. */
export interface ReapPlan {
  session_id: string;
  student_id: string;
  from: SessionState;
  /** In order. Empty means "leave it alone", and most sessions get that. */
  actions: SessionAction[];
  /** For the report. Quiet time in ms at the moment the sweep read the row. */
  quiet_ms: number;
  /**
   * The `last_activity_at` the sweep DECIDED AGAINST, carried into the WHERE
   * clause of every write this plan makes.
   *
   * Guarding on `state` alone is not enough here, and the case that proves it
   * is the one that matters most: a student answers a question between the
   * sweep's read and its write. Their event leaves the session ACTIVE with a
   * new `last_activity_at`, so a `WHERE state = 'ACTIVE'` update would still
   * match — and would put to sleep, then close, a session the student is
   * sitting in. Matching the exact activity timestamp the decision was made
   * from turns that into zero rows. See `TransitionExpectation`.
   */
  expect_last_activity_at: string;
}

/**
 * The whole decision, pure. Takes `nowMs`; owns no clock.
 *
 * Deliberately total over the live states rather than special-cased to DORMANT:
 * REVIEWING and ASSESSING are live, the partial unique index permits exactly
 * one live session per student, and a student who closed their laptop on the
 * review screen would otherwise be locked out of ever opening another session.
 * Both reuse the CLOSED_UNVERIFIED edge E.2 already draws from those states,
 * with `reason = 'reaped'`. Argued at length in `lib/study-session.ts`'s
 * TRANSITIONS comment, where the edges themselves live.
 */
export function planReaping(sessions: readonly SessionRow[], nowMs: number): ReapPlan[] {
  const plans: ReapPlan[] = [];

  for (const s of sessions) {
    if (isTerminal(s.state)) continue;

    const lastMs = Date.parse(s.last_activity_at);
    const quiet = Number.isNaN(lastMs) ? 0 : nowMs - lastMs;
    const liveness = Number.isNaN(lastMs) ? "fresh" : livenessOf(lastMs, nowMs);

    if (liveness === "fresh") continue;

    const actions: SessionAction[] = [];

    if (liveness === "idle") {
      // Only ACTIVE has an `idle_elapsed` edge. A REVIEWING session that has
      // been quiet for an hour is a student reading the review screen, and
      // there is no state for that between REVIEWING and closed.
      if (s.state === "ACTIVE") actions.push("idle_elapsed");
    } else {
      if (s.state === "ACTIVE") actions.push("idle_elapsed");
      actions.push("reap_elapsed");
    }

    if (actions.length > 0) {
      plans.push({
        session_id: s.session_id,
        student_id: s.student_id,
        from: s.state,
        actions,
        quiet_ms: quiet,
        expect_last_activity_at: s.last_activity_at,
      });
    }
  }

  return plans;
}

export interface ReapReport {
  planned: number;
  idled: number;
  reaped: number;
  unchanged: number;
  /** Every session the sweep actually closed, so the caller can emit one
   *  `SESSION_CLOSED_UNVERIFIED` event each. Facts only — no message field
   *  (E.8.a), and no field a model could fill. */
  closed: { session_id: string; student_id: string; quiet_ms: number }[];
  idle_ms: number;
  reap_ms: number;
}

/**
 * Apply a plan through the same guarded transition every other writer uses.
 *
 * It does NOT bypass `applyGuarded`, which matters more than it looks: a sweep
 * with its own UPDATE would be a second implementation of the state machine,
 * and the one thing worse than a session closing early is two closing rules
 * disagreeing about when.
 *
 * A session that a student woke between the read and the write simply fails its
 * conditional update, counts as `unchanged`, and is left alone. The student
 * wins the race, every time, by construction — and the guard that makes that
 * true is `expect_last_activity_at`, not `state`: waking an ACTIVE session
 * leaves it ACTIVE, so a state-only WHERE clause would match and close a
 * session the student was sitting in.
 */
export async function runReaping(
  store: SessionStore,
  sessions: readonly SessionRow[],
  nowMs: number,
): Promise<ReapReport> {
  const plans = planReaping(sessions, nowMs);
  const report: ReapReport = {
    planned: plans.length,
    idled: 0,
    reaped: 0,
    unchanged: 0,
    closed: [],
    idle_ms: IDLE_MS,
    reap_ms: REAP_MS,
  };

  for (const plan of plans) {
    let advanced = false;

    for (const action of plan.actions) {
      const result = await applyGuarded(store, plan.session_id, action, nowMs, {
        last_activity_at: plan.expect_last_activity_at,
      });
      if (!result.changed) break;
      advanced = true;

      if (action === "idle_elapsed") report.idled += 1;
      if (action === "reap_elapsed" && result.session?.state === "CLOSED_UNVERIFIED") {
        report.reaped += 1;
        report.closed.push({
          session_id: plan.session_id,
          student_id: plan.student_id,
          quiet_ms: plan.quiet_ms,
        });
      }
    }

    if (!advanced) report.unchanged += 1;
  }

  return report;
}
