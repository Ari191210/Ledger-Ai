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
      <div className="mb-2 text-xs font-semibold text-text-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onPointerDown={() => playClick("soft")}
              onClick={() => onChange(o.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                on
                  ? "border-accent bg-accent text-accent-on"
                  : "border-border bg-surface-2 text-text-2 hover:text-text",
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
