"use client";
import Link from "next/link";

const CASES = [
  {
    name: "Ananya R.",
    board: "Class 12 CBSE · Pune",
    subject: "Organic Chemistry",
    before: { score: "47 / 70", coverage: "34% syllabus done", habit: "No revision system" },
    after:  { score: "63 / 70", coverage: "91% syllabus done", habit: "18-day streak" },
    quote: "The chapter tracker showed me I was 18 sessions behind. I didn&apos;t realise it was that bad until I saw the number.",
    weeks: 3,
  },
  {
    name: "Dev P.",
    board: "JEE Advanced prep · Delhi",
    subject: "Overall mock rank",
    before: { score: "Rank 14,200", coverage: "Skipping weak chapters", habit: "Solo — no accountability" },
    after:  { score: "Rank 3,860",  coverage: "All chapters attempted", habit: "Study Pact streak active" },
    quote: "Neither of us wanted to be the one who broke the streak.",
    weeks: 16,
  },
  {
    name: "Rohan K.",
    board: "Class 10 ICSE · Mumbai",
    subject: "Overall percentage",
    before: { score: "85%", coverage: "No structured plan", habit: "Cramming before tests" },
    after:  { score: "92%", coverage: "84-day plan followed", habit: "Daily score tracking" },
    quote: "First plan I&apos;ve actually followed. Went from 85% to 92% by year end.",
    weeks: 12,
  },
];

export function BeforeAfterSection() {
  return (
    <section style={{ borderBottom: "1px solid var(--rule)", padding: "120px 0" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 56px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 16 }}>Real outcomes</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 64, flexWrap: "wrap", gap: 16 }}>
          <h2 style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 48, fontWeight: 500, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
            Before Ledger.<br />After Ledger.
          </h2>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.08em" }}>Self-reported · pilot cohort</div>
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
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--cinnabar-ink)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>After · {c.weeks}wk</div>
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
