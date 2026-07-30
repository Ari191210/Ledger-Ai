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
        <h2 className="te-title">Track record</h2>
      </div>

      {/* A recess, not a dashed rectangle. An empty slot in a sheet is the
          honest shape for a section with nothing in it. */}
      <div
        className="te-recess"
        style={{ padding: "clamp(24px, 4vw, 40px)", textAlign: "center" }}
      >
        <div className="te-label" style={{ marginBottom: 14 }}>
          Nothing connected
        </div>

        <p
          style={{
            fontSize: "clamp(17px, 2.1vw, 21px)",
            fontWeight: 500,
            letterSpacing: "-0.012em",
            margin: "0 auto 10px",
            maxWidth: "40ch",
            lineHeight: 1.35,
          }}
        >
          The agent has never traded. No account is connected and no capital is
          at risk.
        </p>

        <p className="te-note" style={{ margin: "0 auto", maxWidth: "48ch" }}>
          The simulation below is not a substitute and is never promoted into
          this space.
        </p>
      </div>
    </section>
  );
}
