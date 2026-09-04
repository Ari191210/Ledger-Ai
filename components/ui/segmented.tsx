"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
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
  const gid = useId();
  const [internal, setInternal] = useState(options[0]);
  const value = controlled ?? internal;

  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-border bg-surface-2 p-0.5",
        size === "sm" ? "text-2xs" : "text-xs",
      )}
      role="tablist"
    >
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={o}
            role="tab"
            aria-selected={on}
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
            {on && (
              <motion.span
                layoutId={`seg-${gid}`}
                className="absolute inset-0 rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 480, damping: 34 }}
              />
            )}
            <span className="relative z-10">{o}</span>
          </button>
        );
      })}
    </div>
  );
}
