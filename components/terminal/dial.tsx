// ═══════════════════════════════════════════════════════════════════════════
// THE DIAL
//
// A rotary indicator: tick ring, swept arc, pointer. It exists because some
// figures are proportions and read faster as a position than as a number —
// how far a session's return sat from the target it had to clear.
//
// The dial always prints its value in text underneath. It is an aid to
// reading the number, never a replacement for it.
// ═══════════════════════════════════════════════════════════════════════════

const START = 135; // degrees, bottom-left
const SWEEP = 270; // degrees of travel

function polar(cx: number, cy: number, r: number, degrees: number) {
  const rad = ((degrees - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M${a.x.toFixed(2)},${a.y.toFixed(2)} A${r},${r} 0 ${large} 1 ${b.x.toFixed(2)},${b.y.toFixed(2)}`;
}

export default function Dial({
  fraction,
  colour,
  caption,
  value,
  size = 116,
}: {
  /** Position on the dial, 0 to 1. Values outside are clamped. */
  fraction: number;
  colour: string;
  caption: string;
  value: string;
  size?: number;
}) {
  const clamped = Math.min(Math.max(Number.isFinite(fraction) ? fraction : 0, 0), 1);
  const cx = size / 2;
  const cy = size / 2;
  const rTick = size / 2 - 4;
  const rArc = size / 2 - 13;
  const angle = START + clamped * SWEEP;

  const ticks = Array.from({ length: 19 }, (_, i) => {
    const deg = START + (i / 18) * SWEEP;
    const major = i % 3 === 0;
    const outer = polar(cx, cy, rTick, deg);
    const inner = polar(cx, cy, rTick - (major ? 7 : 4), deg);
    return { outer, inner, major };
  });

  const pointer = polar(cx, cy, rArc - 6, angle);
  const hub = size * 0.17;

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${caption}: ${value}`}
        style={{ display: "block", margin: "0 auto" }}
      >
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.outer.x}
            y1={t.outer.y}
            x2={t.inner.x}
            y2={t.inner.y}
            stroke="var(--te-ink-3)"
            strokeWidth={t.major ? 1.6 : 1}
            strokeLinecap="round"
            opacity={t.major ? 0.85 : 0.45}
          />
        ))}

        {/* The full travel, unlit. */}
        <path
          d={arcPath(cx, cy, rArc, START, START + SWEEP)}
          fill="none"
          stroke="var(--te-line)"
          strokeWidth={5}
          strokeLinecap="round"
        />

        {/* The swept value. */}
        {clamped > 0.002 && (
          <path
            d={arcPath(cx, cy, rArc, START, angle)}
            fill="none"
            stroke={colour}
            strokeWidth={5}
            strokeLinecap="round"
          />
        )}

        {/* The knob. */}
        <circle
          cx={cx}
          cy={cy}
          r={hub}
          fill="var(--te-panel-2)"
          stroke="var(--te-line)"
          strokeWidth={1}
        />
        <line
          x1={cx}
          y1={cy}
          x2={pointer.x}
          y2={pointer.y}
          stroke={colour}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={2.4} fill={colour} />
      </svg>

      <figcaption style={{ marginTop: 8 }}>
        <div
          className="te-figure te-figure--mono"
          style={{ fontSize: 18, color: colour }}
        >
          {value}
        </div>
        <div className="te-label" style={{ marginTop: 3 }}>
          {caption}
        </div>
      </figcaption>
    </figure>
  );
}
