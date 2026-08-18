import { supabase } from "./supabase";
import { stableHash } from "./ingest/hash";
import { hydrateAbsentOnly } from "./sync-merge";

// ═══════════════════════════════════════════════════════════════════════════
// M7-6 — THE 15-SECOND WHOLE-BLOB UPSERT AND THE MERGE-BY-STRING-LENGTH ARE
// GONE. WHAT IS LEFT IS A NARROW, MARKED, TEMPORARY LEGACY FLUSH.
//
// EXECUTION_PLAN M7-6: *"Retire the 15s whole-blob upsert and merge-by-string-
// length. Verdict DELETE. Done when: `lib/sync.ts:67`,
// `components/sync-manager.tsx:7,42-45` no longer write the academic record."*
//
// TWO THINGS WERE DELETED OUTRIGHT, AND NEITHER IS COMING BACK:
//
//   1. `pushToCloud()` — an UNCONDITIONAL upsert of all twenty synced keys,
//      fired every 15 seconds whether or not a single byte had changed. It
//      wrote the whole record hundreds of times an hour to capture the same
//      bytes.
//   2. `pullFromCloud`'s conflict resolution, which was, verbatim:
//
//          if (!local || value.length > local.length)
//
//      **A longer string is not a newer fact.** That line adjudicated between
//      two versions of a student's academic record by counting characters, so a
//      device holding a stale record with more entries silently overwrote a
//      device holding a corrected one with fewer — and a deletion could never
//      win, ever, by construction. It is Law 7 (*"never lie … no fabricated
//      trend"*) failing in four tokens: the ordering it invents is not an
//      ordering that exists.
//
// WHAT REPLACED THE MERGE. `hydrateAbsentOnly` — the cloud copy may FILL a key
// this device does not have, and may never adjudicate between two values that
// both exist. That is M5-2's rule for `resolveProfile()` applied one layer down
// (*"the cache may only answer a question the server left blank"*), and it is
// the only rule available here that invents nothing: neither copy carries a
// per-key timestamp, so there is no honest way to say which is newer, and the
// honest response to an unanswerable question is to not answer it. A student
// signing in on a new device still gets their record; a student with two
// devices no longer has one silently overwrite the other.
//
//
// ═══════════════════════════════════════════════════════════════════════════
// WHY A WRITE PATH TO `user_data.blob` STILL EXISTS AT ALL — AND WHAT REMOVES IT
// ═══════════════════════════════════════════════════════════════════════════
//
// `flushLegacyBlob()` below is a **narrow, explicitly-scoped compatibility
// shim**, and it is here because deleting it would break shipped features that
// have no replacement yet.
//
// `user_data.blob` has four live SERVER-SIDE readers, and one of them is the
// score:
//
//   app/api/cron/score-snapshot     the daily Ledger Score close
//   app/api/cron/risk-alerts        exam-risk alerts
//   app/api/cron/notifications      the notification engine
//   app/api/cron/weekly-report      the weekly report
//
// M17 removed the other two: `app/api/parent/[code]` (the unauthenticated
// parent surface) is deleted outright, and `app/api/send-parent-digest` no
// longer derives its figures from the blob at all — it reads only through
// `buildParentProjectionForDelivery()` (`lib/parent-projection-server.ts`),
// scoped to the Shared views in `029_parent_space.sql` (architecture N.5).
//
// All four derive their figures through `scoreInputsFromBlob()`. The event
// substrate cannot feed any of them today: every tool manifest still declares
// `emits_events: []` (M8+), there are no projections (M12), and there is no
// event-derived score (M14). Deleting the writer now would freeze every
// student's score at the last byte written and stop the Return beat
// (`PRODUCT_PRINCIPLES` §7.1) — *"the only reason a student comes back
// tomorrow"* — in exchange for a tidier module. That is a worse outcome than
// the seam, and M7-6's own verdict line is *"DELETE **after backfill**"* (S.1),
// not "delete first".
//
// So the shim is narrowed instead, in four ways that the deleted function had
// none of:
//
//   · **It writes only when the content actually changed** (a stable hash of
//     the payload, compared against the last flush). A no-op session writes
//     nothing at all.
//   · **It is called from exactly two moments** — the tab going hidden, and the
//     page unloading — and from no timer. See `components/sync-manager.tsx`.
//   · **It reports which keys it wrote**, split into `academic` and `device`,
//     so "what still writes the academic record" is a value a test can read
//     rather than a thing to grep for.
//   · **It never touches `legacy_blob`.** 017 froze that column with a trigger
//     that refuses even the service role. The permanent archive and the live
//     transport are different columns, and only the transport is still written.
//
// **REMOVE `flushLegacyBlob()` AND `ACADEMIC_KEYS` WHEN ALL THREE ARE TRUE:**
//
//   1. M9/M10 exist, so study sessions and assessments emit real events and the
//      academic keys have a substrate that can hold what they hold.
//   2. M12 exists, so the projections those events feed are the inputs.
//   3. M14 is cut over, so `app/api/cron/score-snapshot` and the other five
//      readers no longer call `scoreInputsFromBlob()`.
//
// At that point this whole module becomes device-preference sync and nothing
// else, and `supabase/migrations/017_legacy_blob_freeze.sql` §5 states the
// matching condition for dropping the column. The same one-way-door convention
// M1-3, M5-2, M6-1 and `lib/events.ts` each wrote into their own fallbacks.
// ═══════════════════════════════════════════════════════════════════════════

// All localStorage keys that should survive across devices
export const SYNC_KEYS = [
  "ledger-profile",
  "ledger-onboarding-done",
  "ledger-focus-streak",
  "ledger-focus-last",
  "ledger-focus-shield",
  "ledger-habits-list",
  "ledger-habits-log",
  "ledger-weak-topics",
  "ledger-deadlines",
  "ledger-notes-history",
  "ledger-plan-v1",
  "ledger-papers-log",
  "ledger-mistakes",
  "ledger-syllabus",
  "ledger-syllabus-subjects",
  "ledger-formula-history",
  "ledger-career-answers",
  "ledger-career-output",
  // Integrity Sprint (v2 engine): coverage proof checks + active-day stamp.
  "ledger-checks",
  "ledger-last-event",
  // M24 — the Workspace Engine's four-trait CHOICE (never a derived token;
  // `lib/console/workspace.ts:312-315`'s own rule, generalised). Device
  // preference, same class as the habit/plan/career keys below.
  "ledger-workspace",
] as const;

type SyncKey = (typeof SYNC_KEYS)[number];

/**
 * The keys that ARE the academic record — the ones `scoreInputsFromBlob()` and
 * `scoreInputsV2FromBlob()` read, plus the two the v2 engine's proof gate and
 * active-day corroboration read.
 *
 * This list exists so that "what still writes the academic record through the
 * legacy path" is an exported constant rather than a question answered by
 * reading twenty strings. Everything NOT in it is device preference — a habit
 * list, a plan, a career questionnaire — which is not academic evidence, has no
 * event type in D.2, and is not what M7-6 is about.
 */
export const ACADEMIC_KEYS: readonly string[] = [
  "ledger-papers-log",
  "ledger-mistakes",
  "ledger-weak-topics",
  "ledger-syllabus",
  "ledger-syllabus-subjects",
  "ledger-notes-history",
  "ledger-checks",
  "ledger-last-event",
  "ledger-focus-streak",
  "ledger-focus-last",
];

const ACADEMIC = new Set<string>(ACADEMIC_KEYS);

/** Everything else. Device state, and it stays here after the academic half
 *  moves to the event substrate. */
export const DEVICE_KEYS: readonly string[] = SYNC_KEYS.filter(k => !ACADEMIC.has(k));

function readLocalBlob(): Record<string, string> {
  const blob: Record<string, string> = {};
  for (const key of SYNC_KEYS) {
    const v = localStorage.getItem(key);
    if (v !== null) blob[key] = v;
  }
  return blob;
}

/** Session-scoped memory of what was last written, so an unchanged record is
 *  not re-uploaded. Module scope rather than storage: a fresh tab flushing once
 *  is cheap, and a persisted fingerprint that disagreed with the server would
 *  suppress a write that was needed. */
let lastFlushedFingerprint: string | null = null;

export interface FlushResult {
  /** False when nothing had changed since the last flush. */
  wrote: boolean;
  /** Which academic keys this flush carried. Empty once M9–M14 land. */
  academic: string[];
  /** Which device-preference keys it carried. */
  device: string[];
  error?: string;
}

/**
 * THE NARROW LEGACY FLUSH. See the header for the four ways it is narrower than
 * the `pushToCloud()` it replaces, and for the three conditions that delete it.
 *
 * It writes `blob` and never `legacy_blob` — 017's freeze trigger would refuse
 * the second anyway, and relying on a database refusal for a rule this module
 * can simply obey would be building the fence on the wrong side.
 */
export async function flushLegacyBlob(userId: string): Promise<FlushResult> {
  const blob = readLocalBlob();
  const keys = Object.keys(blob);
  const academic = keys.filter(k => ACADEMIC.has(k));
  const device = keys.filter(k => !ACADEMIC.has(k));

  const fingerprint = stableHash(blob);
  if (fingerprint === lastFlushedFingerprint) {
    return { wrote: false, academic, device };
  }

  const { error } = await supabase.from("user_data").upsert({
    id: userId,
    blob,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[sync] flushLegacyBlob failed:", error.message);
    return { wrote: false, academic, device, error: error.message };
  }

  lastFlushedFingerprint = fingerprint;
  return { wrote: true, academic, device };
}

/**
 * Read the cloud copy and hydrate the keys this device does not have.
 *
 * Returns true if any key was written, i.e. the cloud held something the device
 * had never seen. The caller reloads on true so the surfaces re-read.
 *
 * **It never overwrites a key that exists locally.** The rule itself lives in
 * `lib/sync-merge.ts`, with no I/O, so it is provable against fixtures rather
 * than described here — including the case the deleted
 * `value.length > local.length` got wrong.
 */
export async function pullFromCloud(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_data")
    .select("blob")
    .eq("id", userId)
    .maybeSingle();
  if (error) console.error("[sync] pullFromCloud failed:", error.message);

  if (!data?.blob || typeof data.blob !== "object") return false;

  return hydrateAbsentOnly(
    data.blob,
    {
      get: k => localStorage.getItem(k),
      set: (k, v) => localStorage.setItem(k, v),
    },
    SYNC_KEYS,
  ).wrote;
}

/** Test seam. The fingerprint is a within-session optimisation, and a test that
 *  flushes twice needs to be able to say "this is a fresh session". */
export function resetFlushFingerprint(): void {
  lastFlushedFingerprint = null;
}
