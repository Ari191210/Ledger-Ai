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
import { inr, magnitude, multipleParts, pct } from "@/lib/trading/format";

function Param({
  label,
  value,
  note,
  channel,
}: {
  label: string;
  value: string;
  note: string;
  /**
   * Which encoder this setting sits under, 1–4. The colour identifies the
   * parameter the way an OP-1 knob cap does — it carries no severity and no
   * judgement, so the figure itself stays in ink.
   */
  channel: 1 | 2 | 3 | 4;
}) {
  return (
    <div className="te-pane">
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}
      >
        <span
          className="te-knob"
          style={{ ["--te-knob" as string]: `var(--te-c${channel})` }}
          aria-hidden="true"
        />
        <span className="te-label">{label}</span>
      </div>
      <div className="te-figure te-figure--mono">{value}</div>
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
        <h2 className="te-title">The mandate</h2>
      </div>

      <div className="te-grid te-grid--4" style={{ marginBottom: 18 }}>
        <Param
          label="Daily target"
          channel={1}
          value={pct(config.dailyReturnTarget)}
          note="every session"
        />
        <Param
          label="Grace"
          channel={2}
          value={String(config.graceDays)}
          note={config.graceDays === 0 ? "no misses" : "misses allowed"}
        />
        <Param
          label="Loss limit"
          channel={3}
          value={pct(config.maxDailyLossPct)}
          note="halts the session"
        />
        <Param
          label="Max drawdown"
          channel={4}
          value={pct(config.maxDrawdownPct)}
          note="destroys the agent"
        />
      </div>

      <div
        className="te-grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}
      >
        <div className="te-readout">
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
          <p className="te-note" style={{ maxWidth: "44ch" }}>
            Reinvested every session, {pct(config.dailyReturnTarget)} reaches ₹1
            crore from {inr(arithmetic.startingCapital / 100)} in{" "}
            <strong>{arithmetic.sessionsToOneCrore} sessions</strong>, and{" "}
            <strong>{magnitude(arithmetic.impliedCapitalAfterYear)}</strong> in a
            year. That is arithmetic on the rule, not a claim about the agent.
          </p>
        </div>
      </div>
    </section>
  );
}
