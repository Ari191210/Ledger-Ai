"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import TierGate from "@/components/tier-gate";
import { useAuth } from "@/components/auth-provider";
import { loadUserData, type UserProfile } from "@/lib/user-data";
import { callAI, callAIOrThrow, AIError } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";
import { AIErrorDisplay } from "@/components/ai-error";
import SaveOutputButton from "@/components/save-output-button";

// ─── Doubt Solver types ──────────────────────────────────────────────────────
type DoubtOutput = { solution: string; principle: string; practice: string[] };
type CrossQ = { q: string; targetsConcept: string };
type CrossResult = { score: number; max: number; verdict: "correct" | "partial" | "wrong"; feedback: string; model: string };
type CrossEval = { results: CrossResult[]; overallScore: number; overallMax: number; summary: string; nextStep: string };
type CrossPhase = "idle" | "generating" | "answering" | "evaluating" | "done";

// ─── Feynman Engine types ────────────────────────────────────────────────────
type FeynmanPhase = "setup" | "explaining" | "probing" | "answering" | "evaluating" | "result";
type ProbeQ = { q: string; gap: string };
type ProbeData = { gaps: string[]; questions: ProbeQ[]; explanationQuality: string };
type FeynmanEvalAnswer = { q: string; studentAnswer: string; verdict: "correct" | "partial" | "wrong"; explanation: string };
type FeynmanEvalData = { knowledgeMap: { solid: string[]; shaky: string[]; missing: string[] }; score: number; outOf: number; answers: FeynmanEvalAnswer[]; summary: string; recommendation: string };
const FEYNMAN_SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "Economics", "History", "Computer Science", "Geography", "Literature", "Statistics"];

// ─── Study Engine types ──────────────────────────────────────────────────────
type Flashcard = { q: string; a: string };
type QuizItem = { q: string; opts: string[]; ans: number };
type NotesOutput = { explanation: string; summary: string[]; flashcards: Flashcard[]; quiz: QuizItem[] };
type HistoryEntry = { id: number; title: string; date: string; input: string; output: NotesOutput };
type NotesExample = { title: string; setup: string; solution: string };
type NotesPracticeQ = { q: string; opts: string[]; ans: number };
type Lesson = { title: string; concept: string; keyPoints: string[]; examples: NotesExample[]; commonMistakes: string[]; practice: NotesPracticeQ[] };
const NOTES_SUBJECTS = ["Mathematics","Physics","Chemistry","Biology","Computer Science","English Literature","History","Geography","Economics","Psychology","Accountancy","Political Science","Sociology","Physical Education"];

function saveToHistory(input: string, output: NotesOutput) {
  try {
    const existing: HistoryEntry[] = JSON.parse(localStorage.getItem("ledger-notes-history") || "[]");
    const entry: HistoryEntry = { id: Date.now(), title: input.trim().slice(0, 60), date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }), input, output };
    localStorage.setItem("ledger-notes-history", JSON.stringify([entry, ...existing].slice(0, 10)));
  } catch {}
}

// ─── Mind Map types ──────────────────────────────────────────────────────────
type MapNode = { label: string; children?: MapNode[] };
type MapData = { center: string; branches: MapNode[] };

// ─── Concept Connect types ───────────────────────────────────────────────────
type Connection = { conceptA: string; conceptB: string; links: { type: string; description: string; example: string }[]; deepInsight: string; crossSubjectValue: string; examAngles: string[]; examTip: string };

// ─── Study Engine sub-components ─────────────────────────────────────────────
function FlashcardView({ cards }: { cards: Flashcard[] }) {
  const [flip, setFlip] = useState<Record<number, boolean>>({});
  return (
    <div className="mob-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)" }}>
      {cards.map((c, i) => (
        <div key={i} onClick={() => setFlip((p) => ({ ...p, [i]: !p[i] }))}
          style={{ padding: "20px 18px", minHeight: 100, cursor: "pointer", borderRight: i % 2 === 0 ? "1px solid var(--ink)" : "none", borderBottom: i < cards.length - 2 ? "1px solid var(--ink)" : "none", background: flip[i] ? "var(--ink)" : "var(--paper-2)", color: flip[i] ? "var(--paper)" : "var(--ink)", transition: "background 200ms, color 200ms" }}>
          <div className="mono" style={{ opacity: 0.6, marginBottom: 8 }}>{flip[i] ? "Answer" : `Card ${String(i + 1).padStart(2, "0")}`}</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{flip[i] ? c.a : c.q}</div>
          <div className="mono" style={{ opacity: 0.4, marginTop: 8, fontSize: 9 }}>tap to {flip[i] ? "show question" : "reveal"}</div>
        </div>
      ))}
    </div>
  );
}

function QuizView({ items }: { items: QuizItem[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const done = Object.keys(answers).length === items.length;
  const score = done ? Object.entries(answers).filter(([i, a]) => a === items[+i].ans).length : 0;
  return (
    <div>
      {items.map((item, i) => {
        const answered = answers[i] !== undefined;
        return (
          <div key={i} style={{ marginBottom: 16, border: "1px solid var(--rule)", padding: "16px 18px" }}>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
              <span className="mono" style={{ color: "var(--cinnabar-ink)", marginRight: 8 }}>{String(i + 1).padStart(2, "0")}</span>{item.q}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {item.opts.map((opt, j) => {
                const isCorrect = j === item.ans;
                return (
                  <button key={j} onClick={() => !answered && setAnswers((p) => ({ ...p, [i]: j }))}
                    style={{ padding: "8px 12px", background: answered && isCorrect ? "var(--paper-2)" : "transparent", border: `1px solid ${answered && isCorrect ? "var(--cinnabar-ink)" : "var(--rule)"}`, cursor: answered ? "default" : "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 12, color: answered && isCorrect ? "var(--cinnabar-ink)" : answered && answers[i] === j && !isCorrect ? "var(--ink-3)" : "var(--ink)" }}>
                    <span className="mono" style={{ marginRight: 6, opacity: 0.5 }}>{String.fromCharCode(65 + j)}.</span>{opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {done && <div style={{ padding: "16px 18px", border: "1px solid var(--ink)", background: "var(--paper-2)", marginTop: 4 }}><div className="mono cin">Score</div><div style={{ fontFamily: "var(--serif)", fontSize: 40, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4 }}>{score}/{items.length}</div></div>}
    </div>
  );
}

function PracticeView({ items }: { items: NotesPracticeQ[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const done = Object.keys(answers).length === items.length;
  const score = done ? Object.entries(answers).filter(([i, a]) => a === items[+i].ans).length : 0;
  return (
    <div>
      {items.map((item, i) => {
        const answered = answers[i] !== undefined;
        return (
          <div key={i} style={{ marginBottom: 16, border: "1px solid var(--rule)", padding: "16px 18px" }}>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
              <span className="mono" style={{ color: "var(--cinnabar-ink)", marginRight: 8 }}>{String(i + 1).padStart(2, "0")}</span>{item.q}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {item.opts.map((opt, j) => {
                const isCorrect = j === item.ans;
                return (
                  <button key={j} onClick={() => !answered && setAnswers((p) => ({ ...p, [i]: j }))}
                    style={{ padding: "8px 12px", background: answered && isCorrect ? "var(--paper-2)" : "transparent", border: `1px solid ${answered && isCorrect ? "var(--cinnabar-ink)" : "var(--rule)"}`, cursor: answered ? "default" : "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 12, color: answered && isCorrect ? "var(--cinnabar-ink)" : answered && answers[i] === j && !isCorrect ? "var(--ink-3)" : "var(--ink)" }}>
                    <span className="mono" style={{ marginRight: 6, opacity: 0.5 }}>{String.fromCharCode(65 + j)}.</span>{opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {done && <div style={{ padding: "16px 18px", border: "1px solid var(--ink)", background: "var(--paper-2)", marginTop: 4 }}><div className="mono cin">Practice Score</div><div style={{ fontFamily: "var(--serif)", fontSize: 40, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4 }}>{score}/{items.length}</div><div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>{score === items.length ? "Perfect — you've got this topic." : score >= items.length / 2 ? "Good start — review the concept once more." : "Revisit the concept section above."}</div></div>}
    </div>
  );
}

// ─── Mind Map sub-component ──────────────────────────────────────────────────
function Branch({ node, depth = 0 }: { node: MapNode; depth?: number }) {
  const [open, setOpen] = useState(true);
  const colors = ["var(--cinnabar-ink)", "#1a6091", "#2d7a3c", "#8b5a2b", "#6b3fa0"];
  const color  = colors[depth % colors.length];
  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 20 }}>
      <div onClick={() => node.children?.length && setOpen(o => !o)}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: `${depth === 0 ? 10 : 6}px ${depth === 0 ? 16 : 12}px`, border: `1px solid ${color}`, marginBottom: 6, cursor: node.children?.length ? "pointer" : "default", background: depth === 0 ? color : "transparent", color: depth === 0 ? "var(--paper)" : color }}>
        {node.children?.length ? <span style={{ fontFamily: "var(--mono)", fontSize: 9 }}>{open ? "▾" : "▸"}</span> : null}
        <span style={{ fontFamily: depth === 0 ? "var(--serif)" : "var(--sans)", fontSize: depth === 0 ? 15 : 13, fontWeight: depth === 0 ? 700 : 400, fontStyle: depth === 0 ? "italic" : "normal" }}>{node.label}</span>
      </div>
      {open && node.children?.map((c, i) => (
        <div key={i} style={{ paddingLeft: 16, borderLeft: `1px solid ${color}20`, marginLeft: depth === 0 ? 8 : 0 }}>
          <Branch node={c} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

// ─── Doubt Solver tab ────────────────────────────────────────────────────────
function DoubtTab() {
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [output, setOutput] = useState<DoubtOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AIError | string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [crossPhase, setCrossPhase] = useState<CrossPhase>("idle");
  const [crossQs, setCrossQs] = useState<CrossQ[]>([]);
  const [crossAnswers, setCrossAnswers] = useState<string[]>(["", ""]);
  const [crossEval, setCrossEval] = useState<CrossEval | null>(null);
  const [crossError, setCrossError] = useState<AIError | string | null>(null);

  useEffect(() => {
    try { const raw = localStorage.getItem("ledger-profile"); if (raw) setProfile(JSON.parse(raw)); } catch {}
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5 MB."); return; }
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() { setImage(null); setImageName(""); if (fileRef.current) fileRef.current.value = ""; }

  async function solve() {
    if (!question.trim() && !image) return;
    setLoading(true); setError(null); setOutput(null);
    setCrossPhase("idle"); setCrossQs([]); setCrossAnswers(["", ""]); setCrossEval(null); setCrossError(null);
    try {
      const syllabusSubjects = (() => { try { return JSON.parse(localStorage.getItem("ledger-syllabus-subjects") || "[]"); } catch { return []; } })();
      const body: Record<string, unknown> = { tool: "doubt", question, ...profile, syllabusSubjects };
      if (image) body.image = image;
      const data = await callAIOrThrow<DoubtOutput>(body);
      setOutput(data);
    } catch (err) { setError(err instanceof AIError ? err : "Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  async function generateCrossQs() {
    if (!output) return;
    setCrossPhase("generating"); setCrossError(null);
    try {
      const data = await callAIOrThrow<{ questions: CrossQ[] }>({ tool: "doubt_cross_question", question, solution: output.solution, principle: output.principle });
      if (!data.questions?.length) { setCrossError("Couldn't generate questions — try again."); setCrossPhase("idle"); return; }
      setCrossQs(data.questions); setCrossAnswers(new Array(data.questions.length).fill("")); setCrossPhase("answering");
    } catch (err) { setCrossError(err instanceof AIError ? err : "Something went wrong."); setCrossPhase("idle"); }
  }

  async function submitCrossAnswers() {
    if (!output) return;
    setCrossPhase("evaluating"); setCrossError(null);
    try {
      const qa = crossQs.map((q, i) => ({ q: q.q, a: crossAnswers[i] ?? "" }));
      const data = await callAIOrThrow<CrossEval>({ tool: "doubt_cross_eval", question, solution: output.solution, qa });
      setCrossEval(data); setCrossPhase("done");
    } catch (err) { setCrossError(err instanceof AIError ? err : "Something went wrong."); setCrossPhase("answering"); }
  }

  const verdictColor = (v: string) => v === "correct" ? "#2d7a3c" : v === "partial" ? "#c97a1a" : "#c44b2a";
  const verdictLabel = (v: string) => v === "correct" ? "✓ Correct" : v === "partial" ? "◑ Partial" : "✗ Incorrect";
  const canSolve = (question.trim().length > 0 || !!image) && !loading;

  return (
    <TierGate requires="pro">
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: (output || loading) ? "1fr 1fr" : "1fr", gap: 48, maxWidth: (output || loading) ? "100%" : 700 }}>
          <div>
            {profile.grade && (
              <div style={{ marginBottom: 14, padding: "8px 12px", border: "1px solid var(--rule)", background: "var(--paper-2)", display: "flex", gap: 10, alignItems: "center" }}>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>Profile</div>
                <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{profile.grade}{profile.board ? ` · ${profile.board}` : ""}{profile.stream ? ` · ${profile.stream}` : ""}</div>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginLeft: "auto" }}>Solutions follow your board&apos;s marking scheme</div>
              </div>
            )}
            <div className="mono cin" style={{ marginBottom: 14 }}>Input · Type your question or upload a photo</div>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder={"Describe the problem clearly — or upload a photo of it below.\n\nExamples:\n— A ball is thrown at 30° with 20 m/s. Find max height.\n— Explain why noble gases are unreactive.\n— Differentiate f(x) = 3x² + 2x − 5"}
              rows={8}
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "16px", color: "var(--ink)", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            <div style={{ marginTop: 12 }}>
              {image ? (
                <div style={{ border: "1px solid var(--ink)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, background: "var(--paper-2)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="uploaded" style={{ width: 56, height: 56, objectFit: "cover", border: "1px solid var(--rule)" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink)" }}>{imageName}</div>
                    <div className="mono" style={{ color: "var(--ink-3)", marginTop: 2 }}>Image attached · will be analysed by AI</div>
                  </div>
                  <button onClick={clearImage} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>✕ Remove</button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  style={{ width: "100%", padding: "12px 16px", border: "1px dashed var(--rule)", background: "var(--paper-2)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.06em", textAlign: "center" }}>
                  + Upload photo of question (JPG, PNG · max 5 MB)
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className="btn" onClick={solve} disabled={!canSolve} style={{ opacity: !canSolve ? 0.5 : 1 }}>{loading ? "Solving…" : "Solve →"}</button>
              {output && <button className="btn ghost" onClick={() => { setOutput(null); setQuestion(""); clearImage(); setCrossPhase("idle"); setCrossQs([]); setCrossEval(null); }}>Clear</button>}
            </div>
            {error && <AIErrorDisplay error={error} onRetry={solve} inline />}
          </div>
          {loading && <AIThinking />}
          {output && !loading && (
            <div>
              <div style={{ border: "1px solid var(--ink)" }}>
                <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--ink)" }}>
                  <div className="mono cin" style={{ marginBottom: 12 }}>Worked solution</div>
                  <AIOutput text={output.solution} />
                </div>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ink)", background: "var(--paper-2)" }}>
                  <div className="mono cin" style={{ marginBottom: 8 }}>Underlying principle</div>
                  <AIOutput text={output.principle} variant="principle" />
                </div>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ink)" }}>
                  <div className="mono cin" style={{ marginBottom: 10 }}>Three similar problems</div>
                  {output.practice.map((p, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < output.practice.length - 1 ? "1px solid var(--rule)" : "none" }}>
                      <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)" }}>{p}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "10px 20px", display: "flex", justifyContent: "flex-end" }}>
                  <SaveOutputButton toolSlug="doubt" toolName="Doubt Solver" input={question} outputText={output.solution} />
                </div>
              </div>
              <div style={{ marginTop: 20, border: "1px solid var(--rule)" }}>
                <div style={{ padding: "14px 20px", borderBottom: crossPhase !== "idle" ? "1px solid var(--rule)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--paper-2)" }}>
                  <div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", letterSpacing: "0.08em" }}>FEYNMAN CHECK</div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", marginTop: 2 }}>Did you actually understand it?</div>
                  </div>
                  {crossPhase === "idle" && <button className="btn ghost" onClick={generateCrossQs} style={{ fontSize: 11 }}>Test my understanding →</button>}
                  {crossPhase === "done" && crossEval && (
                    <div className="mono" style={{ fontSize: 11, color: crossEval.overallScore >= crossEval.overallMax * 0.7 ? "#2d7a3c" : crossEval.overallScore >= crossEval.overallMax * 0.4 ? "#c97a1a" : "#c44b2a" }}>
                      {crossEval.overallScore}/{crossEval.overallMax}
                    </div>
                  )}
                </div>
                {crossPhase === "generating" && <div style={{ padding: "16px 20px" }}><AIThinking /></div>}
                {(crossPhase === "answering" || crossPhase === "evaluating") && crossQs.length > 0 && (
                  <div style={{ padding: "16px 20px" }}>
                    <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 12 }}>Answer in your own words — no looking back.</div>
                    {crossQs.map((q, i) => (
                      <div key={i} style={{ marginBottom: 16 }}>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6, lineHeight: 1.5 }}>
                          <span className="mono cin" style={{ marginRight: 8 }}>Q{i + 1}</span>{q.q}
                        </div>
                        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>Tests: {q.targetsConcept}</div>
                        <textarea value={crossAnswers[i]} onChange={e => setCrossAnswers(a => { const n = [...a]; n[i] = e.target.value; return n; })}
                          placeholder="Write your answer here…" rows={3} disabled={crossPhase === "evaluating"}
                          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", resize: "vertical", boxSizing: "border-box", opacity: crossPhase === "evaluating" ? 0.6 : 1 }} />
                      </div>
                    ))}
                    {crossError && <AIErrorDisplay error={crossError} inline />}
                    <button className="btn" onClick={submitCrossAnswers} disabled={crossPhase === "evaluating" || crossAnswers.every(a => !a.trim())} style={{ width: "100%", opacity: crossPhase === "evaluating" ? 0.5 : 1, marginTop: 4 }}>
                      {crossPhase === "evaluating" ? "Checking answers…" : "Check my answers →"}
                    </button>
                  </div>
                )}
                {crossPhase === "done" && crossEval && (
                  <div style={{ padding: "16px 20px" }}>
                    {crossEval.results.map((r, i) => (
                      <div key={i} style={{ marginBottom: 16, padding: "14px 16px", border: `1px solid ${verdictColor(r.verdict)}22`, background: `${verdictColor(r.verdict)}08` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                            <span className="mono cin" style={{ marginRight: 8 }}>Q{i + 1}</span>{crossQs[i]?.q}
                          </div>
                          <span className="mono" style={{ fontSize: 10, color: verdictColor(r.verdict), flexShrink: 0, marginLeft: 12 }}>{verdictLabel(r.verdict)} · {r.score}/{r.max}</span>
                        </div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", marginBottom: 8, lineHeight: 1.5 }}>
                          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginRight: 6 }}>YOUR ANSWER</span>{crossAnswers[i] || "(no answer)"}
                        </div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", lineHeight: 1.5, marginBottom: 6 }}>{r.feedback}</div>
                        {r.verdict !== "correct" && (
                          <div style={{ padding: "8px 12px", background: "var(--paper-2)", border: "1px solid var(--rule)", marginTop: 6 }}>
                            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>MODEL ANSWER</div>
                            <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{r.model}</div>
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{ padding: "14px 16px", background: "var(--paper-2)", border: "1px solid var(--rule)", marginBottom: 12 }}>
                      <div className="mono cin" style={{ marginBottom: 6 }}>Assessment</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", lineHeight: 1.5, marginBottom: 8 }}>{crossEval.summary}</div>
                      <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>NEXT STEP</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{crossEval.nextStep}</div>
                    </div>
                    <button className="btn ghost" onClick={() => { setCrossPhase("idle"); setCrossQs([]); setCrossEval(null); setCrossAnswers(["", ""]); }} style={{ width: "100%", fontSize: 11 }}>Test again</button>
                  </div>
                )}
                {crossError && crossPhase === "idle" && <div style={{ padding: "0 20px 16px" }}><AIErrorDisplay error={crossError} inline /></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </TierGate>
  );
}

// ─── Feynman Engine tab ───────────────────────────────────────────────────────
function FeynmanTab() {
  const [concept, setConcept] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [explanation, setExplanation] = useState("");
  const [phase, setPhase] = useState<FeynmanPhase>("setup");
  const [probeData, setProbeData] = useState<ProbeData | null>(null);
  const [probeAnswers, setProbeAnswers] = useState<string[]>(["", "", ""]);
  const [evalData, setEvalData] = useState<FeynmanEvalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AIError | string | null>(null);

  async function submitExplanation() {
    if (!concept.trim() || !explanation.trim()) return;
    setLoading(true); setError(null);
    try {
      const data = await callAIOrThrow<ProbeData>({ tool: "feynman_probe", concept, subject, explanation });
      if (!data.questions?.length) { setError("Couldn't generate questions — try again."); return; }
      setProbeData(data); setProbeAnswers(new Array(data.questions.length).fill("")); setPhase("probing");
    } catch (err) { setError(err instanceof AIError ? err : "Something went wrong."); }
    finally { setLoading(false); }
  }

  async function submitAnswers() {
    if (!probeData) return;
    setPhase("evaluating"); setError(null);
    try {
      const qa = probeData.questions.map((q, i) => ({ q: q.q, a: probeAnswers[i] ?? "" }));
      const data = await callAIOrThrow<FeynmanEvalData>({ tool: "feynman_eval", concept, subject, explanation, qa });
      setEvalData(data); setPhase("result");
    } catch (err) { setError(err instanceof AIError ? err : "Something went wrong."); setPhase("answering"); }
  }

  function restart() {
    setPhase("setup"); setConcept(""); setSubject("Physics"); setExplanation("");
    setProbeData(null); setProbeAnswers(["", "", ""]); setEvalData(null); setError(null);
  }

  const verdictColor = (v: string) => v === "correct" ? "#2d7a3c" : v === "partial" ? "#c97a1a" : "#c44b2a";
  const scoreColor = evalData ? (evalData.score / evalData.outOf >= 0.7 ? "#2d7a3c" : evalData.score / evalData.outOf >= 0.4 ? "#c97a1a" : "#c44b2a") : "var(--ink)";

  if (phase === "setup") return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>The Feynman Technique</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 8px" }}>Teach it. Get questioned. Find the gaps.</h2>
      <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 32px" }}>If you can&apos;t explain it simply, you don&apos;t understand it. Explain a concept as if teaching a 12-year-old. Ledger plays the confused student and exposes what you actually don&apos;t know.</p>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {FEYNMAN_SUBJECTS.map(s => (
            <button key={s} onClick={() => setSubject(s)}
              style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: subject === s ? "var(--cinnabar-ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Concept to explain</div>
        <input value={concept} onChange={e => setConcept(e.target.value)} placeholder="e.g. Photosynthesis, Integration by parts, Keynesian economics…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      <button className="btn" onClick={() => { if (concept.trim()) setPhase("explaining"); }} disabled={!concept.trim()} style={{ width: "100%", opacity: !concept.trim() ? 0.4 : 1 }}>Start explaining →</button>
    </div>
  );

  if (phase === "explaining") return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Step 1 · Your explanation</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 500, fontStyle: "italic", margin: "0 0 8px" }}>Explain {concept} as if teaching a 12-year-old.</h2>
      <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 20px" }}>Write freely — don&apos;t look anything up. Use simple language. If you find yourself stuck, that&apos;s the point.</p>
      <textarea value={explanation} onChange={e => setExplanation(e.target.value)} placeholder={`Explain ${concept} simply. What is it? How does it work? Why does it matter?`} rows={12}
        style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.7, border: "1px solid var(--ink)", background: "var(--paper)", padding: "16px", color: "var(--ink)", resize: "vertical", boxSizing: "border-box", marginBottom: 12 }} />
      {error && <div style={{ marginBottom: 12 }}><AIErrorDisplay error={error} onRetry={submitExplanation} inline /></div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn ghost" onClick={() => setPhase("setup")}>← Back</button>
        <button className="btn" onClick={submitExplanation} disabled={loading || explanation.trim().length < 20} style={{ flex: 1, opacity: loading || explanation.trim().length < 20 ? 0.5 : 1 }}>
          {loading ? "Analysing your explanation…" : "Submit explanation →"}
        </button>
      </div>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
      <div className="mono" style={{ marginTop: 16, fontSize: 9, color: "var(--ink-3)", textAlign: "center" }}>{explanation.length} characters</div>
    </div>
  );

  if ((phase === "probing" || phase === "answering" || phase === "evaluating") && probeData) return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Step 2 · The probe</div>
      <div style={{ padding: "14px 18px", background: "var(--paper-2)", border: "1px solid var(--rule)", marginBottom: 24 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>YOUR EXPLANATION</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{probeData.explanationQuality}</div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 8 }}>GAPS IDENTIFIED IN YOUR EXPLANATION</div>
        {probeData.gaps.map((g, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < probeData.gaps.length - 1 ? "1px solid var(--rule)" : "none" }}>
            <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{i + 1}.</span>
            <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{g}</span>
          </div>
        ))}
      </div>
      <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 12 }}>A CONFUSED 12-YEAR-OLD ASKS — answer without looking anything up:</div>
      {probeData.questions.map((q, i) => (
        <div key={i} style={{ marginBottom: 20, border: "1px solid var(--rule)", padding: "16px 18px" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 500, color: "var(--ink)", lineHeight: 1.5, marginBottom: 6 }}>&ldquo;{q.q}&rdquo;</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 10 }}>This tests: {q.gap}</div>
          <textarea value={probeAnswers[i]} onChange={e => { setProbeAnswers(a => { const n = [...a]; n[i] = e.target.value; return n; }); if (phase === "probing") setPhase("answering"); }}
            placeholder="Answer simply…" rows={3} disabled={phase === "evaluating"}
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", resize: "vertical", boxSizing: "border-box", opacity: phase === "evaluating" ? 0.6 : 1 }} />
        </div>
      ))}
      {error && <div style={{ marginBottom: 12 }}><AIErrorDisplay error={error} onRetry={submitAnswers} inline /></div>}
      <button className="btn" onClick={submitAnswers} disabled={phase === "evaluating" || phase === "probing"} style={{ width: "100%", opacity: (phase === "evaluating" || phase === "probing") ? 0.5 : 1 }}>
        {phase === "evaluating" ? "Building your knowledge map…" : "Show my knowledge map →"}
      </button>
      {phase === "evaluating" && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );

  if (phase === "result" && evalData) return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="mono cin">Your knowledge map — {concept}</div>
        <button className="btn ghost" onClick={restart} style={{ fontSize: 11 }}>New concept</button>
      </div>
      <div style={{ display: "flex", gap: 24, marginBottom: 32, padding: "24px 28px", border: "2px solid var(--ink)" }} className="mob-col">
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 56, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{evalData.score}/{evalData.outOf}</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 4 }}>Feynman score</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
          <div style={{ background: "var(--paper-2)", height: 10, overflow: "hidden" }}>
            <div style={{ width: `${Math.round((evalData.score / evalData.outOf) * 100)}%`, height: "100%", background: scoreColor }} />
          </div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{evalData.summary}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }} className="mob-col">
        {[{ label: "Solid", items: evalData.knowledgeMap.solid, color: "#2d7a3c", icon: "✓" }, { label: "Shaky", items: evalData.knowledgeMap.shaky, color: "#c97a1a", icon: "◑" }, { label: "Missing", items: evalData.knowledgeMap.missing, color: "#c44b2a", icon: "✗" }].map(({ label, items, color, icon }) => (
          <div key={label} style={{ border: `1px solid ${color}44`, padding: "16px" }}>
            <div className="mono" style={{ fontSize: 9, color, marginBottom: 10 }}>{icon} {label.toUpperCase()} ({items.length})</div>
            {items.length === 0 ? <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)" }}>None identified</div>
              : items.map((item, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", padding: "4px 0", borderBottom: i < items.length - 1 ? "1px solid var(--rule)" : "none" }}>{item}</div>)}
          </div>
        ))}
      </div>
      <div className="mono cin" style={{ marginBottom: 14 }}>Question breakdown</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 32 }}>
        {evalData.answers.map((a, i) => (
          <div key={i} style={{ border: "1px solid var(--ink)", borderBottom: i < evalData.answers.length - 1 ? "none" : "1px solid var(--ink)", padding: "16px 20px" }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
              <span className="mono" style={{ fontSize: 10, color: verdictColor(a.verdict), flexShrink: 0, fontWeight: 700 }}>{a.verdict === "correct" ? "✓" : a.verdict === "partial" ? "◑" : "✗"} Q{i + 1}</span>
              <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontStyle: "italic", color: "var(--ink)", lineHeight: 1.5 }}>&ldquo;{a.q}&rdquo;</div>
            </div>
            <div style={{ paddingLeft: 28 }}>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", marginBottom: 8, lineHeight: 1.5 }}>
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginRight: 6 }}>YOUR ANSWER</span>{a.studentAnswer || "(no answer)"}
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{a.explanation}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "18px 22px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Next step</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink)", lineHeight: 1.6 }}>{evalData.recommendation}</div>
      </div>
    </div>
  );

  return null;
}

// ─── Study Engine tab ─────────────────────────────────────────────────────────
function NotesTab() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"simplify" | "learn">("simplify");
  const [input, setInput] = useState("");
  const [notesOut, setNotesOut] = useState<NotesOutput | null>(null);
  const [notesTab, setNotesTab] = useState<"explanation" | "summary" | "flashcards" | "quiz">("explanation");
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<AIError | string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({});
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonTab, setLessonTab] = useState<"concept" | "examples" | "keypoints" | "practice">("concept");
  const [learnLoading, setLearnLoading] = useState(false);
  const [learnError, setLearnError] = useState<AIError | string | null>(null);
  const [learnProfile, setLearnProfile] = useState<{ grade?: string; board?: string; stream?: string; interests?: string[]; targetExam?: string }>({});

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem("ledger-notes-history") || "[]");
      setHistory(h);
      const raw = localStorage.getItem("ledger-profile");
      if (raw) setProfile(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    loadUserData(user.id).then(ud => {
      if (ud) setLearnProfile({ grade: ud.grade, board: ud.board, stream: ud.stream, interests: ud.interests, targetExam: ud.targetExam });
    });
  }, [user]);

  async function simplify() {
    if (!input.trim()) return;
    setNotesLoading(true); setNotesError(null); setNotesOut(null);
    try {
      const syllabusSubjects = (() => { try { return JSON.parse(localStorage.getItem("ledger-syllabus-subjects") || "[]"); } catch { return []; } })();
      const data = await callAIOrThrow<NotesOutput>({ tool: "notes", content: input, ...profile, syllabusSubjects });
      setNotesOut(data); setNotesTab("explanation");
      saveToHistory(input, data);
      setHistory(JSON.parse(localStorage.getItem("ledger-notes-history") || "[]"));
    } catch (err) { setNotesError(err instanceof AIError ? err : "Something went wrong. Please try again."); }
    finally { setNotesLoading(false); }
  }

  function loadFromHistory(entry: HistoryEntry) { setInput(entry.input); setNotesOut(entry.output); setNotesTab("explanation"); setShowHistory(false); }
  function deleteFromHistory(id: number) { const updated = history.filter((h) => h.id !== id); setHistory(updated); localStorage.setItem("ledger-notes-history", JSON.stringify(updated)); }

  async function learn() {
    if (!subject || !topic.trim()) return;
    setLearnLoading(true); setLearnError(null); setLesson(null);
    try {
      const data = await callAIOrThrow<Lesson>({ tool: "tutor", subject, topic: topic.trim(), grade: learnProfile.grade || "Class 10", board: learnProfile.board || "", stream: learnProfile.stream || "", targetExam: learnProfile.targetExam || "", extra: learnProfile.interests?.length ? `Student's interests: ${learnProfile.interests.join(", ")}` : "" });
      setLesson(data); setLessonTab("concept");
    } catch (err) { setLearnError(err instanceof AIError ? err : "Something went wrong. Please try again."); }
    finally { setLearnLoading(false); }
  }

  const NOTES_TABS_LIST = [{ id: "explanation" as const, label: "Explanation" }, { id: "summary" as const, label: "Summary" }, { id: "flashcards" as const, label: "Flashcards" }, { id: "quiz" as const, label: "Quiz" }];
  const LESSON_TABS_LIST = [{ id: "concept" as const, label: "Concept" }, { id: "examples" as const, label: "Examples" }, { id: "keypoints" as const, label: "Key Points" }, { id: "practice" as const, label: "Practice" }];

  return (
    <div>
      <div style={{ display: "flex", gap: 4, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "4px", marginBottom: 24, width: "fit-content" }}>
        <button onClick={() => setMode("simplify")} style={{ padding: "10px 20px", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", background: mode === "simplify" ? "var(--ink)" : "transparent", color: mode === "simplify" ? "var(--paper)" : "var(--ink-2)", border: "none", borderRadius: 8, cursor: "pointer", transition: "background 160ms, color 160ms" }}>Simplify Notes</button>
        <button onClick={() => setMode("learn")} style={{ padding: "10px 20px", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", background: mode === "learn" ? "var(--ink)" : "transparent", color: mode === "learn" ? "var(--paper)" : "var(--ink-2)", border: "none", borderRadius: 8, cursor: "pointer", transition: "background 160ms, color 160ms" }}>Learn Topic</button>
      </div>
      {mode === "simplify" && (
        <>
          {showHistory && history.length > 0 && (
            <div style={{ marginBottom: 24, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "20px" }}>
              <div className="mono cin" style={{ marginBottom: 12 }}>Recent notes · {history.length} saved</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 0, border: "1px solid var(--ink)" }}>
                {history.map((h, i) => (
                  <div key={h.id} style={{ padding: "14px 16px", borderRight: "1px solid var(--rule)", borderBottom: i < history.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <button onClick={() => loadFromHistory(h)} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", flex: 1, padding: 0 }}>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{h.title}</div>
                      <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 4 }}>{h.date} · {h.output.flashcards.length} cards · {h.output.summary.length} points</div>
                    </button>
                    <button onClick={() => deleteFromHistory(h.id)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", flexShrink: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: (notesOut || notesLoading) ? "1fr 1.4fr" : "1fr", gap: 48, maxWidth: (notesOut || notesLoading) ? "100%" : 700 }}>
            <div>
              {history.length > 0 && <button onClick={() => setShowHistory(!showHistory)} className="btn ghost" style={{ marginBottom: 16, padding: "6px 14px", fontSize: 11 }}>{showHistory ? "Hide history" : `History (${history.length})`}</button>}
              {profile.grade && (
                <div style={{ marginBottom: 14, padding: "8px 12px", border: "1px solid var(--rule)", background: "var(--paper-2)", display: "flex", gap: 10, alignItems: "center" }}>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>Profile</div>
                  <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{profile.grade}{profile.board ? ` · ${profile.board}` : ""}{profile.stream ? ` · ${profile.stream}` : ""}</div>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginLeft: "auto" }}>AI personalised for your board</div>
                </div>
              )}
              <div className="mono cin" style={{ marginBottom: 14 }}>Paste your notes or chapter</div>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste your textbook excerpt, lecture notes, or any study material here. The longer and denser, the better." rows={notesOut ? 16 : 20}
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "16px", color: "var(--ink)", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button className="btn" onClick={simplify} disabled={notesLoading || !input.trim()} style={{ opacity: notesLoading || !input.trim() ? 0.5 : 1 }}>{notesLoading ? "Analysing…" : "Simplify →"}</button>
                {notesOut && <button className="btn ghost" onClick={() => { setNotesOut(null); setInput(""); }}>Clear</button>}
              </div>
              {notesError && <AIErrorDisplay error={notesError} onRetry={simplify} inline />}
            </div>
            {notesLoading && (
              <div>
                <div style={{ display: "flex", gap: 4, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "4px" }}>
                  {["Explanation","Summary","Flashcards","Quiz"].map((label) => (
                    <div key={label} style={{ flex: 1, padding: "12px 8px", background: "transparent", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", textAlign: "center" }}>{label}</div>
                  ))}
                </div>
                <div style={{ border: "1px solid var(--ink)", borderTop: "none", padding: "24px 20px" }}><AIThinking /></div>
              </div>
            )}
            {notesOut && !notesLoading && (
              <div>
                <div style={{ display: "flex", gap: 4, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "4px" }}>
                  {NOTES_TABS_LIST.map((t) => (
                    <button key={t.id} onClick={() => setNotesTab(t.id)}
                      style={{ flex: 1, padding: "12px 8px", background: notesTab === t.id ? "var(--ink)" : "transparent", color: notesTab === t.id ? "var(--paper)" : "var(--ink-2)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div style={{ border: "1px solid var(--ink)", borderTop: "none", padding: "24px 20px" }}>
                  {notesTab === "explanation" && <AIOutput text={notesOut.explanation} />}
                  {notesTab === "summary" && (
                    <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                      {notesOut.summary.map((point, i) => (
                        <li key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < notesOut.summary.length - 1 ? "1px solid var(--rule)" : "none" }}>
                          <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                          <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {notesTab === "flashcards" && <FlashcardView cards={notesOut.flashcards} />}
                  {notesTab === "quiz" && <QuizView items={notesOut.quiz} />}
                </div>
                <div style={{ padding: "10px 20px", borderLeft: "1px solid var(--rule)", borderRight: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "flex-end" }}>
                  <SaveOutputButton toolSlug="notes" toolName="Study Engine" input={input} outputText={notesOut.explanation} />
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {mode === "learn" && (
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: (lesson || learnLoading) ? "1fr 1.5fr" : "1fr", gap: 48, maxWidth: (lesson || learnLoading) ? "100%" : 700 }}>
          <div>
            {learnProfile.grade && (
              <div style={{ marginBottom: 16, padding: "10px 14px", border: "1px solid var(--rule)", background: "var(--paper-2)", display: "flex", gap: 12, alignItems: "center" }}>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>Profile</div>
                <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{learnProfile.grade}{learnProfile.board ? ` · ${learnProfile.board}` : ""}{learnProfile.stream ? ` · ${learnProfile.stream}` : ""}{learnProfile.targetExam ? ` · ${learnProfile.targetExam}` : ""}</div>
                <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginLeft: "auto" }}>Lessons personalised for you</div>
              </div>
            )}
            <div className="mono cin" style={{ marginBottom: 14 }}>01 · Choose a subject</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)", marginBottom: 24 }}>
              {NOTES_SUBJECTS.map((s, i) => (
                <button key={s} onClick={() => setSubject(s)}
                  style={{ padding: "10px 14px", background: subject === s ? "var(--ink)" : "transparent", color: subject === s ? "var(--paper)" : "var(--ink-2)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", borderBottom: i < NOTES_SUBJECTS.length - 2 ? "1px solid var(--rule)" : "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.05em", textAlign: "left", textTransform: "uppercase" }}>
                  {s}
                </button>
              ))}
            </div>
            <div className="mono cin" style={{ marginBottom: 14 }}>02 · Enter a topic</div>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && learn()}
              placeholder={subject ? `e.g. ${subject === "Mathematics" ? "Integration by parts" : subject === "Physics" ? "Photoelectric effect" : "Enter a specific topic…"}` : "Select a subject first…"}
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "14px 16px", color: "var(--ink)", outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
            <button className="btn" onClick={learn} disabled={learnLoading || !subject || !topic.trim()} style={{ opacity: learnLoading || !subject || !topic.trim() ? 0.5 : 1 }}>
              {learnLoading ? "Generating lesson…" : "Teach me →"}
            </button>
            {lesson && <button className="btn ghost" onClick={() => { setLesson(null); setTopic(""); }} style={{ marginLeft: 10 }}>Clear</button>}
            {learnError && <AIErrorDisplay error={learnError} onRetry={learn} inline />}
          </div>
          {learnLoading && <AIThinking />}
          {lesson && !learnLoading && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{lesson.title}</div>
                <div className="mono" style={{ color: "var(--ink-3)", marginTop: 6 }}>{subject} · {learnProfile.grade || "Class 10"}</div>
              </div>
              <div style={{ display: "flex", gap: 4, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "4px" }}>
                {LESSON_TABS_LIST.map((t) => (
                  <button key={t.id} onClick={() => setLessonTab(t.id)}
                    style={{ flex: 1, padding: "12px 8px", background: lessonTab === t.id ? "var(--ink)" : "transparent", color: lessonTab === t.id ? "var(--paper)" : "var(--ink-2)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ border: "1px solid var(--ink)", borderTop: "none", padding: "24px 20px" }}>
                {lessonTab === "concept" && (
                  <div>
                    <AIOutput text={lesson.concept} noBorder />
                    {lesson.commonMistakes?.length > 0 && (
                      <div style={{ marginTop: 20, padding: "16px 18px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                        <div className="mono cin" style={{ marginBottom: 10 }}>Common mistakes to avoid</div>
                        {lesson.commonMistakes.map((m, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: i < lesson.commonMistakes.length - 1 ? "1px solid var(--rule)" : "none" }}>
                            <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>✕</span>
                            <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)" }}>{m}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {lessonTab === "examples" && lesson.examples.map((ex, i) => (
                  <div key={i} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: i < lesson.examples.length - 1 ? "1px solid var(--rule)" : "none" }}>
                    <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
                      <span className="mono" style={{ color: "var(--cinnabar-ink)", marginRight: 8, fontStyle: "normal" }}>{String(i + 1).padStart(2, "0")}</span>{ex.title}
                    </div>
                    <div style={{ marginBottom: 10, padding: "12px 14px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                      <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Problem</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{ex.setup}</div>
                    </div>
                    <div style={{ padding: "12px 14px", border: "1px solid var(--rule)" }}>
                      <div className="mono cin" style={{ marginBottom: 6 }}>Solution</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.7, color: "var(--ink)" }}>{ex.solution.split("\n").map((line, j) => <div key={j} style={{ marginBottom: 4 }}>{line}</div>)}</div>
                    </div>
                  </div>
                ))}
                {lessonTab === "keypoints" && (
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                    {lesson.keyPoints.map((pt, i) => (
                      <li key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < lesson.keyPoints.length - 1 ? "1px solid var(--rule)" : "none" }}>
                        <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.55 }}>{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {lessonTab === "practice" && <PracticeView items={lesson.practice} />}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Mind Map tab ─────────────────────────────────────────────────────────────
function MindMapTab() {
  const [topic, setTopic] = useState("");
  const [detail, setDetail] = useState("medium");
  const [map, setMap] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true); setError(""); setMap(null);
    try {
      const res  = await callAI({ tool: "mindmap", topic, detail });
      const data = await res.json();
      if (!res.ok || !data.branches) { setError("Could not generate — try again."); return; }
      setMap(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (!map) return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Build a mind map</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Any topic. Full concept breakdown.</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 20 }}>
        <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} placeholder="e.g. Photosynthesis, French Revolution, Machine Learning, Supply and Demand…"
          style={{ fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)" }} />
        <select value={detail} onChange={e => setDetail(e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 10px", color: "var(--ink)" }}>
          <option value="brief">Overview (3 branches)</option>
          <option value="medium">Standard (5 branches)</option>
          <option value="deep">Deep dive (7+ branches)</option>
        </select>
      </div>
      {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
      <button className="btn" onClick={generate} disabled={loading || !topic.trim()} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
        {loading ? "Building map…" : "Generate mind map →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div style={{ display: "inline-block", padding: "14px 28px", background: "var(--ink)", color: "var(--paper)", fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", fontWeight: 700 }}>{map.center}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn ghost" onClick={() => window.print()}>Print / PDF ↗</button>
          <button className="btn ghost" onClick={() => setMap(null)}>New map</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
        {map.branches.map((b, i) => (
          <div key={i} style={{ border: "1px solid var(--rule)", padding: "16px" }}>
            <Branch node={b} depth={0} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Concept Connect tab ──────────────────────────────────────────────────────
function ConceptConnectTab() {
  const [conceptA, setConceptA] = useState("");
  const [conceptB, setConceptB] = useState("");
  const [result, setResult] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!conceptA.trim() || !conceptB.trim()) { setError("Enter both concepts."); return; }
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "concept_connect", conceptA, conceptB });
      const data = await res.json();
      if (!res.ok || !data.links) { setError(data.error || "Could not find connections."); return; }
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (result) return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>{result.conceptA} ↔ {result.conceptB}</div>
        <button className="btn ghost" onClick={() => setResult(null)}>New connection</button>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <div style={{ flex: 1, border: "2px solid var(--ink)", padding: "14px 18px", textAlign: "center" }}><div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>{result.conceptA}</div></div>
        <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 20, flexShrink: 0 }}>↔</div>
        <div style={{ flex: 1, border: "2px solid var(--ink)", padding: "14px 18px", textAlign: "center" }}><div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>{result.conceptB}</div></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {result.links.map((l, i) => (
          <div key={i} style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 6 }}>{l.type}</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, marginBottom: 6 }}>{l.description}</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", fontStyle: "italic" }}>e.g. {l.example}</div>
          </div>
        ))}
      </div>
      <div style={{ border: "2px solid var(--ink)", padding: "16px 20px", marginBottom: 12 }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Deep Insight</div>
        <AIOutput text={result.deepInsight} variant="principle" />
      </div>
      <div style={{ border: "1px solid #2d7a3c", padding: "14px 16px", marginBottom: 12 }}>
        <div className="mono" style={{ fontSize: 9, color: "#2d7a3c", marginBottom: 8 }}>CROSS-SUBJECT VALUE</div>
        <AIOutput text={result.crossSubjectValue} />
      </div>
      <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>EXAM ANGLES THIS UNLOCKS</div>
        {result.examAngles.map((a, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5 }}>· {a}</div>)}
      </div>
      <div style={{ border: "1px solid #1a6091", padding: "14px 16px", background: "rgba(26,96,145,0.04)" }}>
        <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 6 }}>EXAM TIP</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.examTip}</div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Everything connects.</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Discover the hidden links between any two concepts.</h2>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>First concept <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
        <input value={conceptA} onChange={e => setConceptA(e.target.value)} placeholder="e.g. Natural Selection, Supply and Demand, WW1…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Second concept <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
        <input value={conceptB} onChange={e => setConceptB(e.target.value)} placeholder="e.g. Capitalism, Entropy, Nationalism…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 20, padding: "12px 16px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>Try cross-subject pairs for surprising insights. E.g.: &quot;Mitosis&quot; + &quot;Industrial Revolution&quot; or &quot;Keynesian Economics&quot; + &quot;WW2&quot;</div>
      </div>
      {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
        {loading ? "Finding connections…" : "Find the connection →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────
type Tab = "doubt" | "feynman" | "notes" | "mindmap" | "connect";
const TABS: [Tab, string][] = [
  ["doubt",   "Doubt Solver"],
  ["feynman", "Feynman"],
  ["notes",   "Study Engine"],
  ["mindmap", "Mind Map"],
  ["connect", "Concept Connect"],
];

export default function LearnLabPage() {
  const [tab, setTab] = useState<Tab>("doubt");
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Learn Lab</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Doubt · Feynman · Study Engine · Mind Map · Concept Connect</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "4px", overflowX: "auto" }}>
          {TABS.map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 16px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
              {l}
            </button>
          ))}
        </div>
        <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>&larr; Dashboard</Link>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "doubt"   && <DoubtTab />}
        {tab === "feynman" && <FeynmanTab />}
        {tab === "notes"   && <NotesTab />}
        {tab === "mindmap" && <MindMapTab />}
        {tab === "connect" && <ConceptConnectTab />}
      </main>
    </div>
  );
}
