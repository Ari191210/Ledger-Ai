// Kite Connect API shapes, and the interface a live broker satisfies.
//
// WHY THIS IS A SEPARATE INTERFACE FROM Broker (paper-broker.ts).
//
// The backtest Broker is synchronous and returns a Fill immediately, because
// a backtest is a closed deterministic system: there is no network, no
// partial fill, no order sitting OPEN while the exchange matches it. Kite
// Connect has all three. Forcing a live adapter to pretend otherwise — by
// blocking until "done" or by faking a synchronous Fill — would hide the
// exact place where real trading differs from simulation, which is the one
// thing a live adapter must not hide. So LiveBroker is its own interface:
// every call is async, and order placement returns an order id plus a
// status that must be watched, not a completed Fill.

import type { Paise, Side } from "../types";

/** The one segment this adapter places orders in. See lib/trading/types.ts. */
export const KITE_EXCHANGE = "NSE" as const;
/** Margin Intraday Square-off — the product code for intraday equity. */
export const KITE_PRODUCT = "MIS" as const;

export interface LiveOrderRequest {
  symbol: string;
  side: Side;
  quantity: number;
  /**
   * Whether this order opens/adds to risk or reduces it. Supplied by the
   * caller rather than inferred from a freshly-fetched position: the caller
   * (an ENTER_* vs an EXIT signal) already knows which one it is, and
   * inferring it here would mean deciding from a position snapshot that
   * could be stale by the time the order actually lands. Only "OPEN" is
   * gated by the kill switch — see KiteBroker's file header for why "REDUCE"
   * always goes through.
   */
  intent: "OPEN" | "REDUCE";
  /**
   * Client-supplied idempotency tag. Kite does not deduplicate orders by
   * tag — this exists so a caller can correlate a request with whatever it
   * gets back (including an AMBIGUOUS result) without depending on order_id,
   * which does not exist until Kite accepts the request.
   */
  tag: string;
}

export type LiveOrderStatus =
  | "OPEN"
  | "COMPLETE"
  | "REJECTED"
  | "CANCELLED"
  | "PARTIALLY_FILLED";

export interface LiveOrderResult {
  orderId: string;
  status: LiveOrderStatus;
  /** Rupees. Present once Kite has reported at least one fill. */
  averagePrice?: number;
  filledQuantity: number;
}

/**
 * Placing an order over HTTP has three outcomes, not two: it succeeded, it
 * failed before Kite saw it (safe to retry), or the response was lost after
 * Kite may have already accepted it (NOT safe to retry — retrying could
 * place a second, real, unwanted order). Every call site must handle all
 * three; there is no default that quietly picks one.
 */
export type OrderOutcome =
  | { kind: "PLACED"; result: LiveOrderResult }
  | { kind: "REJECTED"; reason: string }
  | {
      kind: "AMBIGUOUS";
      /**
       * What to do about it: check the order book for `tag` before
       * assuming anything, and never resubmit blind.
       */
      detail: string;
    };

export interface LivePosition {
  symbol: string;
  /** Positive long, negative short, matching lib/trading/types.ts Position. */
  quantity: number;
  averagePrice: number;
}

export interface LiveBroker {
  /**
   * Places a market order and returns once Kite has reached a terminal
   * order state (COMPLETE, REJECTED, CANCELLED) or the poll deadline is
   * reached — in which case the result is AMBIGUOUS and the position book
   * is the only thing to trust next.
   */
  placeMarketOrder(order: LiveOrderRequest): Promise<OrderOutcome>;
  /** Today's net positions in the MIS product, however many symbols. */
  positions(): Promise<LivePosition[]>;
  /** Available cash in the equity segment, in paise. */
  funds(): Promise<Paise>;
  /** Last traded price for each requested symbol. Missing keys mean no quote. */
  ltp(symbols: readonly string[]): Promise<Map<string, number>>;
}

// ── Kite's own wire shapes, as documented. Kept separate from LiveBroker's
//    types above so a change in Kite's API touches only the mapping code in
//    broker.ts, never the interface the rest of the system depends on.

export interface KiteErrorBody {
  status: "error";
  message: string;
  error_type: string;
}

export interface KiteOrderResponse {
  status: "success";
  data: { order_id: string };
}

export interface KiteOrderHistoryEntry {
  order_id: string;
  status: string;
  average_price: number;
  filled_quantity: number;
}

export interface KitePositionEntry {
  tradingsymbol: string;
  exchange: string;
  product: string;
  quantity: number;
  average_price: number;
}

export interface KitePositionsResponse {
  status: "success";
  data: { net: KitePositionEntry[]; day: KitePositionEntry[] };
}

export interface KiteMarginsResponse {
  status: "success";
  data: { equity: { available: { cash: number } } };
}

export interface KiteQuoteEntry {
  instrument_token: number;
  last_price: number;
}

export interface KiteLtpResponse {
  status: "success";
  data: Record<string, KiteQuoteEntry>;
}
