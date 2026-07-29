// Deterministic synthetic tape, for exercising the engine.
//
// This is a simulator, not a forecast, and the distinction matters enough to
// state twice: nothing produced here is market data, and no figure derived
// from it describes how the agent would have performed on a real exchange.
//
// The momentum term is deliberately negligible. An earlier version used a
// strongly autocorrelated drift, and the breakout strategy "earned" several
// hundred percent a year on it — not because the strategy is good, but
// because the generator had been handed the exact pattern the strategy looks
// for. A simulator that bakes in the edge you are testing for cannot tell you
// anything. Real minute bars are close to unpredictable, so this one is too.

import { Candle } from "./types";
import { SESSION_CLOSE_MINUTE, SESSION_OPEN_MINUTE } from "./market-calendar";

export interface TapeConfig {
  /** Number of trading sessions to generate. Weekends are skipped. */
  sessions: number;
  /** Bar interval in minutes. 1 for minute bars, 5 for five-minute bars. */
  barMinutes: number;
  /** Seed for the PRNG. The same seed always yields the same tape. */
  seed: number;
  /** Opening price of the first session. */
  startPrice: number;
  /** Annualised-equivalent daily volatility, e.g. 0.014 for 1.4%. */
  dailyVolatility: number;
  /** First session's IST date, as [year, month, day]. */
  startDate: [number, number, number];
}

export const DEFAULT_TAPE: TapeConfig = {
  sessions: 40,
  barMinutes: 5,
  seed: 42,
  startPrice: 1500,
  dailyVolatility: 0.014,
  startDate: [2025, 1, 1],
};

/** Deterministic PRNG — a given seed always reproduces the same tape. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform, for normally distributed returns. */
export function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Epoch ms for an IST wall-clock time. IST is UTC+5:30. */
function istInstant(y: number, m: number, d: number, hh: number, mm: number): number {
  return Date.UTC(y, m - 1, d, hh - 5, mm - 30);
}

/**
 * Generate a tape of intraday candles across `sessions` weekday sessions,
 * running 09:15 to 15:30 IST.
 */
export function syntheticTape(overrides: Partial<TapeConfig> = {}): Candle[] {
  const config = { ...DEFAULT_TAPE, ...overrides };
  if (config.barMinutes <= 0) {
    throw new RangeError(`barMinutes must be positive, got ${config.barMinutes}`);
  }
  if (config.sessions < 0) {
    throw new RangeError(`sessions must be non-negative, got ${config.sessions}`);
  }

  const barsPerSession = Math.floor(
    (SESSION_CLOSE_MINUTE - SESSION_OPEN_MINUTE) / config.barMinutes,
  );
  const barVol = config.dailyVolatility / Math.sqrt(barsPerSession);

  const rand = mulberry32(config.seed);
  const candles: Candle[] = [];

  let price = config.startPrice;
  let momentum = 0;

  const [sy, sm, sd] = config.startDate;
  const cursor = new Date(Date.UTC(sy, sm - 1, sd));

  for (let done = 0; done < config.sessions; ) {
    const weekday = cursor.getUTCDay();
    if (weekday === 0 || weekday === 6) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      continue;
    }

    const sessionStart = istInstant(
      cursor.getUTCFullYear(),
      cursor.getUTCMonth() + 1,
      cursor.getUTCDate(),
      9,
      15,
    );

    for (let bar = 0; bar < barsPerSession; bar++) {
      momentum = momentum * 0.7 + gaussian(rand) * barVol * 0.05;
      const previous = price;
      price = Math.max(price * (1 + gaussian(rand) * barVol + momentum), 1);
      const wick = Math.abs(gaussian(rand)) * price * barVol * 0.5;

      candles.push({
        time: sessionStart + bar * config.barMinutes * 60_000,
        open: previous,
        high: Math.max(previous, price) + wick,
        low: Math.max(Math.min(previous, price) - wick, 0.01),
        close: price,
        volume: Math.round(5_000 + rand() * 20_000),
      });
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
    done++;
  }

  return candles;
}
