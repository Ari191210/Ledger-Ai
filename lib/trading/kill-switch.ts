// The kill switch: the agent's self-destruct mechanism.
//
// Three independent guards, evaluated in severity order. Any one of them
// firing overrides the strategy — there is no code path by which a signal
// reaches a broker while the switch is not RUNNING.
//
//   1. Daily loss limit  → HALTED_FOR_DAY. Flatten, stop, resume tomorrow.
//   2. Max drawdown      → DESTROYED. Peak-to-trough capital protection.
//   3. Daily return target → DESTROYED. The "hit the number or die" rule.
//
// Destruction is intended to be irreversible in software: it writes a
// tombstone, and `assertAlive` refuses to start an agent that has one. A
// human has to delete the tombstone deliberately. That asymmetry is the
// point — an automated system should find it easy to stop itself and hard
// to restart itself.

import { Paise, SessionResult, rupees } from "./types";

export type AgentState = "RUNNING" | "HALTED_FOR_DAY" | "DESTROYED";

export type KillReason =
  | "DAILY_LOSS_LIMIT"
  | "MAX_DRAWDOWN"
  | "DAILY_TARGET_MISSED"
  | "MANUAL";

export interface KillSwitchConfig {
  /**
   * Required return per session, as a fraction. 0.10 means +10% per day.
   *
   * Note on what this number implies: 10% compounded across the ~250 NSE
   * sessions in a year is a factor of about 2.4e10. No strategy, fund, or
   * trader has sustained anything close to it — the best long-run record
   * on file averages well under 1% per session. With `graceDays: 0` the
   * agent will therefore destroy itself almost immediately, which is the
   * mechanism working correctly, not a bug.
   */
  dailyReturnTarget: number;
  /** Consecutive target misses tolerated before destruction. */
  graceDays: number;
  /** Set false to keep the drawdown guard but not the target guard. */
  destroyOnTargetMiss: boolean;
  /** Intraday loss that halts trading for the day, as a fraction. */
  maxDailyLossPct: number;
  /** Peak-to-trough equity decline that destroys the agent, as a fraction. */
  maxDrawdownPct: number;
}

export const DEFAULT_KILL_SWITCH: KillSwitchConfig = {
  dailyReturnTarget: 0.1,
  graceDays: 0,
  destroyOnTargetMiss: true,
  maxDailyLossPct: 0.02,
  maxDrawdownPct: 0.1,
};

export interface Tombstone {
  reason: KillReason;
  /** Human-readable explanation, safe to log or display. */
  detail: string;
  /** Epoch milliseconds. */
  destroyedAt: number;
  finalEquity: Paise;
  peakEquity: Paise;
  sessionsSurvived: number;
}

export interface KillSwitchState {
  state: AgentState;
  /** Highest equity ever recorded, in paise. Never decreases. */
  peakEquity: Paise;
  /** Equity at the start of the current session, in paise. */
  sessionOpeningEquity: Paise;
  consecutiveMisses: number;
  sessionsSurvived: number;
  tombstone?: Tombstone;
}

export function initKillSwitch(startingEquity: Paise): KillSwitchState {
  if (!Number.isFinite(startingEquity) || startingEquity <= 0) {
    throw new RangeError(`startingEquity must be positive, got ${startingEquity}`);
  }
  return {
    state: "RUNNING",
    peakEquity: startingEquity,
    sessionOpeningEquity: startingEquity,
    consecutiveMisses: 0,
    sessionsSurvived: 0,
  };
}

/** Thrown by `assertAlive`. Carries the tombstone for logging. */
export class AgentDestroyedError extends Error {
  constructor(readonly tombstone: Tombstone) {
    super(`Agent destroyed (${tombstone.reason}): ${tombstone.detail}`);
    this.name = "AgentDestroyedError";
  }
}

/**
 * Gate every startup and every order on this. It throws if the agent has
 * been destroyed, which is what makes destruction meaningful rather than
 * advisory.
 */
export function assertAlive(state: KillSwitchState): void {
  if (state.state === "DESTROYED") {
    throw new AgentDestroyedError(
      state.tombstone ?? {
        reason: "MANUAL",
        detail: "destroyed without a recorded tombstone",
        destroyedAt: Date.now(),
        finalEquity: state.peakEquity,
        peakEquity: state.peakEquity,
        sessionsSurvived: state.sessionsSurvived,
      },
    );
  }
}

/** True only when the agent may place new orders right now. */
export function canTrade(state: KillSwitchState): boolean {
  return state.state === "RUNNING";
}

function destroy(
  state: KillSwitchState,
  reason: KillReason,
  detail: string,
  finalEquity: Paise,
  now: number,
): KillSwitchState {
  return {
    ...state,
    state: "DESTROYED",
    tombstone: {
      reason,
      detail,
      destroyedAt: now,
      finalEquity,
      peakEquity: state.peakEquity,
      sessionsSurvived: state.sessionsSurvived,
    },
  };
}

/**
 * Evaluate the intraday guards. Call this on every equity update during a
 * session — it is what stops a bad day from becoming a terminal one.
 */
export function onEquityTick(
  state: KillSwitchState,
  equity: Paise,
  config: KillSwitchConfig,
  now: number = Date.now(),
): KillSwitchState {
  if (state.state === "DESTROYED") return state;

  const peakEquity = Math.max(state.peakEquity, equity);
  const next = { ...state, peakEquity };

  const drawdown = (peakEquity - equity) / peakEquity;
  if (drawdown >= config.maxDrawdownPct) {
    return destroy(
      next,
      "MAX_DRAWDOWN",
      `drawdown ${(drawdown * 100).toFixed(2)}% breached the ${(
        config.maxDrawdownPct * 100
      ).toFixed(2)}% limit (peak ₹${rupees(peakEquity).toFixed(2)}, now ₹${rupees(
        equity,
      ).toFixed(2)})`,
      equity,
      now,
    );
  }

  // Already halted for the day: the drawdown check above still applies, but
  // the daily-loss check should not re-fire.
  if (next.state === "HALTED_FOR_DAY") return next;

  const sessionLoss =
    (next.sessionOpeningEquity - equity) / next.sessionOpeningEquity;
  if (sessionLoss >= config.maxDailyLossPct) {
    return { ...next, state: "HALTED_FOR_DAY" };
  }

  return next;
}

export interface SessionVerdict {
  state: KillSwitchState;
  /** True when this session met or beat the configured target. */
  hitTarget: boolean;
  session: SessionResult;
}

/**
 * Evaluate the end-of-session target guard and roll state into the next
 * session. This is where the 10%-or-die rule is enforced.
 */
export function onSessionClose(
  state: KillSwitchState,
  session: SessionResult,
  config: KillSwitchConfig,
  now: number = Date.now(),
): SessionVerdict {
  if (state.state === "DESTROYED") {
    return { state, hitTarget: false, session };
  }

  const hitTarget = session.returnPct >= config.dailyReturnTarget;
  const peakEquity = Math.max(state.peakEquity, session.closingEquity);
  const consecutiveMisses = hitTarget ? 0 : state.consecutiveMisses + 1;
  const sessionsSurvived = state.sessionsSurvived + 1;

  let next: KillSwitchState = {
    ...state,
    peakEquity,
    consecutiveMisses,
    sessionsSurvived,
    // A new session clears an intraday halt.
    state: "RUNNING",
    sessionOpeningEquity: session.closingEquity,
  };

  if (
    config.destroyOnTargetMiss &&
    !hitTarget &&
    consecutiveMisses > config.graceDays
  ) {
    next = destroy(
      next,
      "DAILY_TARGET_MISSED",
      `returned ${(session.returnPct * 100).toFixed(2)}% on ${session.date}, ` +
        `below the ${(config.dailyReturnTarget * 100).toFixed(2)}% daily target, ` +
        `for ${consecutiveMisses} consecutive session(s) against a grace of ${config.graceDays}`,
      session.closingEquity,
      now,
    );
  }

  return { state: next, hitTarget, session };
}
