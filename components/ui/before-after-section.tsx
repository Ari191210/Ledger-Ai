"use client";
import Link from "next/link";

const CASES = [
  {
    name: "The buried student",
    board: "Class 12 CBSE · Chemistry",
    subject: "The backlog problem",
    before: { score: "No idea where they stand", coverage: "Syllabus coverage unknown", habit: "No revision system" },
    after:  { score: "Live readiness score", coverage: "Every chapter tracked", habit: "Streak running" },
    quote: "The chapter tracker counts exactly how many sessions behind you are — and rebuilds the daily plan around closing it.",
  },
  {
    name: "The solo grinder",
    board: "JEE prep · any coaching city",
    subject: "The accountability problem",
    before: { score: "Skipping weak chapters", coverage: "Nobody notices a bailed session", habit: "Solo — no accountability" },
    after:  { score: "Weak chapters drilled first", coverage: "Study Pact holds both of you", habit: "Shared streak active" },
    quote: "Lock a session with a friend. If either of you bails, both streaks reset. Neither of you wants to be the one.",
  },
  {
    name: "The night-before crammer",
    board: "Class 10 ICSE · all subjects",
    subject: "The consistency problem",
    before: { score: "Cramming before tests", coverage: "No structured plan", habit: "Plans abandoned by week 2" },
    after:  { score: "Spaced revision on autopilot", coverage: "Plan built from the real syllabus", habit: "Daily score tracking" },
    quote: "The plan rebuilds itself when you miss a day — so falling behind once doesn't mean starting over.",
  },
];

export function BeforeAfterSection() {
  return (
    <section style={{ borderBottom: "1px solid var(--rule)", padding: "120px 0" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 56px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 16 }}>The shift</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 64, flexWrap: "wrap", gap: 16 }}>
          <h2 style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 48, fontWeight: 500, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
            Before Ledger.<br />After Ledger.
          </h2>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.08em" }}>Three problems · how the system answers them</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
          {CASES.map((c) => (
            <div key={c.name} style={{ border: "1px solid var(--rule)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--rule)", background: "color-mix(in srgb, var(--ink) 4%, var(--paper))" }}>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 20, color: "var(--ink)", marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{c.board}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--cinnabar-ink)", letterSpacing: "0.08em", marginTop: 4 }}>{c.subject}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ padding: "24px 20px", borderRight: "1px solid var(--rule)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Before</div>
                  {Object.values(c.before).map((v, i) => (
                    <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", marginBottom: 8, lineHeight: 1.4 }}>{v}</div>
                  ))}
                </div>
                <div style={{ padding: "24px 20px", background: "color-mix(in srgb, var(--cinnabar-ink) 4%, var(--paper))" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--cinnabar-ink)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>With Ledger</div>
                  {Object.values(c.after).map((v, i) => (
                    <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", fontWeight: 500, marginBottom: 8, lineHeight: 1.4 }}>{v}</div>
                  ))}
                </div>
              </div>

              <div style={{ padding: "20px 28px", borderTop: "1px solid var(--rule)", background: "color-mix(in srgb, var(--ink) 2%, var(--paper))" }}>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 14, color: "var(--ink-3)", lineHeight: 1.6 }}>&ldquo;{c.quote}&rdquo;</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, textAlign: "center" }}>
          <Link href="/auth" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--cinnabar-ink)", textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Start building your story →
          </Link>
        </div>
      </div>
    </section>
  );
}
