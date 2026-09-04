import Link from "next/link";
import { ArrowLeft, ArrowDown, ArrowUp, Minus, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActivityRange, getPyqAttempts, getMistakes, getCurrentStreak } from "@/lib/study/queries";
import { isoDateIST, isoDaysAgoIST } from "@/lib/date";
import { buildWeeklyBriefing, type WeekWindow } from "@/lib/coach";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export default async function CoachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const today = isoDateIST();
  const uid = user!.id;

  const [activity14, pyq14, mistakesAll, streakDays] = await Promise.all([
    getActivityRange(supabase, uid, isoDaysAgoIST(13), today),
    getPyqAttempts(supabase, uid, 14),
    getMistakes(supabase, uid),
    getCurrentStreak(supabase, uid),
  ]);

  const cutoff = isoDaysAgoIST(6); // start of "this week" (last 7 days incl. today)

  function window(fromDay: string, toDay: string): WeekWindow {
    const minutes = activity14
      .filter((a) => a.day >= fromDay && a.day <= toDay)
      .reduce((s, a) => s + a.minutes, 0);
    const pyq = pyq14.filter((p) => {
      const d = p.taken_at.slice(0, 10);
      return d >= fromDay && d <= toDay;
    });
    const mistakesLogged = mistakesAll.filter((m) => {
      const d = m.created_at.slice(0, 10);
      return d >= fromDay && d <= toDay;
    }).length;
    const mistakesResolved = mistakesAll.filter((m) => {
      if (!m.resolved_at) return false;
      const d = m.resolved_at.slice(0, 10);
      return d >= fromDay && d <= toDay;
    }).length;
    return {
      minutes,
      pyqCorrect: pyq.reduce((s, p) => s + p.correct, 0),
      pyqTotal: pyq.reduce((s, p) => s + p.total, 0),
      mistakesLogged,
      mistakesResolved,
    };
  }

  const thisWeek = window(cutoff, today);
  const lastWeek = window(isoDaysAgoIST(13), isoDaysAgoIST(7));

  const hasAnyData = activity14.length > 0 || pyq14.length > 0 || mistakesAll.length > 0;

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/tools" className="u-mono inline-flex items-center gap-1.5 text-2xs text-text-3 hover:text-text">
        <ArrowLeft size={12} /> tools
      </Link>
      <div className="mt-4 mb-3">
        <span className="u-label">track</span>
        <h1 className="mt-1 text-lg font-bold text-text">Coach</h1>
      </div>

      {!hasAnyData ? (
        <EmptyState
          icon={Megaphone}
          index="no data yet"
          title="Nothing to brief you on"
          body="Log a few days of activity and Coach compares this week to last, real numbers, not encouragement for its own sake."
          hint="log a study session to begin"
        />
      ) : (
        <CoachBody thisWeek={thisWeek} lastWeek={lastWeek} streakDays={streakDays} />
      )}
    </div>
  );
}

function CoachBody({
  thisWeek,
  lastWeek,
  streakDays,
}: {
  thisWeek: WeekWindow;
  lastWeek: WeekWindow;
  streakDays: number;
}) {
  const briefing = buildWeeklyBriefing(thisWeek, lastWeek, streakDays);

  return (
    <div className="space-y-3">
      <section className="u-card p-5">
        <span className="u-label">this week</span>
        <p className="mt-2 text-base font-semibold leading-snug text-text">{briefing.headline}</p>
        <p className="mt-3 text-sm leading-relaxed text-text-2">{briefing.focus}</p>
      </section>

      <section className="u-card p-4">
        <span className="u-label">the numbers</span>
        <div className="mt-2 divide-y divide-border">
          {briefing.deltas.map((d) => (
            <div key={d.label} className="flex items-center gap-3 py-3">
              <div
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full",
                  d.direction === "up" && "bg-accent-weak text-accent-strong",
                  d.direction === "down" && "bg-negative-weak text-negative",
                  d.direction === "flat" && "bg-surface-2 text-text-3",
                )}
              >
                {d.direction === "up" && <ArrowUp size={13} />}
                {d.direction === "down" && <ArrowDown size={13} />}
                {d.direction === "flat" && <Minus size={13} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text">{d.label}</span>
                  <span className="u-mono text-text-2">{d.thisWeek}</span>
                </div>
                <p className="u-mono mt-0.5 text-2xs text-text-3">{d.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
