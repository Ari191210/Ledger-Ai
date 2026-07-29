// ═══════════════════════════════════════════════════════════════════════════
// THE FACEPLATE
//
// The device header: wordmark, model designation, status lamp, edition
// switch. Modelled on an instrument's top panel rather than an app bar —
// the state lamp is the only thing here that reports rather than labels.
//
// The lamp never appears alone. A colour is not an accessible status on its
// own, so the state always prints in words beside it.
// ═══════════════════════════════════════════════════════════════════════════

import type { AgentState } from "@/lib/trading/kill-switch";
import EditionToggle from "./edition-toggle";

const STATE: Record<AgentState, { label: string; lamp: string; note: string }> = {
  RUNNING: {
    label: "Running",
    lamp: "te-led--on",
    note: "accepting signals",
  },
  HALTED_FOR_DAY: {
    label: "Halted",
    lamp: "te-led--warn",
    note: "loss limit hit — flat until next session",
  },
  DESTROYED: {
    label: "Destroyed",
    lamp: "te-led--fault",
    note: "kill switch engaged — will not restart",
  },
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
          <div
            style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}
          >
            <span className="te-chip te-chip--orange">TD-1</span>
            <span className="te-label">Ruflo · Trading Desk</span>
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
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <span className={`te-led ${status.lamp}`} aria-hidden="true" />
              <span
                style={{
                  fontFamily: "var(--te-mono)",
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {status.label}
              </span>
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
