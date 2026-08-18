// ═══════════════════════════════════════════════════════════════════════════
// M5-2 — `getStudentContext()`, the one server-side read of who is asking.
//
// EXECUTION_PLAN M5-2: *"One server-side `getStudentContext()` — replaces
// `lib/user-data.ts:123,139-142`. Done when: localStorage no longer outranks
// Postgres; no unguarded whole-row read-modify-write remains."*
//
//
// WHAT THIS IS BUILT ON, AND WHY IT MATTERS
//
// `createStudentServerClient()` (`lib/supabase-server.ts`, added by M4-1)
// reads the caller's session out of the request cookies with the ANON key, so
// every query it makes is RLS-scoped to `auth.uid()`. M4-1's own comment names
// this file as the reason it exists:
//
//   > Nothing server-renders student data yet — that is M5, where
//   > `getStudentContext()` becomes the server-side identity — so today this
//   > has no call sites. It is here so that when M5 needs it, the client is
//   > already derived from the same cookie the middleware gate reads, rather
//   > than a second, divergent notion of "the session".
//
// So this module does NOT reach for `supabaseServer` (the service role, which
// sees every row), does not accept a `studentId` argument, and does not trust
// anything the client sent. The identity comes from `auth.getUser()`, which
// validates the token against the auth server rather than decoding it locally.
// A caller cannot ask this function about somebody else.
//
//
// WHY IT IS READ-ONLY
//
// The pattern M5-2 exists to delete is a read of a whole row followed by a
// write of a whole row. The correct answer is not a safer merge in TypeScript
// — it is that the merge stops happening in TypeScript at all. Reading and
// writing are therefore split: this module only ever reads, and the single
// write path is `public.set_student_profile()`
// (`supabase/migrations/012_students_and_profiles.sql` §5), which does the
// read and the append in one transaction under `FOR UPDATE` on the caller's
// identity row. There is no function in this file that writes.
//
//
// WHY THE LEGACY FALLBACK EXISTS AND WHEN IT GOES
//
// `012` has NOT been applied to any database. This code ships to a production
// where `student_profiles` does not yet exist, so a read that assumed it would
// break every server render at once. The fallback reads the pre-M5 flat
// `user_data` columns and reports `source: "user_data_legacy"` so the
// degradation is visible rather than silent.
//
// DELETE THE FALLBACK when `select * from public.migration_ledger() where
// version = '012'` returns a row — the same removal condition M1-3 wrote into
// `app/api/cron/score-snapshot/route.ts`, and for the same reason: the
// repository cannot show a branch is dead until the ledger says the migration
// that kills it has run.
// ═══════════════════════════════════════════════════════════════════════════

import { cache } from "react";
import { createStudentServerClient } from "./supabase-server";
import {
  isOnboarded,
  profileFromLegacyRow,
  profileFromRow,
  type StudentProfile,
  type StudentProfileRow,
} from "./student-profile";

/** Where the profile in a context actually came from. Never inferred by the
 *  caller — a context that fell back to the flat columns says so. */
export type StudentContextSource = "student_profiles" | "user_data_legacy" | "none";

export type StudentContext = {
  /** `auth.uid()`, validated against the auth server. */
  studentId: string;
  /** What the student has declared. `{}` when nothing has been declared yet. */
  profile: StudentProfile;
  /** The version of the chain this profile is, or `null` under the fallback
   *  (the flat columns have no version — that is precisely what M5-1 fixes). */
  profileVersion: number | null;
  /** Derived from the profile, never read from a stored flag. See
   *  `isOnboarded()` in `lib/student-profile.ts`. */
  onboarded: boolean;
  source: StudentContextSource;
};

/**
 * The single server-side read of the caller's identity and profile.
 *
 * Returns `null` when there is no authenticated caller — an unauthenticated
 * request has no student context, and returning an empty one would let a
 * caller mistake "signed out" for "signed in with nothing declared".
 *
 * Wrapped in React's `cache()` so several server components in one render can
 * each call it and the request still costs one round trip. That replaces the
 * hand-rolled 3-second TTL map in `lib/user-data.ts` — a real per-request
 * memo, not a timer that can serve a stale row to the next request.
 */
export const getStudentContext = cache(async (): Promise<StudentContext | null> => {
  const supabase = await createStudentServerClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return null;

  // ── The M5-1 path ───────────────────────────────────────────────────────
  const { data: row, error: rowError } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("student_id", user.id)
    .eq("is_current", true)
    .maybeSingle();

  if (!rowError && row) {
    const typed = row as StudentProfileRow;
    const profile = profileFromRow(typed) ?? {};
    return {
      studentId: user.id,
      profile,
      profileVersion: typed.version,
      onboarded: isOnboarded(profile),
      source: "student_profiles",
    };
  }

  // A student who exists but has declared nothing is NOT an error, and must
  // not fall through to the legacy columns: the chain answered, and its answer
  // was "no current version". Only a table that is not there yet falls back.
  if (!rowError) {
    const legacy = await readLegacyProfile(supabase, user.id);
    if (legacy) {
      return {
        studentId: user.id,
        profile: legacy,
        profileVersion: null,
        onboarded: isOnboarded(legacy),
        source: "user_data_legacy",
      };
    }
    return {
      studentId: user.id,
      profile: {},
      profileVersion: null,
      onboarded: false,
      source: "none",
    };
  }

  // ── The pre-012 path ────────────────────────────────────────────────────
  const legacy = await readLegacyProfile(supabase, user.id);
  return {
    studentId: user.id,
    profile: legacy ?? {},
    profileVersion: null,
    onboarded: isOnboarded(legacy),
    source: legacy ? "user_data_legacy" : "none",
  };
});

/** The pre-M5 flat columns, read through the same RLS-scoped client. Deleted
 *  with the fallback — see the header for the removal condition. */
async function readLegacyProfile(
  supabase: Awaited<ReturnType<typeof createStudentServerClient>>,
  studentId: string,
): Promise<StudentProfile | null> {
  const { data, error } = await supabase
    .from("user_data")
    .select("grade, board, stream, interests, \"targetExam\", \"aiProfile\"")
    .eq("id", studentId)
    .maybeSingle();

  if (error || !data) return null;
  return profileFromLegacyRow(data as Record<string, unknown>);
}
