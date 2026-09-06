"use client";

import { useEffect, useState } from "react";

export function Ring({
  value,
  max,
  size = 128,
  stroke = 12,
  track = "var(--surface-3)",
  color = "var(--accent-strong)",
  /** Values on the same scale as `max`, printed across the track as gaps.
   *  An aircraft dial paints its bands on the face, so the threshold is
   *  visible even when the needle rests at zero. A score with no printed
   *  scale invites the reader to invent one. */
  marks = [],
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  track?: string;
  color?: string;
  marks?: readonly number[];
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));

  // The arc travels to its value instead of being painted at it. Two reasons.
  // The readout inside this ring counts up over the same duration, and an arc
  // that is already full while the digits are still climbing is an instrument
  // disagreeing with itself. And when a student logs something, the score is
  // supposed to visibly move, which is the whole promise of the product.
  //
  // The rAF matters: setting this in the same frame as mount gets batched into
  // the first paint, and the transition then has no distance to travel.
  const [shownPct, setShownPct] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShownPct(pct);
      return;
    }
    const id = requestAnimationFrame(() => setShownPct(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shownPct)}
          className="ring-progress"
          // easeOutCubic, deliberately not this repo's usual entrance curve.
          // StatNumber eases the digits with 1 - (1 - p)^3 in JS, and the arc
          // has to sit on the identical curve or the two disagree in the middle
          // even while starting and finishing together. Measured: the repo's
          // standard curve left them 11.7 points apart mid-travel.
          style={{ transition: "stroke-dashoffset 750ms cubic-bezier(0.33, 1, 0.68, 1)" }}
        />
        {/* Drawn last, so they sit on top of the arc as well as the track.
            The whole point of a printed threshold is that it stays visible at
            every reading: an aircraft redline is on the dial face whether the
            needle rests at zero or sweeps past it. Underneath the arc they
            disappeared the moment a student did well, which is precisely when
            knowing the next boundary matters. Ground colour, so they read as
            notches cut into the dial, not as a second data series. */}
        {marks.map((m) => {
          const a = (Math.max(0, Math.min(1, m / max)) * 360 * Math.PI) / 180;
          const inner = r - stroke / 2;
          const outer = r + stroke / 2;
          const cx = size / 2;
          const cy = size / 2;
          return (
            <line
              key={m}
              x1={cx + inner * Math.cos(a)}
              y1={cy + inner * Math.sin(a)}
              x2={cx + outer * Math.cos(a)}
              y2={cy + outer * Math.sin(a)}
              stroke="var(--bg)"
              strokeWidth="2"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        {children}
      </div>
    </div>
  );
}
