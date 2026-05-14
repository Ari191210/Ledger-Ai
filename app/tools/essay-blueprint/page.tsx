"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type Section      = { title: string; purpose: string; points: string[]; wordCount: number; openWith: string };
type Blueprint    = { title: string; thesis: string; totalWords: number; sections: Section[]; dos: string[]; donts: string[]; keyTerms: string[] };
type Point        = { point: string; evidence: string; explain: string; link: string };
type ArgumentPlan = { thesis: string; intro: string; points: Point[]; counter: { argument: string; rebuttal: string }; conclusion: string; keyPhrases: string[]; examTip: string };
type Criterion    = { name: string; score: number; max: number; feedback: string };
type Grade        = { overall: string; band: string; totalScore: number; maxScore: number; criteria: Criterion[]; strengths: string[]; improvements: string[]; summary: string };

const SUBJECTS    = ["Economics","History","English Literature","English Language","Biology","Geography","Psychology","Sociology","Philosophy","Political Science","Business","ToK"];
const LEVELS      = ["GCSE","IGCSE","A-Level","IB HL","IB SL","AP","University"];
const ESSAY_TYPES = [["analytical","Analytical"],["argumentative","Argumentative"],["comparative","Comparative"],["narrative","Narrative"]];
const GRADE_TYPES = ["Argumentative","Analytical","Narrative","Descriptive","Comparative","Research"];

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: "13px 20px", fontFamily: "var(--mono)", fontSize: 11,
  letterSpacing: "0.06em", textTransform: "uppercase" as const,
  background: active ? "var(--ink)" : "var(--paper)",
  color: active ? "var(--paper)" : "var(--ink-2)", border: "none", cursor: "pointer",
});

export default function EssayWorkshopPage() {
  const [tab, setTab] = useState<"plan" | "argue" | "grade">("plan");

  // Shared
  const [subject, setSubject] = useState("History");
  const [level,   setLevel]   = useState("A-Level");

  // Plan state
  const [prompt,      setPrompt]      = useState("");
  const [words,       setWords]       = useState("1000");
  const [essayType,   setEssayType]   = useState("analytical");
  const [blueprint,   setBlueprint]   = useState<Blueprint | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError,   setPlanError]   = useState("");

  // Argue state
  const [claim,      setClaim]      = useState("");
  const [evidence,   setEvidence]   = useState("");
  const [argPlan,    setArgPlan]    = useState<ArgumentPlan | null>(null);
  const [argLoading, setArgLoading] = useState(false);
  const [argError,   setArgError]   = useState("");
  const [argCopied,  setArgCopied]  = useState(false);

  // Grade state
  const [essay,        setEssay]        = useState("");
  const [gradePrompt,  setGradePrompt]  = useState("");
  const [gradeType,    setGradeType]    = useState("Argumentative");
  const [grade,        setGrade]        = useState<Grade | null>(null);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeError,   setGradeError]   = useState("");

  function switchTab(t: "plan" | "argue" | "grade", prefill?: { claim?: string }) {
    if (prefill?.claim) setClaim(prefill.claim);
    setTab(t);
  }

  async function generatePlan() {
    if (!prompt.trim()) { setPlanError("Enter your essay question."); return; }
    setPlanLoading(true); setPlanError("");
    try {
      const res  = await callAI({ tool: "essay_blueprint", subject, level, prompt, words, type: essayType });
      const data = await res.json();
      if (!res.ok || !data.sections) { setPlanError("Could not generate blueprint."); return; }
      setBlueprint(data);
    } catch { setPlanError("Network error."); }
    finally { setPlanLoading(false); }
  }

  async function generateArgument() {
    if (!claim.trim()) { setArgError("Enter a claim or essay question."); return; }
    setArgLoading(true); setArgError("");
    try {
      const res  = await callAI({ tool: "argument", claim, subject, level, evidence });
      const data = await res.json();
      if (!res.ok || !data.points) { setArgError(data.error || "Could not build argument."); return; }
      setArgPlan(data);
    } catch { setArgError("Network error."); }
    finally { setArgLoading(false); }
  }

  function copyArgPlan() {
    if (!argPlan) return;
    const t = [
      `THESIS: ${argPlan.thesis}`,
      `\nINTRODUCTION:\n${argPlan.intro}`,
      ...argPlan.points.map((p, i) => `\nPOINT ${i+1}:\nP: ${p.point}\nE: ${p.evidence}\nE: ${p.explain}\nL: ${p.link}`),
      `\nCOUNTER-ARGUMENT:\n${argPlan.counter.argument}`,
      `REBUTTAL: ${argPlan.counter.rebuttal}`,
      `\nCONCLUSION:\n${argPlan.conclusion}`,
    ].join("\n");
    navigator.clipboard.writeText(t).then(() => { setArgCopied(true); setTimeout(() => setArgCopied(false), 2000); });
  }

  async function gradeEssay() {
    if (essay.trim().length < 100) { setGradeError("Essay must be at least 100 characters."); return; }
    setGradeLoading(true); setGradeError(""); setGrade(null);
    try {
      const res  = await callAI({ tool: "essay_grade", essay, subject, level, type: gradeType, prompt: gradePrompt });
      const data = await res.json();
      if (!res.ok) { setGradeError(data.error || "Failed."); return; }
      if (!data.criteria) { setGradeError("Could not grade — try again."); return; }
      setGrade(data);
    } catch { setGradeError("Network error."); }
    finally { setGradeLoading(false); }
  }

  const wc = essay.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Essay Workshop</div>
        <div style={{ display: "flex", border: "1px solid var(--ink)" }}>
          <button onClick={() => setTab("plan")}  style={{ ...TAB_STYLE(tab === "plan"),  borderRight: "1px solid var(--rule)" }}>Plan</button>
          <button onClick={() => setTab("argue")} style={{ ...TAB_STYLE(tab === "argue"), borderRight: "1px solid var(--rule)" }}>Argue</button>
          <button onClick={() => setTab("grade")} style={TAB_STYLE(tab === "grade")}>Grade</button>
        </div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>
          {tab === "plan" ? "Turn prompt → winning structure" : tab === "argue" ? "Build a P-E-E-L argument" : `${wc} words`}
        </div>
      </header>

      {/* Shared subject + level strip */}
      <div style={{ borderBottom: "1px solid var(--rule)", padding: "12px 44px", background: "var(--paper-2)", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
          <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginRight: 4 }}>Subject</span>
          {SUBJECTS.map(s => (
            <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 7px", border: `1px solid ${subject === s ? "var(--ink)" : "var(--rule)"}`, background: subject === s ? "var(--ink)" : "transparent", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginRight: 4 }}>Level</span>
          {LEVELS.map(l => (
            <button key={l} onClick={() => setLevel(l)} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 7px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "transparent", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── PLAN TAB ───────────────────────────────────── */}
      {tab === "plan" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 800, margin: "0 auto" }}>
          {!blueprint ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Essay type</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ESSAY_TYPES.map(([v, l]) => (
                    <button key={v} onClick={() => setEssayType(v)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${essayType === v ? "var(--ink)" : "var(--rule)"}`, background: essayType === v ? "var(--ink)" : "var(--paper)", color: essayType === v ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Essay question / prompt</div>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder="Paste your exact essay question here…"
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical" }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Word limit: {words}</div>
                <input type="range" min="400" max="3000" step="100" value={words} onChange={e => setWords(e.target.value)} style={{ width: "100%", accentColor: "var(--cinnabar-ink)" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>400</span>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>3000 words</span>
                </div>
              </div>
              {planError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{planError}</div>}
              <button className="btn" onClick={generatePlan} disabled={planLoading} style={{ width: "100%", opacity: planLoading ? 0.5 : 1 }}>
                {planLoading ? "Building blueprint…" : "Build my essay blueprint →"}
              </button>
              {planLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)" }}>Blueprint · {subject} · {level}</div>
                  <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>{blueprint.totalWords} words total</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn ghost" onClick={() => switchTab("argue", { claim: blueprint.thesis })}>Argue from thesis →</button>
                  <button className="btn ghost" onClick={() => setBlueprint(null)}>New blueprint</button>
                </div>
              </div>
              <div style={{ border: "2px solid var(--ink)", padding: "20px 24px", marginBottom: 28 }}>
                <div className="mono cin" style={{ marginBottom: 8 }}>Thesis statement</div>
                <AIOutput text={blueprint.thesis} variant="principle" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
                {blueprint.sections.map((s, i) => (
                  <div key={i} style={{ border: "1px solid var(--rule)", padding: "18px 22px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, marginRight: 8 }}>{String(i+1).padStart(2,"0")}</span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 700 }}>{s.title}</span>
                      </div>
                      <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>~{s.wordCount} words</span>
                    </div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginBottom: 10, fontStyle: "italic" }}>{s.purpose}</div>
                    {s.points.map((p, j) => (
                      <div key={j} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                        <span style={{ color: "var(--rule)", fontFamily: "var(--mono)", fontSize: 10 }}>·</span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{p}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                      <span className="mono" style={{ fontSize: 9, color: "#1a6091" }}>OPEN WITH · </span>
                      <span style={{ fontFamily: "var(--serif)", fontSize: 12, fontStyle: "italic", color: "var(--ink-2)" }}>{s.openWith}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div style={{ border: "1px solid #2d7a3c", padding: "16px" }}>
                  <div className="mono" style={{ color: "#2d7a3c", marginBottom: 10 }}>Do</div>
                  {blueprint.dos.map((d, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 6, lineHeight: 1.5 }}>✓ {d}</div>)}
                </div>
                <div style={{ border: "1px solid var(--cinnabar-ink)", padding: "16px" }}>
                  <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 10 }}>Avoid</div>
                  {blueprint.donts.map((d, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 6, lineHeight: 1.5 }}>✗ {d}</div>)}
                </div>
              </div>
              <div style={{ padding: "14px 18px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>KEY TERMS TO USE</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {blueprint.keyTerms.map((t, i) => <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "3px 8px", border: "1px solid var(--rule)", color: "var(--ink)" }}>{t}</span>)}
                </div>
              </div>
            </>
          )}
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      )}

      {/* ── ARGUE TAB ──────────────────────────────────── */}
      {tab === "argue" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 820, margin: "0 auto" }}>
          {!argPlan ? (
            <>
              <div className="mono cin" style={{ marginBottom: 8 }}>Point. Evidence. Explain. Link.</div>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Build a full P-E-E-L argument from any claim.</h2>
              <div style={{ marginBottom: 14 }}>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Claim, thesis, or essay question <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
                <textarea value={claim} onChange={e => setClaim(e.target.value)} rows={3}
                  placeholder="e.g. 'To what extent was nationalism the primary cause of WWI?' or 'Stalin was a more effective leader than Hitler'"
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Key evidence you have (optional)</div>
                <input value={evidence} onChange={e => setEvidence(e.target.value)} placeholder="e.g. Treaty of Versailles, economic data, specific quotes…"
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
              </div>
              {argError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{argError}</div>}
              <button className="btn" onClick={generateArgument} disabled={argLoading} style={{ width: "100%", opacity: argLoading ? 0.5 : 1 }}>
                {argLoading ? "Building argument…" : "Build my argument →"}
              </button>
              {argLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div className="mono" style={{ color: "var(--ink-3)" }}>Argument · {subject}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn ghost" onClick={copyArgPlan}>{argCopied ? "Copied!" : "Copy plan"}</button>
                  <button className="btn ghost" onClick={() => setArgPlan(null)}>New argument</button>
                </div>
              </div>
              <div style={{ border: "2px solid var(--ink)", padding: "18px 22px", marginBottom: 20 }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 8, letterSpacing: "0.08em" }}>THESIS STATEMENT</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 16, lineHeight: 1.7, fontStyle: "italic" }}>{argPlan.thesis}</div>
              </div>
              <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", marginBottom: 20 }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>INTRODUCTION</div>
                <AIOutput text={argPlan.intro} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {argPlan.points.map((p, i) => (
                  <div key={i} style={{ border: "1px solid var(--rule)", padding: "16px 20px" }}>
                    <div className="mono cin" style={{ marginBottom: 12 }}>Point {i + 1}</div>
                    {([["P — POINT", p.point, "var(--cinnabar-ink)"], ["E — EVIDENCE", p.evidence, "#1a6091"], ["E — EXPLAIN", p.explain, "var(--ink-3)"], ["L — LINK", p.link, "#2d7a3c"]] as [string, string, string][]).map(([label, text, color]) => (
                      <div key={label} style={{ marginBottom: 10 }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color, marginBottom: 4 }}>{label}</div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{text}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", marginBottom: 20 }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 12 }}>COUNTER-ARGUMENT & REBUTTAL</div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 4 }}>COUNTER</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{argPlan.counter.argument}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#2d7a3c", marginBottom: 4 }}>REBUTTAL</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{argPlan.counter.rebuttal}</div>
                </div>
              </div>
              <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", marginBottom: 20 }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>CONCLUSION</div>
                <AIOutput text={argPlan.conclusion} />
              </div>
              <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
                  <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>KEY PHRASES TO USE</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {argPlan.keyPhrases.map((phrase, i) => <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", border: "1px solid var(--rule)", color: "var(--ink-2)" }}>{phrase}</span>)}
                  </div>
                </div>
                <div style={{ border: "1px solid #1a6091", padding: "14px 16px", background: "rgba(26,96,145,0.04)" }}>
                  <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 8 }}>EXAM TIP</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{argPlan.examTip}</div>
                </div>
              </div>
            </>
          )}
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      )}

      {/* ── GRADE TAB ──────────────────────────────────── */}
      {tab === "grade" && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: grade ? 1100 : 800, margin: "0 auto" }}>
          {!grade ? (
            <>
              <div className="mono cin" style={{ marginBottom: 8 }}>Grade my essay</div>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Paste your essay. Get a real grade.</h2>
              <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Essay type</div>
                  <select value={gradeType} onChange={e => setGradeType(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 8px", color: "var(--ink)" }}>
                    {GRADE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Essay prompt / question (optional)</div>
                  <input value={gradePrompt} onChange={e => setGradePrompt(e.target.value)} placeholder="Paste the question or title…"
                    style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Your essay *</div>
                <textarea value={essay} onChange={e => setEssay(e.target.value)} rows={16} placeholder="Paste your full essay here…"
                  style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.7 }} />
              </div>
              {gradeError && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{gradeError}</div>}
              <button className="btn" onClick={gradeEssay} disabled={gradeLoading || essay.trim().length < 100} style={{ width: "100%", opacity: gradeLoading ? 0.5 : 1 }}>
                {gradeLoading ? "Grading essay…" : "Grade my essay →"}
              </button>
              {gradeLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div className="mono" style={{ color: "var(--ink-3)" }}>Essay Graded · {subject} · {level}</div>
                <button className="btn ghost" onClick={() => setGrade(null)}>Grade another →</button>
              </div>
              <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32 }}>
                <div>
                  <div style={{ border: "2px solid var(--ink)", padding: "28px 32px", marginBottom: 24, display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
                    <div>
                      <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 4 }}>OVERALL GRADE</div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 64, fontWeight: 700, lineHeight: 1, color: "var(--cinnabar-ink)" }}>{grade.overall}</div>
                      <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>{grade.band}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 6 }}>TOTAL SCORE</div>
                      <div style={{ height: 8, background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                        <div style={{ height: "100%", width: `${(grade.totalScore / grade.maxScore) * 100}%`, background: "var(--cinnabar)" }} />
                      </div>
                      <div className="mono" style={{ marginTop: 4 }}>{grade.totalScore} / {grade.maxScore}</div>
                    </div>
                  </div>
                  <div style={{ border: "1px solid var(--ink)", marginBottom: 24 }}>
                    <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                      <div className="mono cin">Marking criteria</div>
                    </div>
                    {grade.criteria.map((c, i) => (
                      <div key={i} style={{ padding: "14px 18px", borderBottom: i < grade.criteria.length - 1 ? "1px solid var(--rule)" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                          <span className="mono" style={{ color: "var(--cinnabar-ink)" }}>{c.score}/{c.max}</span>
                        </div>
                        <div style={{ height: 3, background: "var(--paper-2)", border: "1px solid var(--rule)", marginBottom: 6 }}>
                          <div style={{ height: "100%", width: `${(c.score / c.max) * 100}%`, background: c.score / c.max > 0.75 ? "#2d7a3c" : c.score / c.max > 0.5 ? "#c97a1a" : "#c44b2a" }} />
                        </div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{c.feedback}</div>
                      </div>
                    ))}
                  </div>
                  <AIOutput text={grade.summary} variant="principle" />
                </div>
                <div>
                  <div style={{ border: "1px solid var(--ink)", padding: "18px", marginBottom: 16 }}>
                    <div className="mono cin" style={{ marginBottom: 10 }}>Strengths</div>
                    {grade.strengths.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <span style={{ color: "#2d7a3c", fontFamily: "var(--mono)", fontSize: 11 }}>✓</span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ border: "1px solid var(--ink)", padding: "18px" }}>
                    <div className="mono cin" style={{ marginBottom: 10 }}>Improvements</div>
                    {grade.improvements.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <span style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--mono)", fontSize: 11 }}>{String(i+1).padStart(2,"0")}</span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      )}
    </div>
  );
}
