"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateOnboarding } from "@/lib/onboarding";

type Result = { ok: true } | { error: string };

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, id: user.id };
}

export async function saveSyllabus(raw: {
  grade?: string;
  board?: string;
  stream?: string | null;
  target_exam?: string;
}): Promise<Result> {
  const parsed = validateOnboarding(raw);
  if (!parsed.ok) return { error: parsed.error };

  const { supabase, id } = await currentUserId();
  const { error } = await supabase
    .from("profiles")
    .update(parsed.value)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true };
}

export async function saveDisplayName(name: string): Promise<Result> {
  const trimmed = name.trim().slice(0, 60);
  const { supabase, id } = await currentUserId();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: trimmed || null })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}
