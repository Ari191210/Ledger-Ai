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
// user (see lib/supabase/server.ts / client.ts) — RLS enforces `user_id`
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
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function resolveMistake(supabase: SupabaseClient, id: string) {
  return supabase
    .from("mistakes")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", id);
}

// ─── PYQ attempts ────────────────────────────────────────────────────────

export async function addPyqAttempt(
  supabase: SupabaseClient,
  userId: string,
  input: { subject: string; topic?: string; total: number; correct: number },
) {
  return supabase.from("pyq_attempts").insert({
    user_id: userId,
    subject: input.subject,
    topic: input.topic ?? null,
    total: input.total,
    correct: input.correct,
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
  const { data, error } = await q.order("taken_at", { ascending: false });
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
  const { data, error } = await q.order("subject").order("position");
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
