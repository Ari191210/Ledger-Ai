/**
 * Two-factor sign-in by email code, enforced on the server.
 *
 * A student who turns it on gets `app_metadata.two_factor = "email"` (only the
 * service role can write app_metadata). After that, a sign-in that began with a
 * password cannot reach any protected page or API until it has entered a code
 * we emailed to them. Google, an email link and a password reset are exempt:
 * each has just proven the inbox, so a second email would prove nothing new.
 *
 * The same rule lives in the database as private.session_meets_mfa()
 * (supabase/migrations/0021), which is what actually guards the data. This file
 * is the proxy's copy of it; if the two ever disagree the result is a redirect
 * loop, so the tests below pin this one and the e2e check pins both.
 */

/** Pages and APIs that need the code once two-factor is on. */
export const MFA_GUARDED = ["/dashboard", "/tools", "/score", "/settings", "/onboard", "/api"];

/** Sign-in methods (the JWT's `amr`) that have already proven the inbox. An
 *  allow-list on purpose: a method this does not know about still asks. */
export const INBOX_PROVEN_METHODS = ["oauth", "otp", "magiclink", "recovery", "invite", "email/signup"];

export type SessionClaims = {
  sessionId: string | null;
  twoFactor: string | null;
  methods: string[];
};

/** Pull the three things this needs out of verified JWT claims. */
export function readClaims(claims: Record<string, unknown> | null | undefined): SessionClaims {
  const amr = Array.isArray(claims?.amr) ? (claims.amr as { method?: unknown }[]) : [];
  const meta = (claims?.app_metadata ?? {}) as Record<string, unknown>;
  return {
    sessionId: typeof claims?.session_id === "string" ? claims.session_id : null,
    twoFactor: typeof meta.two_factor === "string" ? meta.two_factor : null,
    methods: amr.map((m) => (typeof m?.method === "string" ? m.method : "")).filter(Boolean),
  };
}

/** Could this sign-in owe a code? False means certainly not, with no database
 *  call. True means ask the database, which knows whether it was entered. */
export function mayOweCode(c: SessionClaims): boolean {
  if (c.twoFactor !== "email") return false;
  return !c.methods.some((m) => INBOX_PROVEN_METHODS.includes(m));
}

/**
 * Where the proxy should send a request whose sign-in owes a code, or null to
 * let it through. API calls are answered with a 401 instead, by the proxy.
 */
export function mfaRedirect(path: string, owesCode: boolean): string | null {
  if (!owesCode) return null;
  if (path.startsWith("/auth/")) return null;
  if (!MFA_GUARDED.some((p) => path === p || path.startsWith(p + "/"))) return null;
  return `/auth/mfa?next=${encodeURIComponent(path)}`;
}

/** "ojhaaryamman@gmail.com" → "o•••••••••n@gmail.com": enough to recognise. */
export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain || !name) return email;
  if (name.length <= 2) return `${name[0]}•@${domain}`;
  return `${name[0]}${"•".repeat(Math.min(name.length - 2, 8))}${name[name.length - 1]}@${domain}`;
}

/** Strip anything that is not a digit (a pasted "123 456"), keep six. */
export function cleanCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}
