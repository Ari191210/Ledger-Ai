// ═══════════════════════════════════════════════════════════════════════════
// M7-6 — THE CONFLICT RULE, WITH NO I/O.
//
// `lib/sync.ts` instantiates the Supabase browser client at module load, so
// nothing in it is reachable from a test without a project in hand. The rule
// that decides whether a cloud value may overwrite a local one is a DECISION,
// and the repository's convention — `lib/auth-routes.ts` (M4),
// `lib/concept-resolution.ts` (M6), `lib/event-ingest.ts` (M7-2) — is that a
// decision lives where it can be proven with no database in reach (U.3).
//
// This is the whole of that decision, and it is four lines of behaviour.
//
//
// WHAT IT REPLACED
//
// `lib/sync.ts:67`, deleted by M7-6, was:
//
//     if (!local || value.length > local.length) { localStorage.setItem(...) }
//
// **A longer string is not a newer fact.** That line adjudicated between two
// versions of a student's academic record by counting characters. Three
// consequences, all of them silent:
//
//   · a stale device with more entries overwrote a corrected device with fewer;
//   · a deletion could never propagate — the shorter side always lost, forever;
//   · nothing anywhere recorded that a value had been discarded.
//
// It is `PRODUCT_PRINCIPLES` Law 7 failing in four tokens: the ordering it
// invents does not exist.
//
//
// WHAT REPLACED IT, AND WHY THIS RULE AND NOT ANOTHER
//
// **Fill, never adjudicate.** The cloud copy may write a key this device does
// not have. It may never choose between two values that both exist.
//
// The obvious alternatives were considered and rejected:
//
//   · *Last-write-wins on `user_data.updated_at`* — the timestamp is per ROW,
//     not per key, so it says when the blob was last flushed and nothing about
//     when any particular key changed. Using it would be the same invented
//     ordering with a more plausible name.
//   · *Cloud always wins* — the cloud copy is written by the same client from
//     another device. It has no more authority than the local one, unlike
//     `resolveProfile()` (M5-2) where Postgres holds columns the client does
//     not. Preferring it would lose the work in front of the student.
//   · *Merge the two* — merging two JSON records of academic history without a
//     per-item identity is how duplicates are manufactured, and D.4 is explicit
//     that *"repetition must never manufacture score"*.
//
// Neither copy carries a per-key timestamp, so there is no honest basis on
// which to prefer one. The honest response to an unanswerable question is to
// not answer it: a new device is hydrated in full (every key is absent), and a
// second device is never silently overwritten.
//
// No imports. No clock. No network. No storage.
// ═══════════════════════════════════════════════════════════════════════════

/** The two operations the rule needs. `localStorage` satisfies it; so does a
 *  `Map` in a test, which is the point. */
export interface LocalStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export interface HydrationResult {
  /** True when at least one key was written — the caller reloads on true so
   *  the surfaces re-read what arrived. */
  wrote: boolean;
  filled: string[];
  /** Present locally, so left exactly as it was. Not "skipped" — KEPT. */
  kept: string[];
  /** Not in the allowed key list, or not a usable string. */
  ignored: string[];
}

/**
 * Hydrate the keys the device does not have, and only those.
 *
 * @param cloud       whatever came back from `user_data.blob`, untrusted shape.
 * @param store       the device's own storage.
 * @param allowedKeys `SYNC_KEYS`, passed in rather than imported so this module
 *                    stays free of `lib/sync.ts` and its Supabase client.
 */
export function hydrateAbsentOnly(
  cloud: unknown,
  store: LocalStore,
  allowedKeys: readonly string[],
): HydrationResult {
  const result: HydrationResult = { wrote: false, filled: [], kept: [], ignored: [] };

  if (!cloud || typeof cloud !== "object" || Array.isArray(cloud)) return result;

  const allowed = new Set(allowedKeys);

  for (const [key, value] of Object.entries(cloud as Record<string, unknown>)) {
    if (!allowed.has(key) || typeof value !== "string" || value.length === 0) {
      result.ignored.push(key);
      continue;
    }

    const local = store.get(key);
    if (local !== null && local !== "") {
      // THE RULE. No comparison happens here — not of length, not of content,
      // not of anything. A present value is kept because there is no honest
      // basis on which to replace it.
      result.kept.push(key);
      continue;
    }

    store.set(key, value);
    result.filled.push(key);
    result.wrote = true;
  }

  return result;
}
