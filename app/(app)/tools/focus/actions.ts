"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logFocusAction } from "@/app/(app)/dashboard/actions";

type Result = { error: string } | { ok: true };

/**
 * Record one focus session.
 *
 * Two writes, deliberately: focus_sessions keeps what the session was spent on
 * (which is what makes the timer worth opening twice), and activity_days keeps
 * the daily minutes total the consistency pillar already reads. Only completed
 * sessions add minutes; an abandoned one is recorded but does not earn score,
 * because it should not.
 */
export async function recordFocusSession(input: {
  minutes: number;
  subject?: string | null;
  topic?: string | null;
  completed: boolean;
}): Promise<Result> {
  if (!Number.isFinite(input.minutes) || input.minutes <= 0) {
    return { error: "A session needs to be longer than zero minutes." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("focus_sessions").insert({
    user_id: user.id,
    subject: input.subject ?? null,
    topic: input.topic ?? null,
    minutes: Math.round(input.minutes),
    completed: input.completed,
  });
  if (error) return { error: error.message };

  if (input.completed) {
    // Reuse the dashboard action rather than writing activity_days here:
    // logActivity upserts an absolute value, so adding minutes needs the
    // read-then-add that action already does. Duplicating it would silently
    // overwrite the day's total.
    const logged = await logFocusAction({ minutes: Math.round(input.minutes) });
    if ("error" in logged) return logged;
  }

  revalidatePath("/tools/focus");
  revalidatePath("/dashboard");
  return { ok: true };
}
