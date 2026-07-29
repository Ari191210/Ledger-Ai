// The guard: enforcement for the kill switch.
//
// kill-switch.ts is a pure state machine — it decides. This module makes the
// decision binding. The distinction matters, because the version of this
// system without a guard had two holes that made destruction advisory:
//
//   1. STATE WAS IN MEMORY. `initKillSwitch` built fresh state on every run,
//      so a destroyed agent came back alive on the next process start. The
//      tombstone never survived the thing it was meant to outlive.
//
//   2. ENFORCEMENT LIVED IN THE ORCHESTRATOR. The backtest loop checked
//      `canTrade` before entering, but the broker accepted any order it was
//      handed. Anything holding a Broker reference could trade straight past
//      a destroyed switch.
//
// So the guard persists the tombstone through a store, and sits at the
// broker's order path rather than above it. A destroyed agent cannot open a
// position even if every layer above the broker is bypassed or buggy.
//
// WHAT THIS CANNOT DO: none of it makes the agent profitable. A rule that
// destroys the agent unless it earns a return does not produce the return —
// it only guarantees the destruction is real when the return does not arrive.

import { Paise, SessionResult } from "./types";
import {
  AgentDestroyedError,
  KillSwitchConfig,
  KillSwitchState,
  Tombstone,
  initKillSwitch,
  onEquityTick,
  onSessionClose,
} from "./kill-switch";

/* ── Configuration validation ─────────────────────────────────────────────
   A misconfigured switch is a switch that does not fire. These bounds are
   checked once, loudly, at construction — not silently clamped, because a
   silently corrected limit is a limit the operator does not know they have. */

export class InvalidKillSwitchConfig extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid kill switch configuration:\n  - ${problems.join("\n  - ")}`);
    this.name = "InvalidKillSwitchConfig";
  }
}

export function validateKillSwitchConfig(config: KillSwitchConfig): string[] {
  const problems: string[] = [];
  const finite = (n: number) => Number.isFinite(n);

  if (!finite(config.dailyReturnTarget)) {
    problems.push("dailyReturnTarget must be a finite number");
  }
  if (!finite(config.maxDailyLossPct) || config.maxDailyLossPct <= 0) {
    problems.push("maxDailyLossPct must be greater than 0");
  } else if (config.maxDailyLossPct > 1) {
    problems.push("maxDailyLossPct above 1 can never fire — it exceeds total capital");
  }
  if (!finite(config.maxDrawdownPct) || config.maxDrawdownPct <= 0) {
    problems.push("maxDrawdownPct must be greater than 0");
  } else if (config.maxDrawdownPct > 1) {
    problems.push("maxDrawdownPct above 1 can never fire — it exceeds total capital");
  }
  if (!Number.isInteger(config.graceDays) || config.graceDays < 0) {
    problems.push("graceDays must be a non-negative integer");
  }
  return problems;
}

export function assertValidKillSwitchConfig(config: KillSwitchConfig): void {
  const problems = validateKillSwitchConfig(config);
  if (problems.length) throw new InvalidKillSwitchConfig(problems);
}

/* ── Tombstone persistence ────────────────────────────────────────────── */

/**
 * Where a tombstone outlives the process.
 *
 * Deliberately an interface. The file-backed implementation lives in
 * tombstone-file.ts so that `node:fs` never reaches a browser bundle, and a
 * production deployment on a read-only filesystem would back this with a
 * database row instead. What matters is that `read` is consulted before the
 * first order and `write` is durable.
 */
export interface TombstoneStore {
  read(): Tombstone | null;
  write(tombstone: Tombstone): void;
}

/** In-process store. Correct for tests and backtests, useless for restarts. */
export class MemoryTombstoneStore implements TombstoneStore {
  private tombstone: Tombstone | null = null;

  read(): Tombstone | null {
    return this.tombstone;
  }

  write(tombstone: Tombstone): void {
    // First writer wins. A second destruction must not overwrite the reason
    // the agent originally died.
    if (this.tombstone === null) this.tombstone = tombstone;
  }
}

/* ── The guard ────────────────────────────────────────────────────────── */

export interface GuardOptions {
  config: KillSwitchConfig;
  startingEquity: Paise;
  store?: TombstoneStore;
  /** Injectable for tests. Defaults to Date.now. */
  now?: () => number;
}

/**
 * Stateful wrapper around the kill switch that persists destruction and
 * refuses to hand out permission once it has happened.
 */
export class TradingGuard {
  private switchState: KillSwitchState;
  private readonly store: TombstoneStore;
  private readonly config: KillSwitchConfig;
  private readonly now: () => number;

  constructor(options: GuardOptions) {
    assertValidKillSwitchConfig(options.config);

    this.config = options.config;
    this.store = options.store ?? new MemoryTombstoneStore();
    this.now = options.now ?? (() => Date.now());
    this.switchState = initKillSwitch(options.startingEquity);

    // A tombstone found at construction means this agent already died in a
    // previous life. It does not get a fresh start.
    const existing = this.store.read();
    if (existing) {
      this.switchState = {
        ...this.switchState,
        state: "DESTROYED",
        tombstone: existing,
        sessionsSurvived: existing.sessionsSurvived,
        peakEquity: existing.peakEquity,
      };
    }
  }

  get state(): KillSwitchState {
    return this.switchState;
  }

  get tombstone(): Tombstone | undefined {
    return this.switchState.tombstone;
  }

  /** True only when the agent may open new risk right now. */
  canOpen(): boolean {
    return this.switchState.state === "RUNNING";
  }

  /**
   * Gate for opening a position. Throws when the agent is destroyed, returns
   * false when it is merely halted for the session.
   *
   * The asymmetry is deliberate: a halt is an ordinary daily event that
   * callers handle, destruction is terminal and should not be silently
   * swallowed by a caller that forgot to check a boolean.
   */
  assertMayOpen(): boolean {
    if (this.switchState.state === "DESTROYED") {
      throw new AgentDestroyedError(
        this.switchState.tombstone ?? {
          reason: "MANUAL",
          detail: "destroyed without a recorded tombstone",
          destroyedAt: this.now(),
          finalEquity: this.switchState.peakEquity,
          peakEquity: this.switchState.peakEquity,
          sessionsSurvived: this.switchState.sessionsSurvived,
        },
      );
    }
    return this.switchState.state === "RUNNING";
  }

  /** Feed the current equity. Fires the intraday guards. */
  markEquity(equity: Paise): KillSwitchState {
    if (this.switchState.state === "DESTROYED") return this.switchState;
    this.switchState = onEquityTick(this.switchState, equity, this.config, this.now());
    this.persistIfDestroyed();
    return this.switchState;
  }

  /** Close a session. Fires the target guard. */
  closeSession(session: SessionResult): KillSwitchState {
    if (this.switchState.state === "DESTROYED") return this.switchState;
    this.switchState = onSessionClose(
      this.switchState,
      session,
      this.config,
      this.now(),
    ).state;
    this.persistIfDestroyed();
    return this.switchState;
  }

  /** Operator stop. Recorded like any other destruction. */
  destroyManually(detail: string, finalEquity: Paise): KillSwitchState {
    if (this.switchState.state === "DESTROYED") return this.switchState;
    this.switchState = {
      ...this.switchState,
      state: "DESTROYED",
      tombstone: {
        reason: "MANUAL",
        detail,
        destroyedAt: this.now(),
        finalEquity,
        peakEquity: this.switchState.peakEquity,
        sessionsSurvived: this.switchState.sessionsSurvived,
      },
    };
    this.persistIfDestroyed();
    return this.switchState;
  }

  private persistIfDestroyed(): void {
    if (this.switchState.state === "DESTROYED" && this.switchState.tombstone) {
      this.store.write(this.switchState.tombstone);
    }
  }
}
