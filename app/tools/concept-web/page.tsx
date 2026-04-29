"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Child  = { label: string; detail: string; crossLinks: string[] };
type Branch = { label: string; children: Child[] };
type ConceptWeb = { center: string; description: string; branches: Branch[]; summary: string };

const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "Economics", "History", "English", "Geography", "Psychology", "Computer Science", "Philosophy", "Business"];
const LEVELS   = ["GCSE", "A-Level", "IB", "AP", "University"];
const COLORS   = ["#c44b2a", "#1a6091", "#2d7a3c", "#7a4fa3", "#c97a1a", "#1a7a7a", "#7a1a6e"];

export default function ConceptWebPage() {
  const [topic, setTopic]         = useState("");
  const [subject, setSubject]     = useState("Physics");
  const [level, setLevel]         = useState("A-Level");
  const [web, setWeb]             = useState<ConceptWeb | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [expanded, setExpanded]   = useState<number | null>(null);

  async function generate() {
    if (!topic.trim()) { setError("Enter a concept or topic."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "concept_web", topic, subject, level });
      const data = await res.json();
      if (!res.ok || !data.branches) { setError("Could not generate concept web."); return; }
      setWeb(data); setExpanded(null);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (web) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Concept Web · {web.center}</div>
        <button className="btn ghost" onClick={() => setWeb(null)}>New web</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-block", border: "3px solid var(--ink)", padding: "16px 32px", background: "var(--ink)", color: "var(--paper)" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 700 }}>{web.center}</div>
          </div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>{web.description}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {web.branches.map((b, i) => (
            <div key={i} style={{ border: `2px solid ${COLORS[i % COLORS.length]}`, overflow: "hidden" }}>
              <button onClick={() => setExpanded(expanded === i ? null : i)} style={{ width: "100%", padding: "14px 18px", background: expanded === i ? COLORS[i % COLORS.length] : "var(--paper)", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 700, color: expanded === i ? "white" : "var(--ink)" }}>{b.label}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: expanded === i ? "rgba(255,255,255,0.7)" : "var(--ink-3)" }}>{expanded === i ? "▲" : "▼"} {b.children.length} sub-concepts</span>
              </button>
              {expanded === i && (
                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {b.children.map((c, j) => (
                    <div key={j} style={{ padding: "12px 14px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 6 }}>{c.detail}</div>
                      {c.crossLinks.length > 0 && (
                        <div>
                          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>LINKS TO · </span>
                          {c.crossLinks.map((cl, k) => <span key={k} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#1a6091", marginRight: 8 }}>{cl}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: "16px 20px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>BIG PICTURE</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontStyle: "italic", lineHeight: 1.7 }}>{web.summary}</div>
        </div>
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Concept Web</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 600, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>See the connections</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Any concept, fully mapped.</h2>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUBJECTS.map(s => <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--ink)" : "var(--rule)"}`, background: subject === s ? "var(--ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
          <div style={{ display: "flex", gap: 6 }}>
            {LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>)}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Concept or topic</div>
          <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} placeholder="e.g. Market failure, Mitosis, Quantum mechanics, Cold War…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>

        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Mapping concept…" : "Build concept web →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
