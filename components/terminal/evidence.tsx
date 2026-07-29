// ═══════════════════════════════════════════════════════════════════════════
// THE EVIDENCE
//
// Whether the strategy's return separates from random entry.
//
// This module exists because every other figure on the page is a measurement
// and none of them is a claim. A return of −5.75% tells you what happened on
// one tape; it does not tell you whether the strategy's timing did anything,
// and without that the number is decoration with a decimal point.
//
// The verdict is stated as what the test can support and no more. "Does not
// separate from chance" is not "has no edge" — a test that fails to reject a
// null has not proved it. The wording holds that line, and the closing line
// says what would overturn it, because a conclusion nobody can attack is not
// a conclusion.
// ═══════════════════════════════════════════════════════════════════════════

import type { FalsificationResult } from "@/lib/trading/falsify";
import { pct, signedPct } from "@/lib/trading/format";

export default function Evidence({ result }: { result: FalsificationResult }) {
  const separates = result.verdict === "SEPARATES_FROM_CHANCE";
  const beaten = Math.round(result.pValue * 100);

  return (
    <section className="te-module">
      <h2 className="te-title" style={{ marginBottom: 16 }}>
        Does the timing do anything?
      </h2>

      <p
        className="te-display"
        style={{
          fontSize: "clamp(24px, 3.2vw, 38px)",
          marginBottom: 14,
          color: separates ? "var(--te-ink)" : "var(--te-accent)",
        }}
      >
        {separates
          ? "The strategy separates from random entry."
          : "No. It does not separate from random entry."}
      </p>

      <p className="te-note" style={{ maxWidth: "64ch", marginBottom: 20 }}>
        The same engine was run {result.trials} more times across{" "}
        {result.tapes} tapes with the entry rule replaced by a coin flip —
        matched on trade count, stop distance, sizing and costs, so the only
        difference is <em>when</em> it decides to enter.{" "}
        <strong>{beaten}%</strong> of those random runs did at least as well.
      </p>

      <div className="te-grid te-grid--4" style={{ marginBottom: 20 }}>
        <div className="te-pane">
          <div className="te-label" style={{ marginBottom: 6 }}>
            Strategy
          </div>
          <div className="te-figure te-figure--mono">
            {signedPct(result.meanStrategyReturn)}
          </div>
        </div>
        <div className="te-pane">
          <div className="te-label" style={{ marginBottom: 6 }}>
            Random entry
          </div>
          <div className="te-figure te-figure--mono">
            {signedPct(result.meanNullReturn)}
          </div>
        </div>
        <div className="te-pane">
          <div className="te-label" style={{ marginBottom: 6 }}>
            p-value
          </div>
          <div
            className="te-figure te-figure--mono"
            style={{ color: separates ? "var(--te-ink)" : "var(--te-accent)" }}
          >
            {result.pValue.toFixed(3)}
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--te-glass-line)",
          paddingTop: 14,
          display: "grid",
          gap: 10,
          maxWidth: "68ch",
        }}
      >
        <p className="te-note" style={{ fontSize: 14 }}>
          <span className="te-label">Reading it · </span>
          the p-value is not the probability the strategy is worthless. It is:
          if entry timing were pure noise, this is how often noise would look
          this good. Failing to separate from chance is not proof of no edge.
        </p>
        <p className="te-note" style={{ fontSize: 14 }}>
          <span className="te-label">What would change it · </span>
          {result.whatWouldChangeIt}
        </p>
        <p className="te-note" style={{ fontSize: 14 }}>
          <span className="te-label">What this cannot show · </span>
          the tape is generated and near-unpredictable by construction, so a
          strategy that reads real market structure would have nothing here to
          read. This tests the engine and the claim, not the market. Threshold
          was {pct(result.alpha, 0)}, fixed before the run.
        </p>
      </div>
    </section>
  );
}
