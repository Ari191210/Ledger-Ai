"use client";

import { useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// TRACK — the Fill primitive (CONSOLE.md §4.2).
//
// Progress grows from its origin and decelerates into its true value. It does
// not overshoot: a bar that springs past the value shows progress the student
// has not made.
//
// scaleX rather than width, so it is GPU-composited and never triggers layout.
// ═══════════════════════════════════════════════════════════════════════════

/** Two documented sizes. A caller passing an arbitrary pixel width would be
 *  making a design decision at the call site, which is how systems drift. */
export type TrackSize = "full" | "compact";

export type TrackProps = {
  /** 0–1. Values outside the range are clamped rather than trusted. */
  value: number;
  /** `full` fills its container; `compact` is the chrome indicator. */
  size?: TrackSize;
  label?: string;
};

export default function Track({ value, size = "full", label }: TrackProps) {
  const target = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const [fill, setFill] = useState(0);
  const armed = useRef(false);

  useEffect(() => {
    if (!armed.current) {
      armed.current = true;
      const id = requestAnimationFrame(() => setFill(target));
      return () => cancelAnimationFrame(id);
    }
    setFill(target);
  }, [target]);

  return (
    <div
      className="c-track"
      style={size === "compact" ? { width: 44, flex: "0 0 auto" } : undefined}
      role="progressbar"
      aria-valuenow={Math.round(target * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span className="c-track__fill" style={{ transform: `scaleX(${fill.toFixed(4)})` }} />
    </div>
  );
}
