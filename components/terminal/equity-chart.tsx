// ═══════════════════════════════════════════════════════════════════════════
// THE PLOT
//
// Simulation output on a dotted instrument grid.
//
// Two properties survive the redesign because they are honesty mechanisms,
// not stylistic choices: the stroke stays dashed to mark the series as
// generated rather than recorded, and the label sits inside the plot frame
// so a cropped screenshot still carries it. The x-axis counts sessions, never
// calendar dates — a generated series on real dates reads as a live record.
// ═══════════════════════════════════════════════════════════════════════════

import type { EquityPoint } from "@/lib/trading/terminal-data";
import { inr } from "@/lib/trading/format";

export default function EquityChart({
  series,
  height = 210,
  label,
}: {
  series: EquityPoint[];
  height?: number;
  label: string;
}) {
  if (series.length < 2) return null;

  const W = 1000;
  const PAD = 10;

  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const x = (i: number) => (i / (series.length - 1)) * W;
  const y = (v: number) => PAD + (1 - (v - min) / span) * (height - PAD * 2);

  const path = series
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(" ");

  const first = values[0];
  const last = values[values.length - 1];
  const colour =
    last > first ? "var(--te-green)" : last < first ? "var(--te-red)" : "var(--te-ink-3)";

  return (
    <figure style={{ margin: 0 }}>
      <div
        style={{
          position: "relative",
          background: "var(--te-panel-2)",
          border: "1px solid var(--te-line)",
          borderRadius: "var(--te-radius-sm)",
          padding: "10px 12px 8px",
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${height}`}
          preserveAspectRatio="none"
          width="100%"
          height={height}
          role="img"
          aria-label={
            `Simulated equity, ${inr(first)} to ${inr(last)} across ` +
            `${series.length - 1} sessions. Simulation, not a trading record.`
          }
          style={{ display: "block", overflow: "visible" }}
        >
          <defs>
            <pattern id="te-dots" width="40" height="26" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="var(--te-ink-3)" opacity="0.32" />
            </pattern>
          </defs>
          <rect x={0} y={0} width={W} height={height} fill="url(#te-dots)" />

          {/* The opening level. Gain and loss are read against it. */}
          <line
            x1={0}
            x2={W}
            y1={y(first)}
            y2={y(first)}
            stroke="var(--te-blue)"
            strokeWidth={1.5}
            strokeDasharray="2 5"
            vectorEffect="non-scaling-stroke"
            opacity={0.7}
          />

          <path
            d={path}
            fill="none"
            stroke={colour}
            strokeWidth={2.4}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            /* Dashed = generated, not recorded. Never render this solid. */
            strokeDasharray="8 5"
          />

          <line
            x1={W}
            x2={W}
            y1={y(last) - 7}
            y2={y(last) + 7}
            stroke={colour}
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* The marker lives inside the frame, not in the caption. */}
        <span
          className="te-label"
          style={{
            position: "absolute",
            top: 10,
            left: 12,
            background: "var(--te-panel-2)",
            padding: "0 6px 0 0",
            color: "var(--te-ink-3)",
          }}
        >
          {label}
        </span>
      </div>

      <figcaption
        className="te-label"
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 8,
        }}
      >
        <span>Session 0 · {inr(first)}</span>
        <span>
          Session {series.length - 1} · {inr(last)}
        </span>
      </figcaption>
    </figure>
  );
}
