"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sound";

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

  // One pill that travels, rather than a background that blinks on and off.
  // The options are text, so their widths differ and CSS alone cannot know
  // where to send it; measuring the active button is the whole trick. The pill
  // then moves on a spring curve, which is what makes it read as one object
  // sliding rather than two states swapping.
  const track = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const [ready, setReady] = useState(false);

  useIso(() => {
    const el = track.current?.querySelector<HTMLElement>('[data-on="true"]');
    if (!el || !track.current) return;
    const t = track.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setPill({ left: r.left - t.left, width: r.width });
  }, [value, options, size]);

  // First paint places the pill without a transition; only later moves animate.
  useEffect(() => {
    if (pill && !ready) requestAnimationFrame(() => setReady(true));
  }, [pill, ready]);

  return (
    <div
      ref={track}
      className={cn(
        "relative inline-flex rounded-full border border-border bg-surface-2 p-0.5",
        size === "sm" ? "text-2xs" : "text-xs",
      )}
      // Not role="tablist". A tablist promises tabpanels, and no instance in
      // this codebase has one: these switch content in place. A group of
      // pressed/unpressed buttons is what this actually is.
      role="group"
    >
      {pill && (
        <span
          aria-hidden
          className={cn(
            "absolute top-0.5 bottom-0.5 rounded-full bg-accent",
            ready && "transition-[left,width] duration-[260ms] ease-spring motion-reduce:transition-none",
          )}
          style={{ left: pill.left, width: pill.width }}
        />
      )}

      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={o}
            data-on={on}
            aria-pressed={on}
            onPointerDown={() => playClick("soft")}
            onClick={() => {
              setInternal(o);
              onChange?.(o);
            }}
            className={cn(
              "relative z-10 rounded-full font-semibold transition-colors duration-200",
              size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5",
              on ? "text-accent-on" : "text-text-2 hover:text-text",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
