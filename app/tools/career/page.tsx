"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TierGate from "@/components/tier-gate";

const QUESTIONS = [
  { id: "q1", text: "Which of these activities do you enjoy most?", opts: ["Solving math or logic problems", "Writing essays and storytelling", "Conducting experiments", "Creating art, music, or designs", "Organizing and planning systems"] },
  { id: "q2", text: "In group projects, you naturally...", opts: ["Lead and delegate tasks", "Research and analyse data", "Build and prototype things", "Present and communicate ideas", "Support and coordinate the team"] },
  { id: "q3", text: "Which subjects come most naturally to you?", opts: ["Math / Physics", "Biology / Chemistry", "History / Literature", "Art / Music / Drama", "Computer Science / Technology"] },
  { id: "q4", text: "Your ideal work environment?", opts: ["Lab or research facility", "Office or corporate setting", "Hospital or clinic", "Outdoors or field work", "Home / remote / creative studio"] },
  { id: "q5", text: "What matters most in your future career?", opts: ["High income", "Making a difference in society", "Creative freedom", "Job security and stability", "Good work-life balance"] },
  { id: "q6", text: "How do you prefer to learn?", opts: ["Lectures, notes, structured reading", "Hands-on practice and experiments", "Reading and independent research", "Discussion, debate, and collaboration", "Videos, visuals, and demonstrations"] },
  { id: "q7", text: "When you have a difficult problem, you...", opts: ["Break it down logically, step by step", "Ask for help or work with others", "Look for creative or unconventional solutions", "Find examples of how it was solved before", "Trust your gut and try things out"] },
  { id: "q8", text: "Which of these appeals to you most?", opts: ["Discovering how the universe works", "Helping people recover and heal", "Building a business from scratch", "Creating content or art that reaches people", "Writing code that solves real problems"] },
  { id: "q9", text: "Your dream university subject (pick closest)?", opts: ["Engineering or Computer Science", "Medicine or Life Sciences", "Law or Social Sciences", "Fine Arts or Design", "Commerce or Economics"] },
  { id: "q10", text: "In 10 years, you would rather be...", opts: ["A recognised expert in a technical field", "Running your own company or venture", "Making a direct positive impact on thousands", "Living comfortably with a stable career", "Creating things that outlast you"] },
] as const;

type Stream   = { name: string; why: string; roles: string[] };
type College  = { name: string; country: string; why: string };
type Exam     = { name: string; desc: string };
type Roadmap  = { period: string; milestones: string[] };
type Output   = { streams: Stream[]; colleges: College[]; exams: Exam[]; roadmap: Roadmap[] };

export default function CareerPage() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [output,  setOutput]  = useState<Output | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [step,    setStep]    = useState(0);

  useEffect(() => {
    try {
      const a = localStorage.getItem("ledger-career-answers");
      if (a) setAnswers(JSON.parse(a));
      const o = localStorage.getItem("ledger-career-output");
      if (o) setOutput(JSON.parse(o));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("ledger-career-answers", JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    if (output) localStorage.setItem("ledger-career-output", JSON.stringify(output));
  }, [output]);

  const allAnswered = QUESTIONS.every((q) => answers[q.id]);
  const current = QUESTIONS[step];

  async function generate() {
    setLoading(true); setError(""); setOutput(null);
    try {
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "career", answers }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setOutput(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (output) return (
    <TierGate requires="pro">
      <div>
        <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 06 · Career Pathfinder · Your Profile</div>
          <button className="btn ghost" onClick={() => { setOutput(null); setAnswers({}); setStep(0); }}>Retake quiz</button>
        </header>
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {/* Streams */}
            <div>
              <div className="mono cin" style={{ marginBottom: 14 }}>Recommended streams</div>
              {output.streams.map((s, i) => (
                <div key={i} style={{ border: "1px solid var(--ink)", borderBottom: i < output.streams.length - 1 ? "none" : "1px solid var(--ink)", padding: "20px 18px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span className="mono cin">{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600 }}>{s.name}</span>
                  </div>
                  <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, margin: "8px 0 10px" }}>{s.why}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {s.roles.map((r, j) => (
                      <span key={j} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", border: "1px solid var(--rule)", color: "var(--ink-3)", textTransform: "uppercase" }}>{r}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Colleges */}
              <div>
                <div className="mono cin" style={{ marginBottom: 10 }}>Target colleges</div>
                <div style={{ border: "1px solid var(--ink)" }}>
                  {output.colleges.map((c, i) => (
                    <div key={i} style={{ padding: "12px 16px", borderBottom: i < output.colleges.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 12, alignItems: "baseline" }}>
                      <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{c.country} · {c.why}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exams */}
              <div>
                <div className="mono cin" style={{ marginBottom: 10 }}>Entrance exams to prepare</div>
                <div style={{ border: "1px solid var(--ink)" }}>
                  {output.exams.map((e, i) => (
                    <div key={i} style={{ padding: "12px 16px", borderBottom: i < output.exams.length - 1 ? "1px solid var(--rule)" : "none" }}>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{e.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Roadmap */}
          <div style={{ marginTop: 40 }}>
            <div className="mono cin" style={{ marginBottom: 14 }}>Five-year roadmap</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: "1px solid var(--ink)", borderLeft: "1px solid var(--ink)" }}>
              {output.roadmap.map((r, i) => (
                <div key={i} style={{ borderRight: "1px solid var(--ink)", borderBottom: "1px solid var(--ink)", padding: "18px 16px" }}>
                  <div className="mono cin" style={{ marginBottom: 8 }}>{r.period}</div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontFamily: "var(--sans)", fontSize: 12.5, lineHeight: 1.7, color: "var(--ink-2)" }}>
                    {r.milestones.map((m, j) => <li key={j}>{m}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 06 of 10.</div>
          </div>
        </main>
      </div>
    </TierGate>
  );

  return (
    <TierGate requires="pro">
      <div>
        <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 06 · Career Pathfinder</div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Question {step + 1} of {QUESTIONS.length}</div>
        </header>

        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 680, margin: "0 auto" }}>
          {/* Progress */}
          <div style={{ height: 4, background: "var(--paper-2)", border: "1px solid var(--rule)", marginBottom: 40 }}>
            <div style={{ height: "100%", width: `${((step) / QUESTIONS.length) * 100}%`, background: "var(--cinnabar)", transition: "width 300ms" }} />
          </div>

          <div className="mono cin" style={{ marginBottom: 10 }}>Question {String(step + 1).padStart(2, "0")} of {QUESTIONS.length}</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", lineHeight: 1.3, margin: "0 0 28px" }}>
            {current.text}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--ink)" }}>
            {current.opts.map((opt, j) => {
              const selected = answers[current.id] === opt;
              return (
                <button key={j} onClick={() => {
                  setAnswers((p) => ({ ...p, [current.id]: opt }));
                  if (step < QUESTIONS.length - 1) setTimeout(() => setStep((s) => s + 1), 250);
                }}
                  style={{ padding: "16px 20px", background: selected ? "var(--ink)" : "var(--paper)", color: selected ? "var(--paper)" : "var(--ink)", border: "none", borderBottom: j < current.opts.length - 1 ? "1px solid var(--rule)" : "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.4, display: "flex", gap: 14, alignItems: "baseline" }}>
                  <span className="mono" style={{ opacity: 0.5, flexShrink: 0 }}>{String.fromCharCode(65 + j)}.</span>
                  {opt}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, alignItems: "center" }}>
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
              style={{ background: "none", border: "none", cursor: step === 0 ? "default" : "pointer", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", opacity: step === 0 ? 0.3 : 1 }}>
              ← Previous
            </button>

            {allAnswered && step === QUESTIONS.length - 1 ? (
              <button className="btn" onClick={generate} disabled={loading} style={{ opacity: loading ? 0.5 : 1 }}>
                {loading ? "Generating profile…" : "Generate career profile →"}
              </button>
            ) : (
              <button onClick={() => setStep((s) => Math.min(QUESTIONS.length - 1, s + 1))} disabled={step === QUESTIONS.length - 1}
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", opacity: step === QUESTIONS.length - 1 ? 0.3 : 1 }}>
                Next →
              </button>
            )}
          </div>
          {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}

          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 06 of 10.</div>
          </div>
        </main>
      </div>
    </TierGate>
  );
}
