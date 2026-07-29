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
import Dial from "./dial";

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

/** A segmented level meter. `lit` of `total` segments, capped at 40 slots. */
function Meter({ lit, total, hot }: { lit: number; total: number; hot?: boolean }) {
  const slots = Math.min(total, 40);
  const on = total > 0 ? Math.round((lit / total) * slots) : 0;
  return (
    <div className="te-meter" role="presentation">
      {Array.from({ length: slots }, (_, i) => (
        <span
          key={i}
          className={`te-meter__seg ${
            i < on ? (hot ? "te-meter__seg--hot" : "te-meter__seg--lit") : ""
          }`}
        />
      ))}
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
  const best = unconstrained.best?.returnPct ?? 0;

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
        <span className="te-chip">03</span>
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

        <div
          style={{
            display: "flex",
            gap: "clamp(14px, 3vw, 34px)",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Dial
            fraction={(underMandate.best?.returnPct ?? 0) / target}
            colour="var(--te-accent)"
            value={underMandate.best ? signedPct(underMandate.best.returnPct) : "—"}
            caption={`best vs ${pct(target)} target`}
          />

          <div style={{ flex: "1 1 260px", display: "grid", gap: 10 }}>
            <div className="te-grid te-grid--4">
              <Readout
                label="Survived"
                value={`${underMandate.report.sessions.length} ${
                  underMandate.report.sessions.length === 1 ? "session" : "sessions"
                }`}
              />
              <Readout
                label="Outcome"
                value={
                  underMandate.report.killSwitch.state === "DESTROYED"
                    ? "Destroyed"
                    : "Running"
                }
                colour={
                  underMandate.report.killSwitch.state === "DESTROYED"
                    ? "var(--te-accent)"
                    : "var(--te-ink)"
                }
              />
            </div>
            {tombstone && (
              <p className="te-note" style={{ fontSize: 13 }}>
                {tombstone.detail}.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Rule off ──────────────────────────────────────────────────── */}
      <div className="te-label" style={{ marginBottom: 10 }}>
        Same tape · target rule off · {MARKER}
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
        <Readout label="Best session" value={signedPct(best)} />
        <Readout
          label="Charges"
          value={inr(rupees(unconstrained.report.totalCharges), true)}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div
          className="te-label"
          style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}
        >
          <span>Sessions clearing the {pct(target)} target</span>
          <span>
            {unconstrained.sessionsAtTarget} of {sessions.length}
          </span>
        </div>
        <Meter lit={unconstrained.sessionsAtTarget} total={sessions.length} />
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
