// Domain types for the trading agent.
//
// Every module in lib/trading is a pure function over these types so the
// whole system is testable without a broker, a network, or a clock.
//
// Money is represented in paise (integer) wherever it is accumulated, to
// keep P&L arithmetic exact. Prices coming off an exchange feed stay as
// rupee floats because that is how every Indian broker API reports them.

import type { SignalAssessment } from "./evidence";

/** Integer paise. 100 paise = ₹1. */
export type Paise = number;

export const rupees = (p: Paise): number => p / 100;
export const toPaise = (r: number): Paise => Math.round(r * 100);

export type Side = "BUY" | "SELL";

/** Only intraday equity is modelled. Delivery has a different tax profile. */
export type Segment = "EQUITY_INTRADAY";

export interface Instrument {
  /** NSE trading symbol, e.g. "RELIANCE". */
  symbol: string;
  exchange: "NSE" | "BSE";
  segment: Segment;
  /** Minimum price increment, ₹0.05 for most NSE equities. */
  tickSize: number;
  /** Shares per lot. 1 for cash equities. */
  lotSize: number;
}

export interface Candle {
  /** Epoch milliseconds at the *start* of the interval, UTC. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type SignalKind = "ENTER_LONG" | "ENTER_SHORT" | "EXIT" | "HOLD";

export interface Signal {
  kind: SignalKind;
  symbol: string;
  /** Reference price the signal was computed at. */
  price: number;
  /** Protective stop, absolute price. Required for entries. */
  stop?: number;
  /** Free-text reason, surfaced in the trade log. */
  reason: string;
  /**
   * Present only for ENTER_LONG / ENTER_SHORT. HOLD and EXIT carry no
   * recommendation to assess — HOLD is the absence of a call, and EXIT
   * defers to the stop the entry was already sized against — so neither
   * gets an assessment. See lib/trading/evidence.ts.
   */
  assessment?: SignalAssessment;
}

export interface Order {
  id: string;
  symbol: string;
  side: Side;
  quantity: number;
  /** Undefined means market order. */
  limitPrice?: number;
  time: number;
}

export interface Fill {
  orderId: string;
  symbol: string;
  side: Side;
  quantity: number;
  /** Price actually transacted, after modelled slippage. */
  price: number;
  time: number;
  /** Total charges attributable to this fill, in paise. */
  charges: Paise;
}

export interface Position {
  symbol: string;
  /** Positive for long, negative for short, 0 for flat. */
  quantity: number;
  /** Volume-weighted entry price of the open quantity. */
  averagePrice: number;
  stop?: number;
  openedAt: number;
}

export interface Portfolio {
  /** Free cash, in paise. */
  cash: Paise;
  positions: Map<string, Position>;
  /** Realised P&L for the session so far, net of charges, in paise. */
  realised: Paise;
  /** Charges paid so far this session, in paise. */
  charges: Paise;
}

/** One completed trading session, the unit the kill switch judges. */
export interface SessionResult {
  /** IST calendar date, "YYYY-MM-DD". */
  date: string;
  /** Equity at session open, in paise. */
  openingEquity: Paise;
  /** Equity at session close, in paise. */
  closingEquity: Paise;
  /** (closing - opening) / opening. 0.10 means +10%. */
  returnPct: number;
  charges: Paise;
  trades: number;
}
