// ═══════════════════════════════════════════════════════════════════════════
// THE TRACK RECORD — EMPTY
//
// §3: if the data does not exist, show an honest empty state.
//
// No broker is connected, so there is no trading record. The temptation on a
// terminal is to fill this space with the simulation and let the reader
// assume — the numbers are right there, they render nicely, and nobody would
// immediately notice. That is precisely the substitution §3 exists to stop:
// "a number that was decoration makes every other number in the product
// suspect."
//
// So the section stays empty, states why, and says what would fill it. An
// empty state that explains itself is a stronger claim about the product's
// honesty than any chart could be.
// ═══════════════════════════════════════════════════════════════════════════

export default function NoRecord() {
  return (
    <section style={{ marginBottom: 40 }}>
      <div className="ed-section-head" style={{ marginBottom: 6 }}>
        <h2 className="ed-headline ed-headline--section" style={{ margin: 0 }}>
          Track record
        </h2>
      </div>

      <div
        style={{
          borderTop: "3px solid var(--ink)",
          borderBottom: "1px solid var(--rule)",
          padding: "30px 0 26px",
        }}
      >
        <div className="ed-kicker" style={{ marginBottom: 12 }}>
          No record
        </div>

        <p
          className="ed-standfirst"
          style={{ margin: "0 0 14px", color: "var(--ink)", maxWidth: "58ch" }}
        >
          The agent has never traded. No broker account is connected, no orders
          have been placed, and no capital is at risk.
        </p>

        <div className="ed-body" style={{ fontSize: 15, color: "var(--ink-2)", maxWidth: "68ch" }}>
          <p style={{ marginTop: 0 }}>
            This section stays empty until a live adapter is connected and the
            agent has settled sessions to report. The simulation below is not a
            substitute for it and is never promoted into this space.
          </p>
          <p style={{ marginBottom: 0 }}>
            Connecting a funded account is a deliberate step, with its own
            credential handling and its own review. It is not a configuration
            flag.
          </p>
        </div>
      </div>
    </section>
  );
}
