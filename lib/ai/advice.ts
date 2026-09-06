/**
 * Recording what the AI told a student, so a later answer can check whether
 * anything came of it.
 *
 * The extraction is pure and free: it reuses text the student already saw
 * rather than paying for a second model call to summarise the first one.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiResult } from "./types";

const MAX_HEADLINE = 240;

const firstSentence = (s: string) => {
  const trimmed = s.trim().replace(/\s+/g, " ");
  const stop = trimmed.search(/[.!?](\s|$)/);
  return stop === -1 ? trimmed : trimmed.slice(0, stop + 1);
};

/**
 * What was advised, in one line, or null when the result is not advice.
 *
 * Question sets and per-essay grades are deliberately excluded. A set of
 * practice questions is not an instruction to follow up on, and a grade for one
 * essay says nothing about what the student should do next week.
 */
export function summariseAdvice(result: AiResult): string | null {
  if (result.kind === "list") {
    const titles = result.items
      .map((i) => i.title.trim())
      .filter(Boolean)
      .slice(0, 3);
    if (titles.length === 0) return null;
    return titles.join("; ").slice(0, MAX_HEADLINE);
  }
  if (result.kind === "text") {
    const line = firstSentence(result.text);
    return line.length > 0 ? line.slice(0, MAX_HEADLINE) : null;
  }
  return null;
}

/**
 * The topic this advice was about.
 *
 * Only five of the tools ask for a topic, so a form field alone would leave
 * most advice uncheckable. Falling back to the student's own vocabulary, the
 * topics they typed into their syllabus and mistakes, finds one far more often
 * and stays factual: it matches against rows they created, it does not infer a
 * topic the model might have hallucinated.
 */
export function resolveTopic(
  formTopic: string | null | undefined,
  headline: string,
  knownTopics: string[],
): string | null {
  const explicit = formTopic?.trim();
  if (explicit) return explicit;

  const haystack = headline.toLowerCase();
  // Longest first, so "Mole concept" wins over a bare "Mole" if both are listed.
  const match = [...knownTopics]
    .filter((t) => t.trim().length >= 4)
    .sort((a, b) => b.length - a.length)
    .find((t) => haystack.includes(t.toLowerCase()));
  return match ?? null;
}

export async function recordAdvice(
  supabase: SupabaseClient,
  userId: string,
  row: { tool: string; subject: string | null; topic: string | null; headline: string },
) {
  await supabase.from("ai_advice").insert({ user_id: userId, ...row });
}
