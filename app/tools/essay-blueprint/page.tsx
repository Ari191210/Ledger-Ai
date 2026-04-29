"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Section   = { title: string; purpose: string; points: string[]; wordCount: number; openWith: string };
type Blueprint = { title: string; thesis: string; totalWords: number; sections: Section[]; dos: string[]; donts: string[]; keyTerms: string[] };

const SUBJECTS = ["Economics", "History", "English Literature", "English Language", "Biology", "Geography", "Psychology", "Sociology", "Philosophy", "Political Science", "Business", "ToK"];
const LEVELS   = ["GCSE", "IGCSE", "A-Level", "IB HL", "IB SL", "AP", "University"];
const TYPES    = [["analytical", "Analytical"], ["argumentative", "Argumentative"], ["comparative", "Comparative"], ["narrative", "Narrative"]];

export default function EssayBlueprintPage() {
  const [subject, setSubject]     = useState("History");
  const [level, setLevel]         = useState("A-Level");
  const [prompt, setPrompt]       = useState("");
  const [words, setWords]         = useState("1000");
  const [type, setType]           = useState("analytical");
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  async function generate() {
    if (!prompt.trim()) { setError("Enter your essay question."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "essay_blueprint", subject, level, prompt, words, type });
      const data = await res.json();
      if (!res.ok || !data.sections) { setError("Could not generate blueprint."); return; }
      setBlueprint(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (blueprint) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 34 · Essay Blueprint · {subject} · {level}</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>{blueprint.totalWords} words total</div>
        </div>
        <button className="btn ghost" onClick={() => setBlueprint(null)}>New blueprint</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ border: "2px solid var(--ink)", padding: "20px 24px", marginBottom: 28 }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Thesis statement</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", lineHeight: 1.6 }}>{blueprint.thesis}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
          {blueprint.sections.map((s, i) => (
            <div key={i} style={{ border: "1px solid var(--rule)", padding: "18px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, marginRight: 8 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 700 }}>{s.title}</span>
                </div>
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>~{s.wordCount} words</span>
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginBottom: 10, fontStyle: "italic" }}>{s.purpose}</div>
              {s.points.map((p, j) => (
                <div key={j} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <span style={{ color: "var(--rule)", fontFamily: "var(--mono)", fontSize: 10 }}>·</span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{p}</span>
                </div>
              ))}
              <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                <span className="mono" style={{ fontSize: 9, color: "#1a6091" }}>OPEN WITH · </span>
                <span style={{ fontFamily: "var(--serif)", fontSize: 12, fontStyle: "italic", color: "var(--ink-2)" }}>{s.openWith}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <div style={{ border: "1px solid #2d7a3c", padding: "16px" }}>
            <div className="mono" style={{ color: "#2d7a3c", marginBottom: 10 }}>Do</div>
            {blueprint.dos.map((d, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 6, lineHeight: 1.5 }}>✓ {d}</div>)}
          </div>
          <div style={{ border: "1px solid var(--cinnabar-ink)", padding: "16px" }}>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 10 }}>Avoid</div>
            {blueprint.donts.map((d, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 6, lineHeight: 1.5 }}>✗ {d}</div>)}
          </div>
        </div>

        <div style={{ padding: "14px 18px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>KEY TERMS TO USE</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {blueprint.keyTerms.map((t, i) => <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "3px 8px", border: "1px solid var(--rule)", color: "var(--ink)" }}>{t}</span>)}
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 34 · Essay Blueprint</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Structure before you write</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Turn any prompt into a winning structure.</h2>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUBJECTS.map(s => <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--ink)" : "var(--rule)"}`, background: subject === s ? "var(--ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Essay type</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TYPES.map(([v, l]) => <button key={v} onClick={() => setType(v)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${type === v ? "var(--ink)" : "var(--rule)"}`, background: type === v ? "var(--ink)" : "var(--paper)", color: type === v ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Essay question / prompt</div>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder="Paste your exact essay question here…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical" }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Word limit: {words}</div>
          <input type="range" min="400" max="3000" step="100" value={words} onChange={e => setWords(e.target.value)} style={{ width: "100%", accentColor: "var(--cinnabar-ink)" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>400</span>
            <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>3000 words</span>
          </div>
        </div>

        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Building blueprint…" : "Build my essay blueprint →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
