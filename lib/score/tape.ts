import type { SupabaseClient } from "@supabase/supabase-js";
import { getMistakes, getPyqAttempts, getActivityRange } from "@/lib/study/queries";

export type TapeEntry = {
  id: string;
  at: string;
  label: string;
  meta: string;
  delta?: string;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Recent mistakes, PYQ attempts, and study sessions merged into one
 * chronological feed — the "ledger tape" on the dashboard. */
export async function getLedgerTape(
  supabase: SupabaseClient,
  userId: string,
  limit = 8,
): Promise<TapeEntry[]> {
  const [mistakes, pyq, activity] = await Promise.all([
    getMistakes(supabase, userId, { sinceDays: 14 }),
    getPyqAttempts(supabase, userId, 14),
    getActivityRange(supabase, userId, isoDate(daysAgo(13)), isoDate(new Date())),
  ]);

  const entries: TapeEntry[] = [];

  for (const m of mistakes) {
    entries.push({
      id: `m-${m.id}`,
      at: m.created_at,
      label: "mistake logged",
      meta: `${m.subject.toLowerCase()} · ${m.topic.toLowerCase()}`,
    });
  }
  for (const a of pyq) {
    entries.push({
      id: `p-${a.id}`,
      at: a.taken_at,
      label: "pyq attempt",
      meta: a.subject.toLowerCase(),
      delta: `${a.correct}/${a.total}`,
    });
  }
  for (const d of activity) {
    if (d.minutes > 0) {
      entries.push({
        id: `a-${d.day}`,
        at: `${d.day}T12:00:00.000Z`,
        label: "focus session",
        meta: "—",
        delta: `${d.minutes}m`,
      });
    }
  }

  return entries.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, limit);
}
