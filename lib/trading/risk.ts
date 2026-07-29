// Position sizing and pre-trade risk checks.
//
// Sizing is fixed-fractional against the *stop distance*, not against a
// notional percentage of capital: risk a constant slice of equity per trade
// and let the market's volatility decide the quantity. A wide stop buys
// fewer shares, a tight stop buys more, and the rupee loss on a stop-out is
// the same either way.

import { Paise, Portfolio, rupees, toPaise } from "./types";

export interface RiskConfig {
  /** Equity fraction risked per trade, e.g. 0.005 for 0.5%. */
  riskPerTradePct: number;
  /** Maximum simultaneous open positions. */
  maxOpenPositions: number;
  /** Cap on a single position's notional, as a fraction of equity. */
  maxPositionNotionalPct: number;
  /**
   * Intraday leverage the broker allows on equity (MIS). SEBI's peak-margin
   * rules capped this at ~5x for most cash-segment intraday products; set it
   * to 1 to size as if unleveraged.
   */
  maxLeverage: number;
}

export const DEFAULT_RISK: RiskConfig = {
  riskPerTradePct: 0.005,
  maxOpenPositions: 3,
  maxPositionNotionalPct: 0.3,
  maxLeverage: 1,
};

export type RejectReason =
  | "NO_STOP"
  | "STOP_ON_WRONG_SIDE"
  | "TOO_MANY_POSITIONS"
  | "ALREADY_IN_POSITION"
  | "SIZE_ROUNDS_TO_ZERO"
  | "INSUFFICIENT_BUYING_POWER";

export type SizingResult =
  | { ok: true; quantity: number; riskAmount: Paise; notional: number }
  | { ok: false; reason: RejectReason; detail: string };

export function equityOf(portfolio: Portfolio, marks: Map<string, number>): Paise {
  let equity = portfolio.cash;
  for (const position of portfolio.positions.values()) {
    const mark = marks.get(position.symbol) ?? position.averagePrice;
    // Mark-to-market on the open quantity. Shorts carry negative quantity,
    // so this expression is correct for both directions.
    equity += toPaise(position.quantity * mark);
  }
  return equity;
}

/**
 * Size an entry, or explain why it is rejected.
 *
 * @param entry Intended entry price.
 * @param stop  Protective stop price. Must be below `entry` for a long and
 *              above it for a short.
 */
export function sizePosition(
  params: {
    symbol: string;
    side: "LONG" | "SHORT";
    entry: number;
    stop: number | undefined;
    equity: Paise;
    portfolio: Portfolio;
    lotSize?: number;
  },
  config: RiskConfig = DEFAULT_RISK,
): SizingResult {
  const { symbol, side, entry, stop, equity, portfolio } = params;
  const lotSize = params.lotSize ?? 1;

  if (stop === undefined || !Number.isFinite(stop)) {
    return { ok: false, reason: "NO_STOP", detail: "entries require a protective stop" };
  }

  const existing = portfolio.positions.get(symbol);
  if (existing && existing.quantity !== 0) {
    return {
      ok: false,
      reason: "ALREADY_IN_POSITION",
      detail: `already holding ${existing.quantity} of ${symbol}`,
    };
  }

  const openCount = [...portfolio.positions.values()].filter((p) => p.quantity !== 0).length;
  if (openCount >= config.maxOpenPositions) {
    return {
      ok: false,
      reason: "TOO_MANY_POSITIONS",
      detail: `${openCount} positions open, limit is ${config.maxOpenPositions}`,
    };
  }

  const stopDistance = side === "LONG" ? entry - stop : stop - entry;
  if (stopDistance <= 0) {
    return {
      ok: false,
      reason: "STOP_ON_WRONG_SIDE",
      detail: `stop ${stop} is not protective for a ${side} entry at ${entry}`,
    };
  }

  const riskRupees = rupees(equity) * config.riskPerTradePct;
  let quantity = Math.floor(riskRupees / stopDistance / lotSize) * lotSize;

  // Clamp to the per-position notional cap.
  const maxNotional = rupees(equity) * config.maxPositionNotionalPct;
  const notionalCapped = Math.floor(maxNotional / entry / lotSize) * lotSize;
  quantity = Math.min(quantity, notionalCapped);

  // Clamp to available buying power.
  const buyingPower = rupees(portfolio.cash) * config.maxLeverage;
  const affordable = Math.floor(buyingPower / entry / lotSize) * lotSize;
  quantity = Math.min(quantity, affordable);

  if (quantity <= 0) {
    const reason: RejectReason =
      affordable <= 0 ? "INSUFFICIENT_BUYING_POWER" : "SIZE_ROUNDS_TO_ZERO";
    return {
      ok: false,
      reason,
      detail:
        `risk budget ₹${riskRupees.toFixed(2)} over a ₹${stopDistance.toFixed(2)} stop ` +
        `sizes below one lot at ₹${entry.toFixed(2)}`,
    };
  }

  return {
    ok: true,
    quantity,
    riskAmount: toPaise(quantity * stopDistance),
    notional: quantity * entry,
  };
}
