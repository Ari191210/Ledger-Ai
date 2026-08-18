// ═══════════════════════════════════════════════════════════════════════════
// M4-1 — the browser client, moved onto COOKIE session transport.
//
// WHY THIS CHANGED
//
// The session used to live in `window.localStorage`: `createClient()` from
// `@supabase/supabase-js` with no `auth.storage` override uses the SDK's
// default browser adapter, which is localStorage. Middleware runs at the edge
// and can only read cookies, so every request — including a perfectly valid
// signed-in one — reached `middleware.ts` carrying no evidence of a session.
// That is why edge enforcement (`AUTH_MIDDLEWARE_ENFORCE`) had to ship OFF.
//
// `createBrowserClient` from `@supabase/ssr` is the same `supabase-js` client
// with a `storage` adapter backed by `document.cookie`. Nothing else about the
// client changes: same URL, same anon key, same PKCE flow, same
// `detectSessionInUrl: false` (the callback page exchanges the code by hand —
// see `app/auth/callback/page.tsx` — and letting the SDK also try would race
// it). The session simply becomes visible to the edge.
//
//
// THE EXACT COOKIE SHAPE THIS PRODUCES — the middleware contract
//
// `@supabase/ssr` names cookies after the auth storage key and nothing else.
// `supabase-js` derives that key as `sb-${hostname.split(".")[0]}-auth-token`,
// so for `https://<ref>.supabase.co` the key is `sb-<ref>-auth-token`. The
// browser adapter writes the value with `createChunks()`, which returns a
// SINGLE cookie under the bare key when the URL-encoded value fits in 3180
// bytes and otherwise splits it into `<key>.0`, `<key>.1`, … So the edge sees:
//
//   sb-<ref>-auth-token            ← small session
//   sb-<ref>-auth-token.0/.1/…     ← large session (the common case: a session
//                                    is base64url-encoded, which inflates it)
//
// and, during a sign-in that has STARTED but not completed, these three, none
// of which is a session and all of which are excluded in `lib/auth-routes.ts`:
//
//   sb-<ref>-auth-token-code-verifier
//   sb-<ref>-auth-token-flow-<id>-code-verifier
//   sb-<ref>-auth-token-flows-code-verifier
//
// Cookie attributes come from `DEFAULT_COOKIE_OPTIONS`: `path=/`,
// `SameSite=Lax`, `Max-Age=400d`, and `httpOnly: false` — necessarily false,
// because the browser itself writes them through `document.cookie`. First
// party, essential, no third party ever reads them. The legal pages say so.
// ═══════════════════════════════════════════════════════════════════════════

import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder";

/**
 * The auth storage key, computed exactly the way `supabase-js` computes it, so
 * that the legacy-session migration below reads the same localStorage entry the
 * old client wrote. Derivation is `sb-${new URL(url).hostname.split(".")[0]}
 * -auth-token`; a malformed URL must not take the whole module down at import
 * time, so it falls back to a key that will simply never match anything.
 */
export const AUTH_STORAGE_KEY: string = (() => {
  try {
    return `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
  } catch {
    return "sb-placeholder-auth-token";
  }
})();

export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { detectSessionInUrl: false },
});

// ── Migration in place: localStorage session → cookie session ──────────────
//
// Every student who is signed in today holds their session in localStorage
// under `AUTH_STORAGE_KEY`, as `JSON.stringify(session)` (auth-js
// `_saveSession` → `setItemAsync`). The new client never looks there, so
// without this they would all be silently signed out on the deploy.
//
// So on first load we read that entry once, hand its two tokens to
// `setSession()` — which writes through the NEW cookie storage — and delete the
// localStorage copy. The student stays signed in across the deploy and never
// sees a sign-in page.
//
// It fails safe in every direction:
//   · No localStorage entry → nothing happens (new user, or already migrated).
//   · A cookie session already exists → the localStorage copy is the stale one;
//     it is deleted and NOT replayed, so a fresh session is never downgraded to
//     an older one.
//   · Malformed JSON, missing tokens, a refresh token the server rejects →
//     the error is swallowed, the stale entry is cleared, and the student lands
//     in the ordinary signed-out state: `AuthGuard` sends them to `/auth`. That
//     is a normal "please sign in again", not an error page.
//   · localStorage itself unavailable (Safari private mode, blocked storage) →
//     caught, treated as "nothing to migrate".
//
// It runs at most once per page load: the promise is memoised, and
// `components/auth-provider.tsx` awaits it BEFORE its first `getSession()`, so
// no read can observe the half-migrated state.

let migrationPromise: Promise<void> | null = null;

async function runLegacySessionMigration(): Promise<void> {
  if (typeof window === "undefined") return;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  try {
    // A cookie session already present wins: the localStorage copy is stale.
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const parsed = JSON.parse(raw) as {
        access_token?: unknown;
        refresh_token?: unknown;
        currentSession?: { access_token?: unknown; refresh_token?: unknown };
      };
      // v2 stores the session at the top level; the pre-2.0 shape nested it
      // under `currentSession`. Accept both — a student who has not opened the
      // product in a very long time still migrates instead of being logged out.
      const accessToken = parsed?.access_token ?? parsed?.currentSession?.access_token;
      const refreshToken = parsed?.refresh_token ?? parsed?.currentSession?.refresh_token;

      if (typeof accessToken === "string" && typeof refreshToken === "string") {
        // Writes through the cookie storage adapter. If the refresh token has
        // been revoked or expired this returns an error rather than throwing;
        // either way the cleanup below runs and the student signs in again.
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    }
  } catch {
    // Swallowed on purpose — see the fail-safe note above.
  } finally {
    try {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(`${AUTH_STORAGE_KEY}-code-verifier`);
      window.localStorage.removeItem(`${AUTH_STORAGE_KEY}-user`);
    } catch {
      /* storage unavailable; nothing to clean up */
    }
  }
}

/**
 * Idempotent. Await this before the first `getSession()` of a page load.
 */
export function migrateLegacyLocalSession(): Promise<void> {
  if (!migrationPromise) migrationPromise = runLegacySessionMigration();
  return migrationPromise;
}
