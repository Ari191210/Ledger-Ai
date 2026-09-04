"use client";

import { useState } from "react";

export function FocusChart({ data }: { data: { day: string; minutes: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const w = 760;
  const h = 140;
  const pad = 8;
  const hasData = data.some((d) => d.minutes > 0);
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
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          className="h-36 w-full"
          onMouseLeave={() => setHover(null)}
        >
          {/* baseline — visible even with zero data, so the panel never reads as empty */}
          <line x1={0} y1={h - pad} x2={w} y2={h - pad} stroke="var(--border)" strokeWidth={1} />

          {data.map((d, i) => (
            <rect
              key={d.day}
              x={i * barW + barW * 0.18}
              y={y(d.minutes)}
              width={Math.max(1, barW * 0.64)}
              height={Math.max(2, h - pad - y(d.minutes))}
              className={i === hover ? "fill-accent" : "fill-surface-3"}
              onMouseEnter={() => setHover(i)}
            />
          ))}

          {hasData && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--chart-blue)"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {!hasData && (
          <p className="u-mono pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-2xs text-text-3">
            no focus sessions logged in the last 30 days
          </p>
        )}

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

      <div className="mt-3 flex items-center gap-4 text-2xs text-text-3">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-accent" /> daily focus
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-chart-blue" /> 7-day average
        </span>
      </div>
    </div>
  );
}
