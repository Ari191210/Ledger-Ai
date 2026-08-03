import type { CSSProperties } from "react";
import StandingLive from "./standing-live";

// ═══════════════════════════════════════════════════════════════════════════
// STANDING — VIEW (Component 2A)
//
// Region 1 of the dashboard: the answer. The student's official standing — the
// latest close of record — as the single hero mark on the screen.
//
// State router: loading and empty are rendered here as calm, static states.
// The resolved "ok" state delegates to StandingLive — the "calm + life" hero
// (founder-directed 2026-07-29): editorial DNA kept (the struck .ed-index
// figure), but with gentle depth, one warm accent, and the figure easing in.
// That intentionally supersedes the earlier "figure never counts / no motion"
// rule for the resolved state; loading/empty stay still.
//
//   • Emotional v1 §9.05 (locked) — a first-time student sees an em dash and
//     "Opens at your first close", NEVER a struck 0 read as a verdict.
//   • Visual v1 §13.15 — loading is a static low-contrast outline, never a shimmer.
//
// Must render inside the dashboard's data-ui="editorial" scope (DashboardShell).
// ═══════════════════════════════════════════════════════════════════════════

export type StandingMovement = { delta: number };

export type StandingViewProps =
  | { state: "loading" }
  | { state: "empty" }
  | {
      state: "ok";
      /** The official close of record — report.current.total. */
      total: number;
      /** scoreTier(total).label. */
      tier: string;
      /** Movement vs the previous close (report.daily). Null when there is no
          prior close to move from, or on a passive day with no delta. */
      movement: StandingMovement | null;
      /** Set only when the figure is a stale/offline cached value. */
      asOf?: string | null;
    };

const scaleLabelStyle: CSSProperties = { marginTop: 6 };

// Title-sm — DESIGN.md §3. Orbitron stays at 700 (The Weight Rule); the
// quieter voice comes from colour, not from dropping to 400.
const emptyTierStyle: CSSProperties = {
  fontFamily: "var(--serif)",
  fontSize: 28,
  fontWeight: 700,
  lineHeight: 1.1,
  letterSpacing: "0.04em",
  color: "var(--ink-3)",
  marginTop: 8,
};

// Static outline of the figure's footprint — no animation, no shimmer.
const outlineStyle: CSSProperties = {
  display: "block",
  width: "min(220px, 46vw)",
  height: "clamp(52px, 10vw, 140px)",
  border: "1px solid var(--rule-2)",
  borderRadius: 0,
};

export default function StandingView(props: StandingViewProps) {
  if (props.state === "loading") {
    return (
      <>
        <h1 aria-label="Loading your standing." style={{ margin: 0 }}>
          <span aria-hidden="true" style={outlineStyle} />
        </h1>
        <div aria-hidden="true">
          <div className="ed-kicker" style={scaleLabelStyle}>
            of 1,000
          </div>
        </div>
      </>
    );
  }

  if (props.state === "empty") {
    return (
      <>
        <h1
          aria-label="Academic Performance Index. Opens at your first close."
          style={{ margin: 0 }}
        >
          <span className="ed-index" aria-hidden="true" style={{ display: "block", color: "var(--ink-3)" }}>
            —
          </span>
        </h1>
        <div aria-hidden="true">
          <div className="ed-kicker" style={scaleLabelStyle}>
            of 1,000
          </div>
          <div style={emptyTierStyle}>Opens at your first close</div>
        </div>
      </>
    );
  }

  // state === "ok" — the living hero. See standing-live.tsx.
  const { total, tier, movement, asOf } = props;
  return <StandingLive total={total} tier={tier} movement={movement} asOf={asOf} />;
}
