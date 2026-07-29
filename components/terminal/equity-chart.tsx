// ═══════════════════════════════════════════════════════════════════════════
// THE EQUITY CURVE
//
// Simulation output, so the stroke is dashed and the frame carries its own
// label — §8.4 and §8.3. A cropped screenshot of this chart still says what
// it is, which is the entire reason the marker sits inside the frame rather
// than in a caption beneath it.
//
// The x-axis is session ordinals, never calendar dates (§8.7): a generated
// series plotted against real dates reads as a live record, which it is not.
// ═══════════════════════════════════════════════════════════════════════════

import type { EquityPoint } from "@/lib/trading/terminal-data";
import { inr } from "@/lib/trading/format";

export default function EquityChart({
  series,
  height = 200,
  label,
}: {
  series: EquityPoint[];
  height?: number;
  label: string;
}) {
  if (series.length < 2) return null;

  const W = 1000;
  const PAD = 8;

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
  const stroke =
    last > first ? "var(--advancing)" : last < first ? "var(--retreating)" : "var(--ink-2)";

  return (
    <figure style={{ margin: 0, position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        role="img"
        aria-label={
          `Simulated equity curve, ${inr(first)} to ${inr(last)} ` +
          `across ${series.length - 1} sessions. Simulation, not a trading record.`
        }
        style={{ display: "block", overflow: "visible" }}
      >
        {/* The opening line. Gain and loss are read against it. */}
        <line
          x1={0}
          x2={W}
          y1={y(first)}
          y2={y(first)}
          stroke="var(--rule-2)"
          strokeWidth={1}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth={1.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          /* §8.4: dashed = not a real record. Never render this solid. */
          strokeDasharray="7 4"
        />
        {/* The close. A tick, not a dot. */}
        <line
          x1={W}
          x2={W}
          y1={y(last) - 5}
          y2={y(last) + 5}
          stroke={stroke}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* §8.3: the marker lives inside the frame. */}
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          fontFamily: "var(--data)",
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: "0.17em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          background: "var(--paper)",
          paddingRight: 8,
        }}
      >
        {label}
      </span>

      <figcaption
        className="ed-dateline"
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 8,
          borderTop: "1px solid var(--rule-2)",
          paddingTop: 6,
          textTransform: "none",
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
