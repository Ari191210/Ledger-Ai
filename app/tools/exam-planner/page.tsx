"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

type Exam    = { id: string; subject: string; date: string; board: string; confidence: number };
type Session = { subject: string; type: string; duration: string };
type DayPlan = { date: string; label: string; sessions: Session[] };

function planDays(exams: Exam[]): DayPlan[] {
  if (exams.length === 0) return [];
  const sorted = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const end    = new Date(sorted[sorted.length - 1].date);
  const result: DayPlan[] = [];

  for (const d = new Date(); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const label   = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const sessions: Session[] = [];

    const upcoming = sorted.filter(e => {
      const daysAway = Math.ceil((new Date(e.date).getTime() - d.getTime()) / 86400000);
      return daysAway >= 0 && daysAway <= 21;
    });
    if (upcoming.length === 0) continue;

    upcoming.slice(0, 3).forEach(e => {
      const away = Math.ceil((new Date(e.date).getTime() - d.getTime()) / 86400000);
      if (away === 0)       sessions.push({ subject: e.subject, type: "EXAM DAY", duration: "—" });
      else if (away === 1)  sessions.push({ subject: e.subject, type: "Light review + rest", duration: "30 min" });
      else if (away <= 3)   sessions.push({ subject: e.subject, type: "Past papers — timed conditions", duration: "2 hrs" });
      else if (away <= 7)   sessions.push({ subject: e.subject, type: "Topic deep-dives + weak areas", duration: "1.5 hrs" });
      else if (away <= 14)  sessions.push({ subject: e.subject, type: e.confidence < 40 ? "Core concept revision" : "Practice questions", duration: "1 hr" });
      else                  sessions.push({ subject: e.subject, type: "Spaced recall — key facts & formulas", duration: "30 min" });
    });

    result.push({ date: dateStr, label, sessions });
  }
  return result;
}

export default function ExamPlannerPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [form, setForm]   = useState({ subject: "", date: "", board: "A-Level", confidence: 50 });
  const [view, setView]   = useState<"setup" | "plan">("setup");

  function addExam() {
    if (!form.subject.trim() || !form.date) return;
    setExams(prev => [...prev, { id: Date.now().toString(), ...form }]);
    setForm(f => ({ ...f, subject: "", date: "" }));
  }

  const plan = useMemo(() => planDays(exams), [exams]);

  const typeColor = (t: string) => t === "EXAM DAY" ? "#c44b2a" : t.includes("Past") || t.includes("timed") ? "#1a6091" : t.includes("deep") || t.includes("weak") ? "#7a4fa3" : t.includes("Spaced") ? "#c97a1a" : "var(--ink-2)";

  if (view === "plan") return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between" }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 36 · Exam Season Planner</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>{exams.length} exams · {plan.length} revision days</div>
        </div>
        <button className="btn ghost" onClick={() => setView("setup")}>Edit exams</button>
      </header>
      <main className="mob-p" style={{ padding: "32px 44px 80px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          {([["Past papers", "#1a6091"], ["Deep dives", "#7a4fa3"], ["Spaced recall", "#c97a1a"], ["EXAM DAY", "#c44b2a"]] as [string,string][]).map(([l, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, background: c }} />
              <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{l}</span>
            </div>
          ))}
        </div>

        {plan.map((day, i) => (
          <div key={i} style={{ display: "flex", gap: 16, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--rule)" }}>
            <div style={{ width: 110, flexShrink: 0 }}>
              <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{day.label}</span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              {day.sessions.map((s, j) => (
                <div key={j} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 6, height: 6, background: typeColor(s.type), flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, minWidth: 110 }}>{s.subject}</span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: typeColor(s.type), flex: 1 }}>{s.type}</span>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{s.duration}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 24, padding: "14px 18px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>SPACED REPETITION LOGIC</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6 }}>
            21+ days: spaced recall every 3 days · 14–21: topic revision + practice · 7–14: deep dives on weak areas · 3–7: timed past papers · 1 day: light review + rest · Exam day: go do it
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 36 · Exam Season Planner</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Spaced repetition, automatically</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Add your exams. Get your plan.</h2>

        <div style={{ border: "1px solid var(--ink)", padding: "20px", marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject / paper name</div>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Economics Paper 1"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Exam date</div>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Board</div>
              <select value={form.board} onChange={e => setForm(f => ({ ...f, board: e.target.value }))}
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }}>
                {["CBSE", "ICSE", "IB", "A-Level", "IGCSE", "AP", "SAT"].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Current confidence: {form.confidence}%</div>
            <input type="range" min="10" max="90" value={form.confidence} onChange={e => setForm(f => ({ ...f, confidence: parseInt(e.target.value) }))} style={{ width: "100%", accentColor: "var(--cinnabar-ink)" }} />
          </div>
          <button className="btn" onClick={addExam} style={{ width: "100%" }}>+ Add exam</button>
        </div>

        {exams.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {[...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(e => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid var(--rule)", marginBottom: 6, background: "var(--paper-2)" }}>
                <div>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{e.subject}</span>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginLeft: 10 }}>{e.board} · {new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{e.confidence}%</span>
                  <button onClick={() => setExams(prev => prev.filter(x => x.id !== e.id))} style={{ fontFamily: "var(--mono)", fontSize: 11, padding: "3px 8px", border: "1px solid var(--rule)", background: "none", color: "var(--cinnabar-ink)", cursor: "pointer" }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn" onClick={() => setView("plan")} disabled={exams.length === 0} style={{ width: "100%", opacity: exams.length === 0 ? 0.4 : 1 }}>
          Generate revision plan →
        </button>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
