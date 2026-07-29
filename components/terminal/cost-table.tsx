// ═══════════════════════════════════════════════════════════════════════════
// MODULE 04 — FRICTION
//
// Statutory NSE intraday charges on a round trip, itemised. Real computed
// figures from lib/trading/costs — the same schedule the engine bills fills
// against — so nothing here is marked as simulated.
//
// It earns its place because friction is the argument. A target can be missed
// by a strategy that was wrong; it can also be missed by a strategy that was
// right and handed the difference to the exchange. You cannot tell those
// apart without this module.
// ═══════════════════════════════════════════════════════════════════════════

import type { CostModel } from "@/lib/trading/terminal-data";
import { inr, pct } from "@/lib/trading/format";

export default function CostTable({
  costs,
  target,
}: {
  costs: CostModel;
  target: number;
}) {
  // Bar widths are relative to the largest line, so the shape of the cost —
  // which charge actually dominates — is readable before the figures are.
  const peak = Math.max(...costs.lines.map((l) => l.amount), 0.01);

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
        <h2 className="te-title">Friction</h2>
      </div>

      <p className="te-note" style={{ marginBottom: 18, maxWidth: "72ch" }}>
        Statutory and brokerage charges on one {inr(costs.turnoverPerLeg)} round
        trip in NSE intraday equity. Rates are set by the exchange, SEBI, and
        the union budget — verify against a current contract note before
        trusting a backtest that used them.
      </p>

      <div style={{ display: "grid", gap: 9, marginBottom: 18 }}>
        {costs.lines.map((line) => (
          <div key={line.label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>{line.label}</span>
              <span
                style={{
                  fontFamily: "var(--te-mono)",
                  fontVariantNumeric: "tabular-nums lining-nums",
                  fontSize: 13,
                }}
              >
                {inr(line.amount, true)}
              </span>
            </div>
            <div
              style={{
                height: 7,
                borderRadius: 3,
                background: "var(--te-glass-line)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.max((line.amount / peak) * 100, 1.5)}%`,
                  height: "100%",
                  background: "var(--te-ink-2)",
                  borderRadius: 3,
                }}
              />
            </div>
            <div className="te-label" style={{ marginTop: 3, letterSpacing: "0.05em" }}>
              {line.note}
            </div>
          </div>
        ))}
      </div>

      <div
        className="te-grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}
      >
        <div className="te-readout">
          <div className="te-readout__value">{inr(costs.totalRoundTrip, true)}</div>
          <div className="te-readout__unit">
            round trip · {pct(costs.roundTripPct, 3)} of capital
          </div>
        </div>

        <p className="te-note">
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
