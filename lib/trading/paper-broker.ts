// Paper broker: order execution against historical or simulated candles.
//
// The `Broker` interface is the only seam through which the agent touches
// an exchange. A live adapter (Kite Connect, Upstox, Angel One) implements
// the same three methods and nothing else in the system changes.
//
// Deliberately *not* included in this module: a live adapter. Pointing this
// agent at a funded account is a decision that should be made explicitly,
// with its own credentials handling and its own review — not something that
// happens because a config flag defaulted the wrong way.

import {
  Fill,
  Order,
  Paise,
  Portfolio,
  Position,
  Side,
  toPaise,
} from "./types";
import { ChargeSchedule, DEFAULT_CHARGES, chargesForOrder } from "./costs";
import type { TradingGuard } from "./guard";

/** Thrown when the guard refuses an order. Never swallowed silently. */
export class OrderRejected extends Error {
  constructor(readonly reason: string) {
    super(`Order rejected: ${reason}`);
    this.name = "OrderRejected";
  }
}

export interface Broker {
  /** Execute immediately at the current market. */
  marketOrder(symbol: string, side: Side, quantity: number, time: number): Fill;
  /** Current portfolio snapshot. */
  portfolio(): Portfolio;
  /** Last known price per symbol, for marking positions. */
  marks(): Map<string, number>;
}

export interface PaperBrokerConfig {
  /**
   * Adverse price movement applied to every fill, as a fraction. Covers the
   * bid-ask spread plus impact. 0.0005 (5 bps) is a reasonable floor for
   * liquid NSE large-caps and optimistic for anything smaller.
   */
  slippagePct: number;
  /** Round fills to the instrument tick, ₹0.05 on most NSE equities. */
  tickSize: number;
  charges: ChargeSchedule;
}

export const DEFAULT_PAPER_BROKER: PaperBrokerConfig = {
  slippagePct: 0.0005,
  tickSize: 0.05,
  charges: DEFAULT_CHARGES,
};

function roundToTick(price: number, tick: number): number {
  if (tick <= 0) return price;
  return Math.round(price / tick) * tick;
}

export function emptyPortfolio(startingCash: Paise): Portfolio {
  return {
    cash: startingCash,
    positions: new Map<string, Position>(),
    realised: 0,
    charges: 0,
  };
}

export class PaperBroker implements Broker {
  private readonly state: Portfolio;
  private readonly lastPrice = new Map<string, number>();
  private readonly config: PaperBrokerConfig;
  private orderSeq = 0;
  readonly fills: Fill[] = [];

  /**
   * @param guard Optional, but this is where the kill switch becomes real.
   *              With a guard attached, no caller can open a position while
   *              the agent is destroyed or halted — including a caller that
   *              never checks the switch itself.
   */
  constructor(
    startingCash: Paise,
    config: Partial<PaperBrokerConfig> = {},
    private readonly guard?: TradingGuard,
  ) {
    this.state = emptyPortfolio(startingCash);
    this.config = { ...DEFAULT_PAPER_BROKER, ...config };
  }

  /**
   * True when an order strictly reduces an open position.
   *
   * Reducing orders bypass the guard, deliberately. A destroyed agent must
   * still be able to flatten — trapping it in an open position would leave
   * live risk on the book with nothing permitted to close it, which is a
   * worse failure than the one the kill switch exists to prevent.
   */
  private isReducing(symbol: string, side: Side, quantity: number): boolean {
    const position = this.state.positions.get(symbol);
    if (!position || position.quantity === 0) return false;
    const signed = side === "BUY" ? quantity : -quantity;
    return (
      Math.sign(signed) !== Math.sign(position.quantity) &&
      Math.abs(signed) <= Math.abs(position.quantity)
    );
  }

  /** Feed the current market price. Must be called before ordering. */
  setPrice(symbol: string, price: number): void {
    if (!Number.isFinite(price) || price <= 0) {
      throw new RangeError(`price for ${symbol} must be positive, got ${price}`);
    }
    this.lastPrice.set(symbol, price);
  }

  portfolio(): Portfolio {
    return this.state;
  }

  marks(): Map<string, number> {
    return new Map(this.lastPrice);
  }

  position(symbol: string): Position | undefined {
    return this.state.positions.get(symbol);
  }

  marketOrder(symbol: string, side: Side, quantity: number, time: number): Fill {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new RangeError(`quantity must be a positive integer, got ${quantity}`);
    }

    // The gate. Opening risk requires permission; closing it never does.
    // assertMayOpen throws on a destroyed agent and returns false on a halt.
    if (this.guard && !this.isReducing(symbol, side, quantity)) {
      if (!this.guard.assertMayOpen()) {
        throw new OrderRejected(
          `agent is ${this.guard.state.state}; new positions are not permitted`,
        );
      }
    }

    const reference = this.lastPrice.get(symbol);
    if (reference === undefined) {
      throw new Error(`no market price for ${symbol}; call setPrice first`);
    }

    // Slippage always works against the order.
    const direction = side === "BUY" ? 1 : -1;
    const price = roundToTick(
      reference * (1 + direction * this.config.slippagePct),
      this.config.tickSize,
    );

    const order: Order = {
      id: `paper-${++this.orderSeq}`,
      symbol,
      side,
      quantity,
      time,
    };
    const charges = chargesForOrder(price * quantity, side, this.config.charges).total;
    const fill: Fill = {
      orderId: order.id,
      symbol,
      side,
      quantity,
      price,
      time,
      charges,
    };

    this.apply(fill);
    this.fills.push(fill);
    return fill;
  }

  /** Update cash, position, and realised P&L for a fill. */
  private apply(fill: Fill): void {
    const signed = fill.side === "BUY" ? fill.quantity : -fill.quantity;
    const existing = this.state.positions.get(fill.symbol);
    const held = existing?.quantity ?? 0;

    // Cash: buying spends, selling receives. Shorts receive on the way in.
    this.state.cash -= toPaise(signed * fill.price);
    this.state.cash -= fill.charges;
    this.state.charges += fill.charges;

    if (existing && held !== 0 && Math.sign(signed) !== Math.sign(held)) {
      // Reducing or flipping an existing position: realise the closed part.
      const closed = Math.min(Math.abs(signed), Math.abs(held));
      const perShare =
        held > 0 ? fill.price - existing.averagePrice : existing.averagePrice - fill.price;
      this.state.realised += toPaise(perShare * closed);
    }

    const next = held + signed;
    if (next === 0) {
      this.state.positions.delete(fill.symbol);
      return;
    }

    const flipped = held !== 0 && Math.sign(next) !== Math.sign(held);

    let averagePrice: number;
    if (!existing || held === 0 || flipped) {
      // Opening fresh, or flipping through zero: this fill is the entry.
      averagePrice = fill.price;
    } else if (Math.sign(signed) === Math.sign(held)) {
      // Adding to the position: volume-weight the entry across both lots.
      averagePrice =
        (existing.averagePrice * Math.abs(held) + fill.price * Math.abs(signed)) /
        Math.abs(next);
    } else {
      // Reducing without flipping: the shares still held were bought at the
      // original price, so the average entry is unchanged.
      averagePrice = existing.averagePrice;
    }

    this.state.positions.set(fill.symbol, {
      symbol: fill.symbol,
      quantity: next,
      averagePrice,
      stop: flipped || !existing ? undefined : existing.stop,
      openedAt: existing && !flipped ? existing.openedAt : fill.time,
    });
  }

  /** Attach or replace the protective stop on an open position. */
  setStop(symbol: string, stop: number): void {
    const position = this.state.positions.get(symbol);
    if (!position) throw new Error(`no open position in ${symbol}`);
    this.state.positions.set(symbol, { ...position, stop });
  }
}
