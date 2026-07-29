// ═══════════════════════════════════════════════════════════════════════════
// THE DESK MASTHEAD
//
// The trading desk's nameplate, set as a publication masthead rather than an
// app header. The agent's state is the one live figure on it, and it prints
// in the market colours because it is the only thing on the page that can
// change without a human deciding it should.
//
// Server component: it holds no state and renders the same HTML every time.
// ═══════════════════════════════════════════════════════════════════════════

import type { AgentState } from "@/lib/trading/kill-switch";

const STATE_COPY: Record<AgentState, { label: string; note: string; tone: string }> = {
  RUNNING: {
    label: "Running",
    note: "Accepting signals",
    tone: "var(--advancing)",
  },
  HALTED_FOR_DAY: {
    label: "Halted",
    note: "Daily loss limit reached — flat until next session",
    tone: "var(--ink-2)",
  },
  DESTROYED: {
    label: "Destroyed",
    note: "Kill switch engaged — will not restart",
    tone: "var(--retreating)",
  },
};

export default function TerminalMasthead({
  state,
  edition,
}: {
  state: AgentState;
  edition: string;
}) {
  const copy = STATE_COPY[state];

  return (
    // No bottom rule: the first section's .ed-section-head draws a 2px rule of
    // its own, and two heavy rules 26px apart read as a printing error.
    <header style={{ paddingBottom: 26 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <div className="ed-dateline">Ruflo · Algorithmic Trading Desk</div>
        <div className="ed-dateline">{edition}</div>
      </div>

      <h1 className="ed-masthead" style={{ margin: 0, color: "var(--ink)" }}>
        The Terminal
      </h1>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 16,
          flexWrap: "wrap",
          marginTop: 12,
          borderTop: "1px solid var(--rule)",
          paddingTop: 10,
        }}
      >
        <p className="ed-standfirst" style={{ margin: 0 }}>
          An NSE intraday equity agent, its mandate, and what that mandate costs.
        </p>

        {/* The state chip. A ruled label, not a pill — §4. */}
        <div style={{ textAlign: "right" }}>
          <div className="ed-kicker" style={{ marginBottom: 4 }}>
            Agent State
          </div>
          <div
            style={{
              fontFamily: "var(--data)",
              fontVariantNumeric: "tabular-nums lining-nums",
              fontWeight: 600,
              fontSize: 17,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: copy.tone,
            }}
          >
            {copy.label}
          </div>
          <div className="ed-dateline" style={{ marginTop: 3, textTransform: "none" }}>
            {copy.note}
          </div>
        </div>
      </div>
    </header>
  );
}
