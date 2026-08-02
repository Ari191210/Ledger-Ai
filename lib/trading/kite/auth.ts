// Kite Connect authentication: the login-URL / request-token / access-token
// handshake, and nothing past it.
//
// WHAT THIS DELIBERATELY DOES NOT DO. Kite's actual login (username,
// password, TOTP) happens on Zerodha's own page, in the user's browser. Some
// public examples automate that step by storing the account password and a
// TOTP secret and driving a headless browser through the login form. This
// module does not do that, and nothing in this codebase should: that
// pattern means a broker login password and a second-factor secret sit in
// an env var or a script, which is a materially larger exposure than an API
// key, and it is not a decision this code should make silently. What this
// module automates is the part Kite's own architecture intends to be
// automated — exchanging a request_token the user's browser received for an
// access_token — via scripts/kite-login.mjs, which prints a URL, waits for
// the user to log in themselves, and asks them to paste the redirect.
//
// api_key and api_secret name the Kite Connect *app* registered at
// developers.kite.trade, not the user's personal login. access_token is a
// day-scoped session token; Kite expires it every day at market close, so
// scripts/kite-login.mjs has to be re-run daily by whoever operates this.

import { createHash } from "node:crypto";

const KITE_LOGIN_BASE = "https://kite.zerodha.com/connect/login";
const KITE_API_BASE = "https://api.kite.trade";

export function kiteLoginUrl(apiKey: string): string {
  if (!apiKey) throw new RangeError("apiKey must not be empty");
  return `${KITE_LOGIN_BASE}?v=3&api_key=${encodeURIComponent(apiKey)}`;
}

/**
 * Kite's documented checksum: SHA-256 of api_key + request_token + api_secret,
 * hex-encoded. Required on the token-exchange call so Kite can confirm the
 * request came from a party that holds api_secret, without api_secret ever
 * being sent over the wire itself.
 */
export function kiteChecksum(apiKey: string, requestToken: string, apiSecret: string): string {
  return createHash("sha256").update(apiKey + requestToken + apiSecret).digest("hex");
}

export interface KiteSession {
  accessToken: string;
  /** Kite's own user id, e.g. "AB1234". Useful for logging, not for auth. */
  userId: string;
}

/**
 * Extract request_token from the URL Kite redirects the browser to after a
 * successful login. Accepts either the full redirect URL or a bare query
 * string, since a user pasting from an address bar will hand over one or
 * the other depending on the browser.
 */
export function parseRequestToken(redirectUrlOrQuery: string): string {
  const query = redirectUrlOrQuery.includes("?")
    ? redirectUrlOrQuery.slice(redirectUrlOrQuery.indexOf("?") + 1)
    : redirectUrlOrQuery;
  const params = new URLSearchParams(query);
  const token = params.get("request_token");
  const status = params.get("status");

  if (status && status !== "success") {
    throw new Error(`Kite login did not succeed (status=${status})`);
  }
  if (!token) {
    throw new Error(
      "no request_token found in the pasted URL — make sure this is the URL the " +
        "browser landed on immediately after logging in, not a later page",
    );
  }
  return token;
}

/**
 * Exchange a request_token for a day-scoped access_token.
 *
 * @param fetchImpl Injected so tests never touch the network. Defaults to
 *   the global fetch, present in Node 18+.
 */
export async function exchangeRequestToken(
  params: { apiKey: string; apiSecret: string; requestToken: string },
  fetchImpl: typeof fetch = fetch,
): Promise<KiteSession> {
  const { apiKey, apiSecret, requestToken } = params;
  const checksum = kiteChecksum(apiKey, requestToken, apiSecret);

  const body = new URLSearchParams({
    api_key: apiKey,
    request_token: requestToken,
    checksum,
  });

  const response = await fetchImpl(`${KITE_API_BASE}/session/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Kite-Version": "3",
    },
    body,
  });

  const payload = (await response.json()) as
    | { status: "success"; data: { access_token: string; user_id: string } }
    | { status: "error"; message: string; error_type: string };

  if (payload.status !== "success") {
    // Never echo apiSecret or the raw checksum back into an error message —
    // this is the one place in the module that ever computed them.
    throw new Error(`Kite token exchange failed: ${payload.message} (${payload.error_type})`);
  }

  return { accessToken: payload.data.access_token, userId: payload.data.user_id };
}
