// ═══════════════════════════════════════════════════════════════════════════
// THE SIMULATION
//
// Engine output against a generated tape. Not market data, not a track
// record, and labelled as such inside every unit that prints a figure from
// it — the chart frame, the section rule, and the table caption each carry
// the marker independently, so no single crop loses it (§8.3).
//
// The run is shown twice on purpose:
//
//   • UNDER MANDATE — the agent as configured. It destroys itself.
//   • RULE DISABLED — the same tape, same strategy, target guard off, so the
//     run completes and the session distribution is visible.
//
// The second is what makes the first legible. Without it a reader cannot tell
// whether the agent was destroyed because it traded badly or because the rule
// is unreachable.
// ═══════════════════════════════════════════════════════════════════════════

import type { SimulationSummary } from "@/lib/trading/terminal-data";
import { rupees } from "@/lib/trading/types";
import { direction, inr, pct, signedPct } from "@/lib/trading/format";
import EquityChart from "./equity-chart";

const SIMULATION_LABEL = "Simulation · not a trading record";

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="ed-kicker" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--data)",
          fontVariantNumeric: "tabular-nums lining-nums",
          fontSize: 19,
          fontWeight: 600,
          color: tone ?? "var(--ink)",
        }}
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
    <section style={{ marginBottom: 40 }}>
      <div
        className="ed-section-head"
        style={{
          marginBottom: 6,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <h2 className="ed-headline ed-headline--section" style={{ margin: 0 }}>
          The simulation
        </h2>
        <span className="ed-kicker">{SIMULATION_LABEL}</span>
      </div>

      <p className="ed-standfirst" style={{ marginTop: 0, marginBottom: 22 }}>
        The engine run against a generated tape of{" "}
        {unconstrained.tape.sessions} sessions at {unconstrained.tape.barMinutes}
        -minute bars, seeded for reproducibility. The tape is near-unpredictable
        by construction, so these figures describe the simulator, not a market.
      </p>

      {/* ── Under the mandate ─────────────────────────────────────────── */}
      <div
        style={{
          borderTop: "3px solid var(--ink)",
          borderBottom: "1px solid var(--rule)",
          padding: "16px 0",
          marginBottom: 28,
        }}
      >
        <div className="ed-kicker" style={{ marginBottom: 14 }}>
          Under the mandate · target rule active
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "20px clamp(14px, 3vw, 30px)",
          }}
        >
          <Stat
            label="Sessions survived"
            value={String(underMandate.report.sessions.length)}
          />
          <Stat
            label="Best session"
            value={underMandate.best ? signedPct(underMandate.best.returnPct) : "—"}
          />
          <Stat label="Target" value={pct(target)} />
          <Stat
            label="Outcome"
            value={underMandate.report.killSwitch.state === "DESTROYED" ? "Destroyed" : "Running"}
            tone={
              underMandate.report.killSwitch.state === "DESTROYED"
                ? "var(--retreating)"
                : "var(--advancing)"
            }
          />
        </div>

        {tombstone && (
          <p
            className="ed-body"
            style={{
              margin: "16px 0 0",
              paddingTop: 12,
              borderTop: "1px solid var(--rule-2)",
              fontSize: 15,
              color: "var(--ink-2)",
            }}
          >
            {tombstone.detail}.
          </p>
        )}
      </div>

      {/* ── Rule disabled ─────────────────────────────────────────────── */}
      <div className="ed-kicker" style={{ marginBottom: 12 }}>
        Same tape · target rule disabled · {SIMULATION_LABEL}
      </div>

      <div style={{ marginBottom: 22 }}>
        <EquityChart series={unconstrained.equity} label={SIMULATION_LABEL} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "20px clamp(14px, 3vw, 30px)",
          borderTop: "1px solid var(--rule)",
          borderBottom: "1px solid var(--rule)",
          padding: "16px 0",
          marginBottom: 26,
        }}
      >
        <Stat
          label="Total return"
          value={signedPct(unconstrained.report.totalReturnPct)}
          tone={
            unconstrained.report.totalReturnPct >= 0
              ? "var(--advancing)"
              : "var(--retreating)"
          }
        />
        <Stat label="Median session" value={signedPct(unconstrained.medianReturn)} />
        <Stat
          label="Best session"
          value={unconstrained.best ? signedPct(unconstrained.best.returnPct) : "—"}
        />
        <Stat
          label="Sessions at target"
          value={`${unconstrained.sessionsAtTarget} of ${sessions.length}`}
        />
        <Stat
          label="Charges paid"
          value={inr(rupees(unconstrained.report.totalCharges), true)}
        />
      </div>

      {/* ── The blotter ───────────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <div>
          <div
            className="ed-kicker"
            style={{
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span>Session blotter</span>
            <span>{SIMULATION_LABEL}</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="ed-table">
              <thead>
                <tr>
                  <th scope="col">Session</th>
                  <th scope="col" className="num">
                    Open
                  </th>
                  <th scope="col" className="num">
                    Close
                  </th>
                  <th scope="col" className="num">
                    Return
                  </th>
                  <th scope="col" className="num">
                    Charges
                  </th>
                  <th scope="col" className="num">
                    Orders
                  </th>
                  <th scope="col" className="num">
                    vs target
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, i) => (
                  <tr key={session.date}>
                    {/* §8.7: session ordinals, not the generator's dates. */}
                    <td style={{ fontFamily: "var(--data)", fontSize: 13 }}>{i + 1}</td>
                    <td className="num">{inr(rupees(session.openingEquity))}</td>
                    <td className="num">{inr(rupees(session.closingEquity))}</td>
                    <td className={`num ${direction(session.returnPct)}`}>
                      {signedPct(session.returnPct)}
                    </td>
                    <td className="num">{inr(rupees(session.charges), true)}</td>
                    <td className="num">{session.trades}</td>
                    <td className="num" style={{ color: "var(--ink-3)" }}>
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
