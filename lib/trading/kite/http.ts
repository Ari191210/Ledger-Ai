// A thin, typed wrapper over Kite Connect's REST API.
//
// Everything network-shaped lives here so broker.ts can be read as trading
// logic, not HTTP plumbing. Two things this layer exists specifically to
// get right:
//
//   1. A request that times out is not a request that failed. Kite may have
//      already accepted it; the response was just lost in transit. This
//      client distinguishes KiteTimeoutError (ambiguous — do not retry
//      blind) from KiteApiError (Kite answered, and said no — safe to
//      inspect and decide from the message).
//   2. Nothing here ever puts apiKey or accessToken into a thrown error,
//      a log line, or anything else that might end up in a terminal
//      transcript or an issue tracker. The Authorization header is built
//      once per request and never stored past that call.

import type {
  KiteErrorBody,
  KiteLtpResponse,
  KiteMarginsResponse,
  KiteOrderHistoryEntry,
  KiteOrderResponse,
  KitePositionsResponse,
} from "./types";
import { RateLimiter, REAL_CLOCK, type Clock } from "./rate-limiter";

const KITE_API_BASE = "https://api.kite.trade";

export class KiteApiError extends Error {
  constructor(
    message: string,
    readonly errorType: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "KiteApiError";
  }
}

/**
 * The request may or may not have reached Kite. Whether this was thrown for
 * a slow response or a dropped connection, the caller cannot tell from here
 * whether an order behind this call was accepted — that has to be resolved
 * by checking Kite's own records (the order book, the position book), never
 * by assuming and never by resubmitting.
 */
export class KiteTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KiteTimeoutError";
  }
}

export interface KiteHttpConfig {
  apiKey: string;
  accessToken: string;
  /** Minimum milliseconds between requests. See rate-limiter.ts. */
  minIntervalMs?: number;
  /** Per-request timeout before this treats the call as ambiguous. */
  timeoutMs?: number;
  /** Injected for tests; never touches the network when overridden. */
  fetchImpl?: typeof fetch;
  clock?: Clock;
}

export class KiteHttp {
  private readonly apiKey: string;
  private readonly accessToken: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly limiter: RateLimiter;

  constructor(config: KiteHttpConfig) {
    if (!config.apiKey) throw new RangeError("apiKey must not be empty");
    if (!config.accessToken) throw new RangeError("accessToken must not be empty");
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.timeoutMs = config.timeoutMs ?? 8_000;
    this.limiter = new RateLimiter(config.minIntervalMs ?? 350, config.clock ?? REAL_CLOCK);
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `token ${this.apiKey}:${this.accessToken}`,
      "X-Kite-Version": "3",
    };
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: URLSearchParams,
  ): Promise<T> {
    await this.limiter.acquire();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(`${KITE_API_BASE}${path}`, {
        method,
        headers: {
          ...this.authHeaders(),
          ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        },
        body,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new KiteTimeoutError(
          `${method} ${path} did not respond within ${this.timeoutMs}ms`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    const payload = (await response.json()) as T | KiteErrorBody;
    if ((payload as KiteErrorBody).status === "error") {
      const err = payload as KiteErrorBody;
      throw new KiteApiError(err.message, err.error_type, response.status);
    }
    return payload as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body: URLSearchParams): Promise<T> {
    return this.request<T>("POST", path, body);
  }
}

// ── Endpoint-specific helpers, kept here so broker.ts only ever sees typed
//    results, never raw paths or Kite's field-naming conventions. ──────────

export function placeRegularOrder(
  http: KiteHttp,
  params: { symbol: string; side: "BUY" | "SELL"; quantity: number; tag: string },
): Promise<KiteOrderResponse> {
  const body = new URLSearchParams({
    tradingsymbol: params.symbol,
    exchange: "NSE",
    transaction_type: params.side,
    order_type: "MARKET",
    quantity: String(params.quantity),
    product: "MIS",
    validity: "DAY",
    tag: params.tag,
  });
  return http.post<KiteOrderResponse>("/orders/regular", body);
}

export async function orderHistory(
  http: KiteHttp,
  orderId: string,
): Promise<KiteOrderHistoryEntry[]> {
  const response = await http.get<{ status: "success"; data: KiteOrderHistoryEntry[] }>(
    `/orders/${encodeURIComponent(orderId)}`,
  );
  return response.data;
}

export async function fetchPositions(http: KiteHttp): Promise<KitePositionsResponse["data"]> {
  const response = await http.get<KitePositionsResponse>("/portfolio/positions");
  return response.data;
}

export async function fetchMargins(http: KiteHttp): Promise<KiteMarginsResponse["data"]> {
  const response = await http.get<KiteMarginsResponse>("/user/margins");
  return response.data;
}

export async function fetchLtp(
  http: KiteHttp,
  symbols: readonly string[],
): Promise<KiteLtpResponse["data"]> {
  const query = symbols.map((s) => `i=${encodeURIComponent(`NSE:${s}`)}`).join("&");
  const response = await http.get<KiteLtpResponse>(`/quote/ltp?${query}`);
  return response.data;
}
