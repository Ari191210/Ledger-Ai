import { mayOweCode, readClaims, type SessionClaims } from "@/lib/auth/mfa";

// Structural, so the proxy's client and the route handlers' client both fit.
type AuthClient = {
  auth: { getClaims(): Promise<{ data: { claims: Record<string, unknown> } | null }> };
  rpc(fn: "two_factor_satisfied"): PromiseLike<{ data: unknown; error: unknown }>;
};

/** The signed-in session's claims (verified), or null with no session. */
export async function sessionClaims(supabase: AuthClient): Promise<SessionClaims | null> {
  const { data } = await supabase.auth.getClaims();
  return data ? readClaims(data.claims) : null;
}

/**
 * Does this sign-in still owe an email code? Answered from the token alone for
 * everyone who has two-factor off (no database call), and by the database rule
 * otherwise, which is the one that also guards the data. If the database cannot
 * be asked, the answer is yes: a lock that opens when the check fails is not one.
 */
export async function sessionOwesSecondFactor(supabase: AuthClient): Promise<boolean> {
  const claims = await sessionClaims(supabase);
  if (!claims || !mayOweCode(claims)) return false;
  const { data, error } = await supabase.rpc("two_factor_satisfied");
  if (error) return true;
  return data !== true;
}
