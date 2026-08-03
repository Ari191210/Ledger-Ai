import type { StandingMovement } from "./standing-view";

// ═══════════════════════════════════════════════════════════════════════════
// STANDING — HERO (Dashboard V2, editorial craft)
//
// The struck figure, set as print, not as an app widget. No card, no glow, no
// gradient, no motion — the weight comes from the numeral, a single rule, and
// the space around it. "Alive through type and hierarchy, not effects."
// ═══════════════════════════════════════════════════════════════════════════

const fmt = (n: number) => n.toLocaleString("en-US");

export type StandingLiveProps = {
  total: number;
  tier: string;
  movement: StandingMovement | null;
  asOf?: string | null;
};

function movementText(m: StandingMovement): string {
  if (m.delta > 0) return `Up ${fmt(m.delta)} since previous close`;
  if (m.delta < 0) return `Down ${fmt(Math.abs(m.delta))} since previous close`;
  return "Unchanged since previous close";
}

export default function StandingLive({ total, tier, movement, asOf }: StandingLiveProps) {
  const label =
    `Academic Performance Index. ${fmt(total)} of 1,000. ${tier}.` +
    (movement ? ` ${movementText(movement)}.` : "");

  const moveClass =
    movement == null ? null : movement.delta > 0 ? "ed-up" : movement.delta < 0 ? "ed-down" : "ed-flat";
  const moveText =
    movement == null ? null : movement.delta === 0 ? "Unchanged" : fmt(Math.abs(movement.delta));

  return (
    <div>
      <h1 aria-label={label} style={{ margin: 0 }}>
        <span className="ed-index" aria-hidden="true" style={{ display: "block", lineHeight: 0.86 }}>
          {fmt(total)}
        </span>
      </h1>

      <div
        aria-hidden="true"
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px solid var(--ink)",
          display: "flex",
          alignItems: "baseline",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span className="ed-kicker">of 1,000</span>
        {/* Title-sm — DESIGN.md §3 (Orbitron 700 / 28 / lh 1.1 / ls .04em). */}
        <span
          style={{
            fontFamily: "var(--serif)",
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "0.04em",
            color: "var(--ink)",
          }}
        >
          {tier}
        </span>
        {moveClass && (
          <span
            className={moveClass}
            style={{
              marginLeft: "auto",
              fontFamily: "var(--data)",
              fontSize: 13,
              letterSpacing: "0.03em",
              fontVariantNumeric: "tabular-nums",
              color: "var(--ink-2)",
            }}
          >
            {moveText}
          </span>
        )}
      </div>

      {asOf ? (
        <div
          style={{
            marginTop: 10,
            fontFamily: "var(--data)",
            fontSize: 10.5,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          as of {asOf}
        </div>
      ) : null}
    </div>
  );
}
