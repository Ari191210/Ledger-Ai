import { supabase } from "./supabase";
import { resolveProfile, type StudentProfile } from "./student-profile";

export type Exam = {
  name: string;
  subject: string;
  date: string;
  board: string;
};

export type AiProfile = {
  learningStyle?: "examples-first" | "theory-first" | "bullet-points" | "step-by-step";
  communicationStyle?: "simple" | "conversational" | "detailed" | "direct";
};

export type UserData = {
  plan?: {
    subjects: unknown[];
    hoursPerDay: number;
    chronotype: string;
  };
  marks?: {
    subjects: unknown[];
    target: number;
  };
  focus?: {
    streak: number;
    lastDate: string;
  };
  exams?: Exam[];
  weakTopics?: Record<string, number>;
  papersCount?: number;
  emailEnabled?: boolean;
  // ── M17 ──────────────────────────────────────────────────────────────────
  // `parentCode`, `parentName`, `parentEmail` and `parentDigestEnabled` USED
  // TO LIVE HERE — the unauthenticated `parentCode` mechanism SharePanel
  // minted. M17 replaced it outright (architecture Part N, PRODUCT_DECISIONS
  // §9.2): a parent is now a real `auth.users` identity connected through
  // `parent_connections`, sharing is governed by the versioned
  // `parent_share_policies` row (`lib/parent-space.ts`), and the digest
  // opt-in is that row's `digest_enabled` column. None of the four fields is
  // declared here any more — this type describes the row the student's own
  // client reads and writes, and parent access is no longer part of it.
  // ── M4-3 ──────────────────────────────────────────────────────────────────
  // `parentAlerts` and `notifState` USED TO LIVE HERE. They were documented
  // "service-role writes only" and yet sat in a row with a full
  // `user_data_update_own` UPDATE policy, so a student could clear their own
  // notification dedup keys and parent-alert cooldowns from devtools and make
  // suppressed sends fire again (architecture R.2, Finding A.5.e).
  //
  // They now live in `notification_state` and `parent_alert_state`
  // (`supabase/migrations/011_service_state.sql`) — RLS on, zero policies,
  // service role only. They are deliberately NOT declared on `UserData`: this
  // type describes the row the student's own client reads and writes, and the
  // two fields are no longer part of it. The only readers and writers are
  // `app/api/cron/notifications` and `app/api/cron/risk-alerts`, both of which
  // go through `supabaseServer`.
  referralCode?: string;
  username?: string;
  // Onboarding profile
  onboardingDone?: boolean;
  grade?: string;
  board?: string;
  stream?: string;
  interests?: string[];
  targetExam?: string;
  // AI personalization profile
  aiProfile?: AiProfile;
};

export type UserProfile = Pick<UserData, "grade" | "board" | "stream" | "interests" | "targetExam" | "aiProfile">;

const PROFILE_FIELDS = ["onboardingDone", "grade", "board", "stream", "interests", "targetExam", "aiProfile"] as const;

function readLocalProfile(): Partial<UserData> {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem("ledger-profile");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function writeLocalProfile(updates: Partial<UserData>) {
  try {
    if (typeof window === "undefined") return;
    const existing = readLocalProfile();
    const next = { ...existing };
    PROFILE_FIELDS.forEach(k => {
      if (updates[k] !== undefined) (next as Record<string, unknown>)[k] = updates[k];
    });
    localStorage.setItem("ledger-profile", JSON.stringify(next));
  } catch {}
}

// Reads from localStorage so profile persists even if Supabase columns are missing
export function getLocalProfile(): UserProfile {
  const p = readLocalProfile();
  return { grade: p.grade, board: p.board, stream: p.stream, interests: p.interests, targetExam: p.targetExam, aiProfile: p.aiProfile };
}

// Dedup concurrent loadUserData calls for the same user. The dashboard mounts
// several independent components (main page, ExamSchedule, SharePanel) that
// each called this on mount, firing 3 identical Supabase queries per load.
// Short TTL — this is a same-render-cycle dedup, not a data cache; writes
// invalidate it immediately below so no caller ever sees stale data.
const inflightLoads = new Map<string, { promise: Promise<UserData | null>; ts: number }>();
const LOAD_DEDUP_MS = 3000;

export async function loadUserData(userId: string): Promise<UserData | null> {
  const cached = inflightLoads.get(userId);
  if (cached && Date.now() - cached.ts < LOAD_DEDUP_MS) {
    return cached.promise;
  }
  const promise = fetchUserData(userId);
  inflightLoads.set(userId, { promise, ts: Date.now() });
  return promise;
}

async function fetchUserData(userId: string): Promise<UserData | null> {
  const { data, error } = await supabase
    .from("user_data")
    .select("*")
    .eq("id", userId)
    .single();

  const localProfile = readLocalProfile();

  if (error || !data) {
    return Object.keys(localProfile).length > 0 ? (localProfile as UserData) : null;
  }

  // ── M5-2 — POSTGRES OUTRANKS localStorage ────────────────────────────────
  //
  // This line used to read `{ ...(data as UserData), ...localProfile }`.
  // Architecture C.3 names it as the CURRENT FACT of `StudentProfile`:
  // "localStorage wins over Postgres", which is why a student who changed
  // their board on one device kept seeing the old one on the device holding
  // the stale cache, and why `buildProfileContext` was fed client-supplied
  // values (Finding A.6.b).
  //
  // `resolveProfile` (`lib/student-profile.ts`) inverts it field by field:
  // the server value wins wherever the server HAS one, and the cache may only
  // answer a question the server left blank. The cache stops being an
  // authority and becomes what it was always described as — a cache.
  const { profile } = resolveProfile(data as StudentProfile, localProfile as StudentProfile);

  // Same rule for the one non-profile-shaped flag localStorage also holds:
  // a defined server value is the answer; the cache only fills a gap.
  const serverRow = data as UserData;
  const onboardingDone =
    serverRow.onboardingDone !== undefined && serverRow.onboardingDone !== null
      ? serverRow.onboardingDone
      : localProfile.onboardingDone;

  // Refresh the cache from the record, so a new device is warm. Writing the
  // RESOLVED profile rather than the raw row keeps the cache from ever holding
  // something the server disagrees with.
  writeLocalProfile({ ...(profile as Partial<UserData>), onboardingDone });

  return { ...serverRow, ...(profile as Partial<UserData>), onboardingDone };
}

export async function saveUserData(userId: string, updates: Partial<UserData>): Promise<{ error: string | null }> {
  // localStorage is a cache of the record, refreshed on every write so an
  // offline read is warm. It is never consulted ahead of Postgres — see
  // `resolveProfile` above.
  writeLocalProfile(updates);

  // Scoped write: PostgREST's upsert emits `INSERT … ON CONFLICT (id) DO
  // UPDATE SET` for the columns PRESENT IN THIS PAYLOAD and no others, so a
  // caller changing one field cannot touch a second.
  const { error } = await supabase.from("user_data").upsert({
    id: userId,
    ...updates,
    updated_at: new Date().toISOString(),
  });
  if (!error) inflightLoads.delete(userId);
  return { error: error?.message ?? null };
}

/**
 * M5-2 — the unguarded whole-row read-modify-write, removed.
 *
 * This function used to be:
 *
 *     const existing = await loadUserData(userId);
 *     return saveUserData(userId, { ...(existing ?? {}), [key]: value });
 *
 * which architecture S.1 records as *"an unguarded whole-row
 * read-modify-write"*. Three distinct losses came out of those two lines:
 *
 *   1. **Concurrent writes were silently reverted.** Every column the client
 *      had read was written back. `ExamSchedule` saving `exams` at the same
 *      moment `SharePanel` saved `parentCode` each restored the other's old
 *      value, with no error to either.
 *   2. **The row it wrote back was up to three seconds stale**, because the
 *      read went through `loadUserData`'s dedup map.
 *   3. **It laundered localStorage into Postgres.** The value it spread came
 *      out of `fetchUserData`, where the cache used to outrank the record — so
 *      a stale cached board was written back to the server as if the student
 *      had just declared it.
 *
 * A patch is now exactly what it says: one field, one column. There is no
 * read, so there is no window between a read and a write in which anything
 * can be lost.
 *
 * For PROFILE fields specifically, prefer `saveStudentProfile()` below — it
 * appends a version to the chain instead of overwriting a column.
 */
export async function patchUserData(userId: string, key: keyof UserData, value: unknown): Promise<{ error: string | null }> {
  return saveUserData(userId, { [key]: value } as Partial<UserData>);
}

/**
 * M5-1/M5-2 — the profile write path.
 *
 * `public.set_student_profile()` (migration `012`, §5) appends `version + 1`
 * to the student's profile chain inside one transaction, under `FOR UPDATE` on
 * their `students` row, taking the identity from `auth.uid()` rather than from
 * an argument. Nothing is overwritten and nothing is read into the client and
 * written back.
 *
 * IT DUAL-WRITES, ON PURPOSE, AND THAT IS TEMPORARY. `012` has not been
 * applied to any database, and every existing reader of a profile —
 * `app/home`, `components/app-nav`, `lib/ai-fetch`, `/tools/learn-lab` —
 * still reads the flat `user_data` columns. So the flat columns are written
 * first (they must keep working today) and the version chain is appended
 * afterwards where the function exists. A missing function is not an error
 * here: it is the expected state until `public.migration_ledger()` reports
 * version `012`.
 *
 * REMOVE THE FLAT WRITE when `012` is applied AND every reader has moved to
 * `getStudentContext()`. That is the same one-way door `011` describes, and it
 * belongs to a later milestone, not to this function.
 */
export async function saveStudentProfile(
  userId: string,
  profile: Partial<UserProfile> & { subjects?: string[]; onboardingDone?: boolean },
  changeReason?: string,
): Promise<{ error: string | null }> {
  const subjects = profile.subjects ?? profile.interests;

  const legacy = await saveUserData(userId, {
    ...(profile.board      !== undefined ? { board:      profile.board } : {}),
    ...(profile.grade      !== undefined ? { grade:      profile.grade } : {}),
    ...(profile.stream     !== undefined ? { stream:     profile.stream } : {}),
    ...(profile.targetExam !== undefined ? { targetExam: profile.targetExam } : {}),
    ...(profile.aiProfile  !== undefined ? { aiProfile:  profile.aiProfile } : {}),
    ...(subjects           !== undefined ? { interests:  subjects } : {}),
    ...(profile.onboardingDone !== undefined ? { onboardingDone: profile.onboardingDone } : {}),
  });

  // Append the version. `null` means "carry this field forward" to the
  // function, which is why an unspecified field is sent as null rather than
  // omitted — omitting it would take the SQL default, which is the same null,
  // but sending it explicitly keeps the contract readable from the call site.
  //
  // The RPC's own error is deliberately swallowed and NOT returned to the
  // caller: on a pre-012 database it is always "function does not exist", and
  // surfacing that would tell a student their profile failed to save when the
  // flat write above succeeded. It stops being swallowed when the flat write
  // is removed, because then it is the only write.
  const { error: rpcError } = await supabase.rpc("set_student_profile", {
    p_board:         profile.board      ?? null,
    p_grade:         profile.grade      ?? null,
    p_stream:        profile.stream     ?? null,
    p_target_exam:   profile.targetExam ?? null,
    p_subjects:      subjects           ?? null,
    p_interests:     null,
    p_ai_profile:    profile.aiProfile  ?? null,
    p_change_reason: changeReason       ?? null,
    p_clear:         [],
  });
  if (rpcError && process.env.NODE_ENV !== "production") {
    console.info("[M5] set_student_profile unavailable (expected until 012 is applied):", rpcError.message);
  }

  return legacy;
}
