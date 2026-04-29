"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Guide = { topic: string; overview: string; sections: { title: string; content: string; keyPoints: string[] }[]; mustKnow: string[]; commonMistakes: string[]; quickReview: string[]; examTip: string };

const LEVELS = ["GCSE", "IGCSE", "A-Level", "IB", "CBSE", "JEE", "NEET"];

export default function StudyGuidePage() {
  const [topic, setTopic]     = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel]     = useState("A-Level");
  const [guide, setGuide]     = useState<Guide | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [open, setOpen]       = useState<number | null>(0);

  async function generate() {
    if (!topic.trim()) { setError("Enter a topic or chapter."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "study_guide", topic, subject, level });
      const data = await res.json();
      if (!res.ok || !data.sections) { setError(data.error || "Could not generate study guide."); return; }
      setGuide(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (guide) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 52 · Study Guide · {guide.topic}</div>
        <button className="btn ghost" onClick={() => setGuide(null)}>New guide</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 820, margin: "0 auto" }}>
        <div style={{ border: "2px solid var(--ink)", padding: "16px 20px", marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>OVERVIEW</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.7 }}>{guide.overview}</div>
        </div>

        {guide.sections.map((s, i) => (
          <div key={i} style={{ border: "1px solid var(--rule)", marginBottom: 8 }}>
            <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{s.title}</span>
              <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{open === i ? "▲" : "▼"}</span>
            </button>
            {open === i && (
              <div style={{ padding: "0 16px 16px" }}>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)", marginBottom: 12 }}>{s.content}</div>
                {s.keyPoints.map((kp, j) => <div key={j} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <span style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--mono)", fontSize: 9, marginTop: 2 }}>✓</span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)" }}>{kp}</span>
                </div>)}
              </div>
            )}
          </div>
        ))}

        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16, marginBottom: 12 }}>
          <div style={{ border: "2px solid var(--ink)", padding: "14px 16px" }}>
            <div className="mono cin" style={{ marginBottom: 8 }}>Must Know</div>
            {guide.mustKnow.map((m, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5 }}>· {m}</div>)}
          </div>
          <div style={{ border: "1px solid var(--cinnabar-ink)", padding: "14px 16px" }}>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 8 }}>Common Mistakes</div>
            {guide.commonMistakes.map((m, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5, color: "var(--ink-2)" }}>· {m}</div>)}
          </div>
        </div>

        <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>QUICK REVIEW — FLASH THROUGH THESE</div>
          {guide.quickReview.map((q, i) => <div key={i} style={{ fontFamily: "var(--mono)", fontSize: 10, marginBottom: 4, color: "var(--ink-2)" }}>{i + 1}. {q}</div>)}
        </div>

        <div style={{ border: "1px solid #1a6091", padding: "14px 16px", background: "rgba(26,96,145,0.04)" }}>
          <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 6 }}>EXAM TIP</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{guide.examTip}</div>
        </div>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 52 · Study Guide Builder</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Everything you need. Nothing you don&apos;t.</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Instant comprehensive study guide for any topic.</h2>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic or chapter <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Photosynthesis, Keynesian Economics, The French Revolution…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject (optional)</div>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Biology, Economics…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>)}
          </div>
        </div>
        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Building study guide…" : "Build study guide →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
