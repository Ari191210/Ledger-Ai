"use client";
import { useState } from "react";
import Link from "next/link";
import { callAIOrThrow, AIError } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";
import { AIErrorDisplay } from "@/components/ai-error";

type CQQuestion = { q: string; options: string[]; answer: number; subtopic: string; difficulty: "easy" | "medium" | "hard" };
type CalibData  = { questions: CQQuestion[] };
type Phase      = "setup" | "quiz" | "result";

const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Statistics", "History", "Geography", "Computer Science", "Further Maths"];
const LEVELS   = ["GCSE", "IGCSE", "A-Level", "IB", "CBSE Class 11", "CBSE Class 12", "JEE", "SAT"];
const CONF_LABELS = ["Clueless", "Uncertain", "Maybe", "Fairly sure", "Certain"];
const CONF_VALUES = [0, 0.25, 0.5, 0.75, 1.0];
const CONF_COLORS = ["#c44b2a", "#c97a1a", "#9a8a00", "#4a8a3c", "#2d7a3c"];

export default function CalibrationPage() {
  const [subject,  setSubject]  = useState("Mathematics");
  const [topic,    setTopic]    = useState("");
  const [level,    setLevel]    = useState("A-Level");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<AIError | string | null>(null);
  const [phase,    setPhase]    = useState<Phase>("setup");

  const [questions,    setQuestions]    = useState<CQQuestion[]>([]);
  const [current,      setCurrent]      = useState(0);
  const [confidences,  setConfidences]  = useState<number[]>([]);
  const [answers,      setAnswers]      = useState<(number | null)[]>([]);
  const [confStage,    setConfStage]    = useState<"rating" | "answering">("rating");
  const [selectedConf, setSelectedConf] = useState<number | null>(null);

  async function generate() {
    if (!subject) return;
    setLoading(true); setError(null);
    try {
      const data = await callAIOrThrow<CalibData>({ tool: "calibration_questions", subject, topic, level });
      if (!data.questions?.length) { setError("No questions generated — try again."); return; }
      setQuestions(data.questions);
      setConfidences(new Array(data.questions.length).fill(-1));
      setAnswers(new Array(data.questions.length).fill(null));
      setCurrent(0); setConfStage("rating"); setSelectedConf(null);
      setPhase("quiz");
    } catch (err) {
      setError(err instanceof AIError ? err : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function confirmConfidence() {
    if (selectedConf === null) return;
    const newConfs = [...confidences];
    newConfs[current] = selectedConf;
    setConfidences(newConfs);
    setConfStage("answering");
  }

  function selectAnswer(oi: number) {
    const newAns = [...answers];
    newAns[current] = oi;
    setAnswers(newAns);
    setTimeout(() => {
      if (current < questions.length - 1) {
        setCurrent(c => c + 1);
        setConfStage("rating");
        setSelectedConf(null);
      } else {
        setPhase("result");
      }
    }, 600);
  }

  // ── Result calculations ──
  const total      = questions.length;
  const score      = answers.filter((a, i) => a === questions[i]?.answer).length;
  const pct        = total > 0 ? Math.round((score / total) * 100) : 0;

  type TopicCal = { subtopic: string; asked: number; correct: number; avgConf: number; calibration: "overconfident" | "underconfident" | "calibrated" | "accurate" };

  const topicMap: Record<string, { asked: number; correct: number; confSum: number }> = {};
  questions.forEach((q, i) => {
    if (!topicMap[q.subtopic]) topicMap[q.subtopic] = { asked: 0, correct: 0, confSum: 0 };
    topicMap[q.subtopic].asked++;
    topicMap[q.subtopic].confSum += confidences[i] ?? 0;
    if (answers[i] === q.answer) topicMap[q.subtopic].correct++;
  });

  const topicResults: TopicCal[] = Object.entries(topicMap).map(([subtopic, d]) => {
    const avgConf   = d.confSum / d.asked;
    const actualPct = d.correct / d.asked;
    const diff      = avgConf - actualPct;
    const calibration: TopicCal["calibration"] =
      diff > 0.3 ? "overconfident" :
      diff < -0.3 ? "underconfident" :
      actualPct > 0.7 ? "accurate" : "calibrated";
    return { subtopic, asked: d.asked, correct: d.correct, avgConf, calibration };
  });

  const calibrationScore = (() => {
    const diffs = questions.map((q, i) => {
      const actual = answers[i] === q.answer ? 1 : 0;
      const conf   = confidences[i] ?? 0;
      return Math.abs(conf - actual);
    });
    const avgError = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    return Math.round((1 - avgError) * 100);
  })();

  const calColor = calibrationScore >= 75 ? "#2d7a3c" : calibrationScore >= 50 ? "#c97a1a" : "#c44b2a";
  const calLabel = calibrationScore >= 75 ? "Well-calibrated" : calibrationScore >= 50 ? "Partially calibrated" : "Poorly calibrated";

  const q = questions[current];

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Confidence Calibration</div>
        {phase === "quiz" && (
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>
            Q {current + 1}/{total} · {confStage === "rating" ? "Rate your confidence first" : "Now answer"}
          </div>
        )}
        {phase === "result" && (
          <button className="btn ghost" onClick={() => setPhase("setup")} style={{ fontSize: 11 }}>New session</button>
        )}
      </header>

      {/* ── Setup ── */}
      {phase === "setup" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Know what you know</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 8px" }}>
            Rate your confidence before each answer.
          </h2>
          <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 32px" }}>
            A* students know exactly what they don't know. This tool reveals your blind spots — topics you think you know but don't, and topics you're underestimating.
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
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic or chapter</div>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Integration, Organic Chemistry, World War II…"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 28 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {LEVELS.map(l => (
                <button key={l} onClick={() => setLevel(l)}
                  style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {error && <div style={{ marginBottom: 14 }}><AIErrorDisplay error={error} onRetry={generate} inline /></div>}

          <button className="btn" onClick={generate} disabled={loading || !subject} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
            {loading ? "Generating questions…" : "Start calibration →"}
          </button>
          {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}

          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      )}

      {/* ── Quiz ── */}
      {phase === "quiz" && q && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 680, margin: "0 auto" }}>
          {/* Progress */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {questions.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, background: i < current ? "#2d7a3c" : i === current ? "var(--ink)" : "var(--rule)" }} />
              ))}
            </div>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{subject} · {topic || "General"} · {level}</div>
          </div>

          <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 500, lineHeight: 1.55, marginBottom: 28 }}>{q.q}</div>

          {/* Confidence rating */}
          {confStage === "rating" && (
            <>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 12, letterSpacing: "0.06em" }}>HOW CONFIDENT ARE YOU? (before answering)</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                {CONF_LABELS.map((label, ci) => (
                  <button key={ci} onClick={() => setSelectedConf(ci)}
                    style={{ flex: 1, minWidth: 80, padding: "10px 8px", fontFamily: "var(--mono)", fontSize: 10, border: `2px solid ${selectedConf === ci ? CONF_COLORS[ci] : "var(--rule)"}`, background: selectedConf === ci ? `${CONF_COLORS[ci]}18` : "var(--paper)", color: selectedConf === ci ? CONF_COLORS[ci] : "var(--ink-3)", cursor: "pointer", textAlign: "center" }}>
                    {label}
                    <div style={{ fontSize: 8, marginTop: 2, opacity: 0.7 }}>{Math.round(CONF_VALUES[ci] * 100)}%</div>
                  </button>
                ))}
              </div>
              <button className="btn" onClick={confirmConfidence} disabled={selectedConf === null} style={{ width: "100%", opacity: selectedConf === null ? 0.4 : 1 }}>
                Lock in confidence →
              </button>
            </>
          )}

          {/* Answer selection */}
          {confStage === "answering" && (
            <>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 12, letterSpacing: "0.06em" }}>
                CONFIDENCE: <span style={{ color: selectedConf !== null ? CONF_COLORS[confidences[current] !== -1 ? Math.round(confidences[current] * 4) : 0] : "var(--ink-3)" }}>
                  {confidences[current] !== -1 ? CONF_LABELS[Math.round(confidences[current] * 4)] : "–"}
                </span> · NOW PICK YOUR ANSWER
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {q.options.map((opt, oi) => (
                  <button key={oi} onClick={() => selectAnswer(oi)}
                    style={{ padding: "14px 18px", border: "2px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.4, display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span className="mono" style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{String.fromCharCode(65 + oi)}.</span>
                    {opt}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mono" style={{ marginTop: 24, fontSize: 9, color: "var(--ink-3)", textAlign: "center" }}>
            {q.difficulty} · {q.subtopic}
          </div>
        </main>
      )}

      {/* ── Result ── */}
      {phase === "result" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>
          {/* Summary banner */}
          <div style={{ display: "flex", gap: 24, marginBottom: 36, padding: "28px 32px", border: "2px solid var(--ink)" }} className="mob-col">
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 56, fontWeight: 700, color: calColor, lineHeight: 1 }}>{calibrationScore}%</div>
              <div className="mono" style={{ color: calColor, fontSize: 9, marginTop: 4 }}>{calLabel}</div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
              <div style={{ background: "var(--paper-2)", height: 10, overflow: "hidden" }}>
                <div style={{ width: `${calibrationScore}%`, height: "100%", background: calColor }} />
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
                {pct}% correct ({score}/{total}) · Your confidence matched your actual knowledge {calibrationScore}% of the time.
                {calibrationScore < 60 && " You're significantly over- or under-estimating your knowledge — the breakdown below shows where."}
              </div>
            </div>
          </div>

          {/* Topic breakdown */}
          <div className="mono cin" style={{ marginBottom: 16 }}>Topic calibration breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 36 }}>
            {topicResults.map((t, i) => {
              const tc = t.calibration === "overconfident" ? "#c44b2a" : t.calibration === "underconfident" ? "#1a6091" : "#2d7a3c";
              const tl = t.calibration === "overconfident" ? "⚠ Overconfident" : t.calibration === "underconfident" ? "↑ Underconfident" : t.calibration === "accurate" ? "✓ Accurate" : "≈ Calibrated";
              return (
                <div key={i} style={{ border: "1px solid var(--ink)", borderBottom: i < topicResults.length - 1 ? "none" : "1px solid var(--ink)", padding: "14px 18px", display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{t.subtopic}</div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>
                      Avg confidence: {Math.round(t.avgConf * 100)}% · Actual: {Math.round((t.correct / t.asked) * 100)}% · {t.correct}/{t.asked} correct
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: 10, color: tc, flexShrink: 0 }}>{tl}</span>
                </div>
              );
            })}
          </div>

          {/* Per-question review */}
          <div className="mono cin" style={{ marginBottom: 16 }}>Question-by-question</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {questions.map((q, i) => {
              const userAns = answers[i];
              const correct = userAns === q.answer;
              const conf    = confidences[i];
              const confIdx = Math.round(conf * 4);
              const mismatch = (correct && conf < 0.5) || (!correct && conf >= 0.75);
              return (
                <div key={i} style={{ border: "1px solid var(--ink)", borderBottom: i < total - 1 ? "none" : "1px solid var(--ink)", padding: "14px 18px" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                    <span className="mono" style={{ fontSize: 10, color: correct ? "#2d7a3c" : "#c44b2a", flexShrink: 0, fontWeight: 700 }}>{correct ? "✓" : "✗"} Q{i + 1}</span>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, flex: 1 }}>{q.q}</div>
                    {mismatch && <span className="mono" style={{ fontSize: 9, color: "#c97a1a", flexShrink: 0 }}>⚠ MISMATCH</span>}
                  </div>
                  <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", paddingLeft: 26 }}>
                    Confidence: <span style={{ color: conf >= 0 ? CONF_COLORS[confIdx] : "var(--ink-3)" }}>{conf >= 0 ? CONF_LABELS[confIdx] : "–"}</span>
                    {" · "}Correct: {q.options[q.answer]}
                    {userAns !== null && userAns !== q.answer && ` · You chose: ${q.options[userAns]}`}
                  </div>
                </div>
              );
            })}
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
