import Link from "next/link";
import type { CSSProperties } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// NEXT MOVE — VIEW (Component 3A, pure presentational)
//
// Region 2 of the dashboard: the action. One sized next move — never a list
// (Emotional v1 §6.5, The One Door). The live-guidance side of the model: it
// explains what will improve the NEXT close; it never overwrites the official
// standing.
//
// PURE VIEW. No data, no logic, no analytics, no motion. The container derives
// every string (including the unavailable fallback, folded into "ready" with a
// safe-default control) so this view only lays out what it is handed.
//
// Constitutional basis:
//   • Emotional v1 §6.5 — one move + one control. A door, not a menu.
//   • Visual v1 Stance I / §10.1 / §13.02 — set on the surface, NOT a card. No
//     border box, no shadow. Structure from rules and alignment.
//   • Visual v1 §10.3 — the primary control is the one solid-ink button (.btn).
//   • Visual v1 §9 (strict) — the projected +N is POTENTIAL, not a realised
//     advance, so it is set in ink, never advance-green. Green is reserved for
//     a figure that actually moved.
//   • Motion v5 Law IV — no motion here; the view is still.
//
// Renders inside the dashboard's data-ui="editorial" scope. The region's "Next
// move" label is provided by DashboardShell, so this view renders no kicker.
// ═══════════════════════════════════════════════════════════════════════════

export type NextMoveViewProps =
  | { state: "loading" }
  | {
      state: "ready";
      /** The move, as a sentence. e.g. "Cover Chemistry with Notes". */
      headline: string;
      /** The struck value of the move: "+31", "up to 250", or null. */
      gainDisplay: string | null;
      /** Quiet caption under the value. Null when there is no value. */
      gainCaption: string | null;
      /** Honest provenance note (e.g. "Projected through the real engine"). */
      detail: string;
      /** Primary control label and target. */
      cta: string;
      href: string;
    };

// Title-sm — DESIGN.md §3 (Orbitron 700 / 28 / lh 1.1 / ls .04em).
const headlineStyle: CSSProperties = {
  fontFamily: "var(--serif)",
  fontWeight: 700,
  fontSize: 28,
  lineHeight: 1.1,
  letterSpacing: "0.04em",
  color: "var(--ink)",
  margin: 0,
};

const gainWrapStyle: CSSProperties = { marginTop: 16, display: "flex", alignItems: "baseline", gap: 10 };

// Title — DESIGN.md §3 (Orbitron 700 / 44). A projected figure, set as data.
const gainFigureStyle: CSSProperties = {
  fontFamily: "var(--serif)",
  fontVariantNumeric: "tabular-nums lining-nums",
  fontWeight: 700,
  fontSize: 44,
  lineHeight: 0.95,
  letterSpacing: "0.05em",
  color: "var(--ink)",
};

const controlWrapStyle: CSSProperties = { marginTop: 20 };

const detailStyle: CSSProperties = { margin: "14px 0 0", fontStyle: "normal", fontSize: 15, lineHeight: 1.5 };

// Static outline for the loading state — no shimmer (Visual v1 §13.15).
const loadingBar = (w: string, h: number, mt = 0): CSSProperties => ({
  display: "block",
  width: w,
  height: h,
  marginTop: mt,
  border: "1px solid var(--rule-2)",
  borderRadius: 0,
});

export default function NextMoveView(props: NextMoveViewProps) {
  if (props.state === "loading") {
    return (
      <div aria-hidden="true">
        <span style={loadingBar("min(340px, 80%)", 26)} />
        <span style={loadingBar("min(150px, 44%)", 44, 20)} />
      </div>
    );
  }

  const { headline, gainDisplay, gainCaption, detail, cta, href } = props;

  return (
    <div>
      <h2 style={headlineStyle}>{headline}</h2>

      {gainDisplay && (
        <div style={gainWrapStyle}>
          <span style={gainFigureStyle}>{gainDisplay}</span>
          {gainCaption && <span className="ed-kicker">{gainCaption}</span>}
        </div>
      )}

      <div style={controlWrapStyle}>
        <Link href={href} className="btn" style={{ textDecoration: "none" }}>
          {cta} →
        </Link>
      </div>

      {detail && (
        <p className="ed-byline" style={detailStyle}>
          {detail}
        </p>
      )}
    </div>
  );
}
