// ═══════════════════════════════════════════════════════════════════════════
// M5-2 — the student profile, the pure half.
//
// Architecture C.3 records the failure this module exists to end:
//
//   > Profile lives in 18 flat `user_data` columns *and* in
//   > `localStorage["ledger-profile"]`, and `lib/user-data.ts:123` returns
//   > `{ ...(data as UserData), ...localProfile }` — **localStorage wins over
//   > Postgres.**
//
// The precedence rule is a pure function of two records, so it lives here with
// no I/O, no clock and no imports, exactly as `lib/auth-routes.ts` holds the
// auth decision away from `middleware.ts`. `lib/student-context.ts` supplies
// the server read, `lib/user-data.ts` supplies the browser read, and
// `tests/student-context.test.mjs` proves the rule against the compiled module
// with no Supabase project in reach.
//
// No imports. No clock. No network.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The AI personalisation pair. Carried forward from the retired eight-step
 * onboarding; `PRODUCT_DECISIONS` §2.6 does not ratify asking for it, so the
 * rebuilt onboarding never writes it and it is never invented where absent.
 */
export type AiProfileShape = {
  learningStyle?: "examples-first" | "theory-first" | "bullet-points" | "step-by-step";
  communicationStyle?: "simple" | "conversational" | "detailed" | "direct";
};

/** What the student has declared about themselves. Every field optional: a
 *  profile that does not yet know the answer must be representable. */
export type StudentProfile = {
  board?: string;
  grade?: string;
  stream?: string;
  targetExam?: string;
  subjects?: string[];
  interests?: string[];
  aiProfile?: AiProfileShape;
};

/** One row of `student_profiles`. Snake-cased because it is the database's
 *  shape, not the product's. */
export type StudentProfileRow = {
  student_id: string;
  version: number;
  board: string | null;
  grade: string | null;
  stream: string | null;
  target_exam: string | null;
  subjects: string[] | null;
  interests: string[] | null;
  ai_profile: AiProfileShape | null;
  effective_from: string;
  changed_by: string;
  change_reason: string | null;
  is_current: boolean;
};

/**
 * The fields a profile is made of. Exported so the browser cache, the server
 * read and the tests all agree on the list rather than each keeping their own.
 */
export const PROFILE_FIELDS = [
  "board",
  "grade",
  "stream",
  "targetExam",
  "subjects",
  "interests",
  "aiProfile",
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];

/** Where a resolved profile field came from. Recorded per field rather than
 *  per profile, because a mixed answer is the normal case while 012 is being
 *  rolled out and a caller that cannot see the mix cannot reason about it. */
export type ProfileSource = "postgres" | "local" | "absent";

export type ResolvedProfile = {
  profile: StudentProfile;
  sources: Record<ProfileField, ProfileSource>;
};

/** A value that carries no information. `""` and `[]` are treated as absent
 *  deliberately: the flat columns and localStorage both store an empty string
 *  where the eight-step flow was abandoned mid-way, and letting an empty
 *  string outrank a real server value would reproduce the bug in miniature. */
function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

/**
 * THE PRECEDENCE RULE.
 *
 * Postgres is the record. localStorage is a cache of it, and a cache may only
 * answer a question the record has no answer to — it may never overrule one.
 * Field by field:
 *
 *   server has a value  → server wins, whatever the cache says
 *   server has none     → the cache may supply one, marked `local`
 *   neither             → the field is absent, and stays absent
 *
 * The old `{ ...server, ...local }` did the opposite for every field at once,
 * which is why a student who changed their board on one device kept seeing the
 * old one on the device that had the stale cache, and why `buildProfileContext`
 * was receiving client-supplied values (Finding A.6.b).
 */
export function resolveProfile(
  server: StudentProfile | null | undefined,
  local: StudentProfile | null | undefined,
): ResolvedProfile {
  const profile: Record<string, unknown> = {};
  const sources = {} as Record<ProfileField, ProfileSource>;

  for (const field of PROFILE_FIELDS) {
    const fromServer = server ? (server as Record<string, unknown>)[field] : undefined;
    if (!isEmpty(fromServer)) {
      profile[field] = fromServer;
      sources[field] = "postgres";
      continue;
    }
    const fromLocal = local ? (local as Record<string, unknown>)[field] : undefined;
    if (!isEmpty(fromLocal)) {
      profile[field] = fromLocal;
      sources[field] = "local";
      continue;
    }
    sources[field] = "absent";
  }

  return { profile: profile as StudentProfile, sources };
}

/** Narrow an unknown to a string array, dropping anything that is not a
 *  non-empty string. Used at both boundaries — JSONB from the flat columns and
 *  `TEXT[]` from the version chain — because neither is type-checked by the
 *  time it reaches TypeScript. */
export function toStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === "string" && x.trim() !== "");
  return out.length > 0 ? out : undefined;
}

/** `student_profiles` row → the product's profile shape. */
export function profileFromRow(row: StudentProfileRow | null | undefined): StudentProfile | null {
  if (!row) return null;
  const p: StudentProfile = {};
  if (row.board) p.board = row.board;
  if (row.grade) p.grade = row.grade;
  if (row.stream) p.stream = row.stream;
  if (row.target_exam) p.targetExam = row.target_exam;
  const subjects = toStringArray(row.subjects);
  if (subjects) p.subjects = subjects;
  const interests = toStringArray(row.interests);
  if (interests) p.interests = interests;
  if (row.ai_profile && typeof row.ai_profile === "object") p.aiProfile = row.ai_profile;
  return p;
}

/**
 * The pre-M5 flat `user_data` columns → the same shape.
 *
 * This is the read path that keeps working while `012` is unapplied. It is
 * deliberately a SEPARATE function from `profileFromRow` rather than a
 * parameterised one: the day the columns are dropped (the commented block at
 * the foot of `012`), deleting this function is the whole change.
 *
 * `interests` maps to `subjects` for the reason section 6 of `012` states —
 * the retired onboarding asked *"Which subjects interest you?"* and stored the
 * answer there, so it is a subject declaration under a stale column name.
 */
export function profileFromLegacyRow(row: Record<string, unknown> | null | undefined): StudentProfile | null {
  if (!row) return null;
  const p: StudentProfile = {};
  if (typeof row.board === "string" && row.board.trim()) p.board = row.board;
  if (typeof row.grade === "string" && row.grade.trim()) p.grade = row.grade;
  if (typeof row.stream === "string" && row.stream.trim()) p.stream = row.stream;
  if (typeof row.targetExam === "string" && row.targetExam.trim()) p.targetExam = row.targetExam;
  const subjects = toStringArray(row.interests);
  if (subjects) p.subjects = subjects;
  if (row.aiProfile && typeof row.aiProfile === "object") p.aiProfile = row.aiProfile as AiProfileShape;
  return p;
}

/**
 * Onboarding is complete when the two ratified questions have answers.
 *
 * `PRODUCT_DECISIONS` §2.6 — *"Board and subjects, one screen"* — and §3,
 * which describes `/onboard` as *"Board and subjects. Nothing else."* So
 * completion is DERIVED from the profile rather than stored as a separate
 * `onboardingDone` flag that can disagree with it. A flag that says yes over a
 * profile with no board is a lie the old schema could tell; this cannot.
 */
export function isOnboarded(profile: StudentProfile | null | undefined): boolean {
  if (!profile) return false;
  return !isEmpty(profile.board) && !isEmpty(profile.subjects);
}
