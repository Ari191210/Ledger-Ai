// A minimum-interval throttle in front of the Kite HTTP client.
//
// Kite documents burst limits per endpoint category (roughly 10/sec for
// quotes, 3/sec sustained for order placement), but the number that matters
// here is not "the fastest we're allowed to go" — it's "slow enough that a
// bug in the code calling this can never turn into a flood of real orders
// hitting a real exchange." A retry loop with no backoff, or a caller that
// accidentally calls placeMarketOrder in a tight loop, is a bug either way;
// what this throttle buys is that the bug rate-limits itself to something a
// human monitoring the account has time to notice and stop, rather than
// firing as fast as the network allows.
//
// Deliberately simple: one shared minimum spacing between calls, not a
// separate budget per endpoint category. A live trading adapter earns the
// complexity of per-category budgets only once it is doing enough volume
// for the conservative shared limit to be the bottleneck, and this one
// isn't.

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const REAL_CLOCK: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export class RateLimiter {
  private nextAllowedAt = 0;

  constructor(
    private readonly minIntervalMs: number,
    private readonly clock: Clock = REAL_CLOCK,
  ) {
    if (!Number.isFinite(minIntervalMs) || minIntervalMs < 0) {
      throw new RangeError(`minIntervalMs must be non-negative, got ${minIntervalMs}`);
    }
  }

  /** Waits until this call is allowed to proceed, then reserves the slot. */
  async acquire(): Promise<void> {
    const now = this.clock.now();
    const wait = this.nextAllowedAt - now;
    this.nextAllowedAt = Math.max(now, this.nextAllowedAt) + this.minIntervalMs;
    if (wait > 0) await this.clock.sleep(wait);
  }
}
