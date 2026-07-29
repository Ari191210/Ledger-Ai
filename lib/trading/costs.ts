// Transaction cost model for NSE intraday equity.
//
// This exists because Indian intraday round-trip costs are large enough to
// decide whether a strategy is profitable at all. A discount-broker round
// trip on a ₹1,00,000 position costs roughly ₹80–90 (~0.08%), which a
// strategy taking 10 trades a day has to clear before it earns anything.
//
// Rates are statutory and change with the union budget and exchange
// circulars. They are parameters, not constants baked into the maths —
// verify against your broker's current contract note before trusting a
// backtest that used them.

import { Paise, Side, toPaise } from "./types";

export interface ChargeSchedule {
  /** Per executed order: min(flatFee, percentOfTurnover). Zerodha-style. */
  brokerageFlat: number;
  brokeragePct: number;
  /** Securities Transaction Tax, sell side only for intraday equity. */
  sttSellPct: number;
  /** NSE exchange transaction charge, both sides. */
  exchangeTxnPct: number;
  /** SEBI turnover fee, both sides (₹10 per crore). */
  sebiPct: number;
  /** NSE investor protection fund trust, both sides (₹10 per crore). */
  ipftPct: number;
  /** Stamp duty, buy side only. */
  stampBuyPct: number;
  /** GST on (brokerage + exchange txn + SEBI + IPFT). */
  gstPct: number;
}

/**
 * Discount-broker rates as commonly published for NSE intraday equity.
 * Percentages are expressed as fractions: 0.00025 === 0.025%.
 */
export const DEFAULT_CHARGES: ChargeSchedule = {
  brokerageFlat: 20,
  brokeragePct: 0.0003,
  sttSellPct: 0.00025,
  exchangeTxnPct: 0.0000297,
  sebiPct: 0.000001,
  ipftPct: 0.000001,
  stampBuyPct: 0.00003,
  gstPct: 0.18,
};

export interface ChargeBreakdown {
  brokerage: Paise;
  stt: Paise;
  exchangeTxn: Paise;
  sebi: Paise;
  ipft: Paise;
  stamp: Paise;
  gst: Paise;
  total: Paise;
}

/**
 * Charges for a single executed order.
 *
 * @param turnover Quantity × price, in rupees.
 */
export function chargesForOrder(
  turnover: number,
  side: Side,
  schedule: ChargeSchedule = DEFAULT_CHARGES,
): ChargeBreakdown {
  if (!Number.isFinite(turnover) || turnover < 0) {
    throw new RangeError(`turnover must be a non-negative number, got ${turnover}`);
  }

  const brokerage = Math.min(schedule.brokerageFlat, turnover * schedule.brokeragePct);
  const stt = side === "SELL" ? turnover * schedule.sttSellPct : 0;
  const exchangeTxn = turnover * schedule.exchangeTxnPct;
  const sebi = turnover * schedule.sebiPct;
  const ipft = turnover * schedule.ipftPct;
  const stamp = side === "BUY" ? turnover * schedule.stampBuyPct : 0;
  const gst = (brokerage + exchangeTxn + sebi + ipft) * schedule.gstPct;

  const parts = { brokerage, stt, exchangeTxn, sebi, ipft, stamp, gst };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);

  return {
    brokerage: toPaise(brokerage),
    stt: toPaise(stt),
    exchangeTxn: toPaise(exchangeTxn),
    sebi: toPaise(sebi),
    ipft: toPaise(ipft),
    stamp: toPaise(stamp),
    gst: toPaise(gst),
    total: toPaise(total),
  };
}

/**
 * Round-trip cost of a position as a fraction of the capital deployed.
 * Use this to sanity-check a strategy's edge before backtesting it: if the
 * average winning move is smaller than this, the strategy cannot be
 * profitable no matter how accurate its signals are.
 */
export function roundTripCostPct(
  turnoverPerLeg: number,
  schedule: ChargeSchedule = DEFAULT_CHARGES,
): number {
  if (turnoverPerLeg <= 0) return 0;
  const buy = chargesForOrder(turnoverPerLeg, "BUY", schedule).total;
  const sell = chargesForOrder(turnoverPerLeg, "SELL", schedule).total;
  return (buy + sell) / toPaise(turnoverPerLeg);
}
