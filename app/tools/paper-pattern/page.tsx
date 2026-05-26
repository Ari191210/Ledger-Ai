"use client";
import { useState } from "react";
import Link from "next/link";
import { callAIOrThrow, AIError } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";
import { AIErrorDisplay } from "@/components/ai-error";

type TopicAnalysis = {
  topic: string;
  frequency: number;
  outOf: number;
  marksWeight: number;
  trend: "rising" | "stable" | "falling";
  likelihood: "very likely" | "likely" | "possible" | "rare";
  keySubtopics: string[];
};

type PredictedQ = { q: string; marks: number; type: string; whyLikely: string };

type PatternData = {
  subject: string;
  board: string;
  analysis: TopicAnalysis[];
  hotTopics: string[];
  examinerObsessions: string[];
  predictedQuestions: PredictedQ[];
  hiddenGems: string[];
  tips: string[];
};

const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "Economics", "History", "Computer Science", "Geography", "English Literature", "Statistics", "Further Mathematics"];
const BOARDS   = ["A-Level (AQA)", "A-Level (Edexcel)", "A-Level (OCR)", "IGCSE (Cambridge)", "IB", "CBSE Class 12", "CBSE Class 11", "JEE Mains", "JEE Advanced", "NEET", "SAT", "GCSE (AQA)", "GCSE (Edexcel)"];
const LEVELS   = ["GCSE", "A-Level", "IB", "CBSE", "JEE", "SAT"];

const LIKELIHOOD_COLOR: Record<string, string> = {
  "very likely": "#2d7a3c",
  "likely":      "#4a8a3c",
  "possible":    "#c97a1a",
  "rare":        "#c44b2a",
};

const TREND_ICON: Record<string, string> = {
  "rising":  "↑",
  "stable":  "→",
  "falling": "↓",
};

const TREND_COLOR: Record<string, string> = {
  "rising":  "#2d7a3c",
  "stable":  "var(--ink-3)",
  "falling": "#c44b2a",
};

export default function PaperPatternPage() {
  const [subject, setSubject] = useState("Mathematics");
  const [board,   setBoard]   = useState("A-Level (Edexcel)");
  const [level,   setLevel]   = useState("A-Level");
  const [topic,   setTopic]   = useState("");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<AIError | string | null>(null);
  const [data,    setData]    = useState<PatternData | null>(null);

  async function analyse() {
    setLoading(true); setError(null); setData(null);
    try {
      const result = await callAIOrThrow<PatternData>({ tool: "paper_pattern", subject, board, level, topic });
      setData(result);
    } catch (err) {
      setError(err instanceof AIError ? err : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Past Paper Pattern Miner</div>
        {data && <button className="btn ghost" onClick={() => setData(null)} style={{ fontSize: 11 }}>New analysis</button>}
      </header>

      {!data && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>10 years of patterns. One analysis.</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 8px" }}>
            Know exactly what&apos;s going to come up.
          </h2>
          <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 32px" }}>
            Ledger analyses 10 years of past papers for your subject and board — showing topic frequency, mark weights, examiner obsessions, and predicted questions for this year.
          </p>

          <div style={{ marginBottom: 16 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUBJECTS.map(s => (
                <button key={s} onClick={() => setSubject(s)}
                  style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: subject === s ? "var(--cinnabar-ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Exam board / qualification</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {BOARDS.map(b => (
                <button key={b} onClick={() => setBoard(b)}
                  style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${board === b ? "var(--ink)" : "var(--rule)"}`, background: board === b ? "var(--ink)" : "var(--paper)", color: board === b ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {LEVELS.map(l => (
                <button key={l} onClick={() => setLevel(l)}
                  style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Focus area <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional — leave blank for full paper analysis)</span></div>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Integration, Organic Chemistry, World War II…"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>

          {error && <div style={{ marginBottom: 14 }}><AIErrorDisplay error={error} onRetry={analyse} inline /></div>}

          <button className="btn" onClick={analyse} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
            {loading ? "Mining patterns…" : "Analyse past papers →"}
          </button>
          {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}

          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      )}

      {data && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ marginBottom: 8 }}>
            <div className="mono cin">{data.subject} · {data.board}</div>
          </div>

          {/* Hot topics banner */}
          {data.hotTopics.length > 0 && (
            <div style={{ padding: "16px 20px", background: "var(--cinnabar-ink)", marginBottom: 32, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div className="mono" style={{ color: "var(--paper)", fontSize: 9 }}>🔥 HOT TOPICS THIS YEAR</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {data.hotTopics.map((t, i) => (
                  <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--paper)", padding: "3px 10px", border: "1px solid rgba(255,255,255,0.4)" }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Topic frequency table */}
          <div className="mono cin" style={{ marginBottom: 16 }}>Topic frequency · Last 10 years</div>
          <div style={{ marginBottom: 36, border: "none" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 80px", borderBottom: "1px solid var(--ink)", padding: "10px 16px", background: "var(--paper-2)" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>TOPIC</div>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", textAlign: "center" }}>FREQUENCY</div>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", textAlign: "center" }}>MARK %</div>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", textAlign: "center" }}>TREND</div>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", textAlign: "center" }}>LIKELIHOOD</div>
            </div>
            {data.analysis.map((t, i) => (
              <div key={i} style={{ borderBottom: i < data.analysis.length - 1 ? "1px solid var(--rule)" : "none" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 80px", padding: "12px 16px", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", marginBottom: 2 }}>{t.topic}</div>
                    <div style={{ width: `${Math.round((t.frequency / t.outOf) * 100)}%`, height: 3, background: LIKELIHOOD_COLOR[t.likelihood] ?? "var(--ink-3)", marginTop: 4, maxWidth: "100%", minWidth: "4px" }} />
                  </div>
                  <div className="mono" style={{ fontSize: 11, textAlign: "center", color: "var(--ink)" }}>
                    {t.frequency}/{t.outOf}
                  </div>
                  <div className="mono" style={{ fontSize: 11, textAlign: "center", color: "var(--ink)" }}>
                    {t.marksWeight}%
                  </div>
                  <div className="mono" style={{ fontSize: 14, textAlign: "center", color: TREND_COLOR[t.trend] ?? "var(--ink-3)" }}>
                    {TREND_ICON[t.trend] ?? "→"}
                  </div>
                  <div className="mono" style={{ fontSize: 9, textAlign: "center", color: LIKELIHOOD_COLOR[t.likelihood] ?? "var(--ink-3)" }}>
                    {t.likelihood.toUpperCase()}
                  </div>
                </div>
                {t.keySubtopics.length > 0 && (
                  <div style={{ padding: "0 16px 10px", paddingLeft: 16 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {t.keySubtopics.map((sub, j) => (
                        <span key={j} style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", padding: "2px 8px", border: "1px solid var(--rule)" }}>{sub}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Predicted questions */}
          <div className="mono cin" style={{ marginBottom: 14 }}>Predicted questions for this year</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 36 }}>
            {data.predictedQuestions.map((pq, i) => (
              <div key={i} style={{ border: "none", borderBottom: i < data.predictedQuestions.length - 1 ? "none" : "1px solid var(--ink)", padding: "16px 20px" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "flex-start" }}>
                  <span className="mono cin" style={{ flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 500, color: "var(--ink)", lineHeight: 1.5, flex: 1 }}>{pq.q}</div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{pq.marks} marks</div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{pq.type}</div>
                  </div>
                </div>
                <div style={{ paddingLeft: 32 }}>
                  <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 2 }}>WHY LIKELY</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{pq.whyLikely}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Examiner obsessions + hidden gems */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }} className="mob-col">
            <div style={{ border: "1px solid var(--rule)", padding: "18px 20px" }}>
              <div className="mono cin" style={{ marginBottom: 12 }}>Examiner obsessions</div>
              {data.examinerObsessions.map((o, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < data.examinerObsessions.length - 1 ? "1px solid var(--rule)" : "none" }}>
                  <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>→</span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{o}</span>
                </div>
              ))}
            </div>
            <div style={{ border: "1px solid var(--rule)", padding: "18px 20px" }}>
              <div className="mono cin" style={{ marginBottom: 12 }}>Hidden gems</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", marginBottom: 10, lineHeight: 1.5 }}>
                Topics most students ignore but this board rewards regularly.
              </div>
              {data.hiddenGems.map((g, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < data.hiddenGems.length - 1 ? "1px solid var(--rule)" : "none" }}>
                  <span className="mono" style={{ color: "#2d7a3c", flexShrink: 0 }}>✦</span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{g}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div style={{ padding: "18px 22px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
            <div className="mono cin" style={{ marginBottom: 12 }}>Exam tips for {data.board}</div>
            {data.tips.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < data.tips.length - 1 ? "1px solid var(--rule)" : "none" }}>
                <span className="mono" style={{ color: "var(--ink-3)", flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      )}
    </div>
  );
}
