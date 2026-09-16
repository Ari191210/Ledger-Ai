"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateStudyProfile } from "@/lib/onboarding";
import { confirmsDeletion } from "@/lib/account/delete-confirmation";

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
  const parsed = validateStudyProfile(raw);
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
 * Deletes the account and everything under it. All fourteen user-owned tables
 * (activity_days, ai_advice, ai_invocations, deadlines, focus_sessions,
 * habit_logs, habits, mistake_reviews, mistakes, parental_consents, profiles,
 * pyq_attempts, subscriptions, syllabus_topics) carry `references auth.users
 * (id) on delete cascade`, so removing the auth user removes all of it with no
 * per-table cleanup. Uses the service-role client because deleting an auth user
 * is an admin operation, not something the owning session can do to itself.
 *
 * The list above is checked by lib/rls-policy-audit.test.ts, which derives the
 * same fourteen from the migrations, so a new table cannot quietly appear
 * without both this comment and the data export being wrong.
 */
export async function deleteAccount(confirmation: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The confirmation is checked here, not only in the form. Until 2026-09-16
  // the box asking you to type "delete" was the whole safeguard and this action
  // took no argument at all, so anything that could reach it once deleted the
  // account: the server had no way to tell a considered decision from a single
  // stray call.
  //
  // It asks for the account's own email rather than the word "delete", because
  // "delete" is the same string for everyone and proves only that something
  // typed four letters. An address proves the sender knew which account they
  // were ending. It also works for students who signed in with Google and have
  // no password to re-enter.
  //
  // What this does not do is re-authenticate. A live session is still enough,
  // so it raises the cost of an accidental or forged call without claiming to
  // stop someone who already holds the session.
  if (!confirmsDeletion(confirmation, user.email ?? "")) {
    return { error: "Type the email address on this account to confirm." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };
  redirect("/login");
}
