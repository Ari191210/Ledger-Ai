// ═══════════════════════════════════════════════════════════════════════════
// MODULE 01 — THE MANDATE
//
// The rule as configured, and the arithmetic it implies. Parameters read as
// device settings; the compounding figure gets the readout well, because it
// is the one number on the page that settles the argument.
//
// Everything here is configuration or arithmetic on configuration. Neither
// is a measurement, so nothing in this module is dashed — the dashed stroke
// is reserved for simulation output.
// ═══════════════════════════════════════════════════════════════════════════

import type { KillSwitchConfig } from "@/lib/trading/kill-switch";
import type { MandateArithmetic } from "@/lib/trading/terminal-data";
import { inr, magnitude, multiple, multipleParts, pct } from "@/lib/trading/format";

function Param({
  label,
  value,
  note,
  colour,
}: {
  label: string;
  value: string;
  note: string;
  colour: string;
}) {
  return (
    <div className="te-pane" style={{ borderTop: `3px solid ${colour}` }}>
      <div className="te-label" style={{ marginBottom: 7 }}>
        {label}
      </div>
      <div className="te-figure te-figure--mono">
        {value}
      </div>
      <div
        className="te-label"
        style={{ marginTop: 5, letterSpacing: "0.05em", color: "var(--te-ink-3)" }}
      >
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
    <section className="te-module">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <span className="te-chip te-chip--blue">01</span>
        <h2 className="te-title">The mandate</h2>
      </div>

      <div className="te-grid te-grid--4" style={{ marginBottom: 18 }}>
        <Param
          label="Daily target"
          value={pct(config.dailyReturnTarget)}
          note="every session"
          colour="var(--te-orange)"
        />
        <Param
          label="Grace"
          value={String(config.graceDays)}
          note={config.graceDays === 0 ? "no misses" : "misses allowed"}
          colour="var(--te-yellow)"
        />
        <Param
          label="Loss limit"
          value={pct(config.maxDailyLossPct)}
          note="halts the session"
          colour="var(--te-pink)"
        />
        <Param
          label="Max drawdown"
          value={pct(config.maxDrawdownPct)}
          note="destroys the agent"
          colour="var(--te-red)"
        />
      </div>

      <div
        className="te-grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}
      >
        <div className="te-readout" style={{ color: "var(--te-yellow)" }}>
          <div className="te-readout__value">
            {(() => {
              // Typeset with <sup> rather than Unicode superscripts: the
              // readout is monospaced, and mono faces give ¹ and ⁰ full-width
              // cells that split "10¹⁰" down the middle.
              const { mantissa, exponent } = multipleParts(arithmetic.yearMultiple);
              return (
                <>
                  {mantissa}
                  {exponent !== null && (
                    <sup style={{ fontSize: "0.52em", verticalAlign: "super" }}>
                      {exponent}
                    </sup>
                  )}
                </>
              );
            })()}
          </div>
          <div className="te-readout__unit">
            capital multiple · {pct(config.dailyReturnTarget)} × {arithmetic.sessionsPerYear} sessions
          </div>
        </div>

        <div>
          <div className="te-label" style={{ marginBottom: 8 }}>
            What the target compounds to
          </div>
          <p className="te-note" style={{ marginBottom: 10 }}>
            {pct(config.dailyReturnTarget)} a session, reinvested, multiplies
            capital by <strong>{multiple(arithmetic.yearMultiple)}</strong> over
            one NSE trading year. From {inr(arithmetic.startingCapital / 100)},
            that is <strong>{magnitude(arithmetic.impliedCapitalAfterYear)}</strong>.
          </p>
          <p className="te-note">
            It reaches ₹1 crore in{" "}
            <strong>{arithmetic.sessionsToOneCrore} sessions</strong>. This is
            arithmetic on the rule, not a projection of the agent — it holds
            whatever the strategy does.
          </p>
        </div>
      </div>
    </section>
  );
}
