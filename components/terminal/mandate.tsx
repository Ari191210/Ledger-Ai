// ═══════════════════════════════════════════════════════════════════════════
// THE MANDATE
//
// The rule the agent trades under, and the arithmetic that rule implies.
//
// Everything printed here is either configuration (what the operator set) or
// arithmetic on it (what compounding does to that number). Neither is a
// forecast and neither is market data, so both render solid — the dashed
// stroke is reserved for simulation output, per §8.4.
//
// The compounding figure is the point of the section. A daily return target
// is easy to state and hard to feel; the same number compounded over a
// trading year is not.
// ═══════════════════════════════════════════════════════════════════════════

import type { KillSwitchConfig } from "@/lib/trading/kill-switch";
import type { MandateArithmetic } from "@/lib/trading/terminal-data";
import { inr, magnitude, multiple, pct } from "@/lib/trading/format";

function Term({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <div className="ed-kicker" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--data)",
          fontVariantNumeric: "tabular-nums lining-nums",
          fontSize: 22,
          fontWeight: 600,
          color: "var(--ink)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div className="ed-dateline" style={{ marginTop: 4, textTransform: "none" }}>
        {note}
      </div>
    </div>
  );
}

export default function Mandate({
  config,
  arithmetic,
}: {
  config: KillSwitchConfig;
  arithmetic: MandateArithmetic;
}) {
  return (
    <section style={{ marginBottom: 40 }}>
      <div className="ed-section-head" style={{ marginBottom: 18 }}>
        <h2 className="ed-headline ed-headline--section" style={{ margin: 0 }}>
          The mandate
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "22px clamp(16px, 3vw, 34px)",
          borderTop: "1px solid var(--rule)",
          borderBottom: "1px solid var(--rule)",
          padding: "18px 0",
          marginBottom: 26,
        }}
      >
        <Term
          label="Daily return target"
          value={pct(config.dailyReturnTarget)}
          note="required every session"
        />
        <Term
          label="Grace sessions"
          value={String(config.graceDays)}
          note={config.graceDays === 0 ? "no misses tolerated" : "consecutive misses tolerated"}
        />
        <Term
          label="Daily loss limit"
          value={pct(config.maxDailyLossPct)}
          note="halts trading for the session"
        />
        <Term
          label="Max drawdown"
          value={pct(config.maxDrawdownPct)}
          note="destroys the agent"
        />
      </div>

      {/* The arithmetic. This is the section's argument, so it is set as
          editorial body copy with the figures pulled out — not as another
          row of tiles. */}
      <div className="ed-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "clamp(20px, 3vw, 44px)" }}>
        <div className="ed-body">
          <div className="ed-kicker" style={{ marginBottom: 10 }}>
            What the target compounds to
          </div>
          <p style={{ marginTop: 0 }}>
            A {pct(config.dailyReturnTarget)} return, earned every session and
            reinvested, multiplies capital by{" "}
            <strong>{multiple(arithmetic.yearMultiple)}</strong> over{" "}
            {arithmetic.sessionsPerYear} sessions — one NSE trading year.
          </p>
          <p>
            Starting from {inr(arithmetic.startingCapital / 100)}, that is{" "}
            <strong>{magnitude(arithmetic.impliedCapitalAfterYear)}</strong>. The
            target reaches ₹1 crore in{" "}
            <strong>{arithmetic.sessionsToOneCrore} sessions</strong>, roughly{" "}
            {Math.round(arithmetic.sessionsToOneCrore / 21)} months.
          </p>
          <p style={{ marginBottom: 0 }}>
            This is arithmetic on the configured rule, not a projection of the
            agent. It holds whatever the strategy does.
          </p>
        </div>

        <div>
          <div className="ed-kicker" style={{ marginBottom: 10 }}>
            The figure
          </div>
          <div
            className="ed-index"
            style={{
              fontFamily: "var(--display)",
              fontVariantNumeric: "tabular-nums lining-nums",
              fontWeight: 800,
              fontSize: "clamp(40px, 7vw, 76px)",
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
              color: "var(--ink)",
            }}
          >
            {multiple(arithmetic.yearMultiple)}
          </div>
          <div
            className="ed-dateline"
            style={{ marginTop: 10, textTransform: "none", maxWidth: "34ch" }}
          >
            Capital multiple implied by {pct(config.dailyReturnTarget)} per
            session across {arithmetic.sessionsPerYear} sessions.
          </div>
        </div>
      </div>
    </section>
  );
}
