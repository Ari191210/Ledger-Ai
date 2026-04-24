"use client";

import { useState } from "react";
import Link from "next/link";

type Flashcard = { q: string; a: string };
type QuizItem  = { q: string; opts: string[]; ans: number };
type Output    = { explanation: string; summary: string[]; flashcards: Flashcard[]; quiz: QuizItem[] };

function FlashcardView({ cards }: { cards: Flashcard[] }) {
  const [flip, setFlip] = useState<Record<number, boolean>>({});
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)" }}>
      {cards.map((c, i) => (
        <div key={i} onClick={() => setFlip((p) => ({ ...p, [i]: !p[i] }))}
          style={{ padding: "20px 18px", minHeight: 100, cursor: "pointer", borderRight: i % 2 === 0 ? "1px solid var(--ink)" : "none", borderBottom: i < cards.length - 2 ? "1px solid var(--ink)" : "none", background: flip[i] ? "var(--ink)" : "var(--paper-2)", color: flip[i] ? "var(--paper)" : "var(--ink)", transition: "background 200ms, color 200ms" }}>
          <div className="mono" style={{ opacity: 0.6, marginBottom: 8 }}>{flip[i] ? "Answer" : `Card ${String(i + 1).padStart(2, "0")}`}</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{flip[i] ? c.a : c.q}</div>
          <div className="mono" style={{ opacity: 0.4, marginTop: 8, fontSize: 9 }}>tap to {flip[i] ? "show question" : "reveal"}</div>
        </div>
      ))}
    </div>
  );
}

function QuizView({ items }: { items: QuizItem[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const done = Object.keys(answers).length === items.length;
  const score = done ? Object.entries(answers).filter(([i, a]) => a === items[+i].ans).length : 0;

  return (
    <div>
      {items.map((item, i) => {
        const answered = answers[i] !== undefined;
        return (
          <div key={i} style={{ marginBottom: 16, border: "1px solid var(--rule)", padding: "16px 18px" }}>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
              <span className="mono" style={{ color: "var(--cinnabar-ink)", marginRight: 8 }}>{String(i + 1).padStart(2, "0")}</span>
              {item.q}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {item.opts.map((opt, j) => {
                const isSelected = answers[i] === j;
                const isCorrect  = j === item.ans;
                let bg = "transparent";
                if (answered) bg = isCorrect ? "var(--paper-2)" : isSelected ? "var(--paper-2)" : "transparent";
                return (
                  <button key={j} onClick={() => !answered && setAnswers((p) => ({ ...p, [i]: j }))}
                    style={{ padding: "8px 12px", background: bg, border: `1px solid ${answered && isCorrect ? "var(--cinnabar-ink)" : "var(--rule)"}`, cursor: answered ? "default" : "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 12, color: answered && isCorrect ? "var(--cinnabar-ink)" : answered && isSelected && !isCorrect ? "var(--ink-3)" : "var(--ink)" }}>
                    <span className="mono" style={{ marginRight: 6, opacity: 0.5 }}>{String.fromCharCode(65 + j)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {done && (
        <div style={{ padding: "16px 18px", border: "1px solid var(--ink)", background: "var(--paper-2)", marginTop: 4 }}>
          <div className="mono cin">Score</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 40, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4 }}>
            {score}/{items.length}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NotesPage() {
  const [input,   setInput]   = useState("");
  const [output,  setOutput]  = useState<Output | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [tab,     setTab]     = useState<"explanation" | "summary" | "flashcards" | "quiz">("explanation");

  async function generate() {
    if (!input.trim()) return;
    setLoading(true); setError(""); setOutput(null);
    try {
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "notes", content: input }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setOutput(data); setTab("explanation");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const TABS = [
    { id: "explanation", label: "Explanation" },
    { id: "summary",     label: "Summary"     },
    { id: "flashcards",  label: "Flashcards"  },
    { id: "quiz",        label: "Quiz"        },
  ] as const;

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 03 · Notes Simplifier</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Textbook → plain English</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: output ? "1fr 1.4fr" : "1fr", gap: 48 }}>
          {/* Input */}
          <div>
            <div className="mono cin" style={{ marginBottom: 14 }}>Input · Paste your notes or chapter</div>
            <textarea
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your textbook excerpt, lecture notes, or any study material here. The longer and denser, the better."
              rows={output ? 16 : 20}
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "16px", color: "var(--ink)", resize: "vertical", outline: "none" }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className="btn" onClick={generate} disabled={loading || !input.trim()} style={{ opacity: loading || !input.trim() ? 0.5 : 1 }}>
                {loading ? "Analysing…" : "Simplify →"}
              </button>
              {output && <button className="btn ghost" onClick={() => { setOutput(null); setInput(""); }}>Clear</button>}
            </div>
            {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}
          </div>

          {/* Output */}
          {output && (
            <div>
              <div style={{ display: "flex", border: "1px solid var(--ink)", marginBottom: 0 }}>
                {TABS.map((t, i) => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    style={{ flex: 1, padding: "12px 8px", background: tab === t.id ? "var(--ink)" : "var(--paper)", color: tab === t.id ? "var(--paper)" : "var(--ink-2)", border: "none", borderRight: i < TABS.length - 1 ? "1px solid var(--rule)" : "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ border: "1px solid var(--ink)", borderTop: "none", padding: "24px 20px" }}>
                {tab === "explanation" && (
                  <div style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.65, color: "var(--ink-2)" }}>
                    {output.explanation.split("\n\n").map((p, i) => <p key={i} style={{ marginBottom: 14 }}>{p}</p>)}
                  </div>
                )}
                {tab === "summary" && (
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                    {output.summary.map((point, i) => (
                      <li key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < output.summary.length - 1 ? "1px solid var(--rule)" : "none" }}>
                        <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {tab === "flashcards" && <FlashcardView cards={output.flashcards} />}
                {tab === "quiz"       && <QuizView items={output.quiz} />}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 03 of 10.</div>
        </div>
      </main>
    </div>
  );
}
