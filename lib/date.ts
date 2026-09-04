// StudyLedger's "day" boundary is IST (Asia/Kolkata, UTC+5:30, no DST) —
// the product is for Indian students. A UTC or server-local day boundary
// flips "today" at 5:30am IST instead of midnight, silently misattributing
// anything logged late at night (exactly when students are studying).
//
// Every place that turns "now" (or any instant) into a calendar day for
// streaks, the dashboard, or the Study Days calendar must go through this
// file — never `.toISOString().slice(0, 10)` or `.getDate()` directly.

const IST = "Asia/Kolkata";

/** YYYY-MM-DD for the given instant, in IST. Defaults to now. */
export function isoDateIST(when: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(when);
}

/** IST calendar date, n days before now, as YYYY-MM-DD. */
export function isoDaysAgoIST(n: number): string {
  return isoDateIST(new Date(Date.now() - n * 86_400_000));
}

/** The Y/M/D (IST) "now" currently is. Month is 1-12. */
export function todayPartsIST(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Days in the given IST calendar month (month is 1-12). */
export function daysInMonthIST(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Mon=0..Sun=6 for the 1st of the given IST calendar month (month is 1-12). */
export function firstWeekdayIST(year: number, month: number): number {
  const dow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // Sun=0
  return (dow + 6) % 7;
}

/** Hour of day (0-23) for the given instant, in IST. */
export function hourIST(when: string | Date): number {
  const d = typeof when === "string" ? new Date(when) : when;
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: IST, hour: "2-digit", hour12: false }).format(d),
  ) % 24;
}
