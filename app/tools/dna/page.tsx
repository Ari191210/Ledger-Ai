"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type MistakeEntry = { date: string; subject: string; topic: string; category: string };

const CATEGORIES = ["Conceptual Gap", "Calculation Slip", "Misread Question", "Time Pressure", "Memory Blank"];

const CAT_DESC: Record<string, string> = {
  "Conceptual Gap":     "You didn't understand the underlying idea.",
  "Calculation Slip":   "You knew the method but made an arithmetic or formula error.",
  "Misread Question":   "You understood the concept but misread what was being asked.",
  "Time Pressure":      "You ran out of time and guessed rather than working it through.",
  "Memory Blank":       "You knew it — but couldn't recall it in the moment.",
};

export default function DNAPage() {
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);

  useEffect(() => {
    try {
      setMistakes(JSON.parse(localStorage.getItem("ledger-mistakes") || "[]"));
    } catch {}
  }, []);

  if (mistakes.length === 0) {
    return (
      <div>
        <header style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 12 · Mistake DNA</div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>No data yet.</div>
        </header>
        <main className="mob-p" style={{ padding: "80px 44px", maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.02em", marginBottom: 12 }}>No mistakes logged yet.</div>
          <div className="mono" style={{ color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 32 }}>
            After each Past Papers session, you&apos;ll see a &ldquo;Tag your mistakes&rdquo; section. Tap why you got each question wrong — Conceptual, Slip, Misread, Rushed, or Blanked. Your fingerprint builds up here automatically.
          </div>
          <Link href="/tools/papers" className="btn">Go to Past Papers →</Link>
        </main>
      </div>
    );
  }

  const byCat: Record<string, number> = {};
  CATEGORIES.forEach(c => { byCat[c] = 0; });
  mistakes.forEach(m => { if (byCat[m.category] !== undefined) byCat[m.category]++; });
  const total = mistakes.length;
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const maxCatCount = Math.max(...Object.values(byCat), 1);

  const bySubj: Record<string, number> = {};
  mistakes.forEach(m => { bySubj[m.subject] = (bySubj[m.subject] || 0) + 1; });
  const topSubjects = Object.entries(bySubj).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const byTopic: Record<string, number> = {};
  mistakes.forEach(m => { byTopic[m.topic] = (byTopic[m.topic] || 0) + 1; });
  const topTopics = Object.entries(byTopic).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const recent = mistakes.slice(0, 20);

  function clearAll() {
    localStorage.removeItem("ledger-mistakes");
    setMistakes([]);
  }

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 12 · Mistake DNA</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>{total} mistake{total !== 1 ? "s" : ""} logged</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>

        {/* Biggest Leak + Breakdown */}
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)", marginBottom: 32 }}>
          <div style={{ padding: "28px 24px", borderRight: "1px solid var(--rule)" }}>
            <div className="mono cin" style={{ marginBottom: 8 }}>Biggest Leak</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 34, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 10 }}>
              {topCat[0]}
            </div>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 14 }}>
              {Math.round((topCat[1] / total) * 100)}% of mistakes · {topCat[1]} question{topCat[1] !== 1 ? "s" : ""}
            </div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
              {CAT_DESC[topCat[0]]}
            </div>
          </div>

          <div style={{ padding: "28px 24px" }}>
            <div className="mono cin" style={{ marginBottom: 20 }}>Breakdown</div>
            {CATEGORIES.map(cat => (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span className="mono" style={{ fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase" }}>{cat}</span>
                  <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{byCat[cat]} · {total > 0 ? Math.round((byCat[cat] / total) * 100) : 0}%</span>
                </div>
                <div style={{ height: 6, background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                  <div style={{ height: "100%", width: `${(byCat[cat] / maxCatCount) * 100}%`, background: cat === topCat[0] ? "var(--cinnabar)" : "var(--ink)", transition: "width 600ms ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subjects + Topics */}
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)", marginBottom: 32 }}>
          <div style={{ borderRight: "1px solid var(--rule)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}>
              <div className="mono cin">By Subject</div>
            </div>
            {topSubjects.map(([subj, cnt], i) => (
              <div key={subj} style={{ padding: "14px 20px", borderBottom: i < topSubjects.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--sans)", fontSize: 14 }}>{subj}</span>
                <span className="mono" style={{ color: "var(--cinnabar-ink)" }}>{cnt}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}>
              <div className="mono cin">Recurring Topics</div>
            </div>
            {topTopics.map(([topic, cnt], i) => (
              <div key={topic} style={{ padding: "14px 20px", borderBottom: i < topTopics.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>{topic}</span>
                <span className="mono" style={{ color: "var(--cinnabar-ink)" }}>{cnt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent log */}
        <div style={{ border: "1px solid var(--ink)", marginBottom: 40 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="mono cin">Recent Mistakes</div>
            <button onClick={clearAll} className="mono" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 9 }}>Clear all</button>
          </div>
          {recent.map((m, i) => (
            <div key={i} style={{ padding: "12px 20px", borderBottom: i < recent.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="mono" style={{ color: "var(--cinnabar-ink)", marginRight: 8, fontSize: 9 }}>{m.subject}</span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 13 }}>{m.topic}</span>
              </div>
              <span className="mono" style={{ fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ink-3)", border: "1px solid var(--rule)", padding: "2px 7px", flexShrink: 0 }}>{m.category}</span>
              <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9, flexShrink: 0 }}>{new Date(m.date).toLocaleDateString()}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 12 of 44.</div>
        </div>
      </main>
    </div>
  );
}
