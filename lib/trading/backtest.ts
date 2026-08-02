// Backtest engine: drives strategy → risk → broker → kill switch over
// historical candles, one NSE session at a time.
//
// Two rules keep the results honest:
//
//   1. No lookahead. A signal computed on bar n's close is filled at bar
//      n+1's open, which is the earliest price a live agent could get.
//   2. Stops fill at the worse of the stop and the bar's open, so a gap
//      through the stop costs what it would cost in reality.
//
// The engine stops the moment the kill switch destroys the agent. Sessions
// after that point are not simulated, because there would be no agent.

import { Candle, Paise, SessionResult, toPaise, rupees } from "./types";
import { PaperBroker, PaperBrokerConfig } from "./paper-broker";
import { DEFAULT_RISK, RiskConfig, equityOf, sizePosition } from "./risk";
import { DEFAULT_STRATEGY, StrategyConfig, StrategyContext, evaluate } from "./strategy";
import {
  DEFAULT_KILL_SWITCH,
  KillSwitchConfig,
  KillSwitchState,
  canTrade,
  initKillSwitch,
  onEquityTick,
  onSessionClose,
} from "./kill-switch";
import { istDate, isPastSquareOff } from "./market-calendar";
import { Signal } from "./types";

export interface SymbolSeries {
  symbol: string;
  /** Intraday candles, oldest first, any uniform interval. */
  candles: readonly Candle[];
  lotSize?: number;
}

/** A decision rule. Injectable so the engine can be run against a null. */
export type SignalFn = (ctx: StrategyContext) => Signal;

export interface BacktestConfig {
  startingCapital: Paise;
  strategy: StrategyConfig;
  /**
   * Overrides the strategy. Exists so falsify.ts can drive this same engine
   * with a random-entry rule — the comparison is only fair if both run
   * through identical sizing, costs, slippage and square-off.
   */
  signal?: SignalFn;
  risk: RiskConfig;
  killSwitch: KillSwitchConfig;
  broker: Partial<PaperBrokerConfig>;
}

export const DEFAULT_BACKTEST: BacktestConfig = {
  startingCapital: toPaise(100_000),
  strategy: DEFAULT_STRATEGY,
  risk: DEFAULT_RISK,
  killSwitch: DEFAULT_KILL_SWITCH,
  broker: {},
};

export interface BacktestReport {
  sessions: SessionResult[];
  /** Positions opened. The quantity a null model has to match. */
  entries: number;
  startingEquity: Paise;
  finalEquity: Paise;
  totalReturnPct: number;
  totalCharges: Paise;
  trades: number;
  /** Fraction of simulated sessions that met the daily target. */
  targetHitRate: number;
  killSwitch: KillSwitchState;
  /** IST date the agent was destroyed, if it was. */
  destroyedOn?: string;
}

interface SymbolState {
  symbol: string;
  lotSize: number;
  history: Candle[];
  pending: Signal | null;
}

export function backtest(
  series: readonly SymbolSeries[],
  overrides: Partial<BacktestConfig> = {},
): BacktestReport {
  const config: BacktestConfig = { ...DEFAULT_BACKTEST, ...overrides };
  const decide: SignalFn =
    config.signal ?? ((ctx) => evaluate(ctx, config.strategy));
  const broker = new PaperBroker(config.startingCapital, config.broker);
  let killSwitch = initKillSwitch(config.startingCapital);

  const states = new Map<string, SymbolState>();
  const byTime = new Map<number, { symbol: string; candle: Candle }[]>();

  for (const entry of series) {
    states.set(entry.symbol, {
      symbol: entry.symbol,
      lotSize: entry.lotSize ?? 1,
      history: [],
      pending: null,
    });
    for (const candle of entry.candles) {
      const bucket = byTime.get(candle.time);
      if (bucket) bucket.push({ symbol: entry.symbol, candle });
      else byTime.set(candle.time, [{ symbol: entry.symbol, candle }]);
    }
  }

  const timeline = [...byTime.keys()].sort((a, b) => a - b);
  const sessions: SessionResult[] = [];

  let sessionDate = timeline.length ? istDate(timeline[0]) : "";
  let sessionOpeningEquity = config.startingCapital;
  let sessionCharges = broker.portfolio().charges;
  let sessionTrades = 0;
  let destroyedOn: string | undefined;
  let entries = 0;

  const closeSession = (date: string, at: number): boolean => {
    flattenAll(broker, at);
    const equity = equityOf(broker.portfolio(), broker.marks());
    const result: SessionResult = {
      date,
      openingEquity: sessionOpeningEquity,
      closingEquity: equity,
      returnPct: (equity - sessionOpeningEquity) / sessionOpeningEquity,
      charges: broker.portfolio().charges - sessionCharges,
      trades: sessionTrades,
    };
    sessions.push(result);

    const verdict = onSessionClose(killSwitch, result, config.killSwitch);
    killSwitch = verdict.state;

    sessionOpeningEquity = equity;
    sessionCharges = broker.portfolio().charges;
    sessionTrades = 0;

    if (killSwitch.state === "DESTROYED") {
      destroyedOn = date;
      return false;
    }
    return true;
  };

  for (let t = 0; t < timeline.length; t++) {
    const time = timeline[t];
    const date = istDate(time);
    if (date !== sessionDate) {
      if (!closeSession(sessionDate, timeline[t - 1] ?? time)) break;
      sessionDate = date;
    }

    const bars = byTime.get(time)!;

    // 1. Open of the bar: fill pending entries and check stops.
    for (const { symbol, candle } of bars) {
      const state = states.get(symbol)!;
      broker.setPrice(symbol, candle.open);

      if (checkStop(broker, symbol, candle, time)) sessionTrades++;

      const pending = state.pending;
      state.pending = null;
      if (pending && canTrade(killSwitch)) {
        if (openFromSignal(broker, pending, candle.open, time, state, config, killSwitch)) {
          sessionTrades++;
          entries++;
        }
      }
    }

    // 2. Close of the bar: mark to market, then decide the next action.
    for (const { symbol, candle } of bars) {
      const state = states.get(symbol)!;
      broker.setPrice(symbol, candle.close);
      state.history.push(candle);
    }

    killSwitch = onEquityTick(
      killSwitch,
      equityOf(broker.portfolio(), broker.marks()),
      config.killSwitch,
    );

    if (killSwitch.state === "DESTROYED") {
      flattenAll(broker, time);
      const equity = equityOf(broker.portfolio(), broker.marks());
      sessions.push({
        date,
        openingEquity: sessionOpeningEquity,
        closingEquity: equity,
        returnPct: (equity - sessionOpeningEquity) / sessionOpeningEquity,
        charges: broker.portfolio().charges - sessionCharges,
        trades: sessionTrades,
      });
      destroyedOn = date;
      break;
    }

    if (killSwitch.state === "HALTED_FOR_DAY") {
      flattenAll(broker, time);
      continue;
    }

    for (const { symbol, candle } of bars) {
      const state = states.get(symbol)!;
      const position = broker.position(symbol);
      const signal = decide({
        symbol,
        candles: state.history,
        inPosition: !!position && position.quantity !== 0,
      });

      if (signal.kind === "EXIT" && position) {
        flatten(broker, symbol, candle.close, time);
        sessionTrades++;
      } else if (
        (signal.kind === "ENTER_LONG" || signal.kind === "ENTER_SHORT") &&
        !isPastSquareOff(candle.time)
      ) {
        state.pending = signal;
      }
    }
  }

  if (sessionDate && sessions[sessions.length - 1]?.date !== sessionDate && timeline.length) {
    closeSession(sessionDate, timeline[timeline.length - 1]);
  }

  const finalEquity = equityOf(broker.portfolio(), broker.marks());
  const hits = sessions.filter(
    (s) => s.returnPct >= config.killSwitch.dailyReturnTarget,
  ).length;

  return {
    sessions,
    entries,
    startingEquity: config.startingCapital,
    finalEquity,
    totalReturnPct: (finalEquity - config.startingCapital) / config.startingCapital,
    totalCharges: broker.portfolio().charges,
    trades: broker.fills.length,
    targetHitRate: sessions.length ? hits / sessions.length : 0,
    killSwitch,
    destroyedOn,
  };
}

/** Exit at the stop if the bar traded through it. Returns true if it fired. */
function checkStop(broker: PaperBroker, symbol: string, candle: Candle, time: number): boolean {
  const position = broker.position(symbol);
  if (!position || position.quantity === 0 || position.stop === undefined) return false;

  const long = position.quantity > 0;
  const hit = long ? candle.low <= position.stop : candle.high >= position.stop;
  if (!hit) return false;

  // A gap through the stop fills at the open, not at the stop.
  const fillPrice = long
    ? Math.min(position.stop, candle.open)
    : Math.max(position.stop, candle.open);

  broker.setPrice(symbol, fillPrice);
  broker.marketOrder(symbol, long ? "SELL" : "BUY", Math.abs(position.quantity), time);
  return true;
}

function openFromSignal(
  broker: PaperBroker,
  signal: Signal,
  fillPrice: number,
  time: number,
  state: SymbolState,
  config: BacktestConfig,
  killSwitch: KillSwitchState,
): boolean {
  if (!canTrade(killSwitch)) return false;

  const side = signal.kind === "ENTER_LONG" ? "LONG" : "SHORT";
  const portfolio = broker.portfolio();
  const sizing = sizePosition(
    {
      symbol: signal.symbol,
      side,
      entry: fillPrice,
      // Shift the stop by the gap between signal and fill so the risk
      // budget still describes the distance actually being risked.
      stop: signal.stop === undefined ? undefined : signal.stop + (fillPrice - signal.price),
      equity: equityOf(portfolio, broker.marks()),
      portfolio,
      lotSize: state.lotSize,
      // A signal with no assessment (a custom SignalFn that doesn't build
      // one) sizes at sizePosition's own default rather than at zero — see
      // that default's docstring in lib/trading/risk.ts.
      confidence: signal.assessment?.confidence,
    },
    config.risk,
  );

  if (!sizing.ok) return false;

  broker.marketOrder(signal.symbol, side === "LONG" ? "BUY" : "SELL", sizing.quantity, time);
  const stop = signal.stop! + (fillPrice - signal.price);
  broker.setStop(signal.symbol, stop);
  return true;
}

function flatten(broker: PaperBroker, symbol: string, price: number, time: number): void {
  const position = broker.position(symbol);
  if (!position || position.quantity === 0) return;
  broker.setPrice(symbol, price);
  broker.marketOrder(symbol, position.quantity > 0 ? "SELL" : "BUY", Math.abs(position.quantity), time);
}

function flattenAll(broker: PaperBroker, time: number): void {
  const marks = broker.marks();
  for (const position of [...broker.portfolio().positions.values()]) {
    const price = marks.get(position.symbol) ?? position.averagePrice;
    flatten(broker, position.symbol, price, time);
  }
}

/** Format a report for a terminal. */
export function formatReport(report: BacktestReport): string {
  const lines: string[] = [];
  const pct = (x: number) => `${(x * 100).toFixed(2)}%`;

  lines.push(`Sessions simulated : ${report.sessions.length}`);
  lines.push(`Starting capital   : ₹${rupees(report.startingEquity).toLocaleString("en-IN")}`);
  lines.push(`Final equity       : ₹${rupees(report.finalEquity).toLocaleString("en-IN")}`);
  lines.push(`Total return       : ${pct(report.totalReturnPct)}`);
  lines.push(`Charges paid       : ₹${rupees(report.totalCharges).toFixed(2)}`);
  lines.push(`Orders filled      : ${report.trades}`);
  lines.push(`Daily target hit   : ${pct(report.targetHitRate)} of sessions`);
  lines.push(`Agent state        : ${report.killSwitch.state}`);

  const tombstone = report.killSwitch.tombstone;
  if (tombstone) {
    lines.push("");
    lines.push(`DESTROYED on ${report.destroyedOn} — ${tombstone.reason}`);
    lines.push(`  ${tombstone.detail}`);
    lines.push(`  survived ${tombstone.sessionsSurvived} session(s)`);
  }

  return lines.join("\n");
}
