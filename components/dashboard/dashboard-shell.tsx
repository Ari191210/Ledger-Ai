import type { CSSProperties, ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD SHELL — the layout foundation for the one-question dashboard.
//
// Guiding question (locked): "What is the clearest path forward today?",
// answered in four ordered parts — Standing, Next Move, Why, History.
//
// Constitutional basis (Phase VIII, locked):
//   • Visual v1 "Set, not built" + Stance I — structure comes from a column,
//     alignment, and a single hairline rule. No boxes, no shadows, no cards.
//   • Visual v1 IA I/II/III — one screen, one question; DOM order === reading
//     order === priority order (Standing → Next Move → Why → History).
//   • Visual v1 §13 — one column at every breakpoint; on ultra-wide the column
//     is capped and the surplus is margin, never a second column.
//   • Motion v5 Law IV / §B — the shell has no motion and no idle cost. It is a
//     server component and ships zero client JS. The Open ceremony is
//     orchestrated by the Standing region (a later phase), never here.
//
// This is a pure presentational primitive: it fetches nothing, holds no state,
// and renders the four regions it is handed. Each region owns its own content,
// empty, loading and error states.
//
// It owns the page's single <main id="main-content"> landmark and the
// data-ui="editorial" scope (matching the convention already used across the
// dashboard), so when app/dashboard/page.tsx adopts this shell it must drop its
// own inline <main> wrapper to avoid a duplicate landmark.
// ═══════════════════════════════════════════════════════════════════════════

export interface DashboardShellProps {
  /** Region 1 — the answer: the Ledger Score and its movement since last close. */
  standing: ReactNode;
  /** Region 2 — the action: the single Recommended next move. */
  nextMove: ReactNode;
  /** Region 3 — the evidence: the four sectors behind the figure. */
  why: ReactNode;
  /** Region 4 — the context: the record of closes since listing. */
  history: ReactNode;
  /** Region 5 — the utility: all tools, the reason to open the OS to act. */
  tools: ReactNode;
}

type RegionKey = keyof DashboardShellProps;

// Region identities are fixed for this screen, so they live here rather than
// being passed in. "Standing" is labelled for assistive tech only: the struck
// figure inside it is its own visible heading (Visual v1 Stance IV), so a second
// visible "STANDING" kicker would compete with the one hero mark.
//
// `rule: true` draws a hairline above a region — used only where the content
// changes kind. Standing + Next Move are one bound unit (answer + action) and
// carry no divider; Why (evidence) and History (context) each open with a rule.
// `wide` lets a region break out of the reading measure. The four editorial
// regions stay at a comfortable ~820px column; Tools is a grid, not prose, so
// it spans a much wider container and breathes instead of cramming 2-up.
const READING_MAX = 820;
const WIDE_MAX = 1200;

const REGIONS: ReadonlyArray<{
  key: RegionKey;
  id: string;
  label: string;
  labelHidden: boolean;
  rule: boolean;
  wide: boolean;
}> = [
  { key: "standing", id: "dash-standing", label: "Your standing", labelHidden: true,  rule: false, wide: false },
  { key: "nextMove", id: "dash-next",     label: "Next move",     labelHidden: false, rule: false, wide: false },
  { key: "why",      id: "dash-why",      label: "Why",           labelHidden: false, rule: true,  wide: false },
  { key: "history",  id: "dash-history",  label: "History",       labelHidden: false, rule: true,  wide: false },
  { key: "tools",    id: "dash-tools",    label: "Your tools",    labelHidden: false, rule: true,  wide: true  },
];

// Quiet mono apparatus label (Visual v1 §5.1 — the machinery speaks in mono).
const labelStyle: CSSProperties = {
  fontFamily: "var(--data)",
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
  margin: "0 0 14px",
};

// Visually hidden but present for screen readers and as the region's a11y name.
const srOnly: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
};

export default function DashboardShell({ standing, nextMove, why, history, tools }: DashboardShellProps) {
  const slots: Record<RegionKey, ReactNode> = { standing, nextMove, why, history, tools };

  return (
    <main
      id="main-content"
      tabIndex={-1}
      data-ui="editorial"
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        color: "var(--ink)",
        // Sits below the in-flow AppNav (mounted in app/dashboard/layout.tsx).
        // Horizontal gutter reuses the editorial token; no new spacing system.
        padding: "clamp(28px, 5vh, 48px) var(--gutter) 96px",
        outline: "none",
      }}
    >
      {/* Each region centres itself. Reading regions keep a measured column;
          Tools breaks out wide. On ultra-wide the surplus becomes margin, never
          a second column (Visual v1 §13). */}
      {REGIONS.map(({ key, id, label, labelHidden, rule, wide }, i) => (
        <section
          key={key}
          aria-labelledby={`${id}-label`}
          style={{
            maxWidth: wide ? WIDE_MAX : READING_MAX,
            marginInline: "auto",
            width: "100%",
            marginTop: i === 0 ? 0 : rule ? 56 : 32,
            paddingTop: rule ? 20 : 0,
            borderTop: rule ? "1px solid var(--rule)" : "none",
          }}
        >
          <p id={`${id}-label`} style={labelHidden ? srOnly : labelStyle}>
            {label}
          </p>
          {slots[key]}
        </section>
      ))}
    </main>
  );
}
