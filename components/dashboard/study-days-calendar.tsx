"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";
import type { DayDetail } from "@/lib/score/inputs";

export function StudyDaysCalendar({
  cells,
  today,
  monthLabel,
  studiedDays,
  dayDetails,
}: {
  cells: (number | null)[];
  today: number;
  monthLabel: string;
  studiedDays: Set<number>;
  dayDetails: Record<number, DayDetail>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const detail = selected != null ? dayDetails[selected] : undefined;

  return (
    <section className="u-card u-grille relative flex h-full flex-col p-4">
      <div className="flex items-center justify-between">
        <span className="u-label">
          03 <span className="mx-1 text-text-3/60">·</span> study days
        </span>
        <span className="u-mono text-2xs text-text-3">{monthLabel}</span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-2xs text-text-3">
        {["m", "t", "w", "t", "f", "s", "s"].map((d, i) => (
          <span key={i} className="u-mono">{d}</span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const isFuture = d != null && d > today;
          return (
            <div key={i} className="grid aspect-square place-items-center">
              {d && isFuture && (
                <span className="u-mono grid size-7 place-items-center rounded-full text-2xs tabular-nums text-text-3/40">
                  {d}
                </span>
              )}
              {d && !isFuture && (
                <button
                  type="button"
                  onPointerDown={() => playClick("soft")}
                  onClick={() => setSelected((s) => (s === d ? null : d))}
                  className={cn(
                    "u-mono grid size-7 place-items-center rounded-full text-2xs tabular-nums transition-colors",
                    d === today
                      ? "bg-accent font-bold text-accent-on"
                      : studiedDays.has(d)
                        ? "bg-surface-3 text-text hover:bg-border-2"
                        : "text-text-3 hover:bg-surface-2",
                    selected === d && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                  )}
                >
                  {d}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 min-h-[4.75rem] border-t border-border pt-3">
        {selected == null && (
          <p className="u-mono text-2xs text-text-3">tap a day to see what you studied</p>
        )}
        {selected != null && !detail && (
          <p className="u-mono text-2xs text-text-3">nothing logged on the {selected}th</p>
        )}
        {detail && (
          <div className="u-mono space-y-1.5 text-2xs">
            {detail.minutes > 0 && (
              <div className="text-text">
                <span className="text-accent-strong">{detail.minutes}m</span> focus
              </div>
            )}
            {detail.pyq.map((p, i) => (
              <div key={`p${i}`} className="text-text-2">
                pyq · {p.subject.toLowerCase()} ·{" "}
                <span className="text-text">{p.correct}/{p.total}</span>
              </div>
            ))}
            {detail.mistakes.map((m, i) => (
              <div key={`m${i}`} className="text-text-2">
                mistake · {m.subject.toLowerCase()} · {m.topic.toLowerCase()}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-2xs text-text-3">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-accent" /> today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-surface-3" /> studied
        </span>
      </div>
    </section>
  );
}
