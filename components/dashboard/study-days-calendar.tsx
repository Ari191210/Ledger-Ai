"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";
import { Knob } from "@/components/ui/knob";
import type { DayDetail } from "@/lib/score/inputs";

/** 1st, 2nd, 3rd, 4th, and the 11th to 13th that break the rule. */
function ordinal(d: number) {
  if (d % 100 >= 11 && d % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][d % 10] ?? "th";
}

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
  // The dial always points somewhere, so the card opens on today rather than on
  // an instruction to tap something.
  const [selected, setSelected] = useState<number>(today);
  const detail = dayDetails[selected];
  // Only days that have happened. A dial that can be turned into next week
  // would be a dial with nothing at the other end.
  const days = Array.from({ length: today }, (_, i) => String(i + 1));

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
                  onClick={() => setSelected(d)}
                  aria-pressed={selected === d}
                  // The visible design says all of this with colour: accent for
                  // today, a filled chip for a day with study on it, a ring for
                  // the selected one. A bare digit says none of it, and an
                  // automated name check passes because "17" is a name.
                  aria-label={`${d} ${monthLabel}${d === today ? ", today" : ""}, ${
                    studiedDays.has(d) ? "studied" : "nothing logged"
                  }`}
                  className={cn(
                    "u-tap u-mono grid size-7 place-items-center rounded-full text-2xs tabular-nums transition-colors",
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

      {/* The scrub dial. Twenty-eight small round targets is a fine way to jump
          to a day you already have in mind, and a poor way to go looking. The
          dial is for looking: one detent per day, so you can run the month past
          the readout and watch the entries flick by. It is the same selection
          the grid drives, so the two always agree. */}
      <div className="mt-3 flex items-start gap-3 border-t border-border pt-3">
        <Knob
          label="study day"
          hint={`${selected} ${monthLabel.split(" ")[0]}`}
          positions={days}
          value={String(selected)}
          onChange={(v) => setSelected(Number(v))}
          size={58}
          sweep={300}
        />
        <div className="min-h-[4.75rem] flex-1">
          {!detail && (
            <p className="u-mono text-2xs text-text-3">
              nothing logged on the {selected}
              {ordinal(selected)}
            </p>
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
