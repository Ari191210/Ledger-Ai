"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";

export function FilterPills({
  options,
  onChange,
}: {
  options: string[];
  onChange?: (v: string) => void;
}) {
  const [active, setActive] = useState(options[0]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = o === active;
        return (
          <button
            key={o}
            onPointerDown={() => playClick("soft")}
            onClick={() => {
              setActive(o);
              onChange?.(o);
            }}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              on
                ? "bg-accent text-accent-on"
                : "bg-surface-2 text-text-2 hover:text-text",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
