"use client";

import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";

export function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        playClick("switch");
        onChange(!checked);
      }}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border p-0.5 transition-colors duration-200",
        checked
          ? "border-accent bg-accent-weak shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]"
          : "border-border-2 bg-surface-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]",
      )}
    >
      {/* The knob travels on transform, so the browser composites it without
          an animation runtime. It used to be a framer-motion layout animation,
          which is a lot of library for one element sliding 20 pixels. */}
      <span
        className={cn(
          "block size-5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
          "transition-[translate,background-color] duration-[260ms] ease-spring",
          "motion-reduce:transition-[background-color]",
          checked ? "translate-x-5 bg-accent" : "translate-x-0 bg-text-3",
        )}
      />
    </button>
  );
}
