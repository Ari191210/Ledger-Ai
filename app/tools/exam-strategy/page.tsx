"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Strategy = { subject: string; duration: number; sections: { name: string; timeAllocation: string; approach: string; pitfalls: string[] }[]; timeManagement: string; nerveControl: string[]; lastMinuteTips: string[]; examDayChecklist: string[]; examTip: string };

export default function ExamStrategyPage() {
  const [subject, setSubject]   = useState("");
  const [duration, setDuration] = useState(180);
  const [format, setFormat]     = useState("");
  const [concerns, setConcerns] = useState("");
  const [result, setResult]     = useState<Strategy | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function generate() {
    if (!subject.trim()) { setError("Enter your subject."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "exam_strategy", subject, duration, format, concerns });
      const data = await res.json();
      if (!res.ok || !data.sections) { setError(data.error || "Could not generate strategy."); return; }
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (result) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 53 · Exam Strategy · {result.subject}</div>
        <button className="btn ghost" onClick={() => setResult(null)}>New strategy</button>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 820, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 10 }}>TIME ALLOCATION BY SECTION</div>
          {result.sections.map((s, i) => (
            <div key={i} style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                <span className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)" }}>{s.timeAllocation}</span>
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)", marginBottom: 8 }}>{s.approach}</div>
              <div className="mono" style={{ fontSize: 8, color: "var(--cinnabar-ink)", marginBottom: 4 }}>WATCH OUT FOR</div>
              {s.pitfalls.map((p, j) => <div key={j} style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", marginBottom: 3 }}>· {p}</div>)}
            </div>
          ))}
        </div>

        <div style={{ border: "2px solid var(--ink)", padding: "16px 20px", marginBottom: 12 }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Time Management</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.timeManagement}</div>
        </div>

        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ border: "1px solid #2d7a3c", padding: "14px 16px" }}>
            <div className="mono" style={{ fontSize: 9, color: "#2d7a3c", marginBottom: 8 }}>NERVE CONTROL</div>
            {result.nerveControl.map((n, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 5 }}>· {n}</div>)}
          </div>
          <div style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 8 }}>LAST-MINUTE TIPS</div>
            {result.lastMinuteTips.map((t, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 5 }}>· {t}</div>)}
          </div>
        </div>

        <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>EXAM DAY CHECKLIST</div>
          {result.examDayChecklist.map((c, i) => <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
            <span style={{ width: 14, height: 14, border: "1px solid var(--rule)", display: "inline-block", flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontFamily: "var(--sans)", fontSize: 13 }}>{c}</span>
          </div>)}
        </div>

        <div style={{ border: "1px solid #1a6091", padding: "14px 16px", background: "rgba(26,96,145,0.04)" }}>
          <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 6 }}>KEY REMINDER</div>
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
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 53 · Exam Strategy</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Walk in with a plan.</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Personalised exam-day strategy for any paper.</h2>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. A-Level History Paper 2, JEE Maths…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Duration: {duration} minutes</div>
          <input type="range" min={30} max={360} step={15} value={duration} onChange={e => setDuration(Number(e.target.value))} style={{ width: "100%" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>30 min</span>
            <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>6 hours</span>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Paper format (optional)</div>
          <input value={format} onChange={e => setFormat(e.target.value)} placeholder="e.g. Section A: 50 MCQs, Section B: 4 essays…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Your main concerns (optional)</div>
          <input value={concerns} onChange={e => setConcerns(e.target.value)} placeholder="e.g. Time management, essay structure, running out of time on long questions…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Building strategy…" : "Build exam strategy →"}
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
