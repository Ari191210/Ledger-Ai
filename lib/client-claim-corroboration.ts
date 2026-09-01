// ═══════════════════════════════════════════════════════════════════════════
// M14-8 — CORROBORATION, GENERALISED. AND THE DAY BOUNDARY, DEFINED ONCE.
//
// EXECUTION_PLAN M14-8: *"Generalise the `active-close` corroboration pattern
// to all client claims; fix the IST/UTC boundary. **ADAPT.** Done when: R.10 —
// a client claim is admissible only when a server-observable fact agrees."*
//
// Architecture R.10, verbatim:
//
//   > **Forgery:** the `lib/active-close.ts` corroboration pattern is the model
//   > for every client-originated claim — `corroborateActiveDay` requires the
//   > client stamp **and** independent corroboration, so a forged stamp alone
//   > does nothing. **Generalise it: a client claim is admissible only when a
//   > server-observable fact agrees with it.**
//   >
//   > **Clock:** both timestamps and the skew retained (D.1.b), so the IST/UTC
//   > day-boundary class of bug is diagnosable rather than silent.
//
//
// PART 1 — THE PATTERN, AS A TYPE
//
// `corroborateActiveDay` had the right shape and the wrong scope: it was one
// function about one claim, and its discipline lived in its body where nothing
// else could reuse it. Here the discipline is the TYPE.
//
//   · A claim arrives as `ClientClaim<T>` and is never a `T`. A caller cannot
//     accidentally pass an unverified client value where a fact is expected,
//     because the two are different types and only `admitClientClaim` converts
//     one into the other.
//   · Admission requires at least one `CorroborationSource` to AGREE. A claim
//     with no sources is refused — `uncorroborated` is the DEFAULT verdict, not
//     the exceptional one, which is what makes forgetting to corroborate fail
//     closed rather than open.
//   · The verdict names the source that agreed. A flag that cannot say what
//     corroborated it is a claim wearing a fact's clothes — `lib/occurrences.ts`'s
//     rule, and the reason `RecoveryEvidence` carries its ids.
//
// This module is deliberately NOT a validator. Corroboration is not "is this
// well-formed"; it is "does something the client could not write agree with
// it." A source that reads another client-written field is not a source, and
// the doc comment on `CorroborationSource` says so where an author will read it.
//
//
// PART 2 — THE IST/UTC BOUNDARY BUG, AND THE ACTUAL FIX
//
// `lib/active-close.ts`'s own header admitted it:
//
//   > Known boundary: the stamp uses the student's LOCAL date while the cron
//   > closes on the UTC date. Events between 00:00–05:30 IST land on the
//   > previous UTC day.
//
// THREE places disagreed about what "a day" is, and every pair of them was a
// separate off-by-one:
//
//   1. the client stamp        `new Date().getFullYear()/getMonth()/getDate()`
//                              → whatever zone the browser happens to be in
//   2. the cron's close day    `new Date().toISOString().slice(0, 10)`  → UTC
//   3. the evidence comparison `iso.slice(0, 10)`                       → UTC
//
// A student answering questions at 01:00 IST on the 17th produced a stamp
// reading `2026-08-17`, an evidence timestamp whose UTC date read `2026-08-16`,
// and a cron close day that read `2026-08-16` — so the stamp failed to match
// the close day, the evidence failed to match the stamp, and a genuinely active
// day was recorded `active = false`. Every late-night session in India, silently
// discarded.
//
// D.1.b names the fix and it is not "add 5:30 somewhere": *"day-boundary logic
// [is] defined once, server-side, in the student's declared timezone."*
// `dayKeyInZone` below is that one definition, and all three call sites now go
// through it. It is pure arithmetic over an epoch instant and a fixed offset, so
// it returns the same answer on a Vercel box in UTC, on a laptop in IST, and in
// a test — which is what lets the boundary be asserted rather than described.
//
// **What is deliberately NOT done here.** This does not become a general
// timezone library and it does not read a per-student timezone yet: `students`
// (012) has no such column, and inventing one is M16's. `DECLARED_ZONE_OFFSET_MINUTES`
// is a single declared offset with the reasoning attached, replaceable by a
// per-student read at exactly one call site when that column exists.
//
// No I/O, no Supabase, no `next/*`, no `localStorage`. Importable from a client
// component and from a cron route alike, which is the only way three call sites
// can share one definition.
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// THE DAY BOUNDARY
// ───────────────────────────────────────────────────────────────────────────

/**
 * IST is UTC+05:30 and has no daylight saving, so a fixed offset is exact
 * rather than approximate — which is why this can be integer arithmetic and
 * not a timezone database.
 *
 * The product's students are Indian school students (`PRODUCT_DECISIONS` §1),
 * so this is the declared zone until a per-student one exists. It is a NAMED
 * CONSTANT rather than a literal `330` at three call sites precisely so that
 * replacing it is one edit.
 */
export const IST_OFFSET_MINUTES = 330;

/** The zone every day boundary in this product is measured in. D.1.b. */
export const DECLARED_ZONE_OFFSET_MINUTES = IST_OFFSET_MINUTES;

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/**
 * THE ONE DEFINITION OF "WHICH DAY". `YYYY-MM-DD`, in the declared zone.
 *
 * Pure arithmetic on the epoch instant: shift into the zone, then read the UTC
 * calendar of the shifted instant. It never consults the host's timezone, so
 * the cron, the browser and the test agree by construction rather than by the
 * deployment happening to be configured correctly.
 */
export function dayKeyInZone(atMs: number, offsetMinutes: number = DECLARED_ZONE_OFFSET_MINUTES): string {
  const shifted = new Date(atMs + offsetMinutes * MINUTE_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * The same, for a stored timestamp. Accepts what the record actually holds:
 * a full ISO instant (`2026-08-16T19:30:00Z`) or a bare date (`2026-08-16`).
 *
 * A bare date has no instant, so it cannot be shifted — it IS a day key
 * already, and reinterpreting it as UTC midnight and shifting would move some
 * of them a day. Returning it unchanged is the honest reading of a value that
 * only ever claimed to be a day.
 */
export function dayKeyOf(
  value: unknown,
  offsetMinutes: number = DECLARED_ZONE_OFFSET_MINUTES,
): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const t = Date.parse(value);
  return Number.isFinite(t) ? dayKeyInZone(t, offsetMinutes) : null;
}

/**
 * D.1.b: *"`occurred_at` is a claim, `received_at` is a fact. Both are kept …
 * plus `clock_skew_ms`, [which] makes that class of bug diagnosable instead of
 * silent."*
 *
 * Positive means the client's clock ran ahead of the server's. This is
 * DIAGNOSTIC and never a gate: refusing a claim for skew would punish a student
 * for a wrong wall clock, which they did not choose and cannot see.
 */
export const clockSkewMs = (claimedAtMs: number, observedAtMs: number): number =>
  claimedAtMs - observedAtMs;

/** How far apart two instants are in whole days, in the declared zone. Used to
 *  say *"the claim is for a day the server never saw"* without a subtraction of
 *  two strings. */
export const dayKeyDistance = (a: string, b: string): number =>
  Math.round(Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS);

// ───────────────────────────────────────────────────────────────────────────
// THE PATTERN
// ───────────────────────────────────────────────────────────────────────────

/**
 * Something the client asserted. **Not a fact.**
 *
 * The wrapper exists so a client value cannot reach a place expecting a fact
 * without passing through `admitClientClaim`. `claimedAtMs` is D.1.b's
 * `occurred_at` — retained, never trusted.
 */
export interface ClientClaim<T> {
  /** What the client says. */
  value: T;
  /** When the client says it happened. A claim. */
  claimedAtMs: number | null;
  /** Which day the client says it belongs to, in the declared zone. */
  claimedDayKey: string | null;
}

/**
 * A fact the server can observe, which either agrees with the claim or does
 * not.
 *
 * **`agrees` must read something the client could not have written.** A source
 * backed by another client-synced field corroborates nothing — it lets a forger
 * who writes two fields pass a check designed to stop a forger who writes one.
 * The sources in `lib/active-close.ts` are transitional and their header says
 * so; the durable ones read server-written rows (`assessment_attempts`,
 * `study_sessions`, `academic_events`), which no client can insert.
 */
export interface CorroborationSource<T> {
  /** Named, because a verdict has to be able to say what agreed with it. */
  name: string;
  /** Does a server-observable fact agree with this claim? */
  agrees: (claim: ClientClaim<T>) => boolean;
  /**
   * Whether this source reads server-written data. `false` marks a transitional
   * source that a later milestone must replace; `admitClientClaim` still counts
   * it, and the verdict reports it, so the weakness is visible in the data
   * rather than only in a comment.
   */
  serverWritten?: boolean;
}

export type ClaimRefusal =
  /** Nothing was claimed. */
  | "no-claim"
  /** The claim was unreadable — a coerced claim is a claim wearing a fact's clothes. */
  | "unreadable-claim"
  /** The claim is for a different day than the one being decided. */
  | "wrong-day"
  /** Nothing the server can observe agrees with it. R.10's default verdict. */
  | "uncorroborated";

export type ClaimVerdict<T> =
  | {
      admitted: true;
      value: T;
      /** Every source that agreed, in the order they were offered. */
      corroboratedBy: readonly string[];
      /** True only when at least one agreeing source reads server-written data. */
      serverWitnessed: boolean;
      /** D.1.b, diagnostic only. `null` when the claim carried no instant. */
      clockSkewMs: number | null;
    }
  | { admitted: false; refusal: ClaimRefusal; corroboratedBy: readonly [] };

const REFUSED = <T,>(refusal: ClaimRefusal): ClaimVerdict<T> => ({
  admitted: false,
  refusal,
  corroboratedBy: [],
});

/**
 * R.10, AS A FUNCTION: *"a client claim is admissible only when a
 * server-observable fact agrees with it."*
 *
 * The default verdict is REFUSAL. A caller who forgets to pass a source, or
 * whose sources all disagree, gets `admitted: false` — the failure mode of
 * forgetting is a claim not counted, never a forgery counted.
 *
 * @param forDayKey when given, the claim must also be FOR that day. This is
 * where the IST/UTC bug used to live: the caller passed a UTC day and the claim
 * carried a local one. Both sides now come from `dayKeyInZone`, so they are the
 * same kind of thing before they are compared.
 */
export function admitClientClaim<T>(args: {
  claim: ClientClaim<T> | null;
  sources: readonly CorroborationSource<T>[];
  forDayKey?: string;
  observedAtMs?: number;
}): ClaimVerdict<T> {
  const { claim } = args;
  if (!claim) return REFUSED<T>("no-claim");
  if (claim.value === null || claim.value === undefined) return REFUSED<T>("unreadable-claim");

  if (args.forDayKey !== undefined && claim.claimedDayKey !== args.forDayKey) {
    return REFUSED<T>("wrong-day");
  }

  const corroboratedBy: string[] = [];
  let serverWitnessed = false;
  for (const s of args.sources) {
    if (!s.agrees(claim)) continue;
    corroboratedBy.push(s.name);
    if (s.serverWritten) serverWitnessed = true;
  }

  if (corroboratedBy.length === 0) return REFUSED<T>("uncorroborated");

  return {
    admitted: true,
    value: claim.value,
    corroboratedBy: Object.freeze(corroboratedBy),
    serverWitnessed,
    clockSkewMs:
      claim.claimedAtMs !== null && args.observedAtMs !== undefined
        ? clockSkewMs(claim.claimedAtMs, args.observedAtMs)
        : null,
  };
}

/** The common case, for a caller that only wants the boolean. Kept separate so
 *  reaching for the boolean is a deliberate discard of the verdict's detail. */
export const isAdmitted = <T,>(v: ClaimVerdict<T>): boolean => v.admitted;

/**
 * Sugar for the shape every day-scoped source has: *"is there a record dated
 * this day?"* Written once here so no call site slices a string to get a date
 * again — that slice was one third of the IST/UTC bug.
 */
export function dayMatchSource<T>(args: {
  name: string;
  serverWritten?: boolean;
  /** Every dated record this source can see. */
  records: () => readonly unknown[];
  /** The date field of one record — returned raw, converted by `dayKeyOf`. */
  dateOf: (record: unknown) => unknown;
  /** An extra condition on the record, e.g. *"and it graded at least 5 items"*. */
  qualifies?: (record: unknown) => boolean;
  offsetMinutes?: number;
}): CorroborationSource<T> {
  return {
    name: args.name,
    serverWritten: args.serverWritten ?? false,
    agrees: (claim) => {
      if (claim.claimedDayKey === null) return false;
      for (const r of args.records()) {
        if (args.qualifies && !args.qualifies(r)) continue;
        if (dayKeyOf(args.dateOf(r), args.offsetMinutes) === claim.claimedDayKey) return true;
      }
      return false;
    },
  };
}
