"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

// ─── Language Analyzer types & logic ────────────────────────────────────────

type Tone      = { label: string; explanation: string };
type LangDev   = { device: string; example: string; effect: string };
type Structure = { feature: string; effect: string };
type Theme     = { theme: string; evidence: string };
type Analysis  = { type: string; tone: Tone[]; structure: Structure[]; language: LangDev[]; themes: Theme[]; audience: string; purpose: string; grade9Points: string[]; exampleAnswer: string };

const TEXT_TYPES = ["Poetry", "Prose extract", "News article", "Speech", "Diary/Letter", "Advertisement", "Literary non-fiction"];

function LangAnalyzerTab() {
  const [text, setText]         = useState("");
  const [textType, setTextType] = useState("Poetry");
  const [level, setLevel]       = useState("A-Level");
  const [focus, setFocus]       = useState("full");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [innerTab, setInnerTab] = useState<"language" | "structure" | "themes" | "answer">("language");

  async function analyse() {
    if (text.trim().length < 50) { setError("Paste at least a paragraph of text."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "lang_analyzer", text, textType, level, focus });
      const data = await res.json();
      if (!res.ok || !data.language) { setError("Could not analyse text."); return; }
      setAnalysis(data); setInnerTab("language");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (analysis) return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Language Analyzer &middot; {analysis.type}</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Audience: {analysis.audience} &middot; Purpose: {analysis.purpose}</div>
        </div>
        <button className="btn ghost" onClick={() => setAnalysis(null)} style={{ cursor: "pointer" }}>New text</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {analysis.tone.map((t, i) => (
          <div key={i} style={{ padding: "8px 14px", border: "none", background: i === 0 ? "var(--ink)" : "var(--paper)", color: i === 0 ? "var(--paper)" : "var(--ink)" }}>
            <div style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 700 }}>{t.label}</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 11, opacity: 0.7, marginTop: 2 }}>{t.explanation}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", borderBottom: "2px solid var(--ink)", marginBottom: 24 }}>
        {(["language", "structure", "themes", "answer"] as const).map(t => (
          <button key={t} onClick={() => setInnerTab(t)} style={{ padding: "10px 18px", border: "none", borderBottom: innerTab === t ? "2px solid var(--cinnabar-ink)" : "none", background: "none", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: innerTab === t ? "var(--cinnabar-ink)" : "var(--ink-3)", cursor: "pointer", marginBottom: -2 }}>
            {t === "answer" ? "Grade 9 answer" : t}
          </button>
        ))}
      </div>

      {innerTab === "language" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {analysis.language.map((l, i) => (
            <div key={i} style={{ border: "1px solid var(--rule)", padding: "14px 18px" }}>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, color: "var(--cinnabar-ink)", marginBottom: 6 }}>{l.device}</div>
              <div style={{ padding: "8px 12px", background: "var(--paper-2)", border: "1px solid var(--rule)", marginBottom: 8, fontFamily: "var(--serif)", fontSize: 13, fontStyle: "italic" }}>&ldquo;{l.example}&rdquo;</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}><strong>Effect:</strong> {l.effect}</div>
            </div>
          ))}
        </div>
      )}

      {innerTab === "structure" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {analysis.structure.map((s, i) => (
            <div key={i} style={{ border: "1px solid var(--rule)", padding: "14px 18px", display: "flex", gap: 16 }}>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, minWidth: 160 }}>{s.feature}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{s.effect}</div>
            </div>
          ))}
        </div>
      )}

      {innerTab === "themes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {analysis.themes.map((t, i) => (
            <div key={i} style={{ border: i === 0 ? "2px solid var(--ink)" : "1px solid var(--rule)", padding: "14px 18px" }}>
              <div style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{t.theme}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{t.evidence}</div>
            </div>
          ))}
        </div>
      )}

      {innerTab === "answer" && (
        <div>
          <div style={{ marginBottom: 14, padding: "10px 14px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>TOP-BAND POINTS TO HIT</div>
            {analysis.grade9Points.map((p, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 4 }}>&middot; {p}</div>)}
          </div>
          <div style={{ border: "none", padding: "20px 24px" }}>
            <div className="mono cin" style={{ marginBottom: 12 }}>Model paragraph</div>
            <AIOutput text={analysis.exampleAnswer} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Unseen text, fully decoded</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Paste any text. Get exam-ready analysis.</h2>

      <div style={{ marginBottom: 16 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Text type</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {TEXT_TYPES.map(t => <button key={t} onClick={() => setTextType(t)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${textType === t ? "var(--ink)" : "var(--rule)"}`, background: textType === t ? "var(--ink)" : "var(--paper)", color: textType === t ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{t}</button>)}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
        <div style={{ display: "flex", gap: 6 }}>
          {["GCSE", "IGCSE", "A-Level", "IB"].map(l => <button key={l} onClick={() => setLevel(l)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>)}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Analysis focus</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["full", "Full analysis"], ["language", "Language only"], ["structure", "Structure only"]].map(([v, l]) => <button key={v} onClick={() => setFocus(v)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${focus === v ? "var(--ink)" : "var(--rule)"}`, background: focus === v ? "var(--ink)" : "var(--paper)", color: focus === v ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>)}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Text to analyse</div>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={10}
          placeholder="Paste your poem, extract, article, or passage here…"
          style={{ width: "100%", fontFamily: "var(--serif)", fontSize: 14, border: "none", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.8 }} />
      </div>

      {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <button className="btn" onClick={analyse} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1, cursor: "pointer" }}>
        {loading ? "Analysing text…" : "Analyse this text →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );
}

// ─── Vocabulary Vault types & logic ─────────────────────────────────────────

type Word = { word: string; definition: string; partOfSpeech: string; example: string; etymology: string; synonyms: string[]; memoryTip: string; difficulty: "basic" | "intermediate" | "advanced" };
type VaultData = { words: Word[]; theme: string };
type CardState = "front" | "back";

function VocabTab() {
  const [topic, setTopic]       = useState("");
  const [context, setContext]   = useState("academic");
  const [count, setCount]       = useState("10");
  const [level, setLevel]       = useState("A-Level");
  const [vault, setVault]       = useState<VaultData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [idx, setIdx]           = useState(0);
  const [cardState, setCardState] = useState<CardState>("front");
  const [known, setKnown]       = useState<Set<number>>(new Set());
  const [mode, setMode]         = useState<"cards" | "list">("cards");

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true); setError(""); setVault(null);
    try {
      const res  = await callAI({ tool: "vocab", topic, context, count, level });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.words)) { setError("Could not generate — try again."); return; }
      setVault(data); setIdx(0); setCardState("front"); setKnown(new Set());
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  function markKnown() {
    setKnown(k => { const n = new Set(k); n.add(idx); return n; });
    if (vault && idx < vault.words.length - 1) { setIdx(i => i + 1); setCardState("front"); }
  }
  function markStudy() {
    setKnown(k => { const n = new Set(k); n.delete(idx); return n; });
    if (vault && idx < vault.words.length - 1) { setIdx(i => i + 1); setCardState("front"); }
  }

  const diffColor = { basic: "#2d7a3c", intermediate: "#c97a1a", advanced: "#c44b2a" };

  if (!vault) return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Build your vocabulary</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Any topic. Deep word learning with memory hooks.</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic / subject *</div>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Biology cell biology, Shakespeare, Economics, Law…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "none", background: "var(--paper)", padding: "11px 14px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Context</div>
          <select value={context} onChange={e => setContext(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "none", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)", cursor: "pointer" }}>
            <option value="academic">Academic writing</option>
            <option value="subject">Subject-specific</option>
            <option value="general">General English</option>
            <option value="sat">SAT / test prep</option>
            <option value="literature">Literature</option>
          </select>
        </div>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
          <select value={level} onChange={e => setLevel(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "none", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)", cursor: "pointer" }}>
            {["GCSE","A-Level","IB","University","Advanced"].map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Words</div>
          <select value={count} onChange={e => setCount(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "none", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)", cursor: "pointer" }}>
            {["8","10","15","20"].map(n => <option key={n} value={n}>{n} words</option>)}
          </select>
        </div>
      </div>
      {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
      <button className="btn" onClick={generate} disabled={loading || !topic.trim()} style={{ width: "100%", opacity: loading ? 0.5 : 1, marginTop: 14, cursor: "pointer" }}>
        {loading ? "Building vocab vault…" : "Generate vocabulary →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );

  const w = vault.words[idx];
  const knownCount = known.size;
  const total = vault.words.length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Vocabulary Vault &middot; {vault.theme}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 11, color: "#2d7a3c" }}>{knownCount}/{total} known</span>
          <div style={{ display: "flex", gap: 8, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "6px", overflowX: "auto" as const }}>
            <button onClick={() => setMode("cards")} style={{ padding: "6px 14px", fontFamily: "var(--mono)", fontSize: 10, background: mode === "cards" ? "var(--ink)" : "var(--paper)", color: mode === "cards" ? "var(--paper)" : "var(--ink)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer" }}>Cards</button>
            <button onClick={() => setMode("list")}  style={{ padding: "6px 14px", fontFamily: "var(--mono)", fontSize: 10, background: mode === "list"  ? "var(--ink)" : "var(--paper)", color: mode === "list"  ? "var(--paper)" : "var(--ink)", border: "none", cursor: "pointer" }}>List</button>
          </div>
          <button className="btn ghost" onClick={() => setVault(null)} style={{ cursor: "pointer" }}>New topic</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: "var(--paper-2)", height: 6, marginBottom: 32, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${(knownCount / total) * 100}%`, height: "100%", background: "#2d7a3c", transition: "width 0.3s" }} />
      </div>

      {mode === "cards" ? (
        <>
          {/* Card */}
          <div onClick={() => setCardState(s => s === "front" ? "back" : "front")}
            style={{ border: "none", padding: "40px 48px", minHeight: 320, cursor: "pointer", marginBottom: 24, position: "relative", background: known.has(idx) ? "#2d7a3c08" : "var(--paper)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <span style={{ fontFamily: "var(--serif)", fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>{w.word}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", marginLeft: 10 }}>{w.partOfSpeech}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", border: `1px solid ${diffColor[w.difficulty]}`, color: diffColor[w.difficulty] }}>{w.difficulty}</span>
                <span className="mono" style={{ color: "var(--ink-3)", fontSize: 10 }}>{idx + 1}/{total}</span>
              </div>
            </div>

            {cardState === "front" ? (
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textAlign: "center", marginTop: 40 }}>tap to reveal definition</div>
            ) : (
              <div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 18, lineHeight: 1.6, marginBottom: 16, color: "var(--ink)" }}>{w.definition}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", fontStyle: "italic", marginBottom: 16, lineHeight: 1.6 }}>&ldquo;{w.example}&rdquo;</div>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {w.etymology && (
                    <div>
                      <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 2 }}>ETYMOLOGY</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{w.etymology}</div>
                    </div>
                  )}
                  {w.synonyms.length > 0 && (
                    <div>
                      <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 2 }}>SYNONYMS</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{w.synonyms.join(", ")}</div>
                    </div>
                  )}
                </div>
                {w.memoryTip && (
                  <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                    <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 2 }}>MEMORY HOOK</div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)" }}>{w.memoryTip}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => { setIdx(i => Math.max(0, i - 1)); setCardState("front"); }} disabled={idx === 0} style={{ padding: "10px 20px", fontFamily: "var(--mono)", fontSize: 10, border: "none", background: "var(--paper)", cursor: "pointer", opacity: idx === 0 ? 0.3 : 1 }}>&larr; Back</button>
            <button onClick={markStudy} style={{ padding: "10px 24px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid #c44b2a", background: "var(--paper)", color: "#c44b2a", cursor: "pointer" }}>Still learning</button>
            <button onClick={markKnown} style={{ padding: "10px 24px", fontFamily: "var(--mono)", fontSize: 10, border: "1px solid #2d7a3c", background: "#2d7a3c", color: "var(--paper)", cursor: "pointer" }}>Got it ✓</button>
            <button onClick={() => { setIdx(i => Math.min(total - 1, i + 1)); setCardState("front"); }} disabled={idx === total - 1} style={{ padding: "10px 20px", fontFamily: "var(--mono)", fontSize: 10, border: "none", background: "var(--paper)", cursor: "pointer", opacity: idx === total - 1 ? 0.3 : 1 }}>Next &rarr;</button>
          </div>

          {/* Word dots */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
            {vault.words.map((_, i) => (
              <button key={i} onClick={() => { setIdx(i); setCardState("front"); }}
                style={{ width: 8, height: 8, borderRadius: "50%", border: "none", cursor: "pointer", background: known.has(i) ? "#2d7a3c" : i === idx ? "var(--ink)" : "var(--rule)" }} />
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 1, border: "none" }}>
          {vault.words.map((word, i) => (
            <div key={i} style={{ padding: "16px 18px", borderRight: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", background: known.has(i) ? "#2d7a3c08" : "var(--paper)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700 }}>{word.word}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: diffColor[word.difficulty] }}>{word.difficulty}</span>
              </div>
              <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 4 }}>{word.partOfSpeech}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)", marginBottom: 8 }}>{word.definition}</div>
              {word.memoryTip && <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)", fontStyle: "italic" }}>{word.memoryTip}</div>}
              <button onClick={() => setKnown(k => { const n = new Set(k); if (known.has(i)) { n.delete(i); } else { n.add(i); } return n; })}
                style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", border: `1px solid ${known.has(i) ? "#2d7a3c" : "var(--rule)"}`, background: known.has(i) ? "#2d7a3c" : "var(--paper)", color: known.has(i) ? "var(--paper)" : "var(--ink-3)", cursor: "pointer" }}>
                {known.has(i) ? "✓ known" : "mark known"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page shell ─────────────────────────────────────────────────────────────

type Tab = "analyzer" | "vocab";
const TABS: [Tab, string][] = [["analyzer", "Language Analyzer"], ["vocab", "Vocabulary Vault"]];

export default function LanguageLabPage() {
  const [tab, setTab] = useState<Tab>("analyzer");
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Language Lab</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Analyse texts and build vocabulary for any subject.</div>
        </div>
        <div style={{ display: "flex", gap: 8, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "6px", overflowX: "auto" as const }}>
          {TABS.map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 18px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em" }}>
              {l}
            </button>
          ))}
        </div>
        <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>&larr; Dashboard</Link>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "analyzer" && <LangAnalyzerTab />}
        {tab === "vocab"    && <VocabTab />}
      </main>
    </div>
  );
}
