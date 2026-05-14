"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";

type Tab = "halflife" | "predict";

// ── Half-Life types ───────────────────────────────────────────────────────────

type DecayStatus = "fresh" | "aging" | "critical";
type DecayEntry  = { chapter: string; weeks_since: number; original_mastery: number; current_recall_pct: number; status: DecayStatus };
type ReviveDay   = { day: number; chapter: string; method: string; time_budget: string };
type HalfLifeResult = { decay_table: DecayEntry[]; critical_chapters: string[]; revive_sequence: ReviveDay[] };

const STATUS_COLOR: Record<DecayStatus, string> = { fresh: "var(--ink)", aging: "var(--ink-2)", critical: "var(--cinnabar-ink)" };
const STATUS_LABEL: Record<DecayStatus, string> = { fresh: "Fresh", aging: "Aging", critical: "Critical" };
const HL_LS_KEY = "ledger-half-life-history";
const PLACEHOLDER = `Rotational Motion | 14 | 4\nThermodynamics | 8 | 3\nElectrochemistry | 20 | 2\nOrganic: Aldehydes | 3 | 5\nCalculus: Integration | 6 | 4`;
const EXAM_OPTIONS = ["JEE", "NEET", "CBSE", "IB", "IGCSE", "A-Level", "SAT"];

// ── Predict types ─────────────────────────────────────────────────────────────

type Prediction = { topic: string; level: string; questions: { q: string; marks: number; type: string; why: string }[]; hotTopics: string[]; commandWords: string[]; examTip: string };
const LEVELS = ["GCSE", "IGCSE", "A-Level", "IB", "CBSE", "JEE", "NEET"];

// ── Tab: Topic Half-Life ──────────────────────────────────────────────────────

function HalfLifeTab() {
  const [chaptersLog, setChaptersLog] = useState("");
  const [exam,        setExam]        = useState("JEE");
  const [subject,     setSubject]     = useState("");
  const [result,      setResult]      = useState<HalfLifeResult | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HL_LS_KEY);
      if (saved) {
        const { result: r, inputs } = JSON.parse(saved);
        setResult(r); setChaptersLog(inputs.chaptersLog ?? ""); setExam(inputs.exam ?? "JEE"); setSubject(inputs.subject ?? "");
      }
    } catch {}
  }, []);

  async function generate() {
    if (!chaptersLog.trim() || !subject.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res  = await callAI({ tool: "topic_half_life", chaptersLog: chaptersLog.trim(), exam, subject: subject.trim() });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setResult(data);
      localStorage.setItem(HL_LS_KEY, JSON.stringify({ result: data, inputs: { chaptersLog, exam, subject } }));
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="mob-col" style={{ display: "grid", gridTemplateColumns: result || loading ? "380px 1fr" : "1fr", gap: 48, alignItems: "start" }}>
      <div>
        <div className="mono cin" style={{ marginBottom: 8 }}>01 · Chapter log</div>
        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 10, lineHeight: 1.7 }}>
          One chapter per line. Format:<br />
          <span style={{ color: "var(--ink-2)" }}>Chapter name | weeks ago | mastery 1–5</span>
        </div>
        <textarea value={chaptersLog} onChange={e => setChaptersLog(e.target.value)} placeholder={PLACEHOLDER} rows={10}
          style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.75, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "14px 16px", color: "var(--ink)", outline: "none", resize: "vertical" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16, marginBottom: 16 }}>
          <div>
            <div className="mono cin" style={{ marginBottom: 8, fontSize: 9 }}>02 · Exam</div>
            <select value={exam} onChange={e => setExam(e.target.value)}
              style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "10px 12px", color: "var(--ink)", outline: "none" }}>
              {EXAM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div className="mono cin" style={{ marginBottom: 8, fontSize: 9 }}>03 · Subject</div>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Physics, Chemistry…"
              style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "10px 12px", color: "var(--ink)", outline: "none" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={generate} disabled={loading || !chaptersLog.trim() || !subject.trim()}
            style={{ opacity: loading || !chaptersLog.trim() || !subject.trim() ? 0.5 : 1 }}>
            {loading ? "Modeling decay…" : "Run decay model →"}
          </button>
          {result && <button className="btn ghost" onClick={() => setResult(null)}>Clear</button>}
        </div>
        {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}

        <div style={{ marginTop: 24, borderTop: "1px solid var(--rule)", paddingTop: 16 }}>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 10 }}>Mastery scale</div>
          {[["1","Barely covered"],["2","Read once, no practice"],["3","Did some problems, understood basics"],["4","Solid — could explain it"],["5","Expert — solved complex problems"]].map(([n, l]) => (
            <div key={n} style={{ display: "flex", gap: 10, marginBottom: 5, alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15, fontWeight: 500, color: "var(--cinnabar-ink)", flexShrink: 0, width: 14 }}>{n}</span>
              <span style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {loading && !result && (
        <div style={{ paddingTop: 40 }}>
          <AIThinking />
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 16 }}>Applying Ebbinghaus forgetting curve…</div>
        </div>
      )}

      {result && (
        <div>
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--ink)", paddingBottom: 12, marginBottom: 0 }}>
              <div className="mono cin">Decay Map</div>
              <div style={{ display: "flex", gap: 16 }}>
                {(["critical", "aging", "fresh"] as DecayStatus[]).map(s => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, background: STATUS_COLOR[s] }} />
                    <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>{STATUS_LABEL[s]}</span>
                  </div>
                ))}
              </div>
            </div>
            {result.decay_table.map((entry, i) => {
              const pct    = Math.max(0, Math.min(100, entry.current_recall_pct));
              const color  = STATUS_COLOR[entry.status];
              const isCrit = entry.status === "critical";
              return (
                <div key={i} style={{ borderBottom: "1px solid var(--rule)", padding: "14px 0", background: isCrit ? "color-mix(in srgb, var(--cinnabar-ink) 4%, var(--paper))" : "transparent", paddingLeft: isCrit ? 12 : 0, paddingRight: isCrit ? 12 : 0, marginLeft: isCrit ? -12 : 0, marginRight: isCrit ? -12 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 12 }}>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)", flex: 1, minWidth: 0 }}>{entry.chapter}</span>
                    <div style={{ display: "flex", gap: 16, alignItems: "baseline", flexShrink: 0 }}>
                      <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{entry.weeks_since}w ago · m{entry.original_mastery}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 600, color, minWidth: 38, textAlign: "right" }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: 4, background: "var(--rule)", position: "relative" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color, transition: "width 0.6s ease", opacity: entry.status === "fresh" ? 0.5 : 1 }} />
                    <div style={{ position: "absolute", left: "40%", top: -3, bottom: -3, width: 1, background: "var(--cinnabar-ink)", opacity: 0.4 }} />
                  </div>
                </div>
              );
            })}
            <div style={{ position: "relative", height: 20, marginTop: 4 }}>
              <div className="mono" style={{ position: "absolute", left: "calc(40% - 28px)", fontSize: 8, color: "var(--cinnabar-ink)", opacity: 0.6 }}>40% threshold</div>
            </div>
          </div>

          {result.critical_chapters.length > 0 && (
            <div style={{ border: "1px solid var(--cinnabar-ink)", padding: "16px 20px", marginBottom: 28, background: "color-mix(in srgb, var(--cinnabar-ink) 6%, var(--paper))" }}>
              <div className="mono cin" style={{ marginBottom: 10 }}>Critical — below 40% recall</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.critical_chapters.map((ch, i) => (
                  <span key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, color: "var(--cinnabar-ink)", padding: "4px 10px", border: "1px solid var(--cinnabar-ink)" }}>{ch}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 10, marginBottom: 0 }}>
              <div className="mono cin">7-Day Revive Sequence</div>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 4 }}>Quick-revive methods only — not full re-study</div>
            </div>
            {result.revive_sequence.map((day, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "36px 1fr auto", alignItems: "start", gap: 16, borderBottom: i < result.revive_sequence.length - 1 ? "1px solid var(--rule)" : "none", padding: "14px 0" }}>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, fontWeight: 400, color: "var(--cinnabar-ink)", lineHeight: 1, paddingTop: 2 }}>D{day.day}</div>
                <div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{day.chapter}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{day.method}</div>
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)", flexShrink: 0, textAlign: "right" }}>{day.time_budget}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Question Predictor ───────────────────────────────────────────────────

function PredictTab() {
  const [topic,   setTopic]   = useState("");
  const [subject, setSubject] = useState("");
  const [level,   setLevel]   = useState("A-Level");
  const [result,  setResult]  = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function generate() {
    if (!topic.trim()) { setError("Enter a topic or chapter."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "predict", topic, subject, level });
      const data = await res.json();
      if (!res.ok || !data.questions) { setError(data.error || "Could not generate predictions."); return; }
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (result) return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Predictions for: {result.topic}</div>
        <button className="btn ghost" onClick={() => setResult(null)}>New prediction</button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8, letterSpacing: "0.08em" }}>HOT TOPICS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {result.hotTopics.map((t, i) => <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 10px", border: "1px solid var(--cinnabar-ink)", color: "var(--cinnabar-ink)" }}>{t}</span>)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {result.questions.map((q, i) => (
          <div key={i} style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="mono cin" style={{ fontSize: 9 }}>Q{i + 1} · {q.type}</span>
              <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>[{q.marks} marks]</span>
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>{q.q}</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
              <span style={{ color: "#2d7a3c", fontFamily: "var(--mono)", fontSize: 9 }}>WHY LIKELY · </span>{q.why}
            </div>
          </div>
        ))}
      </div>
      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>KEY COMMAND WORDS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.commandWords.map((w, i) => <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", border: "1px solid var(--rule)" }}>{w}</span>)}
          </div>
        </div>
        <div style={{ border: "1px solid var(--slate)", padding: "14px 16px", background: "var(--slate-bg)" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--slate)", marginBottom: 8 }}>EXAM TIP</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.examTip}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="mono cin" style={{ marginBottom: 6 }}>What will the examiner ask?</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 500, fontStyle: "italic", margin: "0 0 24px" }}>Predict likely exam questions from any topic or chapter.</h2>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic or chapter <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. The Cold War, Organic Chemistry, Calculus…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject (optional)</div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. History, Chemistry…"
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
        {loading ? "Predicting questions…" : "Predict exam questions →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RevisionIntelPage() {
  const [tab, setTab] = useState<Tab>("halflife");

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Revision Intelligence</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Know what's decaying and what the examiner will ask.</div>
        </div>
        <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)" }}>
          {([["halflife", "Topic Half-Life"], ["predict", "Question Predictor"]] as [Tab, string][]).map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 18px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRight: i === 0 ? "1px solid var(--ink)" : "none", cursor: "pointer", letterSpacing: "0.05em" }}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "halflife" && <HalfLifeTab />}
        {tab === "predict"  && <PredictTab />}

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
