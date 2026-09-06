import type { SupabaseClient } from "@supabase/supabase-js";

export type DeadlineKind = "assignment" | "exam" | "test" | "other";

export type Deadline = {
  id: string;
  title: string;
  subject: string | null;
  kind: DeadlineKind;
  due_date: string;
  /** hour of day the exam starts, 0-23, null when untimed */
  start_hour: number | null;
};

export async function getDeadlines(
  supabase: SupabaseClient,
  userId: string,
): Promise<Deadline[]> {
  const { data, error } = await supabase
    .from("deadlines")
    .select("id, title, subject, kind, due_date, start_hour")
    .eq("user_id", userId)
    .order("due_date");
  if (error) throw error;
  return data ?? [];
}

export async function addDeadline(
  supabase: SupabaseClient,
  userId: string,
  input: {
    title: string;
    subject?: string | null;
    kind: DeadlineKind;
    due_date: string;
    /** hour the exam starts, 0-23. Null unless the student told us. */
    start_hour?: number | null;
  },
) {
  return supabase.from("deadlines").insert({ user_id: userId, ...input });
}

export async function deleteDeadline(supabase: SupabaseClient, id: string) {
  return supabase.from("deadlines").delete().eq("id", id);
}
