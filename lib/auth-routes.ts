// ═══════════════════════════════════════════════════════════════════════════
// M4-1 — edge authentication, the pure half.
//
// Architecture R.1: "every product route that renders student data must be
// authenticated before it renders, at the server or the edge." T11: client-only
// guards are "survivable while everything is client-side and RLS-protected. It
// stops being survivable the moment server components read student data."
//
// This module holds the DECISION and no I/O: given a pathname and the names of
// the cookies on the request, it says allow or redirect. `middleware.ts`
// supplies the request and acts on the verdict. Keeping the decision pure is
// what lets `tests/auth-middleware.test.mjs` prove BOTH directions — an
// unauthenticated request is denied AND an authenticated request is allowed —
// with no live Supabase project in reach.
//
// No imports. No clock. No network. No `next/server`.
//
//
// ── THE STATE OF ENFORCEMENT — READ BEFORE FLIPPING THE FLAG ───────────────
//
// The blocker this file was written under is GONE. StudyLedger's browser
// session used to live in `window.localStorage`, which the edge cannot see, so
// every request — valid ones included — arrived carrying no evidence of a
// session and a fail-closed middleware would have locked out one hundred per
// cent of users. `lib/supabase.ts` now builds the browser client with
// `createBrowserClient` from `@supabase/ssr`, whose storage adapter is
// `document.cookie`. The session is now on a transport the edge can read, and
// `components/auth-provider.tsx` migrates an existing localStorage session into
// it on first load so nobody is signed out by the change.
//
// What remains is not an architectural gap, it is a VERIFICATION gap. The
// cookie contract below was read out of `@supabase/ssr@0.12.4`'s own source
// (`src/cookies.ts`, `src/utils/chunker.ts`) and is asserted in
// `tests/auth-middleware.test.mjs`, but no one has yet watched a real browser
// complete a real sign-in against the real project and confirm the cookie
// lands. Turning enforcement on is a change whose failure mode is "nobody can
// use the product", so it stays behind `AUTH_MIDDLEWARE_ENFORCE`, OFF unless
// explicitly set to "1", until a human has done that once. The precise list of
// what to check is in `EXECUTION_PLAN.md` under M4-1.
//
// This is a deliberate, named, single-switch gate, not a silent fail-open: the
// decision below is computed identically whether or not the flag is set, and
// only the ACTION is suppressed. `AuthGuard` (M4-2) is the live gate meanwhile.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Page-route prefixes that render student-specific data and must be
 * authenticated at the edge.
 *
 * `/dashboard` and `/console` are 308 redirects to `/home` as of M3 — but only
 * on the EXACT paths (`next.config.mjs` uses `^(?!/_next)/dashboard(?:/)?$`).
 * `/dashboard/profile`, `/dashboard/saved`, `/console/ai`, `/console/analytics`,
 * `/console/practice` and `/console/work` still resolve and still render
 * student data, so the segments are protected as prefixes, not just as the two
 * retired leaves. The config redirect runs BEFORE middleware in the Next.js
 * routing pipeline (headers → redirects → middleware), so a bare `/dashboard`
 * is answered by the 308 and `/home` is what middleware actually authenticates
 * — which is the correct order: an unauthenticated visitor is bounced to
 * `/auth` from `/home`, and never renders either shell.
 */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/console",
  "/tools",
  "/onboard",
  // M16-1 — `/settings` absorbs `/dashboard/profile` and `/tools/personalise`
  // (`PRODUCT_DECISIONS` §2.4) and renders the same student-specific data
  // both did: username, study profile, billing, exam schedule and parent
  // sharing. Both source prefixes (`/dashboard`, `/tools`) are already
  // protected above; `/settings` needs its own entry because it is a new
  // top-level segment, not a path under either.
  "/settings",
] as const;

/**
 * Routes that must stay reachable signed out. This list is not consulted by
 * `isProtectedRoute` — protection is an allowlist of prefixes, so anything not
 * named above is public by construction — it exists so the guarantee is
 * TESTABLE by name rather than by inference (see `tests/auth-middleware.test.mjs`).
 *
 * `/parent/<code>` is public ON PURPOSE and permanently: a parent has no
 * account. That surface is authenticated by the share code and governed by
 * architecture N.5, not by Supabase Auth. Protecting it would break the
 * feature, not secure it.
 *
 * `/admin` is likewise absent on purpose: it is authenticated by
 * `ADMIN_KEY` (`lib/admin-auth.ts`), a different identity system. Sending an
 * admin to the student sign-in page would be wrong, and gating it on a student
 * session would be weaker than the bearer key it already uses.
 */
export const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/auth/callback",
  "/auth/reset",
  "/pricing",
  "/faq",
  "/legal",
  "/limit",
  "/parent",
  "/admin",
] as const;

/** Where a denied request goes. */
export const SIGN_IN_PATH = "/auth";

/**
 * A path is protected iff it is one of the prefixes above, matched on a
 * SEGMENT boundary. `startsWith` alone would protect a hypothetical
 * `/homepage` or `/toolsmith`; requiring the next character to be `/` or
 * end-of-string keeps the set exactly the five segments named.
 *
 * `/api/*` is never protected here. API routes authenticate their own bearer
 * tokens (`app/api/ai/route.ts`) or their own secrets (`lib/cron-auth.ts`), and
 * answering an API call with an HTML redirect to a sign-in page would turn a
 * clean 401 into a 200 full of markup.
 */
export function isProtectedRoute(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return false;
  return PROTECTED_PREFIXES.some(
    p => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * The cookie contract, read out of `@supabase/ssr@0.12.4` rather than guessed.
 *
 * NAME. `@supabase/ssr` names cookies after the auth storage key and nothing
 * else (`createStorageFromOptions`, the `isServerClient === false` branch:
 * `setItem(key, …)` writes cookies called `key`). `supabase-js` derives that
 * key as `sb-${new URL(url).hostname.split(".")[0]}-auth-token`, so for
 * `https://<ref>.supabase.co` it is `sb-<ref>-auth-token`.
 *
 * CHUNKING. `createChunks()` returns `[{ name: key }]` when the URL-encoded
 * value fits `MAX_CHUNK_SIZE` (3180) and otherwise `[{ name: key.0 }, …]`.
 * Both forms must read as a session; a session is base64url-encoded before it
 * is written, which inflates it, so the chunked form is the common one.
 *
 * The ref is matched as `[a-z0-9-]+` rather than `[a-z0-9]+`: a Supabase
 * project ref is twenty lowercase letters, but a custom or self-hosted
 * hostname (`db-prod.example.com`) yields a key with a hyphen in it, and
 * reading a real session as "absent" is the failure that locks people out.
 * Widening it cannot let a verifier through, because the pattern is anchored
 * on `-auth-token` at the END.
 *
 * THE PKCE VERIFIERS ARE NOT SESSIONS. `@supabase/ssr` 0.12 writes three keys
 * that are all written at the START of a sign-in attempt, before any session
 * exists:
 *
 *   sb-<ref>-auth-token-code-verifier             the fixed per-flow verifier
 *   sb-<ref>-auth-token-flow-<id>-code-verifier   a slot in the verifier ring
 *   sb-<ref>-auth-token-flows-code-verifier       the index of pending flows
 *
 * Treating any of them as a session would let anyone who merely OPENED the
 * sign-in page through the gate. That is the one subtle way this check could
 * fail open, so it is excluded twice over: the pattern's `$` anchor already
 * rejects every `-code-verifier` suffix, and `VERIFIER_SUFFIX` rejects it again
 * explicitly so that no future widening of the ref class can quietly undo it.
 * Both are asserted in `tests/auth-middleware.test.mjs`.
 *
 * The pre-2.0 name `supabase-auth-token` is accepted too, so that a database
 * still issuing the legacy cookie is not read as signed out.
 */
const SUPABASE_SESSION_COOKIE = /^sb-[a-z0-9-]+-auth-token(\.[0-9]+)?$/;
const VERIFIER_SUFFIX = /-code-verifier(\.[0-9]+)?$/;
const LEGACY_SESSION_COOKIE = "supabase-auth-token";

export function isSessionCookieName(name: string): boolean {
  if (VERIFIER_SUFFIX.test(name)) return false;
  return name === LEGACY_SESSION_COOKIE || SUPABASE_SESSION_COOKIE.test(name);
}

/**
 * Presence of a session cookie, not validity of one. Middleware deliberately
 * does not verify the JWT signature here: verification needs the project's JWT
 * secret at the edge, and an unverified-but-present cookie is still the correct
 * INPUT to a redirect decision — a forged cookie buys a forger nothing, because
 * every data path behind this is RLS-scoped to `auth.uid()` and rejects a
 * signature it cannot verify (architecture R.2, R.4). What this gate removes is
 * the case R.1 names: an unauthenticated request REACHING a server component
 * that renders student data.
 *
 * Full signature verification at the edge is the natural follow-on and is noted
 * for M5, where `getStudentContext()` becomes the server-side identity.
 */
export function hasSessionCookie(cookieNames: readonly string[]): boolean {
  return cookieNames.some(isSessionCookieName);
}

/** Is edge enforcement switched on? See the header note before changing this. */
export function isEnforcementEnabled(
  env: { AUTH_MIDDLEWARE_ENFORCE?: string } = {},
): boolean {
  return env.AUTH_MIDDLEWARE_ENFORCE === "1";
}

export type AuthVerdict = {
  /** What middleware should do. */
  action: "allow" | "redirect";
  /** Where to send a redirect. Present iff `action === "redirect"`. */
  location?: string;
  /** True when the route is protected and no session was presented. */
  denied: boolean;
  /** True when `denied` was not acted on because enforcement is off. */
  observedOnly: boolean;
};

/**
 * The whole decision, in one pure function.
 *
 * Note the shape: `denied` is computed the same way in both modes. Enforcement
 * only decides whether `denied` becomes a redirect. That is what makes the
 * flag auditable — a test can prove the deny decision is correct today, before
 * anyone turns it on.
 */
export function authDecision(input: {
  pathname: string;
  cookieNames: readonly string[];
  enforce: boolean;
}): AuthVerdict {
  const { pathname, cookieNames, enforce } = input;

  if (!isProtectedRoute(pathname)) {
    return { action: "allow", denied: false, observedOnly: false };
  }

  if (hasSessionCookie(cookieNames)) {
    return { action: "allow", denied: false, observedOnly: false };
  }

  if (!enforce) {
    return { action: "allow", denied: true, observedOnly: true };
  }

  return {
    action: "redirect",
    location: SIGN_IN_PATH,
    denied: true,
    observedOnly: false,
  };
}
