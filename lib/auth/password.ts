/**
 * Password rules for new passwords (signup and reset), after NIST SP 800-63B:
 * a real minimum length and a check against passwords already leaked in
 * breaches. No forced "one uppercase, one symbol" rules: they make passwords
 * harder to remember without making them harder to guess.
 *
 * This runs in the browser, so it only protects honest users: anyone can call
 * Supabase directly with the public key. The binding rules live in the Supabase
 * dashboard (minimum length, leaked password protection). This is the layer a
 * student actually sees, with a reason attached.
 */

export const MIN_PASSWORD_LENGTH = 10;

/** The first rule a new password breaks, or null if it passes the local rules. */
export function passwordProblem(password: string, email?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (/^(.)\1+$/.test(password)) return "Use more than one repeated character.";
  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && password.toLowerCase().includes(local)) return "Don't build your password from your email address.";
  return null;
}

async function sha1Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

/**
 * Whether the password appears in HaveIBeenPwned's breach corpus, by
 * k-anonymity: only the first 5 characters of its SHA-1 hash leave the browser,
 * and the match is made locally against the returned suffixes. The password
 * itself, and its full hash, are never sent anywhere.
 *
 * Fails open: if the service can't be reached the answer is "not found", so an
 * outage elsewhere never stops a student from signing up.
 */
export async function isBreachedPassword(password: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5), suffix = hash.slice(5);
    const res = await fetcher(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { "Add-Padding": "true" } });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split("\n").some((line) => {
      const [s, count] = line.trim().split(":");
      return s === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}

export const BREACHED_MESSAGE =
  "That password has shown up in a data breach, so it's one of the first an attacker would try. Pick a different one.";
