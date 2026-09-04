"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addMistake, addPyqAttempt, logActivity } from "@/lib/study/queries";
import type { MistakeSource } from "@/lib/study/types";

type Result = { ok: true } | { error: string };

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, id: user.id };
}

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/score");
}

export async function logMistakeAction(input: {
  subject: string;
  topic: string;
  note?: string;
  source?: MistakeSource;
}): Promise<Result> {
  if (!input.subject.trim() || !input.topic.trim()) {
    return { error: "Subject and topic are required." };
  }
  const { supabase, id } = await currentUser();
  const { error } = await addMistake(supabase, id, input);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function logPyqAction(input: {
  subject: string;
  total: number;
  correct: number;
}): Promise<Result> {
  if (!input.subject.trim()) return { error: "Subject is required." };
  if (!Number.isFinite(input.total) || input.total <= 0) {
    return { error: "Enter how many questions you attempted." };
  }
  if (!Number.isFinite(input.correct) || input.correct < 0 || input.correct > input.total) {
    return { error: "Correct can't exceed the total." };
  }
  const { supabase, id } = await currentUser();
  const { error } = await addPyqAttempt(supabase, id, input);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function logFocusAction(input: { minutes: number }): Promise<Result> {
  if (!Number.isFinite(input.minutes) || input.minutes <= 0) {
    return { error: "Enter minutes greater than zero." };
  }
  const { supabase, id } = await currentUser();
  const day = new Date().toISOString().slice(0, 10);

  const { data: existing, error: readErr } = await supabase
    .from("activity_days")
    .select("minutes")
    .eq("user_id", id)
    .eq("day", day)
    .maybeSingle();
  if (readErr) return { error: readErr.message };

  const total = (existing?.minutes ?? 0) + Math.round(input.minutes);
  const { error } = await logActivity(supabase, id, day, total);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}
