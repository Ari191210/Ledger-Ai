"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";

type Tab = "flashcards" | "formula";

// ── Flashcard types ───────────────────────────────────────────────────────────

type Card = { q: string; a: string };

// ── Formula types ─────────────────────────────────────────────────────────────

type Formula = { id: number; name: string; formula: string; variables_explained: string; memory_tip: string; topic: string };
type CardState = "prompt" | "answered" | "revealed";

const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology"];
const TOPICS: Record<string, string[]> = {
  Physics:     ["Mechanics", "Thermodynamics", "Electrostatics", "Magnetism", "Optics", "Modern Physics", "Waves", "Fluid Mechanics"],
  Chemistry:   ["Mole Concept", "Thermodynamics", "Electrochemistry", "Chemical Kinetics", "Organic Reactions", "Atomic Structure", "Equilibrium"],
  Mathematics: ["Calculus", "Algebra", "Trigonometry", "Coordinate Geometry", "Probability", "Matrices", "Vectors", "Statistics"],
  Biology:     ["Cell Biology", "Genetics", "Ecology", "Human Physiology", "Plant Physiology", "Evolution", "Biotechnology"],
};

function normalize(s: string) { return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[×·]/g, "*"); }
function isClose(a: string, b: string) {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return true;
  const longer = Math.max(na.length, nb.length);
  if (longer === 0) return true;
  let m = 0;
  for (let i = 0; i < Math.min(na.length, nb.length); i++) if (na[i] === nb[i]) m++;
  return m / longer >= 0.8;
}

// ── Tab: Flashcards ───────────────────────────────────────────────────────────

function FlashcardsTab() {
  const [input, setInput]     = useState("");
  const [subject, setSubject] = useState("");
  const [cards, setCards]     = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [idx, setIdx]         = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [unknown, setUnknown] = useState<Set<number>>(new Set());
  const [mode, setMode]       = useState<"all" | "unknown">("all");

  const deck = mode === "unknown" ? cards.filter((_, i) => unknown.has(i)) : cards;
  const cur  = deck[idx];

  async function generate() {
    if (!input.trim() && !subject.trim()) return;
    setLoading(true); setError(""); setCards([]); setIdx(0); setFlipped(false); setUnknown(new Set());
    try {
      const res  = await callAI({ tool: "flashcards", content: input, subject });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed."); return; }
      if (!Array.isArray(data.cards) || !data.cards.length) { setError("No cards generated — try again."); return; }
      setCards(data.cards);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  function markKnown() {
    const orig = cards.indexOf(cur);
    setUnknown(s => { const n = new Set(s); n.delete(orig); return n; }); next();
  }
  function markUnknown() {
    const orig = cards.indexOf(cur);
    setUnknown(s => new Set(Array.from(s).concat(orig))); next();
  }
  function next() { setFlipped(false); setTimeout(() => setIdx(i => (i + 1) % deck.length), 80); }
  function prev() { setFlipped(false); setTimeout(() => setIdx(i => (i - 1 + deck.length) % deck.length), 80); }

  if (cards.length === 0) return (
    <>
      <div className="mono cin" style={{ marginBottom: 8 }}>Generate flashcards</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 24px" }}>Paste notes or name a topic.</h2>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject / topic</div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Organic Chemistry, World War II…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Paste your notes (optional)</div>
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={7} placeholder="Paste chapter notes, definitions, or any study material here…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical" }} />
      </div>
      {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
      <button className="btn" onClick={generate} disabled={loading || (!input.trim() && !subject.trim())} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
        {loading ? "Generating cards…" : "Generate flashcards →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </>
  );

  return (
    <>
      <div style={{ display: "flex", gap: 4, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "4px", marginBottom: 24, width: "fit-content" }}>
        {([["all", `All (${cards.length})`], ["unknown", `Still learning (${unknown.size})`]] as [string, string][]).map(([v, l], i) => (
          <button key={v} onClick={() => { setMode(v as "all" | "unknown"); setIdx(0); setFlipped(false); }}
            style={{ padding: "8px 16px", fontFamily: "var(--mono)", fontSize: 10, background: mode === v ? "var(--ink)" : "var(--paper)", color: mode === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em" }}>
            {l}
          </button>
        ))}
      </div>
      {deck.length === 0
        ? <div style={{ textAlign: "center", padding: "60px 0" }}><div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", color: "var(--ink-2)" }}>No cards in this set.</div></div>
        : <>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 12, textAlign: "center" }}>{idx + 1} / {deck.length}</div>
            <div onClick={() => setFlipped(f => !f)}
              style={{ border: "2px solid var(--ink)", padding: "60px 40px", textAlign: "center", cursor: "pointer", minHeight: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: flipped ? "var(--ink)" : "var(--paper)", transition: "background 200ms", marginBottom: 20, userSelect: "none" }}>
              <div className="mono" style={{ color: flipped ? "rgba(255,255,255,0.4)" : "var(--ink-3)", fontSize: 9, marginBottom: 16, letterSpacing: "0.1em" }}>{flipped ? "ANSWER" : "QUESTION — click to reveal"}</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", color: flipped ? "var(--paper)" : "var(--ink)", lineHeight: 1.5, maxWidth: 520 }}>{flipped ? cur.a : cur.q}</div>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button onClick={prev} style={{ flex: 1, padding: "11px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid var(--ink)", background: "var(--paper)", cursor: "pointer" }}>← Prev</button>
              {flipped && <>
                <button onClick={markUnknown} style={{ flex: 2, padding: "11px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid #c44b2a", background: "var(--paper)", color: "#c44b2a", cursor: "pointer" }}>✕ Still learning</button>
                <button onClick={markKnown}   style={{ flex: 2, padding: "11px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid #2d7a3c", background: "var(--paper)", color: "#2d7a3c", cursor: "pointer" }}>✓ Got it</button>
              </>}
              <button onClick={next} style={{ flex: 1, padding: "11px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid var(--ink)", background: "var(--paper)", cursor: "pointer" }}>Next →</button>
            </div>
            <button className="btn ghost" onClick={() => setCards([])} style={{ width: "100%" }}>Generate new set</button>
          </>
      }
    </>
  );
}

// ── Tab: Formula Recall ───────────────────────────────────────────────────────

function FormulaTab() {
  const [subject, setSubject] = useState("Physics");
  const [topic, setTopic]     = useState("Mechanics");
  const [loading, setLoading] = useState(false);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [current, setCurrent] = useState(0);
  const [attempt, setAttempt] = useState("");
  const [cardState, setCardState] = useState<CardState>("prompt");
  const [scores, setScores]   = useState<boolean[]>([]);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTopic(TOPICS[subject][0]); }, [subject]);

  async function generate() {
    setLoading(true); setError(""); setFormulas([]); setScores([]); setCurrent(0); setAttempt(""); setCardState("prompt"); setDone(false);
    try {
      const res = await callAI({ tool: "formula_recall", subject, topic }) as unknown as { formulas: Formula[] };
      if (!res?.formulas?.length) { setError("Could not generate formulas. Try again."); return; }
      setFormulas(res.formulas);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  function checkAnswer() {
    if (!attempt.trim()) return;
    setScores(s => [...s, isClose(attempt, formulas[current].formula)]);
    setCardState("answered");
  }

  function reveal() { if (cardState === "prompt") setScores(s => [...s, false]); setCardState("revealed"); }

  function next() {
    if (current + 1 >= formulas.length) { setDone(true); }
    else { setCurrent(c => c + 1); setAttempt(""); setCardState("prompt"); setTimeout(() => inputRef.current?.focus(), 80); }
  }

  function restart() { setCurrent(0); setAttempt(""); setCardState("prompt"); setScores([]); setDone(false); setTimeout(() => inputRef.current?.focus(), 80); }

  const correctCount = scores.filter(Boolean).length;

  if (done && formulas.length) {
    const pct = Math.round((correctCount / formulas.length) * 100);
    const tierColor = pct >= 80 ? "#27ae60" : pct >= 50 ? "#e67e22" : "var(--cinnabar-ink)";
    return (
      <div style={{ maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 64, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--ink)", marginBottom: 8 }}>{pct}%</div>
          <div className="mono" style={{ fontSize: 11, color: tierColor, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{pct >= 80 ? "Strong recall" : pct >= 50 ? "Review needed" : "Critical gaps"}</div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{correctCount}/{formulas.length} correct · {subject} · {topic}</div>
        </div>
        <div style={{ marginBottom: 28 }}>
          {formulas.map((f, i) => (
            <div key={f.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 0", borderBottom: "1px solid var(--rule)" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: scores[i] ? "#27ae60" : "var(--cinnabar-ink)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{scores[i] ? "✓" : "✗"}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{f.name}</div>
                <div className="mono" style={{ fontSize: 12, color: "var(--cinnabar-ink)" }}>{f.formula}</div>
                {!scores[i] && <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.5 }}>{f.memory_tip}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={restart} style={{ flex: 1 }}>Drill again →</button>
          <button className="btn ghost" onClick={generate} style={{ flex: 1 }}>New set</button>
        </div>
      </div>
    );
  }

  if (formulas.length && !done) {
    const f = formulas[current];
    const isCorrect = cardState === "answered" && scores[scores.length - 1];
    return (
      <div style={{ maxWidth: 560 }}>
        <div style={{ height: 3, background: "var(--rule)", marginBottom: 32 }}>
          <div style={{ height: "100%", width: `${(current / formulas.length) * 100}%`, background: "var(--cinnabar-ink)", transition: "width 400ms ease" }} />
        </div>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>{f.topic} · {current + 1}/{formulas.length}</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", color: "var(--ink)", marginBottom: 28 }}>{f.name}</h2>
        {cardState === "prompt" && <>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Write the formula from memory</div>
          <input ref={inputRef} autoFocus value={attempt} onChange={e => setAttempt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && attempt.trim()) checkAnswer(); }}
            placeholder="e.g. F = ma"
            style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 18, padding: "14px 16px", border: "1px solid var(--ink)", background: "var(--paper)", color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn" onClick={checkAnswer} disabled={!attempt.trim()} style={{ flex: 2 }}>Check →</button>
            <button className="btn ghost" onClick={reveal} style={{ flex: 1, fontSize: 11 }}>Show answer</button>
          </div>
        </>}
        {(cardState === "answered" || cardState === "revealed") && (
          <div>
            {cardState === "answered" && (
              <div style={{ padding: "14px 18px", border: `1px solid ${isCorrect ? "#27ae60" : "var(--cinnabar-ink)"}`, background: isCorrect ? "rgba(39,174,96,0.08)" : "rgba(255,80,48,0.06)", marginBottom: 20 }}>
                <div className="mono" style={{ fontSize: 10, color: isCorrect ? "#27ae60" : "var(--cinnabar-ink)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{isCorrect ? "Correct ✓" : "Not quite ✗"}</div>
                <div className="mono" style={{ fontSize: 14, color: "var(--ink-2)" }}>Your answer: {attempt}</div>
              </div>
            )}
            <div style={{ padding: "20px", border: "1px solid var(--rule)", background: "var(--paper-2)", marginBottom: 20 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Correct formula</div>
              <div className="mono" style={{ fontSize: 22, color: "var(--cinnabar-ink)", marginBottom: 14 }}>{f.formula}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 10 }}>{f.variables_explained}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, fontStyle: "italic" }}>Memory tip: {f.memory_tip}</div>
            </div>
            <button className="btn" onClick={next} style={{ width: "100%" }}>{current + 1 >= formulas.length ? "See results →" : "Next formula →"}</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: "var(--ink)", margin: "0 0 8px" }}>Test your formula memory.</h2>
      <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7, margin: "0 0 28px" }}>Formula name shown. You write it from memory. Active recall beats re-reading by 4×.</p>
      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Subject</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {SUBJECTS.map(s => (
            <button key={s} onClick={() => setSubject(s)}
              style={{ padding: "12px", border: `1px solid ${subject === s ? "var(--ink)" : "var(--rule)"}`, background: subject === s ? "var(--ink)" : "transparent", color: subject === s ? "var(--paper)" : "var(--ink-2)", fontFamily: "var(--sans)", fontSize: 13, fontWeight: subject === s ? 700 : 400, cursor: "pointer" }}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 28 }}>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Topic</div>
        <select value={topic} onChange={e => setTopic(e.target.value)}
          style={{ width: "100%", padding: "12px 14px", border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 13 }}>
          {(TOPICS[subject] || []).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {error && <div className="mono" style={{ fontSize: 12, color: "var(--cinnabar-ink)", marginBottom: 16, padding: "10px 14px", border: "1px solid var(--cinnabar-ink)" }}>{error}</div>}
      {loading && <AIThinking />}
      <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%" }}>{loading ? "Generating drill…" : "Start drill →"}</button>
      <p className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "center", marginTop: 14 }}>8–10 formulas · Active recall · Spaced repetition ready</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RecallStudioPage() {
  const [tab, setTab] = useState<Tab>("flashcards");

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Recall Studio</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Flashcards and formula drills. Active recall beats re-reading.</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "4px" }}>
          {([["flashcards", "AI Flashcards"], ["formula", "Formula Recall"]] as [Tab, string][]).map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 18px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em" }}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>
        {tab === "flashcards" && <FlashcardsTab />}
        {tab === "formula"    && <FormulaTab />}

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
