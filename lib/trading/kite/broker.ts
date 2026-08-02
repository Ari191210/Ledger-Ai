// KiteBroker: a LiveBroker backed by real Kite Connect orders.
//
// THIS PLACES REAL ORDERS AGAINST A REAL FUNDED ACCOUNT. Everything about
// this file's shape follows from that one sentence.
//
// SAFETY DECISIONS, EACH DELIBERATE:
//
//   · The constructor requires a TradingGuard — not optional the way it is
//     on PaperBroker. There is no code path that constructs a KiteBroker
//     without a kill switch attached.
//   · The constructor also requires `liveTradingAcknowledged: true` as a
//     literal. It does nothing except force whoever is instantiating this
//     to type the word "true" next to a comment explaining what it means —
//     a speed bump against copy-pasting a PaperBroker call site and getting
//     a live broker by accident. Anything other than the literal `true`
//     throws before any HTTP client is even constructed.
//   · `intent` on every order request is supplied by the caller, not
//     inferred from a freshly-fetched position (see LiveOrderRequest in
//     types.ts). The caller — a Signal's ENTER_* vs EXIT — already knows
//     which one it is; inferring it here would mean an extra network round
//     trip against state that could be stale by the time the order lands.
//     Only "OPEN" intent is gated by the guard, matching PaperBroker's
//     documented reasoning: a destroyed agent must still be able to flatten
//     a position, or the kill switch would trap live risk on the book with
//     nothing permitted to close it.
//   · Order placement never retries automatically. A timeout here is
//     reported as AMBIGUOUS (types.ts) precisely so nothing downstream is
//     tempted to retry blind and double a real position.

import { toPaise, type Paise } from "../types";
import { TradingGuard } from "../guard";
import { KiteHttp, KiteApiError, KiteTimeoutError, type KiteHttpConfig } from "./http";
import { placeRegularOrder, orderHistory, fetchPositions, fetchMargins, fetchLtp } from "./http";
import { REAL_CLOCK, type Clock } from "./rate-limiter";
import type {
  LiveBroker,
  LiveOrderRequest,
  LiveOrderResult,
  LiveOrderStatus,
  LivePosition,
  OrderOutcome,
} from "./types";

export interface KiteBrokerConfig extends KiteHttpConfig {
  guard: TradingGuard;
  /**
   * Must be the literal `true`. See the file header — this is a deliberate
   * speed bump, not a feature flag to be defaulted or inferred.
   */
  liveTradingAcknowledged: true;
  /** How long to poll an order for a terminal state before calling it AMBIGUOUS. */
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  clock?: Clock;
}

function mapKiteStatus(raw: string): LiveOrderStatus {
  switch (raw) {
    case "COMPLETE":
      return "COMPLETE";
    case "REJECTED":
      return "REJECTED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      // Kite's transient pre-OPEN statuses ("PUT ORDER REQ RECEIVED", etc.)
      // and anything else unrecognized fall here, on the side of "keep
      // watching" rather than mis-declaring a still-pending order terminal.
      return /partial/i.test(raw) ? "PARTIALLY_FILLED" : "OPEN";
  }
}

function isTerminal(status: LiveOrderStatus): boolean {
  return status === "COMPLETE" || status === "REJECTED" || status === "CANCELLED";
}

export class KiteBroker implements LiveBroker {
  private readonly http: KiteHttp;
  private readonly guard: TradingGuard;
  private readonly pollTimeoutMs: number;
  private readonly pollIntervalMs: number;
  private readonly clock: Clock;

  constructor(config: KiteBrokerConfig) {
    if (config.liveTradingAcknowledged !== true) {
      throw new Error(
        "KiteBroker places real orders against a real account. Construct it with " +
          "liveTradingAcknowledged: true only once that is a decision you meant to make.",
      );
    }
    this.guard = config.guard;
    this.http = new KiteHttp(config);
    this.pollTimeoutMs = config.pollTimeoutMs ?? 15_000;
    this.pollIntervalMs = config.pollIntervalMs ?? 500;
    this.clock = config.clock ?? REAL_CLOCK;
  }

  async placeMarketOrder(order: LiveOrderRequest): Promise<OrderOutcome> {
    if (order.intent === "OPEN") {
      // Throws AgentDestroyedError uncaught if the agent is destroyed —
      // that is deliberately loud and matches the guard's own contract
      // (see lib/trading/guard.ts). A halt is routine and is reported as a
      // normal REJECTED outcome instead.
      if (!this.guard.assertMayOpen()) {
        return {
          kind: "REJECTED",
          reason: `agent is ${this.guard.state.state}; new positions are not permitted`,
        };
      }
    }

    if (!Number.isInteger(order.quantity) || order.quantity <= 0) {
      return {
        kind: "REJECTED",
        reason: `quantity must be a positive integer, got ${order.quantity}`,
      };
    }

    let orderId: string;
    try {
      const response = await placeRegularOrder(this.http, {
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        tag: order.tag,
      });
      orderId = response.data.order_id;
    } catch (err) {
      if (err instanceof KiteTimeoutError) {
        return {
          kind: "AMBIGUOUS",
          detail:
            `the order request for tag=${order.tag} timed out before a response arrived. ` +
            `Check the Kite order book and position book for this tag before doing anything ` +
            `else — do not resubmit.`,
        };
      }
      if (err instanceof KiteApiError) {
        return { kind: "REJECTED", reason: `${err.message} (${err.errorType})` };
      }
      throw err;
    }

    const result = await this.pollUntilTerminal(orderId);
    if (result === null) {
      return {
        kind: "AMBIGUOUS",
        detail:
          `order ${orderId} (tag=${order.tag}) did not reach COMPLETE, REJECTED or ` +
          `CANCELLED within ${this.pollTimeoutMs}ms. It may still fill later — check the ` +
          `order book before assuming it did not.`,
      };
    }
    return { kind: "PLACED", result };
  }

  private async pollUntilTerminal(orderId: string): Promise<LiveOrderResult | null> {
    const deadline = this.clock.now() + this.pollTimeoutMs;
    while (this.clock.now() < deadline) {
      const history = await orderHistory(this.http, orderId);
      const latest = history[history.length - 1];
      if (latest) {
        const status = mapKiteStatus(latest.status);
        if (isTerminal(status)) {
          return {
            orderId,
            status,
            averagePrice: latest.average_price || undefined,
            filledQuantity: latest.filled_quantity,
          };
        }
      }
      await this.clock.sleep(this.pollIntervalMs);
    }
    return null;
  }

  async positions(): Promise<LivePosition[]> {
    const data = await fetchPositions(this.http);
    // Only today's MIS positions on NSE are in scope — this codebase does
    // not model any other segment or product (see lib/trading/types.ts).
    return data.net
      .filter((p) => p.exchange === "NSE" && p.product === "MIS")
      .map((p) => ({
        symbol: p.tradingsymbol,
        quantity: p.quantity,
        averagePrice: p.average_price,
      }));
  }

  async funds(): Promise<Paise> {
    const data = await fetchMargins(this.http);
    return toPaise(data.equity.available.cash);
  }

  async ltp(symbols: readonly string[]): Promise<Map<string, number>> {
    if (symbols.length === 0) return new Map();
    const data = await fetchLtp(this.http, symbols);
    const marks = new Map<string, number>();
    for (const symbol of symbols) {
      const entry = data[`NSE:${symbol}`];
      if (entry) marks.set(symbol, entry.last_price);
    }
    return marks;
  }
}
