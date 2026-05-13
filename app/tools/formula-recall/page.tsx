"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";

type Formula = {
  id: number;
  name: string;
  formula: string;
  variables_explained: string;
  memory_tip: string;
  topic: string;
};

type DrillResult = {
  formulas: Formula[];
};

type CardState = "prompt" | "answered" | "revealed";

const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology"];

const TOPICS: Record<string, string[]> = {
  Physics: ["Mechanics", "Thermodynamics", "Electrostatics", "Magnetism", "Optics", "Modern Physics", "Waves", "Fluid Mechanics"],
  Chemistry: ["Mole Concept", "Thermodynamics", "Electrochemistry", "Chemical Kinetics", "Organic Reactions", "Atomic Structure", "Equilibrium"],
  Mathematics: ["Calculus", "Algebra", "Trigonometry", "Coordinate Geometry", "Probability", "Matrices", "Vectors", "Statistics"],
  Biology: ["Cell Biology", "Genetics", "Ecology", "Human Physiology", "Plant Physiology", "Evolution", "Biotechnology"],
};

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[×·]/g, "*");
}

function isClose(attempt: string, answer: string): boolean {
  const a = normalize(attempt);
  const b = normalize(answer);
  if (a === b) return true;
  // Allow if 85%+ chars match (simple heuristic for formula typos)
  const longer = Math.max(a.length, b.length);
  if (longer === 0) return true;
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / longer >= 0.8;
}

export default function FormulaRecallPage() {
  const [subject, setSubject] = useState("Physics");
  const [topic, setTopic] = useState("Mechanics");
  const [loading, setLoading] = useState(false);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [current, setCurrent] = useState(0);
  const [attempt, setAttempt] = useState("");
  const [cardState, setCardState] = useState<CardState>("prompt");
  const [scores, setScores] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTopic(TOPICS[subject][0]);
  }, [subject]);

  async function generate() {
    setLoading(true);
    setError("");
    setFormulas([]);
    setScores([]);
    setCurrent(0);
    setAttempt("");
    setCardState("prompt");
    setDone(false);
    try {
      const res = await callAI({ tool: "formula_recall", subject, topic }) as unknown as DrillResult;
      if (!res?.formulas?.length) { setError("Could not generate formulas. Try again."); return; }
      setFormulas(res.formulas);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function checkAnswer() {
    if (!attempt.trim()) return;
    const correct = isClose(attempt, formulas[current].formula);
    setScores(s => [...s, correct]);
    setCardState("answered");
  }

  function reveal() {
    if (cardState === "prompt") {
      setScores(s => [...s, false]);
    }
    setCardState("revealed");
  }

  function next() {
    if (current + 1 >= formulas.length) {
      setDone(true);
    } else {
      setCurrent(c => c + 1);
      setAttempt("");
      setCardState("prompt");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }

  function restart() {
    setCurrent(0);
    setAttempt("");
    setCardState("prompt");
    setScores([]);
    setDone(false);
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  const correctCount = scores.filter(Boolean).length;

  // ── Done screen ──
  if (done && formulas.length) {
    const pct = Math.round((correctCount / formulas.length) * 100);
    const tierColor = pct >= 80 ? "#27ae60" : pct >= 50 ? "#e67e22" : "var(--cinnabar-ink)";
    const tierLabel = pct >= 80 ? "Strong recall" : pct >= 50 ? "Review needed" : "Critical gaps";
    return (
      <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
        <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.04em" }}>← Dashboard</Link>
          <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 700 }}>Formula Recall</div>
        </header>
        <main style={{ maxWidth: 520, margin: "0 auto", padding: "60px 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 72, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--ink)", marginBottom: 8 }}>{pct}%</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: tierColor, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{tierLabel}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>{correctCount}/{formulas.length} recalled correctly · {subject} · {topic}</div>
          </div>
          <div style={{ marginBottom: 32 }}>
            {formulas.map((f, i) => (
              <div key={f.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 0", borderBottom: "1px solid var(--rule)" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: scores[i] ? "#27ae60" : "var(--cinnabar-ink)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                  <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{scores[i] ? "✓" : "✗"}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>{f.name}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--cinnabar-ink)" }}>{f.formula}</div>
                  {!scores[i] && <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.5 }}>{f.memory_tip}</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={restart} style={{ flex: 1 }}>Drill again →</button>
            <button className="btn ghost" onClick={generate} style={{ flex: 1 }}>New set</button>
          </div>
        </main>
      </div>
    );
  }

  // ── Drill screen ──
  if (formulas.length && !done) {
    const f = formulas[current];
    const isCorrect = cardState === "answered" && scores[scores.length - 1];
    const isWrong = cardState === "answered" && !scores[scores.length - 1];
    return (
      <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
        <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.04em" }}>← Dashboard</Link>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>
            {current + 1} / {formulas.length} · {subject}
          </div>
        </header>

        {/* Progress bar */}
        <div style={{ height: 3, background: "var(--rule)" }}>
          <div style={{ height: "100%", width: `${((current) / formulas.length) * 100}%`, background: "var(--cinnabar-ink)", transition: "width 400ms ease" }} />
        </div>

        <main style={{ maxWidth: 560, margin: "0 auto", padding: "60px 32px" }}>
          {/* Topic chip */}
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>{f.topic}</div>

          {/* Formula name */}
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 34, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", color: "var(--ink)", marginBottom: 32 }}>
            {f.name}
          </h1>

          {/* Input */}
          {cardState === "prompt" && (
            <>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Write the formula from memory</div>
              <input
                ref={inputRef}
                autoFocus
                value={attempt}
                onChange={e => setAttempt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && attempt.trim()) checkAnswer(); }}
                placeholder="e.g. F = ma"
                style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 18, padding: "14px 16px", border: "1px solid var(--ink)", background: "var(--paper)", color: "var(--ink)", outline: "none", boxSizing: "border-box", letterSpacing: "0.02em" }}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button className="btn" onClick={checkAnswer} disabled={!attempt.trim()} style={{ flex: 2 }}>Check →</button>
                <button className="btn ghost" onClick={reveal} style={{ flex: 1, fontSize: 11 }}>Show answer</button>
              </div>
            </>
          )}

          {/* Answered state */}
          {(cardState === "answered" || cardState === "revealed") && (
            <div>
              {cardState === "answered" && (
                <div style={{ padding: "14px 18px", border: `1px solid ${isCorrect ? "#27ae60" : "var(--cinnabar-ink)"}`, background: isCorrect ? "rgba(39,174,96,0.08)" : "rgba(255,80,48,0.06)", marginBottom: 20 }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: isCorrect ? "#27ae60" : "var(--cinnabar-ink)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                    {isCorrect ? "Correct ✓" : isWrong ? "Not quite ✗" : ""}
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--ink-2)" }}>Your answer: {attempt}</div>
                </div>
              )}

              <div style={{ padding: "20px", border: "1px solid var(--rule)", background: "var(--paper-2)", marginBottom: 20 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Correct formula</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 22, color: "var(--cinnabar-ink)", marginBottom: 14, letterSpacing: "0.02em" }}>{f.formula}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 10 }}>{f.variables_explained}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, fontStyle: "italic" }}>Memory tip: {f.memory_tip}</div>
              </div>

              <button className="btn" onClick={next} style={{ width: "100%" }}>
                {current + 1 >= formulas.length ? "See results →" : "Next formula →"}
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── Setup screen ──
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.04em" }}>← Dashboard</Link>
          <span style={{ color: "var(--rule)" }}>|</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Practise</span>
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>Formula Recall</div>
      </header>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "60px 32px 80px" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 700, lineHeight: 1.1, color: "var(--ink)", margin: "0 0 10px" }}>
            Test your formula memory.
          </h1>
          <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7, margin: 0 }}>
            We show you the formula name. You write it from memory. Active recall beats re-reading by 4×.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Subject</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {SUBJECTS.map(s => (
              <button key={s} onClick={() => setSubject(s)}
                style={{ padding: "12px", border: `1px solid ${subject === s ? "var(--ink)" : "var(--rule)"}`, background: subject === s ? "var(--ink)" : "transparent", color: subject === s ? "var(--paper)" : "var(--ink-2)", fontFamily: "var(--sans)", fontSize: 13, fontWeight: subject === s ? 700 : 400, cursor: "pointer", transition: "all 160ms ease" }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Topic</div>
          <select value={topic} onChange={e => setTopic(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 13 }}>
            {(TOPICS[subject] || []).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {error && (
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--cinnabar-ink)", marginBottom: 16, padding: "10px 14px", border: "1px solid var(--cinnabar-ink)" }}>{error}</div>
        )}

        {loading && <AIThinking />}

        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%" }}>
          {loading ? "Generating drill…" : "Start drill →"}
        </button>

        <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textAlign: "center", marginTop: 14 }}>
          8–10 formulas · Active recall · Spaced repetition ready
        </p>
      </main>
    </div>
  );
}
