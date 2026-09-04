import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHabits, getHabitLogs } from "@/lib/study/habits";
import { computeStreak } from "@/lib/study/streak";
import { HabitsTracker, type HabitVM } from "@/components/tools/habits-tracker";

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function HabitsToolPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [habits, logs] = await Promise.all([
    getHabits(supabase, user!.id),
    getHabitLogs(supabase, user!.id, isoDaysAgo(29)),
  ]);

  const byHabit = new Map<string, Set<string>>();
  for (const l of logs) {
    if (!byHabit.has(l.habit_id)) byHabit.set(l.habit_id, new Set());
    byHabit.get(l.habit_id)!.add(l.day);
  }

  const today = isoDaysAgo(0);
  const week = Array.from({ length: 7 }, (_, i) => isoDaysAgo(6 - i));

  const data: HabitVM[] = habits.map((h) => {
    const days = byHabit.get(h.id) ?? new Set<string>();
    return {
      id: h.id,
      name: h.name,
      streak: computeStreak(days),
      week: week.map((d) => days.has(d)),
      doneToday: days.has(today),
    };
  });

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/tools"
        className="u-mono inline-flex items-center gap-1.5 text-2xs text-text-3 hover:text-text"
      >
        <ArrowLeft size={12} /> tools
      </Link>

      <div className="mt-4 mb-3">
        <span className="u-label">plan</span>
        <h1 className="mt-1 text-lg font-bold text-text">Habits</h1>
      </div>

      <HabitsTracker habits={data} today={today} />
    </div>
  );
}
