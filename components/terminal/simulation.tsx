// ═══════════════════════════════════════════════════════════════════════════
// MODULE 03 — THE SIMULATION
//
// Engine output against a generated tape. Not market data, not a track
// record. Every unit that prints a figure from it carries the marker itself
// — the plot frame, the module header, the blotter caption — so no single
// crop loses the disclosure.
//
// Run twice, deliberately:
//   • UNDER MANDATE — the agent as configured. It destroys itself.
//   • RULE OFF      — same tape, same strategy, target guard disabled, so the
//                     run completes and the session distribution is visible.
//
// The second is what makes the first legible. Without it you cannot tell
// whether the agent died because it traded badly or because the rule is
// unreachable.
// ═══════════════════════════════════════════════════════════════════════════

import type { SimulationSummary } from "@/lib/trading/terminal-data";
import { rupees } from "@/lib/trading/types";
import { inr, pct, signedPct } from "@/lib/trading/format";
import EquityChart from "./equity-chart";

const MARKER = "Simulation · not a trading record";

function Readout({
  label,
  value,
  colour,
}: {
  label: string;
  value: string;
  colour?: string;
}) {
  return (
    <div className="te-pane">
      <div className="te-label" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div
        className="te-figure te-figure--mono"
        style={{ fontSize: 19, color: colour }}
      >
        {value}
      </div>
    </div>
  );
}

export default function Simulation({
  underMandate,
  unconstrained,
  target,
}: {
  underMandate: SimulationSummary;
  unconstrained: SimulationSummary;
  target: number;
}) {
  const tombstone = underMandate.report.killSwitch.tombstone;
  const sessions = unconstrained.report.sessions;

  return (
    <section className="te-module">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <h2 className="te-title">The simulation</h2>
        <span className="te-label" style={{ marginLeft: "auto" }}>
          {MARKER}
        </span>
      </div>

      <p className="te-note" style={{ marginBottom: 18, maxWidth: "72ch" }}>
        The engine run against a generated tape of {unconstrained.tape.sessions}{" "}
        sessions at {unconstrained.tape.barMinutes}-minute bars, seeded for
        reproducibility. The tape is near-unpredictable by construction, so
        these figures describe the simulator, not a market.
      </p>

      {/* ── Under the mandate ─────────────────────────────────────────── */}
      <div
        style={{
          border: "1px solid var(--te-glass-line)",
          borderLeft: "3px solid var(--te-accent)",
          borderRadius: "var(--te-radius-sm)",
          padding: "14px 15px",
          marginBottom: 18,
        }}
      >
        <div className="te-label" style={{ marginBottom: 14 }}>
          Under the mandate · target rule active
        </div>

        <p
          className="te-display"
          style={{ fontSize: "clamp(26px, 3.4vw, 40px)", marginBottom: 10 }}
        >
          {underMandate.report.killSwitch.state === "DESTROYED"
            ? `Destroyed on session ${underMandate.report.sessions.length}.`
            : `Running after ${underMandate.report.sessions.length} sessions.`}
        </p>

        <p className="te-note" style={{ maxWidth: "62ch" }}>
          Best session {underMandate.best ? signedPct(underMandate.best.returnPct) : "—"}{" "}
          against a {pct(target)} target.
          {tombstone ? ` ${tombstone.detail}.` : ""}
        </p>
      </div>

      {/* ── Rule off ──────────────────────────────────────────────────── */}
      <div className="te-label" style={{ marginBottom: 10 }}>
        Same tape · target rule off
      </div>

      <div style={{ marginBottom: 16 }}>
        <EquityChart series={unconstrained.equity} label={MARKER} />
      </div>

      <div className="te-grid te-grid--4" style={{ marginBottom: 16 }}>
        <Readout
          label="Total return"
          value={signedPct(unconstrained.report.totalReturnPct)}
          colour={
            unconstrained.report.totalReturnPct >= 0
              ? "var(--te-ink)"
              : "var(--te-accent)"
          }
        />
        <Readout label="Median session" value={signedPct(unconstrained.medianReturn)} />
        <Readout
          label="Charges"
          value={inr(rupees(unconstrained.report.totalCharges), true)}
        />
      </div>

      {/* ── The blotter ───────────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <div>
          <div
            className="te-label"
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            <span>Session blotter</span>
            <span>{MARKER}</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="te-table">
              <thead>
                <tr>
                  <th scope="col">Sess</th>
                  <th scope="col" className="num">Open</th>
                  <th scope="col" className="num">Close</th>
                  <th scope="col" className="num">Return</th>
                  <th scope="col" className="num">Charges</th>
                  <th scope="col" className="num">Orders</th>
                  <th scope="col" className="num">vs target</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, i) => (
                  <tr key={session.date}>
                    {/* Session ordinals, never the generator's dates. */}
                    <td style={{ fontFamily: "var(--te-mono)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="num">{inr(rupees(session.openingEquity))}</td>
                    <td className="num">{inr(rupees(session.closingEquity))}</td>
                    <td
                      className={`num ${
                        session.returnPct > 0
                          ? "te-up"
                          : session.returnPct < 0
                            ? "te-down"
                            : "te-flat"
                      }`}
                    >
                      {signedPct(session.returnPct)}
                    </td>
                    <td className="num">{inr(rupees(session.charges), true)}</td>
                    <td className="num">{session.trades}</td>
                    <td className="num te-flat">
                      {signedPct(session.returnPct - target)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
