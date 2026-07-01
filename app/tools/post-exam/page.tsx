"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import ElasticSlider from "@/components/ui/elastic-slider";
import { callAIOrThrow } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type Tab = "dna" | "debrief" | "strategy";

// ── DNA types ─────────────────────────────────────────────────────────────────

type MistakeEntry = { date: string; subject: string; topic: string; category: string };
const CATEGORIES = ["Conceptual Gap", "Calculation Slip", "Misread Question", "Time Pressure", "Memory Blank"];
const CAT_DESC: Record<string, string> = {
  "Conceptual Gap":   "You didn't understand the underlying idea.",
  "Calculation Slip": "You knew the method but made an arithmetic or formula error.",
  "Misread Question": "You understood the concept but misread what was being asked.",
  "Time Pressure":    "You ran out of time and guessed rather than working it through.",
  "Memory Blank":     "You knew it — but couldn't recall it in the moment.",
};

// ── Debrief types ─────────────────────────────────────────────────────────────

type DebriefResult = { immediate_focus: string; pattern_note: string; sleep_impact: string; next_session: string; mindset_note: string };
type DebriefEntry  = { id: string; date: string; examName: string; scorePercent: number; hardTopics: string; sleepHours: number; anxietyLevel: number; examBoard: string; result: DebriefResult };

const BOARDS = ["CBSE", "ICSE", "IB", "IGCSE", "JEE", "NEET", "A-Level", "SAT", "Other"];
const ANXIETY_LABELS: Record<number, string> = { 1: "Calm", 2: "Mildly anxious", 3: "Nervous", 4: "Very anxious", 5: "Overwhelmed" };
const ANXIETY_COLORS: Record<number, string> = { 1: "var(--sage)", 2: "#5aaf6a", 3: "var(--gold)", 4: "#d45a22", 5: "var(--cinnabar-ink)" };

function formatDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
const LS_KEY = "ledger-exam-debriefs";
function loadHistory(): DebriefEntry[] { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } }
function saveEntry(e: DebriefEntry) { const ex = loadHistory(); localStorage.setItem(LS_KEY, JSON.stringify([e, ...ex].slice(0, 50))); }

// ── Tab: Mistake DNA ──────────────────────────────────────────────────────────

function DNATab() {
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);

  useEffect(() => { try { setMistakes(JSON.parse(localStorage.getItem("ledger-mistakes") || "[]")); } catch {} }, []);

  if (mistakes.length === 0) return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ fontFamily: "var(--serif)", fontSize: 30, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.02em", marginBottom: 12 }}>No mistakes logged yet.</div>
      <div className="mono" style={{ color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 28 }}>
        After each Past Papers session, use the &quot;Tag your mistakes&quot; section. Tap why you got each question wrong — Conceptual, Slip, Misread, Rushed, or Blanked. Your fingerprint builds up here automatically.
      </div>
      <Link href="/tools/exam-practice" className="btn">Go to Past Papers →</Link>
    </div>
  );

  const byCat: Record<string, number> = {};
  CATEGORIES.forEach(c => { byCat[c] = 0; });
  mistakes.forEach(m => { if (byCat[m.category] !== undefined) byCat[m.category]++; });
  const total = mistakes.length;
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const maxCatCount = Math.max(...Object.values(byCat), 1);
  const bySubj: Record<string, number> = {};
  mistakes.forEach(m => { bySubj[m.subject] = (bySubj[m.subject] || 0) + 1; });
  const topSubjects = Object.entries(bySubj).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const byTopic: Record<string, number> = {};
  mistakes.forEach(m => { byTopic[m.topic] = (byTopic[m.topic] || 0) + 1; });
  const topTopics = Object.entries(byTopic).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const recent = mistakes.slice(0, 20);

  return (
    <div>
      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "none", marginBottom: 28 }}>
        <div style={{ padding: "28px 24px", borderRight: "1px solid var(--rule)" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Biggest Leak</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 30, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 10 }}>{topCat[0]}</div>
          <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 10 }}>{Math.round((topCat[1] / total) * 100)}% of mistakes · {topCat[1]} question{topCat[1] !== 1 ? "s" : ""}</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>{CAT_DESC[topCat[0]]}</div>
        </div>
        <div style={{ padding: "28px 24px" }}>
          <div className="mono cin" style={{ marginBottom: 20 }}>Breakdown</div>
          {CATEGORIES.map(cat => (
            <div key={cat} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span className="mono" style={{ fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase" }}>{cat}</span>
                <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{byCat[cat]} · {total > 0 ? Math.round((byCat[cat] / total) * 100) : 0}%</span>
              </div>
              <div style={{ height: 6, background: "var(--paper-2)", border: "1px solid var(--rule)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: "100%", transform: `scaleX(${byCat[cat] / maxCatCount})`, transformOrigin: "left", background: cat === topCat[0] ? "var(--cinnabar)" : "var(--ink)", transition: "transform 600ms ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "none", marginBottom: 28 }}>
        <div style={{ borderRight: "1px solid var(--rule)" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--rule)" }}><div className="mono cin">By Subject</div></div>
          {topSubjects.map(([subj, cnt], i) => (
            <div key={subj} style={{ padding: "12px 20px", borderBottom: i < topSubjects.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--sans)", fontSize: 14 }}>{subj}</span>
              <span className="mono" style={{ color: "var(--cinnabar-ink)" }}>{cnt}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--rule)" }}><div className="mono cin">Recurring Topics</div></div>
          {topTopics.map(([topic, cnt], i) => (
            <div key={topic} style={{ padding: "12px 20px", borderBottom: i < topTopics.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>{topic}</span>
              <span className="mono" style={{ color: "var(--cinnabar-ink)" }}>{cnt}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ border: "none" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="mono cin">Recent Mistakes</div>
          <button onClick={() => { localStorage.removeItem("ledger-mistakes"); setMistakes([]); }} className="mono" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 9 }}>Clear all</button>
        </div>
        {recent.map((m, i) => (
          <div key={i} style={{ padding: "12px 20px", borderBottom: i < recent.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="mono" style={{ color: "var(--cinnabar-ink)", marginRight: 8, fontSize: 9 }}>{m.subject}</span>
              <span style={{ fontFamily: "var(--sans)", fontSize: 13 }}>{m.topic}</span>
            </div>
            <span className="mono" style={{ fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ink-3)", border: "1px solid var(--rule)", padding: "2px 7px", flexShrink: 0 }}>{m.category}</span>
            <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9, flexShrink: 0 }}>{new Date(m.date).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Exam Debrief ─────────────────────────────────────────────────────────

function DebriefTab() {
  const [form, setForm] = useState({ examName: "", scorePercent: "", hardTopics: "", sleepHours: "7", anxietyLevel: 3, examBoard: "CBSE" });
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<DebriefResult | null>(null);
  const [history, setHistory] = useState<DebriefEntry[]>([]);
  const [error, setError]     = useState("");
  const [view, setView]       = useState<"form" | "result" | "history">("form");

  useEffect(() => { setHistory(loadHistory()); }, []);

  async function generate() {
    if (!form.examName.trim() || !form.scorePercent) { setError("Add the exam name and your score first."); return; }
    setLoading(true); setError("");
    try {
      const res = await callAIOrThrow<DebriefResult>({ tool: "exam_debrief", examName: form.examName, scorePercent: parseFloat(form.scorePercent), hardTopics: form.hardTopics, sleepHours: parseFloat(form.sleepHours), anxietyLevel: form.anxietyLevel, examBoard: form.examBoard });
      if (!res?.immediate_focus) { setError("Could not generate debrief. Try again."); return; }
      setResult(res);
      const entry: DebriefEntry = { id: Date.now().toString(), date: new Date().toISOString(), examName: form.examName, scorePercent: parseFloat(form.scorePercent), hardTopics: form.hardTopics, sleepHours: parseFloat(form.sleepHours), anxietyLevel: form.anxietyLevel, examBoard: form.examBoard, result: res };
      saveEntry(entry); setHistory(loadHistory()); setView("result");
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  const scoreNum = parseFloat(form.scorePercent) || 0;
  const scoreColor = scoreNum >= 80 ? "var(--sage)" : scoreNum >= 55 ? "var(--gold)" : "var(--cinnabar-ink)";

  if (view === "history") return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 700, color: "var(--ink)" }}>Exam history</div>
        <button onClick={() => setView("form")} className="mono" style={{ background: "none", border: "1px solid var(--rule)", padding: "5px 12px", color: "var(--ink-3)", cursor: "pointer", fontSize: 10 }}>New debrief</button>
      </div>
      <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", margin: "0 0 24px", lineHeight: 1.6 }}>
        {history.length >= 3 ? "Pattern detected — review the AI notes below each exam." : `${3 - history.length} more debrief${3 - history.length !== 1 ? "s" : ""} before pattern analysis unlocks.`}
      </p>
      {history.map(entry => (
        <div key={entry.id} style={{ border: "1px solid var(--rule)", marginBottom: 14, background: "var(--paper-2)" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600, fontStyle: "italic", color: "var(--ink)" }}>{entry.examName}</div>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 3 }}>{formatDate(entry.date)} · {entry.examBoard}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 700, lineHeight: 1, color: entry.scorePercent >= 80 ? "var(--sage)" : entry.scorePercent >= 55 ? "var(--gold)" : "var(--cinnabar-ink)" }}>{entry.scorePercent}%</div>
              <div className="mono" style={{ fontSize: 9, color: ANXIETY_COLORS[entry.anxietyLevel], marginTop: 2 }}>{ANXIETY_LABELS[entry.anxietyLevel]}</div>
            </div>
          </div>
          <div style={{ padding: "14px 20px" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Immediate focus</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>{entry.result.immediate_focus}</div>
          </div>
        </div>
      ))}
    </div>
  );

  if (view === "result" && result) return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Debrief · {form.examName}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 52, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.03em", color: scoreColor }}>{form.scorePercent}%</div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{form.examBoard} · {form.sleepHours}h sleep · {ANXIETY_LABELS[form.anxietyLevel].toLowerCase()}</div>
        </div>
      </div>
      {[["Immediate Focus", result.immediate_focus], ["Pattern Note", result.pattern_note], ["Sleep Impact", result.sleep_impact], ["Next Session", result.next_session]].map(([label, text]) => (
        <div key={label} style={{ borderTop: "1px solid var(--rule)", paddingTop: 20, marginBottom: 20 }}>
          <div className="mono cin" style={{ marginBottom: 10 }}>{label}</div>
          <AIOutput text={text} />
        </div>
      ))}
      <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 20, marginBottom: 28 }}>
        <div className="mono cin" style={{ marginBottom: 10 }}>Mindset</div>
        <AIOutput text={result.mindset_note} variant="principle" />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn" onClick={() => { setResult(null); setForm({ examName: "", scorePercent: "", hardTopics: "", sleepHours: "7", anxietyLevel: 3, examBoard: "CBSE" }); setView("form"); }}>New debrief</button>
        {history.length > 0 && <button className="btn ghost" onClick={() => setView("history")}>View history ({history.length})</button>}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Exam name</div>
          <input value={form.examName} onChange={e => setForm(f => ({ ...f, examName: e.target.value }))} placeholder="e.g. CBSE Physics Paper 1"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Exam Board</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {BOARDS.map(b => <button key={b} onClick={() => setForm(f => ({ ...f, examBoard: b }))} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${form.examBoard === b ? "var(--ink)" : "var(--rule)"}`, background: form.examBoard === b ? "var(--ink)" : "var(--paper)", color: form.examBoard === b ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{b}</button>)}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Score (%)</div>
        <input type="number" min={0} max={100} value={form.scorePercent} onChange={e => setForm(f => ({ ...f, scorePercent: e.target.value }))} placeholder="e.g. 74"
          style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 22, border: "none", background: "var(--paper)", padding: "10px 12px", color: scoreNum > 0 ? scoreColor : "var(--ink)", boxSizing: "border-box" }} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Hard topics / what tripped you up</div>
        <textarea value={form.hardTopics} onChange={e => setForm(f => ({ ...f, hardTopics: e.target.value }))} rows={3}
          placeholder="e.g. Electrochemistry, probability questions, reading comprehension…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Sleep the night before</div>
          <ElasticSlider defaultValue={parseFloat(form.sleepHours)} startingValue={3} maxValue={10} isStepped stepSize={0.5} onChange={(v) => setForm(f => ({ ...f, sleepHours: String(v) }))} />
        </div>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Anxiety level</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setForm(f => ({ ...f, anxietyLevel: n }))}
                style={{ width: 36, height: 36, border: `1px solid ${form.anxietyLevel === n ? ANXIETY_COLORS[n] : "var(--rule)"}`, background: form.anxietyLevel === n ? ANXIETY_COLORS[n] : "transparent", color: form.anxietyLevel === n ? "#fff" : "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {n}
              </button>
            ))}
          </div>
          <div className="mono" style={{ fontSize: 9, color: ANXIETY_COLORS[form.anxietyLevel], marginTop: 6 }}>{ANXIETY_LABELS[form.anxietyLevel]}</div>
        </div>
      </div>

      {error && <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 12, fontSize: 12 }}>{error}</div>}
      {loading && <AIThinking />}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn" onClick={generate} disabled={loading} style={{ flex: 1 }}>{loading ? "Debriefing…" : "Generate debrief →"}</button>
        {history.length > 0 && <button className="btn ghost" onClick={() => setView("history")} style={{ flexShrink: 0 }}>History ({history.length})</button>}
      </div>
    </div>
  );
}

// ── Tab: Exam Strategy ────────────────────────────────────────────────────────

type Strategy = { subject: string; duration: number; sections: { name: string; timeAllocation: string; approach: string; pitfalls: string[] }[]; timeManagement: string; nerveControl: string[]; lastMinuteTips: string[]; examDayChecklist: string[]; examTip: string };

function ExamStrategyTab() {
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
      const data = await callAIOrThrow<Strategy>({ tool: "exam_strategy", subject, duration, format, concerns });
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (result) return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Strategy · {result.subject}</div>
        <button className="btn ghost" onClick={() => setResult(null)}>New strategy</button>
      </div>
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
      <div style={{ border: "none", padding: "16px 20px", marginBottom: 12 }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Time Management</div>
        <AIOutput text={result.timeManagement} />
      </div>
      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ border: "1px solid var(--sage)", padding: "14px 16px" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--sage)", marginBottom: 8 }}>NERVE CONTROL</div>
          {result.nerveControl.map((n, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 5 }}>· {n}</div>)}
        </div>
        <div style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 8 }}>LAST-MINUTE TIPS</div>
          {result.lastMinuteTips.map((t, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 5 }}>· {t}</div>)}
        </div>
      </div>
      <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>EXAM DAY CHECKLIST</div>
        {result.examDayChecklist.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
            <span style={{ width: 14, height: 14, border: "1px solid var(--rule)", display: "inline-block", flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontFamily: "var(--sans)", fontSize: 13 }}>{c}</span>
          </div>
        ))}
      </div>
      <div style={{ border: "1px solid var(--ink-2)", padding: "14px 16px", background: "color-mix(in oklch, var(--ink-2) 4%, transparent)" }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-2)", marginBottom: 6 }}>KEY REMINDER</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.examTip}</div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Walk in with a plan.</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Personalised exam-day strategy for any paper.</h2>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. A-Level History Paper 2, JEE Maths…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Duration: {duration} minutes</div>
        <ElasticSlider defaultValue={duration} startingValue={30} maxValue={360} isStepped stepSize={15} onChange={setDuration} />
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
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PostExamPage() {
  const [tab, setTab] = useState<Tab>("dna");

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Post-Exam Analysis</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Understand what went wrong. Correct it next time.</div>
        </div>
        <div style={{ display: "flex", gap: 8, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "6px", overflowX: "auto" as const }}>
          {([["dna", "Mistake DNA"], ["debrief", "Exam Debrief"], ["strategy", "Exam Strategy"]] as [Tab, string][]).map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 18px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em" }}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "dna"      && <DNATab />}
        {tab === "debrief"  && <DebriefTab />}
        {tab === "strategy" && <ExamStrategyTab />}

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
