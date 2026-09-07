"use client";

import { useOptimistic, useState, useTransition } from "react";
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

  /**
   * The switch used to be driven straight from server data, so pressing it did
   * nothing visible until the write, a revalidate of two routes, and a fresh
   * render of the page had all come back: measured at 2.7 seconds on the live
   * site for a control whose entire job is to move twenty pixels.
   *
   * The press is now answered locally and the server catches up. Today's dot
   * moves with it, because the switch and the week strip are the same fact
   * shown twice and they must not disagree while the write is in flight. The
   * streak is deliberately left alone: it depends on days this component
   * cannot see, and a number that guesses and then corrects itself is worse
   * than one that arrives a moment late.
   */
  const [shown, applyToggle] = useOptimistic(
    habits,
    (state, { id, done }: { id: string; done: boolean }) =>
      state.map((h) =>
        h.id === id
          ? { ...h, doneToday: done, week: [...h.week.slice(0, -1), done] }
          : h,
      ),
  );

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
      applyToggle({ id, done });
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

      {shown.length === 0 && (
        <p className="u-mono py-6 text-center text-2xs text-text-3">
          no habits yet, add one above
        </p>
      )}

      {/* A habit card holds a name, seven dots and a switch. Stretched down a
          full-width page each one was mostly empty, with the switch stranded a
          screen away from the name it belongs to. Wrapping into columns keeps a
          card the width its contents need and puts the whole week's habits in
          one glance, which is the thing this tool is for. */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {shown.map((h) => (
          <section key={h.id} className="u-card flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-text">{h.name}</p>
                {h.streak > 0 && (
                  <span className="u-mono shrink-0 text-2xs text-text-2">{h.streak}d streak</span>
                )}
              </div>
              {/* The switch is this card's one accent, the same way the
                  dashboard's habit rows spend theirs. Seven days of lime dots
                  beside a lime switch and a lime streak put three accents in a
                  panel, and four cards across a wide screen turned that into a
                  wall of it. The week is the workings; today is the figure. */}
              <div className="mt-2 flex gap-1.5">
                {h.week.map((done, i) => (
                  <span
                    key={i}
                    className="size-2 rounded-full"
                    style={{ background: done ? "var(--text-3)" : "var(--surface-3)" }}
                  />
                ))}
              </div>
            </div>
            <ToggleSwitch
              checked={h.doneToday}
              onChange={(v) => toggle(h.id, v)}
              label={`${h.name}, today`}
            />
            <button
              onClick={() => remove(h.id)}
              aria-label={`Remove ${h.name}`}
              className="shrink-0 text-text-3 hover:text-negative"
            >
              <X size={14} />
            </button>
          </section>
        ))}
      </div>
    </div>
  );
}
