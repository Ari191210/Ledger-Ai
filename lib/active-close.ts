// ═══════════════════════════════════════════════════════════════════════════
// ACTIVE CLOSE — M14-8. THE BOUNDARY BUG IS FIXED AND THE PATTERN HAS MOVED OUT.
//
// An ACTIVE close is a close on a day with ≥1 qualifying academic event.
// A PASSIVE close is the cron's nightly row for everyone else — still written
// (series continuity), marked active=false.
//
// The client stamps `ledger-last-event` on every qualifying event; the stamp
// syncs inside the blob. The server never trusts the stamp alone: it
// corroborates against evidence inside the same blob.
//
//
// WHAT M14-8 CHANGED
//
// 1. **THE IST/UTC DAY-BOUNDARY BUG IS FIXED.** This file's header used to
//    carry the defect as a known-issue note:
//
//      > Known boundary: the stamp uses the student's LOCAL date while the cron
//      > closes on the UTC date. Events between 00:00–05:30 IST land on the
//      > previous UTC day. Accepted for shadow mode; Phase B moves closes to an
//      > IST boundary.
//
//    This IS Phase B, and the note is now a fixed bug rather than a plan.
//    Three places disagreed about what a day was — the stamp (browser-local),
//    the cron's close day (UTC), and the evidence comparison (`iso.slice(0,10)`,
//    also UTC). A student answering questions at 01:00 IST on the 17th stamped
//    `2026-08-17` while both the close day and the evidence read `2026-08-16`,
//    so the stamp missed the close day AND the evidence missed the stamp, and a
//    genuinely active day was recorded `active = false`. Every late-night
//    session in India, silently discarded.
//
//    D.1.b's fix is *"day-boundary logic … defined once, server-side, in the
//    student's declared timezone."* `dayKeyInZone` in
//    `lib/client-claim-corroboration.ts` is that one definition and all three
//    call sites now go through it — including `app/api/cron/score-snapshot`,
//    which closes on the IST day rather than the UTC one.
//
// 2. **THE CORROBORATION PATTERN HAS BEEN GENERALISED OUT OF THIS FILE.** R.10
//    calls this function *"the model for every client-originated claim"* and
//    asks for it to be generalised; it now lives in
//    `lib/client-claim-corroboration.ts` as `admitClientClaim`, and this file is
//    its first caller rather than its only implementation. The behaviour here
//    is unchanged apart from the boundary fix: the stamp must match the day AND
//    at least one evidence source must agree, so a forged stamp alone still
//    does nothing.
//
//
// WHAT IS STILL WEAK, RECORDED RATHER THAN HIDDEN
//
// Every source below reads the SAME BLOB the stamp came from, so they are
// `serverWritten: false`: a forger who writes two blob keys defeats a check
// designed to stop one who writes one. That is a property of the blob era, not
// of the pattern — J.7's *"the score is computed only on the server, from
// server-written events"* is the answer, and M14-6 wires it in for the score.
// This flag remains blob-derived until a later milestone gives it an
// event-derived source; `admitClientClaim` reports `serverWitnessed: false` for
// it, so the weakness is visible in the verdict instead of only in this comment.
// ═══════════════════════════════════════════════════════════════════════════

import {
  admitClientClaim,
  dayKeyInZone,
  dayKeyOf,
  dayMatchSource,
  type ClaimVerdict,
  type ClientClaim,
  type CorroborationSource,
} from "./client-claim-corroboration";

export type QualifyingEventType =
  | "practice_session"   // graded session, ≥5 questions
  | "mistake_cleared"    // recovery clear
  | "coverage_check"     // passed proof check
  | "focus_session"      // counted Pomodoro work session
  | "onboarding";        // first-close event during onboarding (Phase 4)

export const LAST_EVENT_KEY = "ledger-last-event";

/**
 * The day this instant belongs to, in the declared zone.
 *
 * **This replaced a `getFullYear()/getMonth()/getDate()` triple**, which read
 * whichever zone the browser happened to be in — so the same student on a
 * laptop set to UTC and a phone set to IST stamped two different days for one
 * event. The day a student's work belongs to is a property of the product's
 * declared zone, not of the device that happened to be in their hand.
 */
export const activeDayKey = (atMs: number = Date.now()): string => dayKeyInZone(atMs);

/** Stamp today as an active day. Cheap, idempotent, client-only. */
export function stampQualifyingEvent(type: QualifyingEventType): void {
  if (typeof window === "undefined") return;
  try {
    const at = Date.now();
    localStorage.setItem(
      LAST_EVENT_KEY,
      // `at` is D.1.b's `occurred_at` — a claim, retained so the server can
      // measure clock skew rather than being surprised by it.
      JSON.stringify({ date: activeDayKey(at), type, at }),
    );
  } catch {}
}

type Stamp = { date: string; type?: QualifyingEventType; at?: number };

function parseStamp(raw: string | undefined | null): Stamp | null {
  try {
    const s = raw ? (JSON.parse(raw) as Stamp) : null;
    return s && typeof s.date === "string" ? s : null;
  } catch { return null; }
}

const parseList = (blob: Record<string, string> | null, key: string): unknown[] => {
  try {
    const v = blob?.[key] ? JSON.parse(blob[key]) : [];
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};

const field = (record: unknown, key: string): unknown =>
  typeof record === "object" && record !== null ? (record as Record<string, unknown>)[key] : undefined;

/**
 * The evidence a blob can offer that a qualifying event happened on the claimed
 * day. Each one is a named `CorroborationSource`, so the verdict can say which
 * agreed instead of returning a bare `true`.
 *
 * Every date goes through `dayKeyOf`, which resolves it in the declared zone —
 * the `iso.slice(0, 10)` this replaced was the third of the three UTC readings
 * that made up the boundary bug.
 */
export function activeDaySources(
  blob: Record<string, string> | null,
): readonly CorroborationSource<QualifyingEventType>[] {
  return [
    dayMatchSource({
      name: "papers-log",
      records: () => parseList(blob, "ledger-papers-log"),
      dateOf: r => field(r, "date"),
      // The same ≥5 gate the score's MIN_SESSION_QUESTIONS applies: a
      // two-question paper is not a graded session.
      qualifies: r => typeof field(r, "total") === "number" && (field(r, "total") as number) >= 5,
    }),
    dayMatchSource({
      name: "coverage-checks",
      records: () => parseList(blob, "ledger-checks"),
      dateOf: r => field(r, "date"),
    }),
    dayMatchSource({
      name: "cleared-mistakes",
      records: () => parseList(blob, "ledger-mistakes"),
      dateOf: r => field(r, "clearedDate"),
      qualifies: r => field(r, "status") === "cleared",
    }),
    {
      name: "focus-last",
      serverWritten: false,
      agrees: claim =>
        claim.claimedDayKey !== null && dayKeyOf(blob?.["ledger-focus-last"]) === claim.claimedDayKey,
    },
  ];
}

/**
 * The stamp, as a claim rather than as a fact.
 *
 * A stamp with no readable `type` is **not a claim** — `stampQualifyingEvent`
 * writes the day and the type together, so a stamp carrying only a day is
 * malformed, and the honest reading of a malformed stamp is that nothing was
 * claimed. Returning `null` here rather than a claim whose value is `null` is
 * what keeps `ClientClaim<T>`'s contract true: `admitClientClaim` refuses a
 * null-valued claim by design (fail-closed), so a type admitting `null` would
 * have declared a value legal that can never be admitted.
 */
export function readActiveDayClaim(
  blob: Record<string, string> | null,
): ClientClaim<QualifyingEventType> | null {
  if (!blob) return null;
  const stamp = parseStamp(blob[LAST_EVENT_KEY]);
  if (!stamp || !stamp.type) return null;
  return {
    value: stamp.type,
    claimedAtMs: typeof stamp.at === "number" && Number.isFinite(stamp.at) ? stamp.at : null,
    // The stamp already carries a day key in the declared zone. A pre-fix stamp
    // carries a browser-local one; `dayKeyOf` returns a bare `YYYY-MM-DD`
    // unchanged, so an old stamp is read exactly as it was written and is not
    // retroactively reinterpreted into a different day.
    claimedDayKey: dayKeyOf(stamp.date),
  };
}

/**
 * R.10, for this one claim: does this blob show evidence of a qualifying event
 * on `dayKey`?
 *
 * The verdict, not the boolean — a caller that wants to record WHAT agreed can,
 * and `corroborateActiveDay` below is the boolean for callers that do not.
 *
 * @param dayKey `YYYY-MM-DD` in the DECLARED ZONE. Callers must produce it with
 * `activeDayKey()` / `dayKeyInZone()`; passing a UTC day here is the bug this
 * task fixed, and it is the reason the parameter is named for a key rather than
 * for a date.
 */
export function judgeActiveDay(
  blob: Record<string, string> | null,
  dayKey: string,
  observedAtMs?: number,
): ClaimVerdict<QualifyingEventType> {
  return admitClientClaim({
    claim: readActiveDayClaim(blob),
    sources: activeDaySources(blob),
    forDayKey: dayKey,
    observedAtMs,
  });
}

/**
 * Server-side: does this blob show evidence of a qualifying event on `dayKey`?
 * The stamp must match AND at least one evidence source must corroborate it —
 * a bare stamp with no matching record is ignored, so forging the stamp alone
 * does nothing.
 */
export function corroborateActiveDay(blob: Record<string, string> | null, dayKey: string): boolean {
  return judgeActiveDay(blob, dayKey).admitted;
}
