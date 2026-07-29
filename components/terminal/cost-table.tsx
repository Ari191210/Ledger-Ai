// ═══════════════════════════════════════════════════════════════════════════
// THE COST OF TRADING
//
// Statutory NSE intraday charges on a round trip, itemised. These are real
// computed figures from lib/trading/costs — the same schedule the engine
// bills fills against — so the table renders solid.
//
// It earns its place because friction is the argument. A target can be
// missed by a strategy that was simply wrong; it can also be missed by a
// strategy that was right and handed the difference to the exchange. The
// reader cannot tell those apart without this table.
// ═══════════════════════════════════════════════════════════════════════════

import type { CostModel } from "@/lib/trading/terminal-data";
import { inr, pct } from "@/lib/trading/format";

export default function CostTable({ costs, target }: { costs: CostModel; target: number }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <div className="ed-section-head" style={{ marginBottom: 6 }}>
        <h2 className="ed-headline ed-headline--section" style={{ margin: 0 }}>
          The cost of trading
        </h2>
      </div>

      <p className="ed-standfirst" style={{ marginTop: 0, marginBottom: 20 }}>
        Statutory and brokerage charges on one {inr(costs.turnoverPerLeg)} round
        trip in NSE intraday equity. Rates are set by the exchange, SEBI, and the
        union budget; verify against a current contract note before trusting a
        backtest that used them.
      </p>

      <div style={{ overflowX: "auto", marginBottom: 20 }}>
        <table className="ed-table">
          <thead>
            <tr>
              <th scope="col">Charge</th>
              <th scope="col" className="num">
                Amount
              </th>
              <th scope="col">Applies to</th>
            </tr>
          </thead>
          <tbody>
            {costs.lines.map((line) => (
              <tr key={line.label}>
                <td>{line.label}</td>
                <td className="num">{inr(line.amount, true)}</td>
                <td style={{ color: "var(--ink-3)", fontSize: 13 }}>{line.note}</td>
              </tr>
            ))}
            <tr>
              <td style={{ fontWeight: 700, borderTop: "1px solid var(--ink)" }}>
                Round trip
              </td>
              <td
                className="num"
                style={{ fontWeight: 700, borderTop: "1px solid var(--ink)" }}
              >
                {inr(costs.totalRoundTrip, true)}
              </td>
              <td
                style={{
                  color: "var(--ink-3)",
                  fontSize: 13,
                  borderTop: "1px solid var(--ink)",
                }}
              >
                {pct(costs.roundTripPct, 3)} of capital deployed
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Deliberately not .ed-body: that class sets a drop cap on the first
          paragraph, which would split the opening word across two sizes. */}
      <div
        style={{
          borderTop: "1px solid var(--rule)",
          paddingTop: 14,
          fontSize: 15,
          lineHeight: 1.55,
          color: "var(--ink-2)",
          maxWidth: "68ch",
        }}
      >
        <p style={{ margin: 0 }}>
          Four round trips a session puts friction alone at{" "}
          <strong>{pct(costs.roundTripPct * 4, 2)}</strong> of capital. Netting{" "}
          {pct(target)} therefore requires{" "}
          <strong>{pct(costs.grossNeededForTarget)}</strong> gross before
          slippage, which the engine models separately.
        </p>
      </div>
    </section>
  );
}
