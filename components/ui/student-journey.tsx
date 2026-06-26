"use client";
import Link from "next/link";

const STAGES = [
  {
    day: "Day 1",
    title: "You know your gap.",
    points: [
      "Upload syllabus PDF or photo",
      "Ledger maps every chapter and topic",
      "First Ledger Score calculated",
      "Day-by-day plan generated in 6 seconds",
    ],
    score: "Score: ~200",
    scoreNote: "baseline set",
  },
  {
    day: "Day 7",
    title: "You have a system.",
    points: [
      "7-day streak building",
      "Weak topics identified from first past papers",
      "Score updates after every session",
      "Spaced revision surfaces forgotten topics",
    ],
    score: "Score: ~380",
    scoreNote: "+180 in one week",
  },
  {
    day: "Day 30",
    title: "You can see the difference.",
    points: [
      "Syllabus coverage crosses 60%",
      "Mock accuracy trending up",
      "Peer Struggle Heatmap shows where others are stuck",
      "Error patterns categorised and shrinking",
    ],
    score: "Score: ~590",
    scoreNote: "Developing tier",
  },
];

export function StudentJourneySection() {
  return (
    <section style={{ borderBottom: "1px solid var(--rule)", padding: "120px 0" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 56px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--cinnabar-ink)", marginBottom: 16 }}>The journey</div>
        <h2 style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 48, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 64px", lineHeight: 1.1 }}>
          Day 1 to exam day.<br />What actually happens.
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, position: "relative" }}>
          <div style={{ position: "absolute", top: 22, left: "16.67%", right: "16.67%", height: 1, background: "var(--rule)", zIndex: 0 }} />

          {STAGES.map((s, i) => (
            <div key={s.day} style={{ position: "relative", zIndex: 1, padding: "0 24px" }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: i === STAGES.length - 1 ? "var(--cinnabar-ink)" : "var(--ink-3)",
                border: "2px solid var(--paper)",
                marginBottom: 28,
                marginLeft: "auto",
                marginRight: "auto",
                boxShadow: i === STAGES.length - 1 ? "0 0 12px var(--cinnabar-ink)" : "none",
              }} />

              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>{s.day}</div>
              <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 20, fontWeight: 500, color: "var(--ink)", marginBottom: 20, lineHeight: 1.2 }}>{s.title}</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {s.points.map((p, j) => (
                  <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--ink-3)", flexShrink: 0, marginTop: 6 }} />
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>{p}</div>
                  </div>
                ))}
              </div>

              <div style={{
                padding: "12px 16px",
                background: "color-mix(in srgb, var(--cinnabar-ink) 8%, var(--paper))",
                borderRadius: 8,
                border: "1px solid color-mix(in srgb, var(--cinnabar-ink) 20%, transparent)",
              }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: "var(--cinnabar-ink)", letterSpacing: "0.06em" }}>{s.score}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink-3)", marginTop: 2, letterSpacing: "0.06em" }}>{s.scoreNote}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 64, textAlign: "center" }}>
          <Link href="/auth" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--cinnabar-ink)", textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Start Day 1 today — free →
          </Link>
        </div>
      </div>
    </section>
  );
}
