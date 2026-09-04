import type { SupabaseClient } from "@supabase/supabase-js";

export type DeadlineKind = "assignment" | "exam" | "test" | "other";

export type Deadline = {
  id: string;
  title: string;
  subject: string | null;
  kind: DeadlineKind;
  due_date: string;
};

export async function getDeadlines(
  supabase: SupabaseClient,
  userId: string,
): Promise<Deadline[]> {
  const { data, error } = await supabase
    .from("deadlines")
    .select("id, title, subject, kind, due_date")
    .eq("user_id", userId)
    .order("due_date");
  if (error) throw error;
  return data ?? [];
}

export async function addDeadline(
  supabase: SupabaseClient,
  userId: string,
  input: { title: string; subject?: string | null; kind: DeadlineKind; due_date: string },
) {
  return supabase.from("deadlines").insert({ user_id: userId, ...input });
}

export async function deleteDeadline(supabase: SupabaseClient, id: string) {
  return supabase.from("deadlines").delete().eq("id", id);
}
