import type { SupabaseClient } from "@supabase/supabase-js";

export type Habit = {
  id: string;
  name: string;
  created_at: string;
  archived: boolean;
};

export type HabitLog = { habit_id: string; day: string };

export async function getHabits(
  supabase: SupabaseClient,
  userId: string,
): Promise<Habit[]> {
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function addHabit(supabase: SupabaseClient, userId: string, name: string) {
  return supabase.from("habits").insert({ user_id: userId, name });
}

export async function archiveHabit(supabase: SupabaseClient, id: string) {
  return supabase.from("habits").update({ archived: true }).eq("id", id);
}

export async function getHabitLogs(
  supabase: SupabaseClient,
  userId: string,
  sinceDay: string,
): Promise<HabitLog[]> {
  const { data, error } = await supabase
    .from("habit_logs")
    .select("habit_id, day")
    .eq("user_id", userId)
    .gte("day", sinceDay);
  if (error) throw error;
  return data ?? [];
}

export async function setHabitDay(
  supabase: SupabaseClient,
  userId: string,
  habitId: string,
  day: string,
  done: boolean,
) {
  if (done) {
    return supabase
      .from("habit_logs")
      .upsert({ user_id: userId, habit_id: habitId, day }, { onConflict: "habit_id,day" });
  }
  return supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("day", day);
}
