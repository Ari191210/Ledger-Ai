"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";

export function Segmented({
  options,
  value: controlled,
  onChange,
  size = "md",
}: {
  options: readonly string[];
  value?: string;
  onChange?: (v: string) => void;
  size?: "sm" | "md";
}) {
  const [internal, setInternal] = useState(options[0]);
  const value = controlled ?? internal;

  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-border bg-surface-2 p-0.5",
        size === "sm" ? "text-2xs" : "text-xs",
      )}
      // Not role="tablist". A tablist promises tabpanels, and no instance in
      // this codebase has one: these switch content in place. A group of
      // pressed/unpressed buttons is what this actually is.
      role="group"
    >
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={o}
            aria-pressed={on}
            onPointerDown={() => playClick("soft")}
            onClick={() => {
              setInternal(o);
              onChange?.(o);
            }}
            className={cn(
              "relative rounded-full font-semibold transition-colors",
              size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5",
              on ? "text-accent-on" : "text-text-2 hover:text-text",
            )}
          >
            {/* The pill was a framer-motion shared-element that slid between
                options. It is a background now: this control is pressed
                constantly, and the audit's own rule is that high-frequency
                controls earn less motion, not more. */}
            {on && <span className="absolute inset-0 rounded-full bg-accent" />}
            <span className="relative z-10">{o}</span>
          </button>
        );
      })}
    </div>
  );
}
