// Falsification: try to prove the strategy has no edge.
//
// Every other module in lib/trading measures what the strategy did. This one
// asks whether that number means anything, which is a different question and
// the more important one.
//
// THE NULL. A random-entry rule, matched to the strategy on the things that
// are not the edge: the same number of positions, the same ATR stop, the same
// square-off, and the same sizing, costs, slippage and broker. It differs
// only in *when* it decides to enter. If the strategy cannot beat that, the
// timing — which is the entire claim — is worth nothing.
//
// Matching the trade count matters. A rule that trades twice as often pays
// twice the friction, and a comparison that let the counts drift would be
// measuring transaction costs rather than skill.
//
// THE SPREAD. The strategy is run across several independent tapes, not one.
// Reporting a single path is selection bias: with one seed you are quoting a
// sample of size one and calling it a result.
//
// WHAT THE p-VALUE IS. The fraction of null runs that did at least as well as
// the strategy's mean. It is not the probability the strategy is worthless.
// It is: if entry timing were pure noise, this is how often noise would look
// this good. A high value means the evidence does not separate the strategy
// from chance — which is not the same as proving it has no edge, and the
// verdict below is worded to keep that distinction.

import { Candle, Signal } from "./types";
import { StrategyContext, atr } from "./strategy";
import { BacktestConfig, SignalFn, backtest } from "./backtest";
import { DEFAULT_KILL_SWITCH } from "./kill-switch";
import { DEFAULT_TAPE, TapeConfig, mulberry32, syntheticTape } from "./synthetic";
import { isPastSquareOff } from "./market-calendar";

export interface FalsifyConfig {
  /** Independent tapes. More paths, less selection bias. */
  tapeSeeds: number[];
  /** Null runs per tape. */
  nullTrialsPerTape: number;
  tape: Partial<TapeConfig>;
  backtest: Partial<BacktestConfig>;
  /** Threshold below which the null is rejected. */
  alpha: number;
  /** Bars of history before the null may fire, so ATR is seeded. */
  warmupBars: number;
}

export const DEFAULT_FALSIFY: FalsifyConfig = {
  tapeSeeds: [11, 23, 42, 57, 88],
  nullTrialsPerTape: 25,
  tape: {},
  backtest: {},
  alpha: 0.05,
  warmupBars: 20,
};

/**
 * A random-entry rule. Fires with probability `rate` per eligible bar and
 * picks its direction by coin flip, then defers to the same ATR stop and the
 * same square-off the strategy uses.
 */
export function randomEntrySignal(
  rate: number,
  seed: number,
  atrPeriod: number,
  atrStopMultiple: number,
  warmupBars: number,
): SignalFn {
  const rand = mulberry32(seed);

  return (ctx: StrategyContext): Signal => {
    const { candles, symbol } = ctx;
    const current = candles[candles.length - 1];
    if (!current) return { kind: "HOLD", symbol, price: NaN, reason: "no data" };

    const price = current.close;

    // Identical exit discipline. The null is only allowed to differ on entry
    // timing — matching everything else is what makes the test about timing.
    if (isPastSquareOff(current.time)) {
      return ctx.inPosition
        ? { kind: "EXIT", symbol, price, reason: "square-off" }
        : { kind: "HOLD", symbol, price, reason: "past square-off" };
    }
    if (ctx.inPosition) {
      return { kind: "HOLD", symbol, price, reason: "position open" };
    }
    if (candles.length < warmupBars) {
      return { kind: "HOLD", symbol, price, reason: "warming up" };
    }

    const volatility = atr(candles, atrPeriod);
    if (volatility === undefined || volatility <= 0) {
      return { kind: "HOLD", symbol, price, reason: "no volatility estimate" };
    }
    if (rand() >= rate) {
      return { kind: "HOLD", symbol, price, reason: "no draw" };
    }

    const distance = volatility * atrStopMultiple;
    const long = rand() < 0.5;
    return {
      kind: long ? "ENTER_LONG" : "ENTER_SHORT",
      symbol,
      price,
      stop: long ? price - distance : price + distance,
      reason: "random entry (null model)",
    };
  };
}

export type Verdict =
  | "INDISTINGUISHABLE_FROM_CHANCE"
  | "SEPARATES_FROM_CHANCE";

export interface FalsificationResult {
  /** One return per tape. */
  strategyReturns: number[];
  /** Pooled null returns across every tape and trial. */
  nullReturns: number[];
  meanStrategyReturn: number;
  meanNullReturn: number;
  medianNullReturn: number;
  /** Null runs that matched or beat the strategy's mean, as a fraction. */
  pValue: number;
  alpha: number;
  verdict: Verdict;
  trials: number;
  tapes: number;
  /** Mean positions opened per tape by the strategy. */
  meanEntries: number;
  /** Plain-language statement of what would overturn the verdict. */
  whatWouldChangeIt: string;
}

function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function median(xs: readonly number[]): number {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function falsify(
  overrides: Partial<FalsifyConfig> = {},
): FalsificationResult {
  const config: FalsifyConfig = { ...DEFAULT_FALSIFY, ...overrides };

  // The target guard is off throughout. A run that is destroyed on session
  // one produces no distribution to test, and the question here is whether
  // the strategy has an edge — not whether it clears an unrelated rule.
  const base: Partial<BacktestConfig> = {
    ...config.backtest,
    killSwitch: {
      ...DEFAULT_KILL_SWITCH,
      ...config.backtest.killSwitch,
      destroyOnTargetMiss: false,
    },
  };

  const strategyConfig = { ...DEFAULT_TAPE, ...config.tape };
  const strategyReturns: number[] = [];
  const nullReturns: number[] = [];
  const entryCounts: number[] = [];

  for (const seed of config.tapeSeeds) {
    const candles: Candle[] = syntheticTape({ ...strategyConfig, seed });
    const series = [{ symbol: "SYNTH", candles }];

    const real = backtest(series, base);
    strategyReturns.push(real.totalReturnPct);
    entryCounts.push(real.entries);

    // Eligible bars are those where the null could actually fire. Dividing by
    // the whole tape would under-fire it and hand the strategy an unearned
    // advantage on trade count.
    const eligible = Math.max(candles.length - config.warmupBars, 1);
    const rate = Math.min(real.entries / eligible, 1);

    for (let trial = 0; trial < config.nullTrialsPerTape; trial++) {
      const signal = randomEntrySignal(
        rate,
        seed * 1000 + trial,
        (base.strategy ?? { atrPeriod: 14 }).atrPeriod ?? 14,
        (base.strategy ?? { atrStopMultiple: 1.5 }).atrStopMultiple ?? 1.5,
        config.warmupBars,
      );
      nullReturns.push(backtest(series, { ...base, signal }).totalReturnPct);
    }
  }

  const meanStrategyReturn = mean(strategyReturns);
  const atLeastAsGood = nullReturns.filter((r) => r >= meanStrategyReturn).length;

  // The +1 on both sides is the standard correction for an empirical p-value:
  // with a finite number of draws, zero observed is not evidence of zero
  // probability, and an uncorrected 0 would overstate the result.
  const pValue = (atLeastAsGood + 1) / (nullReturns.length + 1);

  return {
    strategyReturns,
    nullReturns,
    meanStrategyReturn,
    meanNullReturn: mean(nullReturns),
    medianNullReturn: median(nullReturns),
    pValue,
    alpha: config.alpha,
    verdict:
      pValue <= config.alpha
        ? "SEPARATES_FROM_CHANCE"
        : "INDISTINGUISHABLE_FROM_CHANCE",
    trials: nullReturns.length,
    tapes: config.tapeSeeds.length,
    meanEntries: mean(entryCounts),
    whatWouldChangeIt:
      pValue <= config.alpha
        ? `A wider set of tapes, or a null matched on holding period as well as ` +
          `entry count, could still absorb this result. It is one test on ` +
          `generated data, not evidence of an edge on a real exchange.`
        : `The strategy would have to beat the null on more than ` +
          `${(100 * (1 - config.alpha)).toFixed(0)}% of runs across independent ` +
          `tapes. Real market data, a longer sample, or a strategy whose ` +
          `parameters were fitted out-of-sample could all produce that; this ` +
          `test cannot rule it in or out.`,
  };
}
