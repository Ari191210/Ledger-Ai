"use client";

import { useTransition } from "react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { playClick } from "@/lib/sound";
import { toggleHabitAction } from "@/app/(app)/tools/habits/actions";

export type DashboardHabit = { id: string; name: string; doneToday: boolean };

export function DashboardHabits({ habits, today }: { habits: DashboardHabit[]; today: string }) {
  const [, start] = useTransition();

  function toggle(id: string, done: boolean) {
    playClick("switch");
    start(async () => {
      await toggleHabitAction(id, today, done);
    });
  }

  return (
    <div className="divide-y divide-dashed divide-border">
      {habits.map((h) => (
        <div key={h.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className={h.doneToday ? "text-sm text-text" : "text-sm text-text-2"}>{h.name}</span>
          <ToggleSwitch checked={h.doneToday} onChange={(v) => toggle(h.id, v)} label={h.name} />
        </div>
      ))}
    </div>
  );
}
