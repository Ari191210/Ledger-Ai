import type { SupabaseClient } from "@supabase/supabase-js";
import { computeStreak } from "./streak";
import type {
  ActivityDay,
  Mistake,
  MistakeSource,
  PyqAttempt,
  SyllabusTopic,
} from "./types";

// All of these assume `supabase` is a client already scoped to the calling
// user (see lib/supabase/server.ts / client.ts), RLS enforces `user_id`
// ownership regardless, but every write still sets it explicitly so a bug
// here fails closed (RLS rejects), not open.

// ─── activity ────────────────────────────────────────────────────────────

export async function logActivity(
  supabase: SupabaseClient,
  userId: string,
  day: string,
  minutes: number,
) {
  return supabase
    .from("activity_days")
    .upsert(
      { user_id: userId, day, minutes },
      { onConflict: "user_id,day" },
    );
}

export async function getActivityRange(
  supabase: SupabaseClient,
  userId: string,
  fromDay: string,
  toDay: string,
): Promise<ActivityDay[]> {
  const { data, error } = await supabase
    .from("activity_days")
    .select("day, minutes")
    .eq("user_id", userId)
    .gte("day", fromDay)
    .lte("day", toDay)
    .order("day");
  if (error) throw error;
  return data ?? [];
}

/** Consecutive days of activity ending today (0 if today has none). */
export async function getCurrentStreak(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("activity_days")
    .select("day")
    .eq("user_id", userId)
    .gt("minutes", 0)
    .order("day", { ascending: false })
    .limit(400);
  if (error) throw error;
  if (!data?.length) return 0;

  return computeStreak(new Set(data.map((d) => d.day)));
}

// ─── mistakes ────────────────────────────────────────────────────────────

export async function addMistake(
  supabase: SupabaseClient,
  userId: string,
  input: { subject: string; topic: string; note?: string; source?: MistakeSource },
) {
  return supabase.from("mistakes").insert({
    user_id: userId,
    subject: input.subject,
    topic: input.topic,
    note: input.note ?? null,
    source: input.source ?? "practice",
  });
}

export async function getMistakes(
  supabase: SupabaseClient,
  userId: string,
  opts: { onlyOpen?: boolean; sinceDays?: number } = {},
): Promise<Mistake[]> {
  let q = supabase.from("mistakes").select("*").eq("user_id", userId);
  if (opts.onlyOpen) q = q.is("resolved_at", null);
  if (opts.sinceDays) {
    const since = new Date();
    since.setDate(since.getDate() - opts.sinceDays);
    q = q.gte("created_at", since.toISOString());
  }
  // Explicit, because PostgREST applies its own default row cap otherwise and
  // silently returns a short list. Every caller counts these (repeat tallies in
  // the AI context, mistake half life, contagion), so a quiet truncation would
  // read as real numbers rather than as missing data.
  const { data, error } = await q.order("created_at", { ascending: false }).limit(2000);
  if (error) throw error;
  return data ?? [];
}

export async function resolveMistake(supabase: SupabaseClient, id: string) {
  return supabase
    .from("mistakes")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", id);
}

// ─── spaced review ──────────────────────────────────────────────────────

// days-until-next-review by review_count: 1 -> 3 -> 7 -> 14 -> 30, then holds
const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];
const MASTERED_AT_REVIEW_COUNT = REVIEW_INTERVALS_DAYS.length;

export async function getDueMistakes(
  supabase: SupabaseClient,
  userId: string,
): Promise<Mistake[]> {
  const { data, error } = await supabase
    .from("mistakes")
    .select("*")
    .eq("user_id", userId)
    .is("resolved_at", null)
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at")
    .limit(2000);
  if (error) throw error;
  return data ?? [];
}

/**
 * Record a review. Remembered pushes the next review further out (and
 * auto-resolves once it's been remembered enough times in a row); forgotten
 * resets the interval to the start.
 */
/**
 * Advance a mistake through the review schedule.
 *
 * The count comes from the row, never from the caller. It used to be passed in
 * from the browser and written back as `count + 1`, so anything that could post
 * to the action could hand over a 4 and have a topic marked mastered on its
 * first review, or send a nonsense value and quietly wreck its own schedule.
 * RLS meant this could only ever damage the sender's own ledger, which is why
 * it was not a breach, but spaced repetition is the whole product and its state
 * cannot be client-supplied.
 */
export async function reviewMistake(
  supabase: SupabaseClient,
  id: string,
  _ignoredClientCount: number,
  remembered: boolean,
) {
  const { data: row, error: readError } = await supabase
    .from("mistakes")
    .select("review_count")
    .eq("id", id)
    .maybeSingle();
  if (readError) return { error: readError, data: null };
  // RLS hides other people's rows, so a miss here is either someone else's id
  // or one that no longer exists. Either way there is nothing to advance.
  if (!row) return { error: null, data: null };
  const currentReviewCount = Number(row.review_count) || 0;

  if (!remembered) {
    return supabase
      .from("mistakes")
      .update({
        review_count: 0,
        next_review_at: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .eq("id", id);
  }

  const nextCount = currentReviewCount + 1;
  if (nextCount >= MASTERED_AT_REVIEW_COUNT) {
    return supabase
      .from("mistakes")
      .update({ review_count: nextCount, resolved_at: new Date().toISOString() })
      .eq("id", id);
  }

  const days = REVIEW_INTERVALS_DAYS[nextCount] ?? REVIEW_INTERVALS_DAYS.at(-1)!;
  return supabase
    .from("mistakes")
    .update({
      review_count: nextCount,
      next_review_at: new Date(Date.now() + days * 86_400_000).toISOString(),
    })
    .eq("id", id);
}

// ─── PYQ attempts ────────────────────────────────────────────────────────

export async function addPyqAttempt(
  supabase: SupabaseClient,
  userId: string,
  input: {
    subject: string;
    topic?: string;
    total: number;
    correct: number;
    /** what the student predicted before marking, for calibration */
    predictedCorrect?: number | null;
  },
) {
  return supabase.from("pyq_attempts").insert({
    user_id: userId,
    subject: input.subject,
    topic: input.topic ?? null,
    total: input.total,
    correct: input.correct,
    predicted_correct: input.predictedCorrect ?? null,
  });
}

export async function getPyqAttempts(
  supabase: SupabaseClient,
  userId: string,
  sinceDays?: number,
): Promise<PyqAttempt[]> {
  let q = supabase.from("pyq_attempts").select("*").eq("user_id", userId);
  if (sinceDays) {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);
    q = q.gte("taken_at", since.toISOString());
  }
  // Bounded for the same reason getMistakes is: PostgREST applies its own
  // default cap otherwise and returns a short list with no error. Calibration
  // and ghost mode difference the oldest attempts against the newest, so a
  // silent truncation does not just lose rows, it inverts the finding.
  const { data, error } = await q.order("taken_at", { ascending: false }).limit(2000);
  if (error) throw error;
  return data ?? [];
}

// ─── syllabus ────────────────────────────────────────────────────────────

export async function getSyllabus(
  supabase: SupabaseClient,
  userId: string,
  subject?: string,
): Promise<SyllabusTopic[]> {
  let q = supabase.from("syllabus_topics").select("*").eq("user_id", userId);
  if (subject) q = q.eq("subject", subject);
  const { data, error } = await q.order("subject").order("position").limit(2000);
  if (error) throw error;
  return data ?? [];
}

export async function upsertSyllabusTopic(
  supabase: SupabaseClient,
  userId: string,
  input: { subject: string; topic: string; covered?: boolean; position?: number },
) {
  return supabase.from("syllabus_topics").upsert(
    {
      user_id: userId,
      subject: input.subject,
      topic: input.topic,
      covered: input.covered ?? false,
      position: input.position ?? 0,
    },
    { onConflict: "user_id,subject,topic" },
  );
}

export async function setTopicCovered(
  supabase: SupabaseClient,
  id: string,
  covered: boolean,
) {
  return supabase.from("syllabus_topics").update({ covered }).eq("id", id);
}

export async function deleteSyllabusTopic(supabase: SupabaseClient, id: string) {
  return supabase.from("syllabus_topics").delete().eq("id", id);
}
