"use client";

import { useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// READOUT — the Roll primitive (CONSOLE.md §4.2).
//
// Every figure in the product renders through this. A real odometer: each
// digit is a 0–9 strip that translates to its value. Digits roll; they never
// fade, never cross-fade, never count up by re-rendering text.
//
// Columns are staggered left-to-right so the number settles the way
// mechanical wheels do — the least significant digit is still moving when the
// most significant has stopped.
//
// It never overshoots. A figure that springs past its value displays a score
// the student does not have, which breaks "never lie" (CONSOLE.md §1.4).
// ═══════════════════════════════════════════════════════════════════════════

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export type ReadoutProps = {
  value: number;
  /** Rendered before the first roll. Defaults to 0 so the figure rolls up. */
  from?: number;
  /** Milliseconds added per column, left to right. */
  stagger?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Screen-reader text. The visual columns are aria-hidden. */
  label?: string;
};

export default function Readout({
  value,
  from = 0,
  stagger = 55,
  className,
  style,
  label,
}: ReadoutProps) {
  // Render `from` on the first paint, then flip to `value` on the next frame
  // so the CSS transition has two states to move between. Without this the
  // digits mount already at their destination and nothing rolls.
  const [shown, setShown] = useState(from);
  const armed = useRef(false);

  useEffect(() => {
    if (!armed.current) {
      armed.current = true;
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }
    setShown(value);
  }, [value]);

  // Width is fixed by the final value, not the animating one, so the element
  // never reflows mid-roll.
  const text = String(Math.max(0, Math.round(value)));
  const shownText = String(Math.max(0, Math.round(shown))).padStart(text.length, "0");

  return (
    <span className={className} style={style} aria-label={label ?? text} role="img">
      <span className="c-roll" aria-hidden="true">
        {text.split("").map((_, i) => {
          const d = Number(shownText[i] ?? "0");
          return (
            <span key={i} className="c-roll__col">
              <span
                className="c-roll__strip"
                style={{
                  transform: `translateY(-${d}em)`,
                  transitionDelay: `${i * stagger}ms`,
                }}
              >
                {DIGITS.map((n) => (
                  <span key={n} className="c-roll__d">
                    {n}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
