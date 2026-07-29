// ═══════════════════════════════════════════════════════════════════════════
// THE HEADER
//
// Wordmark, what the desk is, and the agent's state.
//
// The state was a coloured lamp beside the word it duplicated. The word was
// always doing the work — a colour is not a status anyone can read aloud —
// so the lamp went and the word took the accent instead.
// ═══════════════════════════════════════════════════════════════════════════

import type { AgentState } from "@/lib/trading/kill-switch";
import EditionToggle from "./edition-toggle";

const STATE: Record<AgentState, { label: string; note: string }> = {
  RUNNING: { label: "Running", note: "accepting signals" },
  HALTED_FOR_DAY: { label: "Halted", note: "loss limit hit — flat until next session" },
  DESTROYED: { label: "Destroyed", note: "kill switch engaged — will not restart" },
};

export default function Faceplate({
  state,
  sessions,
}: {
  state: AgentState;
  sessions: number;
}) {
  const status = STATE[state];

  return (
    <header className="te-module" style={{ marginBottom: "clamp(10px, 1.6vw, 16px)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="te-label" style={{ marginBottom: 12 }}>
            Ruflo · Trading Desk
          </div>

          <h1 className="te-display">The&nbsp;Desk</h1>

          <p className="te-lede" style={{ marginTop: 14 }}>
            An NSE intraday equity agent, the rule it trades under, and what
            that rule costs.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 12,
          }}
        >
          <EditionToggle />

          <div style={{ textAlign: "right" }}>
            <div className="te-label" style={{ marginBottom: 6 }}>
              Agent
            </div>
            <div
              style={{
                fontFamily: "var(--te-mono)",
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: state === "DESTROYED" ? "var(--te-accent)" : "var(--te-ink)",
              }}
            >
              {status.label}
            </div>
            <div className="te-label" style={{ marginTop: 5, letterSpacing: "0.06em" }}>
              {status.note}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          marginTop: 18,
          paddingTop: 12,
          borderTop: "1px solid var(--te-glass-line)",
        }}
      >
        <span className="te-label">NSE · Equity intraday</span>
        <span className="te-label">{sessions} sessions simulated</span>
        <span className="te-label">Paper broker only</span>
      </div>
    </header>
  );
}
