"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

/**
 * Deletes the account and everything under it. Every user-owned table
 * (activity_days, mistakes, pyq_attempts, syllabus_topics, habits,
 * habit_logs, deadlines, profiles) has `references auth.users (id) on
 * delete cascade`, removing the auth user removes all of it, no manual
 * per-table cleanup needed. Uses the service-role client because deleting
 * an auth user is an admin operation, not something the owning session can
 * do to itself.
 */
export async function deleteAccount(): Promise<Result> {
  const { id } = await currentUserId();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { error: error.message };
  redirect("/login");
}
