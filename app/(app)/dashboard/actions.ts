"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addMistake, addPyqAttempt } from "@/lib/study/queries";
import type { MistakeSource } from "@/lib/study/types";
import { isoDateIST } from "@/lib/date";
import { validateMistake, validatePyq, validateFocusMinutes } from "@/lib/study/validate";

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
  // The rules live in lib/study/validate.ts so they can be tested without a
  // database or a session. They are bounded because these strings end up
  // interpolated into the AI system prompt, where unbounded text is unbounded
  // token cost billed to us.
  const checked = validateMistake(input);
  if (!checked.ok) return { error: checked.error };

  const { supabase, id } = await currentUser();
  const { error } = await addMistake(supabase, id, {
    source: input.source,
    ...checked.value,
  });
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function logPyqAction(input: {
  subject: string;
  total: number;
  correct: number;
  predictedCorrect?: number | null;
}): Promise<Result> {
  const checked = validatePyq(input);
  if (!checked.ok) return { error: checked.error };

  const { supabase, id } = await currentUser();
  const { error } = await addPyqAttempt(supabase, id, checked.value);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function logFocusAction(input: { minutes: number }): Promise<Result> {
  const checked = validateFocusMinutes(input.minutes);
  if (!checked.ok) return { error: checked.error };

  await currentUser();
  const supabase = await createClient();

  // One statement, so the addition cannot interleave. Reading the current
  // total and writing total + n was two round trips, and two writes landing
  // inside that gap both read the same starting value: the later one won
  // outright and the earlier session's minutes vanished. Reachable in normal
  // use, a focus timer ending in one tab while Quick Log submits in another.
  const { error } = await supabase.rpc("add_activity_minutes", {
    p_day: isoDateIST(),
    p_minutes: checked.value,
  });
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}
