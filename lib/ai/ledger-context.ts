/**
 * The student's own logged data, formatted for a system prompt.
 *
 * This is what separates an AI tool here from the same question typed into a
 * general chatbot. The model is not being told who the student is in the
 * abstract (buildProfileContext already does grade, board, stream, exam), it is
 * being told what this particular person has already got wrong, what they have
 * not covered yet, and what is coming up.
 *
 * Everything is counted from rows the student created. Nothing is inferred, and
 * an empty ledger says so plainly rather than inventing a plausible history for
 * the model to reason about.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getMistakes, getSyllabus, getPyqAttempts } from "@/lib/study/queries";
import { getDeadlines } from "@/lib/study/deadlines";
import { isoDateIST } from "@/lib/date";
import { derivedPatterns } from "./patterns-context";
import { followThrough, type AdviceRow } from "./recall";

const ALL = "All subjects";

export type LedgerContext = {
  text: string;
  /** The student's own topic vocabulary, so advice can be filed against a real
   *  topic without a second query and without inventing one. */
  knownTopics: string[];
};

export async function buildLedgerContext(
  supabase: SupabaseClient,
  userId: string,
  subjectFilter?: string,
): Promise<LedgerContext> {
  const scope = subjectFilter && subjectFilter !== ALL ? subjectFilter : null;

  // Every mistake, not just the open ones. The same query either way, and the
  // derived patterns below need the full history: a topic that was fixed and
  // broke again is precisely the thing worth knowing, and it is invisible if
  // resolved rows are filtered out in the database.
  const [allMistakes, syllabus, attempts, deadlines, adviceRes] = await Promise.all([
    getMistakes(supabase, userId),
    getSyllabus(supabase, userId),
    getPyqAttempts(supabase, userId),
    getDeadlines(supabase, userId),
    supabase
      .from("ai_advice")
      .select("tool, subject, topic, headline, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const mistakes = allMistakes.filter((m) => m.resolved_at === null);

  const inScope = <T extends { subject: string }>(rows: T[]) =>
    scope ? rows.filter((r) => r.subject === scope) : rows;

  const lines: string[] = [];

  // What they keep getting wrong, most repeated first.
  const counts = new Map<string, number>();
  for (const m of inScope(mistakes)) {
    const key = `${m.subject} · ${m.topic}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size > 0) {
    // Capped for the same reason the syllabus is: a student a year in has
    // hundreds of these, and the tail of one-off mistakes crowds out the
    // repeat offenders that matter. Sorted first, so the cut loses the least.
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    lines.push("Open mistakes (subject · topic, times logged):");
    for (const [key, n] of ranked.slice(0, 25)) lines.push(`- ${key} (${n}x)`);
    if (ranked.length > 25) {
      lines.push(`- and ${ranked.length - 25} more, logged ${ranked[25][1]}x or fewer`);
    }
  }

  // What they have not covered. Capped: a 70-topic dump crowds out the rest.
  const uncovered = inScope(syllabus).filter((t) => !t.covered);
  if (uncovered.length > 0) {
    lines.push("Uncovered syllabus topics (subject · topic):");
    for (const t of uncovered.slice(0, 25)) lines.push(`- ${t.subject} · ${t.topic}`);
    if (uncovered.length > 25) lines.push(`- and ${uncovered.length - 25} more`);
  }

  // How they actually score, so the model can pitch at the right level instead
  // of guessing from grade alone.
  const scopedAttempts = inScope(attempts);
  const correct = scopedAttempts.reduce((s, a) => s + a.correct, 0);
  const total = scopedAttempts.reduce((s, a) => s + a.total, 0);
  if (total > 0) {
    lines.push(
      `Past paper accuracy${scope ? ` in ${scope}` : ""}: ${correct} of ${total} (${Math.round(
        (correct / total) * 100,
      )}%) across ${scopedAttempts.length} logged attempts.`,
    );
  }

  // What is coming, so advice can be weighted by urgency.
  const today = new Date(`${isoDateIST()}T00:00:00Z`).getTime();
  const upcoming = deadlines
    .map((d) => ({
      ...d,
      days: Math.round((new Date(`${d.due_date}T00:00:00Z`).getTime() - today) / 86_400_000),
    }))
    .filter((d) => d.days >= 0 && d.days <= 30)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);
  if (upcoming.length > 0) {
    lines.push("Upcoming deadlines:");
    for (const d of upcoming) {
      lines.push(
        `- ${d.title}${d.subject ? ` (${d.subject})` : ""} in ${d.days} day${d.days === 1 ? "" : "s"}`,
      );
    }
  }

  // What the facts above add up to over time. Scoped like everything else,
  // except contagion, which is fed the full set because a pair breaking across
  // two subjects is the finding a single-subject view would throw away.
  const patterns = derivedPatterns({
    mistakes: inScope(allMistakes),
    allMistakes,
    syllabus: inScope(syllabus),
    attempts: inScope(attempts),
  });
  if (patterns.length > 0) {
    lines.push("Patterns in how they study, measured from the rows above:");
    for (const p of patterns) lines.push(`- ${p}`);
  }

  // What came of the last round of advice. Only advice old enough to have been
  // acted on counts, and the outcome is read off their logged rows rather than
  // asked for, so this can say "nothing happened" without it being an accusation.
  const recall = followThrough(
    (adviceRes.error ? [] : ((adviceRes.data ?? []) as AdviceRow[])).filter(
      (a) => !scope || a.subject === scope,
    ),
    allMistakes,
    attempts,
  );
  if (recall.length > 0) {
    lines.push("What happened after previous advice:");
    for (const r of recall) lines.push(`- ${r}`);
  }

  const knownTopics = [
    ...new Set([...syllabus.map((t) => t.topic), ...allMistakes.map((m) => m.topic)]),
  ].filter(Boolean);

  if (lines.length === 0) {
    return {
      text: "This student has not logged any mistakes, syllabus topics, past papers or deadlines yet. Do not refer to their history, because there is none.",
      knownTopics,
    };
  }

  const text = [
    "--- THIS STUDENT'S LOGGED DATA ---",
    ...lines,
    "",
    "Use this to ground your answer: connect to topics they already struggle with where it is genuinely relevant, and pitch difficulty at their measured accuracy. Where a pattern above explains something, let it change what you actually advise, not just what you say. A topic they re-break every few days needs a different explanation than the one that has already failed, not the same one repeated more slowly.",
    "Never quote these figures or patterns back at them as though reading a report, and never invent a figure that is not listed here. They can already see their own statistics on the Patterns page; your job is to act on them.",
    "Where a previous piece of advice is listed above, you may refer to it, but only as it is written: do not claim to remember a conversation, and do not invent advice that is not listed. If nothing was logged against it, treat that as information about what to suggest next, not as something to reproach them for. Advice they ignored twice is advice that did not fit them, so suggest a different approach rather than repeating it.",
    "--- END LOGGED DATA ---",
  ].join("\n");

  return { text, knownTopics };
}
