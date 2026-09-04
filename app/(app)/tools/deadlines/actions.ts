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
}): Promise<Result> {
  const title = input.title.trim();
  if (!title) return { error: "Name the deadline." };
  if (!input.due_date) return { error: "Pick a date." };

  const { supabase, id } = await currentUser();
  const { error } = await addDeadline(supabase, id, {
    title,
    subject: input.subject?.trim() || null,
    kind: input.kind,
    due_date: input.due_date,
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
