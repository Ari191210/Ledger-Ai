"use client";

import { useState } from "react";

export function FocusChart({ data }: { data: { day: string; minutes: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const w = 760;
  const h = 140;
  const pad = 8;
  const max = Math.max(...data.map((d) => d.minutes), 30);
  const barW = w / data.length;

  // 7-day trailing average — the line overlay
  const avg = data.map((_, i) => {
    const slice = data.slice(Math.max(0, i - 6), i + 1);
    return slice.reduce((s, d) => s + d.minutes, 0) / slice.length;
  });

  const x = (i: number) => i * barW + barW / 2;
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const linePath = avg
    .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");

  const active = hover != null ? data[hover] : null;
  const activePct = hover != null ? Math.min(90, Math.max(10, (hover / (data.length - 1)) * 100)) : 0;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="h-36 w-full"
        onMouseLeave={() => setHover(null)}
      >
        {data.map((d, i) => (
          <rect
            key={d.day}
            x={i * barW + barW * 0.18}
            y={y(d.minutes)}
            width={Math.max(1, barW * 0.64)}
            height={Math.max(1, h - pad - y(d.minutes))}
            className={i === hover ? "fill-accent" : "fill-surface-3"}
            onMouseEnter={() => setHover(i)}
          />
        ))}
        <path
          d={linePath}
          fill="none"
          stroke="var(--accent-strong)"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {active && (
        <div
          className="u-card u-mono pointer-events-none absolute -top-3 z-10 -translate-x-1/2 -translate-y-full px-2.5 py-1.5 text-2xs shadow-lg"
          style={{ left: `${activePct}%` }}
        >
          <div className="whitespace-nowrap text-text">{active.minutes}m focus</div>
          <div className="whitespace-nowrap text-text-3">
            {new Date(active.day).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
          </div>
        </div>
      )}
    </div>
  );
}
