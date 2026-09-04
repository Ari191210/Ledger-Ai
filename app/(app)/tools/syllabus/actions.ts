"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { upsertSyllabusTopic, setTopicCovered, deleteSyllabusTopic } from "@/lib/study/queries";

type Result = { ok: true } | { error: string };

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, id: user.id };
}

export async function addTopicAction(input: {
  subject: string;
  topic: string;
  position: number;
}): Promise<Result> {
  const topic = input.topic.trim();
  if (!topic) return { error: "Name the topic." };

  const { supabase, id } = await currentUser();
  const { error } = await upsertSyllabusTopic(supabase, id, {
    subject: input.subject,
    topic,
    position: input.position,
  });
  if (error) return { error: error.message };
  revalidatePath("/tools/syllabus");
  revalidatePath("/tools/debt-meter");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function toggleTopicAction(id: string, covered: boolean): Promise<Result> {
  const { supabase } = await currentUser();
  const { error } = await setTopicCovered(supabase, id, covered);
  if (error) return { error: error.message };
  revalidatePath("/tools/syllabus");
  revalidatePath("/tools/debt-meter");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteTopicAction(id: string): Promise<Result> {
  const { supabase } = await currentUser();
  const { error } = await deleteSyllabusTopic(supabase, id);
  if (error) return { error: error.message };
  revalidatePath("/tools/syllabus");
  revalidatePath("/tools/debt-meter");
  revalidatePath("/dashboard");
  return { ok: true };
}
