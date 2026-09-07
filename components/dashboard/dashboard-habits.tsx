"use client";

import { useOptimistic, useTransition } from "react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { playClick } from "@/lib/sound";
import { toggleHabitAction } from "@/app/(app)/tools/habits/actions";

export type DashboardHabit = { id: string; name: string; doneToday: boolean };

export function DashboardHabits({ habits, today }: { habits: DashboardHabit[]; today: string }) {
  const [, start] = useTransition();

  // Answer the press locally; the write and the revalidate catch up behind it.
  // Driven straight from server data this switch took seconds to move.
  const [shown, applyToggle] = useOptimistic(
    habits,
    (state, { id, done }: { id: string; done: boolean }) =>
      state.map((h) => (h.id === id ? { ...h, doneToday: done } : h)),
  );

  function toggle(id: string, done: boolean) {
    playClick("switch");
    start(async () => {
      applyToggle({ id, done });
      await toggleHabitAction(id, today, done);
    });
  }

  return (
    <div className="divide-y divide-dashed divide-border">
      {shown.map((h) => (
        <div key={h.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className={h.doneToday ? "text-sm text-text" : "text-sm text-text-2"}>{h.name}</span>
          <ToggleSwitch checked={h.doneToday} onChange={(v) => toggle(h.id, v)} label={h.name} />
        </div>
      ))}
    </div>
  );
}
