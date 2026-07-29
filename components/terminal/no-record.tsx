// ═══════════════════════════════════════════════════════════════════════════
// MODULE 02 — TRACK RECORD, EMPTY
//
// No broker is connected, so there is no trading record.
//
// The visual language changed; this rule did not. The temptation on a
// device-like page is stronger, if anything — an empty module looks like a
// fault, and the simulation is right there and would fill it convincingly.
// It stays empty and says why. A number that was decoration makes every
// other number on the panel suspect.
// ═══════════════════════════════════════════════════════════════════════════

export default function NoRecord() {
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
        <span className="te-chip">02</span>
        <h2 className="te-title">Track record</h2>
      </div>

      <div
        style={{
          border: "2px dashed var(--te-line)",
          borderRadius: "var(--te-radius-sm)",
          padding: "clamp(18px, 3vw, 28px)",
          textAlign: "center",
          background: "color-mix(in srgb, var(--te-ink) 2.5%, transparent)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span className="te-led" aria-hidden="true" />
          <span className="te-label">No signal · nothing connected</span>
        </div>

        <p
          style={{
            fontSize: "clamp(16px, 2vw, 19px)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            margin: "0 auto 12px",
            maxWidth: "42ch",
            lineHeight: 1.35,
          }}
        >
          The agent has never traded. No broker account is connected, no orders
          have been placed, and no capital is at risk.
        </p>

        <p className="te-note" style={{ margin: "0 auto", maxWidth: "56ch" }}>
          This module stays empty until a live adapter is connected and the
          agent has settled sessions to report. The simulation below is not a
          substitute and is never promoted into this space. Connecting a funded
          account is a deliberate step with its own review — not a config flag.
        </p>
      </div>
    </section>
  );
}
