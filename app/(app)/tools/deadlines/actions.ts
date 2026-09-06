"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDeadline, deleteDeadline, type DeadlineKind } from "@/lib/study/deadlines";

type Result = { ok: true } | { error: string };

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, id: user.id };
}

export async function addDeadlineAction(input: {
  title: string;
  subject?: string;
  kind: DeadlineKind;
  due_date: string;
  start_hour?: number | null;
}): Promise<Result> {
  const title = input.title.trim();
  if (!title) return { error: "Name the deadline." };
  if (!input.due_date) return { error: "Pick a date." };

  const startHour = input.start_hour;
  if (startHour !== null && startHour !== undefined) {
    if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
      return { error: "Start time must be an hour between 0 and 23." };
    }
  }

  const { supabase, id } = await currentUser();
  const { error } = await addDeadline(supabase, id, {
    title,
    subject: input.subject?.trim() || null,
    kind: input.kind,
    due_date: input.due_date,
    start_hour: startHour ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/tools/deadlines");
  return { ok: true };
}

export async function deleteDeadlineAction(id: string): Promise<Result> {
  const { supabase } = await currentUser();
  const { error } = await deleteDeadline(supabase, id);
  if (error) return { error: error.message };
  revalidatePath("/tools/deadlines");
  return { ok: true };
}
