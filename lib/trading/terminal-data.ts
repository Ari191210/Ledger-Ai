// Everything the terminal renders, assembled as plain data.
//
// The page component stays presentational: it formats what this module
// returns and adds no figures of its own. That separation is what makes the
// terminal's numbers testable — and under §3 of the Product Constitution, a
// number that cannot be checked has no business being printed.
//
// Two categories of figure appear here, and they are kept apart deliberately:
//
//   • ARITHMETIC — what a compounding rule implies. Verifiable, not a
//     forecast, and true regardless of any market. Renders solid.
//   • SIMULATION — output of the engine run against a generated tape. Not a
//     track record, not market data. Renders dashed and labelled, per §8.
//
// There is deliberately no third category. A live trading record would come
// from a broker, and none is connected, so `liveRecord` is null and the
// terminal prints an honest empty state rather than dressing the simulation
// up as one.

import { Paise, SessionResult, rupees, toPaise } from "./types";
import { ChargeBreakdown, chargesForOrder, roundTripCostPct } from "./costs";
import { DEFAULT_KILL_SWITCH, KillSwitchConfig } from "./kill-switch";
import { BacktestReport, backtest } from "./backtest";
import { syntheticTape, DEFAULT_TAPE, TapeConfig } from "./synthetic";
import { FalsificationResult, falsify } from "./falsify";

/** NSE sessions in a typical calendar year, after weekends and holidays. */
export const SESSIONS_PER_YEAR = 250;

export interface MandateArithmetic {
  /** Required return per session, as a fraction. */
  target: number;
  sessionsPerYear: number;
  /** (1 + target) ^ sessionsPerYear. */
  yearMultiple: number;
  startingCapital: Paise;
  /** Capital after one year at the target. Rupees, not paise — it overflows. */
  impliedCapitalAfterYear: number;
  /** Sessions until the target turns the starting capital into ₹1 crore. */
  sessionsToOneCrore: number;
}

/**
 * What the daily target implies when compounded. This is arithmetic on the
 * configured rule, not a projection of the agent's performance.
 */
export function mandateArithmetic(
  target: number,
  startingCapital: Paise,
  sessionsPerYear: number = SESSIONS_PER_YEAR,
): MandateArithmetic {
  const start = rupees(startingCapital);
  const yearMultiple = Math.pow(1 + target, sessionsPerYear);
  const sessionsToOneCrore =
    target > 0 ? Math.ceil(Math.log(10_000_000 / start) / Math.log(1 + target)) : Infinity;

  return {
    target,
    sessionsPerYear,
    yearMultiple,
    startingCapital,
    impliedCapitalAfterYear: start * yearMultiple,
    sessionsToOneCrore: Math.max(sessionsToOneCrore, 0),
  };
}

export interface CostLine {
  label: string;
  /** Rupees on the modelled turnover. */
  amount: number;
  note: string;
}

export interface CostModel {
  /** Turnover per leg, in rupees, the table is computed on. */
  turnoverPerLeg: number;
  buy: ChargeBreakdown;
  sell: ChargeBreakdown;
  lines: CostLine[];
  totalRoundTrip: number;
  roundTripPct: number;
  /**
   * Gross session return needed to net the target after `trades` round
   * trips of friction.
   */
  grossNeededForTarget: number;
}

export function costModel(turnoverPerLeg: number, target: number, tradesPerSession = 4): CostModel {
  const buy = chargesForOrder(turnoverPerLeg, "BUY");
  const sell = chargesForOrder(turnoverPerLeg, "SELL");
  const roundTripPct = roundTripCostPct(turnoverPerLeg);

  const lines: CostLine[] = [
    { label: "Brokerage", amount: rupees(buy.brokerage + sell.brokerage), note: "both legs, capped at ₹20 per order" },
    { label: "STT", amount: rupees(sell.stt), note: "sell leg only" },
    { label: "Stamp duty", amount: rupees(buy.stamp), note: "buy leg only" },
    { label: "Exchange transaction", amount: rupees(buy.exchangeTxn + sell.exchangeTxn), note: "both legs" },
    { label: "SEBI turnover fee", amount: rupees(buy.sebi + sell.sebi), note: "both legs" },
    { label: "Investor protection fund", amount: rupees(buy.ipft + sell.ipft), note: "both legs" },
    { label: "GST", amount: rupees(buy.gst + sell.gst), note: "18% on brokerage and exchange charges" },
  ];

  return {
    turnoverPerLeg,
    buy,
    sell,
    lines,
    totalRoundTrip: rupees(buy.total + sell.total),
    roundTripPct,
    grossNeededForTarget: target + roundTripPct * tradesPerSession,
  };
}

export interface EquityPoint {
  /** Session ordinal, 1-based. Sessions, not calendar dates — see §8.7. */
  session: number;
  value: number;
}

export interface SimulationSummary {
  report: BacktestReport;
  equity: EquityPoint[];
  best: SessionResult | null;
  worst: SessionResult | null;
  /** Median session return, as a fraction. */
  medianReturn: number;
  /** Sessions that met the target. */
  sessionsAtTarget: number;
  tape: TapeConfig;
}

export function summarise(
  report: BacktestReport,
  target: number,
  tape: TapeConfig,
): SimulationSummary {
  const sorted = [...report.sessions].sort((a, b) => a.returnPct - b.returnPct);
  const mid = Math.floor(sorted.length / 2);
  const medianReturn = sorted.length
    ? sorted.length % 2
      ? sorted[mid].returnPct
      : (sorted[mid - 1].returnPct + sorted[mid].returnPct) / 2
    : 0;

  return {
    report,
    equity: [
      { session: 0, value: rupees(report.startingEquity) },
      ...report.sessions.map((s, i) => ({ session: i + 1, value: rupees(s.closingEquity) })),
    ],
    best: sorted.length ? sorted[sorted.length - 1] : null,
    worst: sorted.length ? sorted[0] : null,
    medianReturn,
    sessionsAtTarget: report.sessions.filter((s) => s.returnPct >= target).length,
    tape,
  };
}

export interface TerminalReport {
  killSwitch: KillSwitchConfig;
  startingCapital: Paise;
  mandate: MandateArithmetic;
  costs: CostModel;
  /** The mandate as configured — the agent destroys itself on a miss. */
  underMandate: SimulationSummary;
  /** The same tape with the target rule disabled, so the run completes. */
  unconstrained: SimulationSummary;
  /**
   * Whether the strategy's return separates from random entry. Carried on
   * the report because a return printed without it is a number with no
   * claim attached.
   */
  evidence: FalsificationResult;
  /**
   * A real trading record from a connected broker. Always null: no live
   * adapter exists, and the terminal must not imply one does.
   */
  liveRecord: null;
}

/**
 * Build the terminal's full dataset. Deterministic for a given tape config,
 * so the page prerenders to a stable result.
 */
export function buildTerminalReport(
  options: {
    startingCapital?: Paise;
    killSwitch?: Partial<KillSwitchConfig>;
    tape?: Partial<TapeConfig>;
  } = {},
): TerminalReport {
  const startingCapital = options.startingCapital ?? toPaise(100_000);
  const killSwitch: KillSwitchConfig = { ...DEFAULT_KILL_SWITCH, ...options.killSwitch };
  const tape: TapeConfig = { ...DEFAULT_TAPE, ...options.tape };

  const series = [{ symbol: "SYNTH", candles: syntheticTape(tape) }];

  const underMandate = backtest(series, { startingCapital, killSwitch });
  const unconstrained = backtest(series, {
    startingCapital,
    killSwitch: { ...killSwitch, destroyOnTargetMiss: false },
  });

  // Smaller than the default sweep: this runs at build time, and the verdict
  // is stable well below the sample the CLI uses.
  const evidence = falsify({
    tapeSeeds: [11, 23, 42],
    nullTrialsPerTape: 12,
    tape,
  });

  return {
    killSwitch,
    startingCapital,
    evidence,
    mandate: mandateArithmetic(killSwitch.dailyReturnTarget, startingCapital),
    costs: costModel(100_000, killSwitch.dailyReturnTarget),
    underMandate: summarise(underMandate, killSwitch.dailyReturnTarget, tape),
    unconstrained: summarise(unconstrained, killSwitch.dailyReturnTarget, tape),
    liveRecord: null,
  };
}
