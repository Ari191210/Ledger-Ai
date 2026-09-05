/**
 * Age maths, in IST.
 *
 * India's DPDP Act draws its line at 18, so "is this user a child" has to be a
 * calendar-day question in the user's own timezone, not the server's. Same rule
 * as everywhere else in this codebase: never use raw Date getters for a
 * calendar day, go through lib/date.ts.
 */

import { todayPartsIST } from "./date";

/** Youngest and oldest we will accept. Keeps typos out of a legal signal. */
export const MIN_AGE = 8;
export const MAX_AGE = 100;

/** Whole years old today, in IST. `dob` is an ISO date, "2009-04-17". */
export function ageFromDob(dob: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;

  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  // reject dates the calendar does not have, e.g. 2009-02-31
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) {
    return null;
  }

  const today = todayPartsIST();
  let age = today.year - y;
  // birthday not reached yet this year
  if (today.month < mo || (today.month === mo && today.day < d)) age -= 1;
  return age;
}

/** Under 18 is a child under the DPDP Act. Unknown DOB is not a claim either way. */
export function isMinor(dob: string | null | undefined): boolean | null {
  if (!dob) return null;
  const age = ageFromDob(dob);
  return age === null ? null : age < 18;
}

export function validateDob(dob: string): { ok: true } | { ok: false; error: string } {
  const age = ageFromDob(dob);
  if (age === null) return { ok: false, error: "Enter a real date of birth." };
  if (age < MIN_AGE) return { ok: false, error: "That date of birth looks wrong." };
  if (age > MAX_AGE) return { ok: false, error: "That date of birth looks wrong." };
  return { ok: true };
}
