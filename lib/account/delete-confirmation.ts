/**
 * The one rule for "has this person confirmed they want the account deleted".
 *
 * It lives apart from both callers because the form and the server action each
 * have to apply it and they must agree exactly. If the server trimmed and the
 * form did not, the button would light up on input the server then rejects; if
 * the form were the looser of the two, it would promise a deletion that fails.
 * Neither is a disaster, but both are the kind of drift nobody notices until
 * someone is trying to leave and cannot.
 *
 * The confirmation is the account's own email rather than a fixed word like
 * "delete", which is the same string for every account and proves only that
 * something typed four letters.
 */
export function confirmsDeletion(typed: string, email: string): boolean {
  const a = typeof typed === "string" ? typed.trim().toLowerCase() : "";
  const b = typeof email === "string" ? email.trim().toLowerCase() : "";
  // An account with no email on it cannot be confirmed this way, and must not
  // fall through to "two empty strings match".
  return b.length > 0 && a === b;
}
