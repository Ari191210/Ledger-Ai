"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type DebriefResult = {
  immediate_focus: string;
  pattern_note: string;
  sleep_impact: string;
  next_session: string;
  mindset_note: string;
};

type DebriefEntry = {
  id: string;
  date: string;
  examName: string;
  scorePercent: number;
  hardTopics: string;
  sleepHours: number;
  anxietyLevel: number;
  examBoard: string;
  result: DebriefResult;
};

const BOARDS = ["CBSE", "ICSE", "IB", "IGCSE", "JEE", "NEET", "A-Level", "SAT", "Other"];

const ANXIETY_LABELS: Record<number, string> = {
  1: "Calm",
  2: "Mildly anxious",
  3: "Nervous",
  4: "Very anxious",
  5: "Overwhelmed",
};

const ANXIETY_COLORS: Record<number, string> = {
  1: "#27ae60",
  2: "#5aaf6a",
  3: "#e67e22",
  4: "#d45a22",
  5: "var(--cinnabar-ink)",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const LS_KEY = "ledger-exam-debriefs";

function loadHistory(): DebriefEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}

function saveEntry(entry: DebriefEntry) {
  const existing = loadHistory();
  localStorage.setItem(LS_KEY, JSON.stringify([entry, ...existing].slice(0, 50)));
}

export default function ExamDebriefPage() {
  const [form, setForm] = useState({ examName: "", scorePercent: "", hardTopics: "", sleepHours: "7", anxietyLevel: 3, examBoard: "CBSE" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebriefResult | null>(null);
  const [history, setHistory] = useState<DebriefEntry[]>([]);
  const [error, setError] = useState("");
  const [view, setView] = useState<"form" | "result" | "history">("form");

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  async function generate() {
    if (!form.examName.trim() || !form.scorePercent) {
      setError("Add the exam name and your score first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await callAI({
        tool: "exam_debrief",
        examName: form.examName,
        scorePercent: parseFloat(form.scorePercent),
        hardTopics: form.hardTopics,
        sleepHours: parseFloat(form.sleepHours),
        anxietyLevel: form.anxietyLevel,
        examBoard: form.examBoard,
      }) as unknown as DebriefResult;
      if (!res?.immediate_focus) { setError("Could not generate debrief. Try again."); return; }
      setResult(res);
      const entry: DebriefEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        examName: form.examName,
        scorePercent: parseFloat(form.scorePercent),
        hardTopics: form.hardTopics,
        sleepHours: parseFloat(form.sleepHours),
        anxietyLevel: form.anxietyLevel,
        examBoard: form.examBoard,
        result: res,
      };
      saveEntry(entry);
      setHistory(loadHistory());
      setView("result");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function newDebrief() {
    setResult(null);
    setForm({ examName: "", scorePercent: "", hardTopics: "", sleepHours: "7", anxietyLevel: 3, examBoard: "CBSE" });
    setView("form");
  }

  const scoreNum = parseFloat(form.scorePercent) || 0;
  const scoreColor = scoreNum >= 80 ? "#27ae60" : scoreNum >= 55 ? "#e67e22" : "var(--cinnabar-ink)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "var(--paper)", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textDecoration: "none", letterSpacing: "0.04em" }}>← Dashboard</Link>
          <span style={{ color: "var(--rule)" }}>|</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Track</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 700 }}>Exam Debrief</div>
          {history.length > 0 && (
            <button onClick={() => setView(view === "history" ? "form" : "history")}
              style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 12px", border: "1px solid var(--rule)", background: "transparent", color: "var(--ink-3)", cursor: "pointer" }}>
              {view === "history" ? "New debrief" : `History (${history.length})`}
            </button>
          )}
        </div>
      </header>

      {/* History view */}
      {view === "history" && (
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "48px 32px 80px" }}>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 700, margin: "0 0 8px", color: "var(--ink)" }}>Your exam history.</h1>
          <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", margin: "0 0 32px", lineHeight: 1.6 }}>
            {history.length >= 3 ? "Pattern detected across your debriefs — review the notes below each exam." : `${3 - history.length} more debrief${3 - history.length !== 1 ? "s" : ""} before pattern analysis unlocks.`}
          </p>
          {history.map(entry => (
            <div key={entry.id} style={{ border: "1px solid var(--rule)", marginBottom: 16, background: "var(--paper-2)" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600, fontStyle: "italic", color: "var(--ink)" }}>{entry.examName}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", marginTop: 3 }}>{formatDate(entry.date)} · {entry.examBoard}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 700, lineHeight: 1, color: entry.scorePercent >= 80 ? "#27ae60" : entry.scorePercent >= 55 ? "#e67e22" : "var(--cinnabar-ink)" }}>{entry.scorePercent}%</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: ANXIETY_COLORS[entry.anxietyLevel], marginTop: 2 }}>{ANXIETY_LABELS[entry.anxietyLevel]}</div>
                </div>
              </div>
              <div style={{ padding: "16px 20px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Immediate focus</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>{entry.result.immediate_focus}</div>
              </div>
            </div>
          ))}
        </main>
      )}

      {/* Result view */}
      {view === "result" && result && (
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 32px 80px" }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Debrief · {form.examName}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 56, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.03em", color: scoreColor }}>{form.scorePercent}%</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>{form.examBoard} · {form.sleepHours}h sleep · {ANXIETY_LABELS[form.anxietyLevel].toLowerCase()}</div>
            </div>
          </div>

          {[
            { label: "Immediate focus", text: result.immediate_focus },
            { label: "Pattern insight", text: result.pattern_note },
            { label: "Sleep impact", text: result.sleep_impact },
            { label: "Next study session", text: result.next_session },
            { label: "Mindset note", text: result.mindset_note },
          ].map(({ label, text }) => (
            <div key={label} style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 10 }}>{label}</div>
              <AIOutput text={text} noBorder />
            </div>
          ))}

          <button className="btn ghost" onClick={newDebrief} style={{ width: "100%", marginTop: 8 }}>Log another exam →</button>
        </main>
      )}

      {/* Form view */}
      {view === "form" && (
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 32px 80px" }}>
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: "var(--ink)", margin: "0 0 10px" }}>
              Debrief every exam.
            </h1>
            <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7, margin: 0 }}>
              Log your score, sleep, and stress level. After 3 exams, the AI detects your personal patterns — what&apos;s actually holding your score back.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Exam name</div>
              <input value={form.examName} onChange={e => setForm(f => ({ ...f, examName: e.target.value }))}
                placeholder="e.g. Physics Unit Test 2"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Score (%)</div>
              <input type="number" min={0} max={100} value={form.scorePercent} onChange={e => setForm(f => ({ ...f, scorePercent: e.target.value }))}
                placeholder="67"
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${scoreNum > 0 ? scoreColor : "var(--rule)"}`, background: "var(--paper)", color: scoreNum > 0 ? scoreColor : "var(--ink)", fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700, boxSizing: "border-box", transition: "border-color 200ms, color 200ms" }} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Board</div>
              <select value={form.examBoard} onChange={e => setForm(f => ({ ...f, examBoard: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 13 }}>
                {BOARDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Topics that destroyed you (optional)</div>
            <textarea value={form.hardTopics} onChange={e => setForm(f => ({ ...f, hardTopics: e.target.value }))}
              rows={3} placeholder="e.g. Electrostatics, Organic mechanisms, Integration by parts..."
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, resize: "vertical", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Sleep last night</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700, color: parseFloat(form.sleepHours) < 6 ? "var(--cinnabar-ink)" : "var(--ink)" }}>{form.sleepHours}h</div>
            </div>
            <input type="range" min={2} max={12} step={0.5} value={form.sleepHours} onChange={e => setForm(f => ({ ...f, sleepHours: e.target.value }))}
              style={{ width: "100%", accentColor: "var(--cinnabar-ink)" }} />
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Anxiety level going in</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setForm(f => ({ ...f, anxietyLevel: n }))}
                  style={{ flex: 1, padding: "10px 0", border: `1px solid ${form.anxietyLevel === n ? ANXIETY_COLORS[n] : "var(--rule)"}`, background: form.anxietyLevel === n ? `${ANXIETY_COLORS[n]}18` : "transparent", color: form.anxietyLevel === n ? ANXIETY_COLORS[n] : "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 160ms ease" }}>
                  {n}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: ANXIETY_COLORS[form.anxietyLevel], marginTop: 6 }}>{ANXIETY_LABELS[form.anxietyLevel]}</div>
          </div>

          {error && <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--cinnabar-ink)", marginBottom: 16, padding: "10px 14px", border: "1px solid var(--cinnabar-ink)" }}>{error}</div>}
          {loading && <AIThinking />}

          <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%" }}>
            {loading ? "Analysing…" : "Generate debrief →"}
          </button>
          <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textAlign: "center", marginTop: 12 }}>Saved locally · Patterns unlock after 3 exams</p>
        </main>
      )}
    </div>
  );
}
