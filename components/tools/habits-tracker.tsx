"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { playClick } from "@/lib/sound";
import { addHabitAction, toggleHabitAction, archiveHabitAction } from "@/app/(app)/tools/habits/actions";

export type HabitVM = {
  id: string;
  name: string;
  streak: number;
  week: boolean[]; // 7 entries, oldest -> newest (today last)
  doneToday: boolean;
};

export function HabitsTracker({ habits, today }: { habits: HabitVM[]; today: string }) {
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function add() {
    if (!name.trim()) return;
    setErr(null);
    start(async () => {
      const res = await addHabitAction(name);
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      setName("");
      playClick("switch");
    });
  }

  function toggle(id: string, done: boolean) {
    playClick("switch");
    start(async () => {
      await toggleHabitAction(id, today, done);
    });
  }

  function remove(id: string) {
    start(async () => {
      await archiveHabitAction(id);
    });
  }

  return (
    <div className="space-y-3">
      <section className="u-card p-4">
        <span className="u-label">new habit</span>
        <div className="mt-2 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            placeholder="e.g. Review flashcards"
            maxLength={60}
            className="flex-1 rounded-md border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
          <Button size="md" onClick={add} disabled={pending || !name.trim()}>
            <Plus size={14} /> add
          </Button>
        </div>
        {err && <p className="mt-2 u-mono text-2xs text-negative">{err}</p>}
      </section>

      {habits.length === 0 && (
        <p className="u-mono py-6 text-center text-2xs text-text-3">
          no habits yet — add one above
        </p>
      )}

      {habits.map((h) => (
        <section key={h.id} className="u-card flex items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-text">{h.name}</p>
              {h.streak > 0 && (
                <span className="u-mono text-2xs text-accent-strong">{h.streak}d streak</span>
              )}
            </div>
            <div className="mt-2 flex gap-1.5">
              {h.week.map((done, i) => (
                <span
                  key={i}
                  className="size-2 rounded-full"
                  style={{ background: done ? "var(--accent)" : "var(--surface-3)" }}
                />
              ))}
            </div>
          </div>
          <ToggleSwitch
            checked={h.doneToday}
            onChange={(v) => toggle(h.id, v)}
            label={`${h.name} — today`}
          />
          <button
            onClick={() => remove(h.id)}
            aria-label={`Remove ${h.name}`}
            className="text-text-3 hover:text-negative"
          >
            <X size={14} />
          </button>
        </section>
      ))}
    </div>
  );
}
