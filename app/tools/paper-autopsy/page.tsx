"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { callAIOrThrow } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExamBoard = "JEE" | "NEET" | "CBSE" | "CUET" | "Other";
type Subject = "Physics" | "Chemistry" | "Mathematics" | "Biology" | "English" | "Other";

interface QuestionEntry {
  id: string;
  questionNumber: string;
  yourAnswer: string;
  correctAnswer: string;
  marksLost: string;
  topic: string;
}

interface ErrorType {
  type: string;
  mark_loss: number;
  percentage: number;
  description: string;
}

interface SubtopicEntry {
  subtopic: string;
  chapter: string;
  marks_lost: number;
  error_pattern: string;
}

interface PaperAutopsyResult {
  error_types: ErrorType[];
  subtopic_map: SubtopicEntry[];
  top_priority: string;
  repeat_mistakes: string[];
  practice_prompts: string[];
  verdict: string;
}

interface HistoryEntry {
  id: string;
  date: string;
  subject: Subject;
  examBoard: ExamBoard;
  totalMarksLost: number;
  result: PaperAutopsyResult;
}

type Step = 1 | 2 | 3;

// ─── Sparkline Component ──────────────────────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - ((v - min) / range) * height;
        return (
          <circle key={i} cx={x} cy={y} r="2" fill={color} />
        );
      })}
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaperAutopsyPage() {
  const [step, setStep] = useState<Step>(1);
  const [subject, setSubject] = useState<Subject>("Chemistry");
  const [examBoard, setExamBoard] = useState<ExamBoard>("JEE");
  const [totalMarks, setTotalMarks] = useState<string>("100");
  const [marksObtained, setMarksObtained] = useState<string>("67");
  const [rawDump, setRawDump] = useState<string>("");
  const [useRawMode, setUseRawMode] = useState<boolean>(false);
  const [questions, setQuestions] = useState<QuestionEntry[]>([
    { id: "1", questionNumber: "1", yourAnswer: "", correctAnswer: "", marksLost: "", topic: "" },
  ]);
  const [result, setResult] = useState<PaperAutopsyResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("paper_autopsy_history");
      if (stored) {
        setHistory(JSON.parse(stored) as HistoryEntry[]);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveToHistory = (res: PaperAutopsyResult) => {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      subject,
      examBoard,
      totalMarksLost: res.error_types.reduce((s, e) => s + e.mark_loss, 0),
      result: res,
    };
    const updated = [entry, ...history].slice(0, 20);
    setHistory(updated);
    try {
      localStorage.setItem("paper_autopsy_history", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        questionNumber: String(prev.length + 1),
        yourAnswer: "",
        correctAnswer: "",
        marksLost: "",
        topic: "",
      },
    ]);
  };

  const updateQuestion = (id: string, field: keyof QuestionEntry, value: string) => {
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleAnalyse = async () => {
    setLoading(true);
    setError(null);
    setStep(2);

    try {
      let inputPayload: Record<string, unknown>;

      if (useRawMode) {
        inputPayload = {
          mode: "raw_dump",
          raw_text: rawDump,
          subject,
          exam_board: examBoard,
          total_marks: totalMarks,
          marks_obtained: marksObtained,
        };
      } else {
        inputPayload = {
          mode: "structured",
          questions: questions.filter(q => q.marksLost && parseFloat(q.marksLost) > 0),
          subject,
          exam_board: examBoard,
          total_marks: totalMarks,
          marks_obtained: marksObtained,
        };
      }

      const res = await callAIOrThrow<PaperAutopsyResult>({ tool: "paper_autopsy", ...inputPayload });
      setResult(res);
      saveToHistory(res);
      setStep(3);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setResult(null);
    setError(null);
    setQuestions([
      { id: "1", questionNumber: "1", yourAnswer: "", correctAnswer: "", marksLost: "", topic: "" },
    ]);
    setRawDump("");
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt).catch(() => {});
  };

  // Compute sparkline data per error type from history
  const getSparklineData = (errorType: string): number[] => {
    return history
      .slice()
      .reverse()
      .map(h => {
        const found = h.result.error_types.find(e => e.type === errorType);
        return found ? found.mark_loss : 0;
      });
  };

  // ─── Styles ──────────────────────────────────────────────────────────────────

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: "var(--paper)",
    color: "var(--ink)",
    fontFamily: "var(--sans)",
  };

  const headerStyle: React.CSSProperties = {
    borderBottom: "1px solid var(--rule)",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    backgroundColor: "var(--paper)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  };

  const backLinkStyle: React.CSSProperties = {
    color: "var(--ink-3)",
    textDecoration: "none",
    fontSize: "13px",
    fontFamily: "var(--sans)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    transition: "color 0.15s",
  };

  const toolNameStyle: React.CSSProperties = {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--ink)",
    letterSpacing: "-0.01em",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "760px",
    margin: "0 auto",
    padding: "40px 24px 80px",
  };

  const stepperStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0",
    marginBottom: "40px",
  };

  const stepRowStyle = (active: boolean, done: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
    opacity: done || active ? 1 : 0.4,
  });

  const stepDotStyle = (active: boolean, done: boolean): React.CSSProperties => ({
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: done ? "var(--cinnabar)" : active ? "var(--ink)" : "var(--paper-2)",
    border: `2px solid ${done ? "var(--cinnabar)" : active ? "var(--ink)" : "var(--rule)"}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: 700,
    color: done || active ? "white" : "var(--ink-3)",
    flexShrink: 0,
    marginTop: "2px",
  });

  const stepConnectorStyle: React.CSSProperties = {
    width: "2px",
    height: "20px",
    backgroundColor: "var(--rule)",
    marginLeft: "13px",
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: "var(--paper-2)",
    border: "1px solid var(--rule)",
    borderRadius: "8px",
    padding: "28px",
    marginTop: "12px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--ink-2)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "6px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--rule)",
    borderRadius: "6px",
    backgroundColor: "var(--paper)",
    color: "var(--ink)",
    fontSize: "14px",
    fontFamily: "var(--sans)",
    boxSizing: "border-box",
    outline: "none",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    paddingRight: "28px",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "140px",
    resize: "vertical",
    fontFamily: "var(--mono)",
    fontSize: "13px",
    lineHeight: 1.6,
  };

  const primaryBtnStyle: React.CSSProperties = {
    backgroundColor: "var(--cinnabar)",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "12px 28px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--sans)",
    letterSpacing: "-0.01em",
  };

  const ghostBtnStyle: React.CSSProperties = {
    backgroundColor: "transparent",
    color: "var(--ink-2)",
    border: "1px solid var(--rule)",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "var(--sans)",
  };

  const tagStyle = (color: string): React.CSSProperties => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 600,
    backgroundColor: color + "18",
    color: color,
    letterSpacing: "0.03em",
    textTransform: "uppercase",
  });

  const errorBarStyle = (pct: number, color: string): React.CSSProperties => ({
    height: "6px",
    borderRadius: "3px",
    backgroundColor: "var(--rule)",
    overflow: "hidden",
    marginTop: "6px",
    position: "relative",
  });

  const ERROR_COLORS: Record<string, string> = {
    "conceptual gap": "var(--cinnabar)",
    "calculation slip": "var(--ink-2)",
    "misread question": "var(--ink-2)",
    "incomplete answer": "var(--gold)",
    "time pressure": "var(--sage)",
  };

  const getErrorColor = (type: string): string => {
    const key = type.toLowerCase();
    for (const k in ERROR_COLORS) {
      if (key.includes(k)) return ERROR_COLORS[k];
    }
    return "var(--ink-2)";
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <Link href="/dashboard" style={backLinkStyle}>
          ← Dashboard
        </Link>
        <span style={{ color: "var(--rule)" }}>|</span>
        <span style={toolNameStyle}>Paper Autopsy</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <button
            style={ghostBtnStyle}
            onClick={() => setShowHistory(!showHistory)}
          >
            History ({history.length})
          </button>
          {step === 3 && (
            <button style={ghostBtnStyle} onClick={handleReset}>
              New Paper
            </button>
          )}
        </div>
      </header>

      <div style={containerStyle}>
        {/* Intro */}
        <div style={{ marginBottom: "36px" }}>
          <h1 style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--ink)",
            letterSpacing: "-0.03em",
            marginBottom: "8px",
            fontFamily: "var(--serif)",
          }}>
            Why did you lose those marks?
          </h1>
          <p style={{ fontSize: "14px", color: "var(--ink-3)", lineHeight: 1.6, maxWidth: "520px" }}>
            Enter your paper's errors and let AI diagnose your exact loss pattern — down to the sub-topic.
            Stop studying the wrong thing.
          </p>
        </div>

        {/* History Panel */}
        {showHistory && history.length > 0 && (
          <div style={{
            ...sectionStyle,
            marginBottom: "32px",
            backgroundColor: "var(--paper)",
          }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Paper History
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {history.map(entry => (
                <div key={entry.id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "12px",
                  backgroundColor: "var(--paper-2)",
                  borderRadius: "6px",
                  border: "1px solid var(--rule)",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                      {entry.subject} · {entry.examBoard}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--ink-3)", marginTop: "2px" }}>
                      {entry.date} · Lost {entry.totalMarksLost} marks
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    {entry.result.error_types.slice(0, 3).map(et => {
                      const sparkData = getSparklineData(et.type);
                      return (
                        <div key={et.type} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "10px", color: "var(--ink-3)", marginBottom: "2px" }}>
                            {et.type.split(" ").map(w => w[0].toUpperCase()).join("")}
                          </div>
                          <Sparkline values={sparkData} color={getErrorColor(et.type)} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vertical Stepper */}
        <div style={stepperStyle}>

          {/* Step 1 */}
          <div style={stepRowStyle(step === 1, step > 1)}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={stepDotStyle(step === 1, step > 1)}>
                {step > 1 ? "✓" : "1"}
              </div>
            </div>
            <div style={{ flex: 1, paddingBottom: "0" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", marginTop: "4px", marginBottom: "4px" }}>
                Enter Your Paper
              </div>

              {step === 1 && (
                <div style={sectionStyle}>
                  {/* Meta */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                    <div>
                      <label style={labelStyle}>Subject</label>
                      <select
                        style={selectStyle}
                        value={subject}
                        onChange={e => setSubject(e.target.value as Subject)}
                      >
                        {(["Physics", "Chemistry", "Mathematics", "Biology", "English", "Other"] as Subject[]).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Exam Board</label>
                      <select
                        style={selectStyle}
                        value={examBoard}
                        onChange={e => setExamBoard(e.target.value as ExamBoard)}
                      >
                        {(["JEE", "NEET", "CBSE", "CUET", "Other"] as ExamBoard[]).map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Total Marks</label>
                      <input
                        style={inputStyle}
                        type="number"
                        value={totalMarks}
                        onChange={e => setTotalMarks(e.target.value)}
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Marks Obtained</label>
                      <input
                        style={inputStyle}
                        type="number"
                        value={marksObtained}
                        onChange={e => setMarksObtained(e.target.value)}
                        placeholder="67"
                      />
                    </div>
                  </div>

                  {/* Mode toggle */}
                  <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                    <button
                      style={{
                        ...ghostBtnStyle,
                        backgroundColor: !useRawMode ? "var(--ink)" : "transparent",
                        color: !useRawMode ? "white" : "var(--ink-2)",
                        borderColor: !useRawMode ? "var(--ink)" : "var(--rule)",
                        fontSize: "12px",
                      }}
                      onClick={() => setUseRawMode(false)}
                    >
                      Question-by-question
                    </button>
                    <button
                      style={{
                        ...ghostBtnStyle,
                        backgroundColor: useRawMode ? "var(--ink)" : "transparent",
                        color: useRawMode ? "white" : "var(--ink-2)",
                        borderColor: useRawMode ? "var(--ink)" : "var(--rule)",
                        fontSize: "12px",
                      }}
                      onClick={() => setUseRawMode(true)}
                    >
                      Paste paper dump
                    </button>
                  </div>

                  {useRawMode ? (
                    <div>
                      <label style={labelStyle}>Paste your paper, corrections, and marks lost</label>
                      <textarea
                        style={textareaStyle}
                        value={rawDump}
                        onChange={e => setRawDump(e.target.value)}
                        placeholder={`Paste any text dump of your paper here. Example:\n\nQ1: I wrote CH3CHO reacts with NaBH4 to give alcohol. Marks lost: 3. Correct: reduction gives CH3CH2OH, mechanism involves hydride attack on carbonyl.\nQ4: Forgot to balance the equation. Marks lost: 2.\n...`}
                      />
                    </div>
                  ) : (
                    <div>
                      <label style={labelStyle}>Questions where you lost marks</label>

                      {/* Column headers */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "60px 1fr 1fr 80px 1fr 32px",
                        gap: "8px",
                        marginBottom: "6px",
                        paddingLeft: "0",
                      }}>
                        {["Q No.", "Your Answer", "Correct Answer", "Marks Lost", "Topic / Chapter", ""].map((h, i) => (
                          <span key={i} style={{ fontSize: "10px", fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {h}
                          </span>
                        ))}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {questions.map(q => (
                          <div key={q.id} style={{
                            display: "grid",
                            gridTemplateColumns: "60px 1fr 1fr 80px 1fr 32px",
                            gap: "8px",
                            alignItems: "center",
                          }}>
                            <input
                              style={{ ...inputStyle, textAlign: "center" }}
                              value={q.questionNumber}
                              onChange={e => updateQuestion(q.id, "questionNumber", e.target.value)}
                              placeholder="Q1"
                            />
                            <input
                              style={inputStyle}
                              value={q.yourAnswer}
                              onChange={e => updateQuestion(q.id, "yourAnswer", e.target.value)}
                              placeholder="What you wrote…"
                            />
                            <input
                              style={inputStyle}
                              value={q.correctAnswer}
                              onChange={e => updateQuestion(q.id, "correctAnswer", e.target.value)}
                              placeholder="Correct answer…"
                            />
                            <input
                              style={{ ...inputStyle, textAlign: "center" }}
                              type="number"
                              value={q.marksLost}
                              onChange={e => updateQuestion(q.id, "marksLost", e.target.value)}
                              placeholder="0"
                              min="0"
                            />
                            <input
                              style={inputStyle}
                              value={q.topic}
                              onChange={e => updateQuestion(q.id, "topic", e.target.value)}
                              placeholder="e.g. Carbonyl reactions"
                            />
                            <button
                              style={{
                                width: "28px",
                                height: "28px",
                                border: "1px solid var(--rule)",
                                borderRadius: "4px",
                                backgroundColor: "transparent",
                                color: "var(--ink-3)",
                                cursor: "pointer",
                                fontSize: "14px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              onClick={() => removeQuestion(q.id)}
                              title="Remove"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        style={{ ...ghostBtnStyle, marginTop: "12px", fontSize: "12px" }}
                        onClick={addQuestion}
                      >
                        + Add question
                      </button>
                    </div>
                  )}

                  {error && (
                    <div style={{
                      marginTop: "16px",
                      padding: "12px 14px",
                      backgroundColor: "var(--cinnabar)18",
                      border: "1px solid var(--cinnabar)44",
                      borderRadius: "6px",
                      fontSize: "13px",
                      color: "var(--cinnabar)",
                    }}>
                      {error}
                    </div>
                  )}

                  <div style={{ marginTop: "20px" }}>
                    <button
                      style={primaryBtnStyle}
                      onClick={handleAnalyse}
                      disabled={loading}
                    >
                      {loading ? "Analysing…" : "Run Autopsy →"}
                    </button>
                  </div>
                </div>
              )}

              {step > 1 && (
                <div style={{ fontSize: "12px", color: "var(--ink-3)", marginTop: "2px" }}>
                  {subject} · {examBoard} · {marksObtained}/{totalMarks} marks
                </div>
              )}
            </div>
          </div>

          {/* Connector */}
          <div style={{ display: "flex" }}>
            <div style={{ width: "14px" }} />
            <div style={stepConnectorStyle} />
          </div>

          {/* Step 2 */}
          <div style={stepRowStyle(step === 2, step > 2)}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={stepDotStyle(step === 2, step > 2)}>
                {step > 2 ? "✓" : "2"}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", marginTop: "4px", marginBottom: "4px" }}>
                AI Analysis
              </div>
              {step === 2 && loading && (
                <div style={{ marginTop: "8px" }}>
                  <AIThinking />
                </div>
              )}
            </div>
          </div>

          {/* Connector */}
          <div style={{ display: "flex" }}>
            <div style={{ width: "14px" }} />
            <div style={stepConnectorStyle} />
          </div>

          {/* Step 3 */}
          <div style={stepRowStyle(step === 3, false)}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={stepDotStyle(step === 3, false)}>3</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", marginTop: "4px", marginBottom: "4px" }}>
                Diagnosis
              </div>
            </div>
          </div>
        </div>

        {/* ─── Results ─────────────────────────────────────────────────────────── */}

        {result && step === 3 && (
          <div ref={resultRef} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* Verdict */}
            <div style={{
              padding: "20px 24px",
              backgroundColor: "var(--paper)",
              border: "2px solid var(--cinnabar-ink)",
              borderRadius: "8px",
            }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--cinnabar-ink)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                Verdict
              </div>
              <AIOutput
                text={result.verdict}
                variant="principle"
              />
            </div>

            {/* Top Priority */}
            <div style={sectionStyle}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                🎯 If you fix only ONE thing
              </div>
              <p style={{
                fontSize: "15px",
                color: "var(--ink)",
                lineHeight: "1.6",
                margin: 0,
              }}>
                {result.top_priority}
              </p>
            </div>

            {/* Error Types */}
            {result.error_types.length > 0 && (
              <div style={sectionStyle}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                  Error Breakdown
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {result.error_types.map((et, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ flex: 1, fontSize: "13px", color: "var(--ink)" }}>{et.type}</div>
                      <div style={{ fontSize: "12px", color: getErrorColor(et.type), flexShrink: 0 }}>{et.percentage}%</div>
                      <div style={{ width: 100, height: 6, background: "var(--paper-2)", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
                        <div style={{ width: `${et.percentage}%`, height: "100%", background: getErrorColor(et.type), borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subtopic Map */}
            {result.subtopic_map.length > 0 && (
              <div style={sectionStyle}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                  Where Marks Went
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {result.subtopic_map.map((sm, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 12px", background: "var(--paper-2)", border: "1px solid var(--rule)", borderRadius: 4 }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>{sm.subtopic}</div>
                        <div style={{ fontSize: "11px", color: "var(--ink-3)", marginTop: 2 }}>{sm.chapter} · {sm.error_pattern}</div>
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--cinnabar-ink)", flexShrink: 0, marginLeft: 16 }}>−{sm.marks_lost}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Repeat Mistakes */}
            {result.repeat_mistakes.length > 0 && (
              <div style={sectionStyle}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                  Patterns to Break
                </div>
                <ul style={{ paddingLeft: 16, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.repeat_mistakes.map((m, i) => (
                    <li key={i} style={{ fontSize: "13px", color: "var(--ink)", lineHeight: 1.5 }}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Practice Prompts */}
            {result.practice_prompts.length > 0 && (
              <div style={sectionStyle}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                  Practice These Next
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.practice_prompts.map((pr, i) => (
                    <div key={i} style={{ padding: "10px 12px", background: "var(--paper-2)", border: "1px solid var(--rule)", borderRadius: 4, fontSize: "13px", color: "var(--ink)", lineHeight: 1.5 }}>
                      {pr}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
