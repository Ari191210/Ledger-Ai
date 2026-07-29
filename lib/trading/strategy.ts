// Opening-range breakout with an ATR stop and a trend filter.
//
// This is a well-known intraday pattern, not a proprietary edge: define the
// range of the first N minutes, trade a break of that range in the direction
// of the session's EMA trend, stop out at a multiple of ATR, and exit at the
// square-off bell. It is here to be a realistic, honest baseline that the
// rest of the system can be tested against — a strategy whose behaviour you
// can reason about, so that when the backtest reports a number you know
// what produced it.
//
// It is not tuned, and its parameters are not fitted to any sample. Expect
// a small edge at best, and expect transaction costs to consume much of it.

import { Candle, Signal } from "./types";
import { isPastSquareOff, minutesSinceOpen } from "./market-calendar";

export interface StrategyConfig {
  /** Minutes after the open that define the range, e.g. 15. */
  openingRangeMinutes: number;
  /** Bars in the trend EMA. */
  emaPeriod: number;
  /** Bars in the ATR used for stop distance. */
  atrPeriod: number;
  /** Stop distance as a multiple of ATR. */
  atrStopMultiple: number;
  /** Breakout must clear the range by this fraction to count, e.g. 0.0005. */
  breakoutBufferPct: number;
}

export const DEFAULT_STRATEGY: StrategyConfig = {
  openingRangeMinutes: 15,
  emaPeriod: 20,
  atrPeriod: 14,
  atrStopMultiple: 1.5,
  breakoutBufferPct: 0.0005,
};

/** Exponential moving average of closes. Returns undefined until seeded. */
export function ema(candles: readonly Candle[], period: number): number | undefined {
  if (period <= 0) throw new RangeError(`period must be positive, got ${period}`);
  if (candles.length < period) return undefined;

  const k = 2 / (period + 1);
  // Seed with the SMA of the first `period` closes, then walk forward.
  let value = 0;
  for (let i = 0; i < period; i++) value += candles[i].close;
  value /= period;
  for (let i = period; i < candles.length; i++) {
    value = candles[i].close * k + value * (1 - k);
  }
  return value;
}

/** Wilder's Average True Range. Returns undefined until seeded. */
export function atr(candles: readonly Candle[], period: number): number | undefined {
  if (period <= 0) throw new RangeError(`period must be positive, got ${period}`);
  if (candles.length < period + 1) return undefined;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const prevClose = candles[i - 1].close;
    trueRanges.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - prevClose),
        Math.abs(candles[i].low - prevClose),
      ),
    );
  }

  let value = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    value = (value * (period - 1) + trueRanges[i]) / period;
  }
  return value;
}

export interface OpeningRange {
  high: number;
  low: number;
  /** Bars that contributed. Zero means the range is not established yet. */
  bars: number;
}

/** High/low of the bars falling inside the opening-range window. */
export function openingRange(
  candles: readonly Candle[],
  windowMinutes: number,
): OpeningRange {
  let high = -Infinity;
  let low = Infinity;
  let bars = 0;

  // Candles are chronological, so the window is a prefix: stop at the first
  // bar past it rather than scanning the whole accumulated session.
  for (const candle of candles) {
    const elapsed = minutesSinceOpen(candle.time);
    if (elapsed < 0) continue;
    if (elapsed >= windowMinutes) break;
    high = Math.max(high, candle.high);
    low = Math.min(low, candle.low);
    bars++;
  }

  return bars > 0 ? { high, low, bars } : { high: NaN, low: NaN, bars: 0 };
}

export interface StrategyContext {
  symbol: string;
  /** Session candles so far, oldest first. The last one is the current bar. */
  candles: readonly Candle[];
  /** True when a position is already open in this symbol. */
  inPosition: boolean;
}

/**
 * Produce the signal for the current bar.
 *
 * Only the closed portion of the series is used, so this cannot look ahead:
 * decisions for bar *n* depend on bars 0..n only, and the entry price is
 * bar n's close, which the backtest fills on bar n+1's open.
 */
export function evaluate(
  ctx: StrategyContext,
  config: StrategyConfig = DEFAULT_STRATEGY,
): Signal {
  const { candles, symbol } = ctx;
  const current = candles[candles.length - 1];

  if (!current) {
    return { kind: "HOLD", symbol, price: NaN, reason: "no data" };
  }

  const price = current.close;

  // Intraday means intraday: everything is flat before the bell.
  if (isPastSquareOff(current.time)) {
    return ctx.inPosition
      ? { kind: "EXIT", symbol, price, reason: "square-off" }
      : { kind: "HOLD", symbol, price, reason: "past square-off, no new entries" };
  }

  if (ctx.inPosition) {
    // Exits are managed by the stop the entry was sized against, which the
    // broker holds. The strategy does not second-guess it mid-trade.
    return { kind: "HOLD", symbol, price, reason: "position open, stop is working" };
  }

  const range = openingRange(candles, config.openingRangeMinutes);
  if (range.bars === 0 || minutesSinceOpen(current.time) < config.openingRangeMinutes) {
    return { kind: "HOLD", symbol, price, reason: "opening range not established" };
  }

  const trend = ema(candles, config.emaPeriod);
  const volatility = atr(candles, config.atrPeriod);
  if (trend === undefined || volatility === undefined || volatility <= 0) {
    return { kind: "HOLD", symbol, price, reason: "indicators not seeded" };
  }

  const buffer = price * config.breakoutBufferPct;
  const stopDistance = volatility * config.atrStopMultiple;

  if (price > range.high + buffer && price > trend) {
    return {
      kind: "ENTER_LONG",
      symbol,
      price,
      stop: price - stopDistance,
      reason:
        `broke ${range.high.toFixed(2)} opening-range high with trend ` +
        `(EMA${config.emaPeriod} ${trend.toFixed(2)})`,
    };
  }

  if (price < range.low - buffer && price < trend) {
    return {
      kind: "ENTER_SHORT",
      symbol,
      price,
      stop: price + stopDistance,
      reason:
        `broke ${range.low.toFixed(2)} opening-range low with trend ` +
        `(EMA${config.emaPeriod} ${trend.toFixed(2)})`,
    };
  }

  return { kind: "HOLD", symbol, price, reason: "inside opening range" };
}
