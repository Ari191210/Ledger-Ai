"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addHabit, archiveHabit, setHabitDay } from "@/lib/study/habits";

type Result = { ok: true } | { error: string };

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, id: user.id };
}

export async function addHabitAction(name: string): Promise<Result> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name your habit." };
  if (trimmed.length > 60) return { error: "Keep it under 60 characters." };

  const { supabase, id } = await currentUser();
  const { error } = await addHabit(supabase, id, trimmed);
  if (error) return { error: error.message };
  revalidatePath("/tools/habits");
  return { ok: true };
}

export async function toggleHabitAction(
  habitId: string,
  day: string,
  done: boolean,
): Promise<Result> {
  const { supabase, id } = await currentUser();
  const { error } = await setHabitDay(supabase, id, habitId, day, done);
  if (error) return { error: error.message };
  revalidatePath("/tools/habits");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function archiveHabitAction(habitId: string): Promise<Result> {
  const { supabase } = await currentUser();
  const { error } = await archiveHabit(supabase, habitId);
  if (error) return { error: error.message };
  revalidatePath("/tools/habits");
  return { ok: true };
}
