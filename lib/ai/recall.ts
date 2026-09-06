/**
 * Whether the student did anything about what they were told last time.
 *
 * This is the half a general chatbot cannot reach. Remembering a conversation
 * is a transcript; this holds past advice next to the ledger and reports what
 * measurably happened after it, from rows the student logged themselves.
 *
 * Pure, so the judgement can be tested without a database.
 */

import type { Mistake, PyqAttempt } from "@/lib/study/types";

export type AdviceRow = {
  tool: string;
  subject: string | null;
  topic: string | null;
  headline: string;
  created_at: string;
};

/**
 * Advice younger than this is not evidence of anything. A student who was told
 * something yesterday and has not acted on it has not failed, they have had a
 * day. Scolding on that basis is the failure mode this guard exists to stop,
 * and it is the same call the signals library makes: say nothing rather than
 * something weak.
 */
const MIN_AGE_DAYS = 7;
const MAX_LINES = 2;
const DAY = 86_400_000;

const daysBetween = (a: number, b: number) => Math.max(0, Math.round((a - b) / DAY));
const sameTopic = (a: string | null, b: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export function followThrough(
  advice: AdviceRow[],
  mistakes: Mistake[],
  attempts: PyqAttempt[],
  now = Date.now(),
): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  const ripe = advice
    .filter((a) => a.topic && daysBetween(now, new Date(a.created_at).getTime()) >= MIN_AGE_DAYS)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  for (const a of ripe) {
    const key = `${a.subject ?? ""}||${a.topic}`.toLowerCase();
    if (seen.has(key)) continue;

    const since = new Date(a.created_at).getTime();
    const age = daysBetween(now, since);

    const after = <T extends { created_at?: string; taken_at?: string }>(rows: T[], k: keyof T) =>
      rows.filter((r) => new Date(r[k] as string).getTime() > since);

    const tested = after(attempts, "taken_at").filter((x) => sameTopic(x.topic, a.topic));
    const brokeAgain = after(mistakes, "created_at").filter((m) => sameTopic(m.topic, a.topic));
    const resolved = mistakes.filter(
      (m) => sameTopic(m.topic, a.topic) && m.resolved_at && new Date(m.resolved_at).getTime() > since,
    );

    const label = `${a.subject ? `${a.subject} · ` : ""}${a.topic}`;
    let verdict: string | null = null;

    if (tested.length > 0) {
      const correct = tested.reduce((s, x) => s + x.correct, 0);
      const total = tested.reduce((s, x) => s + x.total, 0);
      const pct = total > 0 ? Math.round((correct / total) * 100) : null;
      verdict =
        `they have since tested themselves on it ${tested.length} time${tested.length === 1 ? "" : "s"}` +
        (pct === null ? "." : `, scoring ${pct}%.`);
    } else if (resolved.length > 0) {
      verdict = "they have since marked that mistake resolved.";
    } else if (brokeAgain.length > 0) {
      verdict = `they have logged it wrong ${brokeAgain.length} more time${brokeAgain.length === 1 ? "" : "s"} since, and have not tested themselves on it.`;
    } else {
      verdict = "nothing has been logged against it since.";
    }

    seen.add(key);
    lines.push(`${age} days ago ${a.tool} pointed them at ${label}, and ${verdict}`);
    if (lines.length >= MAX_LINES) break;
  }

  return lines;
}
