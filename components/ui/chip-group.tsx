"use client";

import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";

export type ChipOption = { readonly value: string; readonly label: string };

export function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly ChipOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="u-label mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onPointerDown={() => playClick("soft")}
              onClick={() => onChange(o.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors",
                on
                  ? "border-accent bg-accent text-accent-on shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                  : "border-border bg-surface-2 text-text-2 hover:border-border-2 hover:text-text",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
