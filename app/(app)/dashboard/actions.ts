"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addMistake, addPyqAttempt } from "@/lib/study/queries";
import type { MistakeSource } from "@/lib/study/types";
import { isoDateIST } from "@/lib/date";
import { boundedText, MAX_NOTE } from "@/lib/text";

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
  // Bounded, because this string is interpolated into the AI system prompt.
  // Unbounded text there is unbounded token cost, billed to us.
  const subject = boundedText(input.subject, "Subject", 60);
  if (!subject.ok) return { error: subject.error };
  const topic = boundedText(input.topic, "Topic");
  if (!topic.ok) return { error: topic.error };
  const note = boundedText(input.note, "Note", MAX_NOTE, false);
  if (!note.ok) return { error: note.error };

  const { supabase, id } = await currentUser();
  const { error } = await addMistake(supabase, id, {
    ...input,
    subject: subject.value,
    topic: topic.value,
    note: note.value || undefined,
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
  const pyqSubject = boundedText(input.subject, "Subject", 60);
  if (!pyqSubject.ok) return { error: pyqSubject.error };
  if (!Number.isFinite(input.total) || input.total <= 0) {
    return { error: "Enter how many questions you attempted." };
  }
  if (!Number.isFinite(input.correct) || input.correct < 0 || input.correct > input.total) {
    return { error: "Correct can't exceed the total." };
  }
  const predicted = input.predictedCorrect;
  if (predicted !== null && predicted !== undefined) {
    if (!Number.isFinite(predicted) || predicted < 0 || predicted > input.total) {
      return { error: "Your guess can't be negative or exceed the total." };
    }
  }
  const { supabase, id } = await currentUser();
  const { error } = await addPyqAttempt(supabase, id, { ...input, subject: pyqSubject.value });
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function logFocusAction(input: { minutes: number }): Promise<Result> {
  if (!Number.isFinite(input.minutes) || input.minutes <= 0) {
    return { error: "Enter minutes greater than zero." };
  }
  await currentUser();
  const supabase = await createClient();

  // One statement, so the addition cannot interleave. Reading the current
  // total and writing total + n was two round trips, and two writes landing
  // inside that gap both read the same starting value: the later one won
  // outright and the earlier session's minutes vanished. Reachable in normal
  // use, a focus timer ending in one tab while Quick Log submits in another.
  const { error } = await supabase.rpc("add_activity_minutes", {
    p_day: isoDateIST(),
    p_minutes: Math.round(input.minutes),
  });
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}
