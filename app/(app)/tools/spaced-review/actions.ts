"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reviewMistake } from "@/lib/study/queries";

type Result = { ok: true } | { error: string };

export async function reviewMistakeAction(
  id: string,
  currentReviewCount: number,
  remembered: boolean,
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await reviewMistake(supabase, id, currentReviewCount, remembered);
  if (error) return { error: error.message };

  revalidatePath("/tools/spaced-review");
  revalidatePath("/dashboard");
  return { ok: true };
}
