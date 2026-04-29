"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Event = { date: string; title: string; description: string; significance: string; category: string };
type Timeline = { title: string; period: string; events: Event[]; themes: string[]; examTip: string };

const SUBJECTS = ["History", "Economics", "Science", "Politics", "Literature", "Geography", "Other"];

export default function TimelinePage() {
  const [topic, setTopic]     = useState("");
  const [subject, setSubject] = useState("History");
  const [result, setResult]   = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const CAT_COLORS: Record<string, string> = { Political: "var(--cinnabar-ink)", Economic: "#2d7a3c", Social: "#1a6091", Military: "#7a5c2d", Scientific: "#6b3fa0", Other: "var(--ink-3)" };

  async function generate() {
    if (!topic.trim()) { setError("Enter a topic or period."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "timeline", topic, subject });
      const data = await res.json();
      if (!res.ok || !data.events) { setError(data.error || "Could not build timeline."); return; }
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (result) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 49 · Timeline Builder</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>{result.period}</div>
        </div>
        <button className="btn ghost" onClick={() => setResult(null)}>New timeline</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 820, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 500, marginBottom: 24 }}>{result.title}</div>

        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 1, background: "var(--ink)" }} />
          {result.events.map((ev, i) => {
            const color = CAT_COLORS[ev.category] || "var(--ink-3)";
            return (
              <div key={i} style={{ position: "relative", marginBottom: 20 }}>
                <div style={{ position: "absolute", left: -20, top: 6, width: 10, height: 10, background: color, borderRadius: "50%", border: "2px solid var(--paper)" }} />
                <div style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="mono" style={{ fontSize: 9, color: color }}>{ev.category} · {ev.date}</span>
                  </div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{ev.title}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.5, color: "var(--ink-2)", marginBottom: 6 }}>{ev.description}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#2d7a3c" }}>SIGNIFICANCE · <span style={{ fontFamily: "var(--sans)", fontSize: 11, textTransform: "none", letterSpacing: 0, color: "var(--ink-2)" }}>{ev.significance}</span></div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20, border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>KEY THEMES</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {result.themes.map((t, i) => <span key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, padding: "4px 10px", border: "1px solid var(--rule)", color: "var(--ink-2)" }}>{t}</span>)}
          </div>
        </div>
        <div style={{ border: "1px solid #1a6091", padding: "14px 16px", background: "rgba(26,96,145,0.04)" }}>
          <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 6 }}>EXAM TIP</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.examTip}</div>
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
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 49 · Timeline Builder</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Chronology, annotated.</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Build a fully annotated timeline for any topic or period.</h2>
        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUBJECTS.map(s => <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: subject === s ? "var(--cinnabar-ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic or period <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. The Cold War 1945-1991, Industrial Revolution, DNA discovery…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Building timeline…" : "Build timeline →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
