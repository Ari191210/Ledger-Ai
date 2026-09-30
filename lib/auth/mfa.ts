/**
 * Two-factor sign-in (TOTP, an authenticator app), enforced on the server.
 *
 * Supabase tracks how strongly a session was proven: aal1 is a password (or
 * Google), aal2 is a password plus a code from the authenticator app. A student
 * who has turned two-factor on has nextLevel "aal2"; until they enter a code
 * their session stays at aal1, and every protected page and API sends them to
 * /auth/mfa first. Checking this in the browser alone would be a lock anyone can
 * step round, so the decision lives in the proxy and the API routes.
 */

// Supabase types the level as an open string ("aal1" | "aal2" | string); only "aal2" matters here.
export type Aal = string | null | undefined;

/** Pages and APIs that need a fully proven session once two-factor is on. */
export const MFA_GUARDED = ["/dashboard", "/tools", "/score", "/settings", "/onboard", "/api"];

/** True when the session still owes a second factor. */
export function owesSecondFactor(currentLevel: Aal, nextLevel: Aal): boolean {
  return nextLevel === "aal2" && currentLevel !== "aal2";
}

/**
 * Where the proxy should send this request, or null to let it through.
 * API calls are answered with a status rather than redirected, so the proxy
 * turns the "/api" case into a 401.
 */
export function mfaRedirect(path: string, currentLevel: Aal, nextLevel: Aal): string | null {
  if (!owesSecondFactor(currentLevel, nextLevel)) return null;
  if (path === "/auth/mfa" || path.startsWith("/auth/")) return null;
  if (!MFA_GUARDED.some((p) => path === p || path.startsWith(p + "/"))) return null;
  return `/auth/mfa?next=${encodeURIComponent(path)}`;
}

type MfaClient = {
  auth: {
    mfa: {
      getAuthenticatorAssuranceLevel(): Promise<{
        data: { currentLevel: Aal; nextLevel: Aal } | null;
      }>;
    };
  };
};

/**
 * The same check inside the handlers that matter most (the data export, the AI
 * route, deleting the account), so they stay shut even if the proxy's matcher
 * is ever narrowed and stops covering them.
 */
export async function sessionOwesSecondFactor(supabase: MfaClient): Promise<boolean> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return owesSecondFactor(data?.currentLevel, data?.nextLevel);
}
