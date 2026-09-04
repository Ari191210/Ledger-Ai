"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateOnboarding } from "@/lib/onboarding";

export async function completeOnboarding(raw: {
  grade?: string;
  board?: string;
  stream?: string | null;
  target_exam?: string;
}): Promise<{ error: string } | void> {
  const parsed = validateOnboarding(raw);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ ...parsed.value, onboarded_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };
  redirect("/dashboard");
}
