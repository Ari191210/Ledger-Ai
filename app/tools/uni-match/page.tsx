"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type TabType = "uni" | "subjects" | "career";

// Uni Match types
type UniMatch = { name: string; country: string; fitScore: number; why: string; requirements: string; strengths: string[]; applyBy: string; reach: "safety" | "match" | "reach" };
type UniResult = { summary: string; unis: UniMatch[]; advice: string; gaps: string[] };

// Subject Picker types
type SubjectRec = { combo: string[]; why: string; careerFit: string[]; uniReqs: string; difficulty: "manageable" | "challenging" | "intense"; score: number };
type SubjectResult = { intro: string; combos: SubjectRec[]; avoid: string[]; tip: string };

// Career types
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

type CareerOutput = { streams: { name: string; why: string; roles: string[] }[]; colleges: { name: string; country: string; why: string }[]; exams: { name: string; desc: string }[]; roadmap: { period: string; milestones: string[] }[] };

const COUNTRIES = ["United Kingdom", "United States", "Canada", "Australia", "Netherlands", "Germany", "Singapore", "India", "Any"];
const FIELDS    = ["Medicine", "Engineering", "Law", "Economics / Finance", "Computer Science", "Architecture", "Business", "Natural Sciences", "Psychology", "Arts & Design", "International Relations", "Mathematics", "Education", "Journalism"];
const BOARDS    = ["IB", "A-Level", "CBSE", "ICSE", "AP", "SAT", "IGCSE"];
const IB_ALL    = ["English A Lit", "English A Lang&Lit", "Hindi A", "French B", "Spanish B", "Economics", "History", "Geography", "Psychology", "Business Management", "Philosophy", "Biology", "Chemistry", "Physics", "Computer Science", "Environmental Systems", "Mathematics AA", "Mathematics AI", "Visual Arts", "Music", "Theatre"];
const ALEVELS   = ["Mathematics", "Further Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Business", "History", "Geography", "English Literature", "Psychology", "Computer Science", "Law", "Sociology", "Political Science", "French", "Spanish", "Art & Design", "Music"];
const CAREERS   = ["Medicine", "Engineering", "Law", "Finance & Banking", "Computer Science", "Architecture", "Business", "Research / Academia", "Journalism", "Education", "Arts & Design", "Psychology", "International Relations", "Entrepreneurship"];

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  padding: "10px 20px", fontFamily: "var(--mono)", fontSize: 10,
  background: active ? "var(--ink)" : "var(--paper)", color: active ? "var(--paper)" : "var(--ink)",
  border: "none", borderRight: "1px solid var(--ink)", cursor: "pointer", letterSpacing: "0.05em",
});

const reachColor = (r: string) => r === "safety" ? "#2d7a3c" : r === "match" ? "#c97a1a" : "#c44b2a";
const reachLabel = (r: string) => r === "safety" ? "Likely" : r === "match" ? "Good chance" : "Reach";
const diffColor  = (d: string) => d === "manageable" ? "#2d7a3c" : d === "challenging" ? "#c97a1a" : "#c44b2a";

export default function FutureFinderPage() {
  const [tab, setTab] = useState<TabType>("uni");

  // Uni state
  const [board,      setBoard]      = useState("IB");
  const [grade,      setGrade]      = useState("");
  const [field,      setField]      = useState("Economics / Finance");
  const [countries,  setCountries]  = useState<string[]>(["United Kingdom"]);
  const [extra,      setExtra]      = useState("");
  const [uniResult,  setUniResult]  = useState<UniResult | null>(null);
  const [unLoading,  setUnLoading]  = useState(false);
  const [unError,    setUnError]    = useState("");

  // Subject state
  const [spBoard,     setSpBoard]     = useState<"IB" | "A-Level">("IB");
  const [interests,   setInterests]   = useState<string[]>([]);
  const [career,      setCareer]      = useState<string[]>([]);
  const [spExtra,     setSpExtra]     = useState("");
  const [spResult,    setSpResult]    = useState<SubjectResult | null>(null);
  const [spLoading,   setSpLoading]   = useState(false);
  const [spError,     setSpError]     = useState("");

  // Career state
  const [answers,    setAnswers]    = useState<Record<string, string>>({});
  const [carOutput,  setCarOutput]  = useState<CareerOutput | null>(null);
  const [carLoading, setCarLoading] = useState(false);
  const [carError,   setCarError]   = useState("");
  const [step,       setStep]       = useState(0);

  useEffect(() => {
    try {
      const a = localStorage.getItem("ledger-career-answers");
      if (a) setAnswers(JSON.parse(a));
      const o = localStorage.getItem("ledger-career-output");
      if (o) setCarOutput(JSON.parse(o));
    } catch {}
  }, []);

  useEffect(() => { try { localStorage.setItem("ledger-career-answers", JSON.stringify(answers)); } catch {} }, [answers]);
  useEffect(() => { try { if (carOutput) localStorage.setItem("ledger-career-output", JSON.stringify(carOutput)); } catch {} }, [carOutput]);

  function toggleCountry(c: string) { setCountries(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]); }
  function toggle<T>(arr: T[], item: T, set: (v: T[]) => void) { set(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]); }

  async function generateUni() {
    if (!grade.trim())       { setUnError("Enter your predicted grades."); return; }
    if (!countries.length)   { setUnError("Select at least one country."); return; }
    setUnLoading(true); setUnError("");
    try {
      const res  = await callAI({ tool: "uni_match", board, grade, field, countries, extra });
      const data = await res.json();
      if (!res.ok || !data.unis) { setUnError("Could not generate recommendations."); return; }
      setUniResult(data);
    } catch { setUnError("Network error."); }
    finally { setUnLoading(false); }
  }

  async function generateSubjects() {
    if (interests.length < 2) { setSpError("Select at least 2 subjects you like."); return; }
    if (!career.length)        { setSpError("Select at least 1 career direction."); return; }
    setSpLoading(true); setSpError("");
    try {
      const res  = await callAI({ tool: "subject_picker", board: spBoard, interests, career, extra: spExtra });
      const data = await res.json();
      if (!res.ok || !data.combos) { setSpError("Could not generate recommendations."); return; }
      setSpResult(data);
    } catch { setSpError("Network error."); }
    finally { setSpLoading(false); }
  }

  async function generateCareer() {
    setCarLoading(true); setCarError(""); setCarOutput(null);
    try {
      const res  = await callAI({ tool: "career", answers });
      const data = await res.json();
      if (!res.ok) { setCarError(data.error || "Something went wrong."); return; }
      setCarOutput(data);
    } catch { setCarError("Network error."); }
    finally { setCarLoading(false); }
  }

  const subjects       = spBoard === "IB" ? IB_ALL : ALEVELS;
  const allAnswered    = QUESTIONS.every((q) => answers[q.id]);
  const currentQ       = QUESTIONS[step];

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Future Finder</div>
        <div style={{ display: "flex", border: "1px solid var(--ink)" }}>
          <button style={TAB_STYLE(tab === "uni")}      onClick={() => setTab("uni")}>University Match</button>
          <button style={TAB_STYLE(tab === "subjects")} onClick={() => setTab("subjects")}>Subject Picker</button>
          <button style={{ ...TAB_STYLE(tab === "career"), borderRight: "none" }} onClick={() => setTab("career")}>Career Path</button>
        </div>
      </header>

      {/* ── UNIVERSITY MATCH ── */}
      {tab === "uni" && !uniResult && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Find your university</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Your grades. Your field. Your matches.</h2>
          <div style={{ marginBottom: 16 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Your board</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {BOARDS.map(b => <button key={b} onClick={() => setBoard(b)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${board === b ? "var(--ink)" : "var(--rule)"}`, background: board === b ? "var(--ink)" : "var(--paper)", color: board === b ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{b}</button>)}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Predicted / achieved grades</div>
            <input value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. IB 38/42, A-Level AAB, CBSE 94%…"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Field of study</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {FIELDS.map(f => <button key={f} onClick={() => setField(f)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${field === f ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: field === f ? "var(--cinnabar-ink)" : "var(--paper)", color: field === f ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{f}</button>)}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Countries</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {COUNTRIES.map(c => <button key={c} onClick={() => toggleCountry(c)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${countries.includes(c) ? "var(--ink)" : "var(--rule)"}`, background: countries.includes(c) ? "var(--ink)" : "var(--paper)", color: countries.includes(c) ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{c}</button>)}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Anything else? (optional)</div>
            <input value={extra} onChange={e => setExtra(e.target.value)} placeholder="e.g. small campus, strong research, scholarship opportunities…"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          {unError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{unError}</div>}
          <button className="btn" onClick={generateUni} disabled={unLoading} style={{ width: "100%", opacity: unLoading ? 0.5 : 1 }}>
            {unLoading ? "Finding your matches…" : "Find my universities →"}
          </button>
          {unLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}

      {tab === "uni" && uniResult && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <button className="btn ghost" onClick={() => setUniResult(null)}>Start over</button>
          </div>
          <div style={{ marginBottom: 28, padding: "16px 20px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}><AIOutput text={uniResult.summary} variant="principle" /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
            {uniResult.unis.map((u, i) => (
              <div key={i} style={{ border: i === 0 ? "2px solid var(--ink)" : "1px solid var(--rule)", padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    {i === 0 && <div className="mono cin" style={{ marginBottom: 4 }}>Top match</div>}
                    <div style={{ fontFamily: "var(--sans)", fontSize: 16, fontWeight: 700 }}>{u.name}</div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>{u.country}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "3px 8px", border: `1px solid ${reachColor(u.reach)}`, color: reachColor(u.reach) }}>{reachLabel(u.reach)}</span>
                    <span className="mono" style={{ fontSize: 10, color: "var(--cinnabar-ink)" }}>{u.fitScore}/10 fit</span>
                  </div>
                </div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", marginBottom: 10 }}>{u.why}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {u.strengths.map((s, j) => <span key={j} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", border: "1px solid var(--rule)", color: "var(--ink-2)" }}>{s}</span>)}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ padding: "8px 12px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                    <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>REQUIREMENTS · </span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 12 }}>{u.requirements}</span>
                  </div>
                  {u.applyBy && <div style={{ padding: "8px 12px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                    <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>APPLY BY · </span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 12 }}>{u.applyBy}</span>
                  </div>}
                </div>
              </div>
            ))}
          </div>
          {uniResult.gaps.length > 0 && (
            <div style={{ border: "1px solid var(--cinnabar-ink)", padding: "16px 20px", marginBottom: 20 }}>
              <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 8 }}>Gaps to address before applying</div>
              {uniResult.gaps.map((g, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5 }}>· {g}</div>)}
            </div>
          )}
          <div style={{ padding: "14px 18px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
            <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 4 }}>APPLICATION ADVICE</div>
            <AIOutput text={uniResult.advice} />
          </div>
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}

      {/* ── SUBJECT PICKER ── */}
      {tab === "subjects" && !spResult && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 680, margin: "0 auto" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Grade 11 subject selection</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Find the perfect combination.</h2>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Your board</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["IB", "A-Level"] as const).map(b => (
                <button key={b} onClick={() => { setSpBoard(b); setInterests([]); }} style={{ flex: 1, padding: "12px", border: `2px solid ${spBoard === b ? "var(--ink)" : "var(--rule)"}`, background: spBoard === b ? "var(--ink)" : "var(--paper)", color: spBoard === b ? "var(--paper)" : "var(--ink)", fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{b}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Subjects you like or are good at (pick 2–6)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {subjects.map(s => <button key={s} onClick={() => toggle(interests, s, setInterests)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${interests.includes(s) ? "var(--ink)" : "var(--rule)"}`, background: interests.includes(s) ? "var(--ink)" : "var(--paper)", color: interests.includes(s) ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Career interests (pick 1–3)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CAREERS.map(c => <button key={c} onClick={() => toggle(career, c, setCareer)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${career.includes(c) ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: career.includes(c) ? "var(--cinnabar-ink)" : "var(--paper)", color: career.includes(c) ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{c}</button>)}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Anything else? (optional)</div>
            <input value={spExtra} onChange={e => setSpExtra(e.target.value)} placeholder="e.g. I want to apply to UK universities, strong in maths but hate memorisation…"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          {spError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{spError}</div>}
          <button className="btn" onClick={generateSubjects} disabled={spLoading} style={{ width: "100%", opacity: spLoading ? 0.5 : 1 }}>
            {spLoading ? "Finding your perfect combination…" : "Get subject recommendations →"}
          </button>
          {spLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}

      {tab === "subjects" && spResult && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <button className="btn ghost" onClick={() => setSpResult(null)}>Start over</button>
          </div>
          <div style={{ marginBottom: 28, padding: "16px 20px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}><AIOutput text={spResult.intro} variant="principle" /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 28 }}>
            {spResult.combos.map((c, i) => (
              <div key={i} style={{ border: i === 0 ? "2px solid var(--ink)" : "1px solid var(--rule)", padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    {i === 0 && <div className="mono cin" style={{ marginBottom: 6 }}>Best fit for you</div>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {c.combo.map((s, j) => <span key={j} style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, padding: "4px 10px", background: i === 0 ? "var(--ink)" : "var(--paper-2)", color: i === 0 ? "var(--paper)" : "var(--ink)", border: "1px solid var(--rule)" }}>{s}</span>)}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span className="mono" style={{ fontSize: 10, color: diffColor(c.difficulty) }}>{c.difficulty.toUpperCase()}</span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--cinnabar-ink)" }}>{c.score}/10</span>
                  </div>
                </div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", marginBottom: 10 }}>{c.why}</div>
                <div style={{ marginBottom: 8 }}>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>OPENS DOORS TO · </span>
                  {c.careerFit.map((cf, j) => <span key={j} style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-2)" }}>{cf}{j < c.careerFit.length - 1 ? " · " : ""}</span>)}
                </div>
                <div style={{ padding: "8px 12px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>UNI REQUIREMENTS · </span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{c.uniReqs}</span>
                </div>
              </div>
            ))}
          </div>
          {spResult.avoid.length > 0 && (
            <div style={{ border: "1px solid var(--cinnabar-ink)", padding: "16px 20px", marginBottom: 20 }}>
              <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 8 }}>Combinations to avoid</div>
              {spResult.avoid.map((a, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 4 }}>· {a}</div>)}
            </div>
          )}
          <div style={{ padding: "14px 18px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
            <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 4 }}>COACH TIP</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{spResult.tip}</div>
          </div>
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}

      {/* ── CAREER PATH ── */}
      {tab === "career" && !carOutput && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 680, margin: "0 auto" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Ten questions. One direction.</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Discover which career streams fit you.</h2>

          <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>QUESTION {step + 1} OF {QUESTIONS.length}</div>
            <div style={{ height: 3, background: "var(--rule)", marginTop: 8 }}>
              <div style={{ height: "100%", width: `${((step + 1) / QUESTIONS.length) * 100}%`, background: "var(--cinnabar-ink)", transition: "width 300ms" }} />
            </div>
          </div>

          <div style={{ border: "2px solid var(--ink)", padding: "24px 28px", marginBottom: 20 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 500, lineHeight: 1.5, marginBottom: 20 }}>{currentQ.text}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {currentQ.opts.map((opt) => (
                <button key={opt} onClick={() => { setAnswers(a => ({ ...a, [currentQ.id]: opt })); if (step < QUESTIONS.length - 1) setStep(s => s + 1); }}
                  style={{ padding: "12px 16px", border: `1px solid ${answers[currentQ.id] === opt ? "var(--ink)" : "var(--rule)"}`, background: answers[currentQ.id] === opt ? "var(--ink)" : "var(--paper)", color: answers[currentQ.id] === opt ? "var(--paper)" : "var(--ink)", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 13 }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="btn ghost" style={{ opacity: step === 0 ? 0.4 : 1 }}>← Back</button>
            {step < QUESTIONS.length - 1
              ? <button onClick={() => setStep(s => Math.min(QUESTIONS.length - 1, s + 1))} disabled={!answers[currentQ.id]} className="btn" style={{ flex: 1, opacity: answers[currentQ.id] ? 1 : 0.4 }}>Next question →</button>
              : <button onClick={generateCareer} disabled={!allAnswered || carLoading} className="btn" style={{ flex: 1, opacity: !allAnswered || carLoading ? 0.4 : 1 }}>{carLoading ? "Analysing…" : "See my career paths →"}</button>
            }
          </div>
          {carLoading && <AIThinking />}
          {carError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{carError}</div>}
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}

      {tab === "career" && carOutput && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <button className="btn ghost" onClick={() => { setCarOutput(null); setAnswers({}); setStep(0); }}>Retake quiz</button>
          </div>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <div>
              <div className="mono cin" style={{ marginBottom: 14 }}>Recommended streams</div>
              {carOutput.streams.map((s, i) => (
                <div key={i} style={{ border: "1px solid var(--ink)", borderBottom: i < carOutput.streams.length - 1 ? "none" : "1px solid var(--ink)", padding: "20px 18px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span className="mono cin">{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600 }}>{s.name}</span>
                  </div>
                  <div style={{ margin: "8px 0 10px" }}><AIOutput text={s.why} /></div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {s.roles.map((r, j) => <span key={j} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", border: "1px solid var(--rule)", color: "var(--ink-3)", textTransform: "uppercase" }}>{r}</span>)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <div className="mono cin" style={{ marginBottom: 10 }}>Target colleges</div>
                <div style={{ border: "1px solid var(--ink)" }}>
                  {carOutput.colleges.map((c, i) => (
                    <div key={i} style={{ padding: "12px 16px", borderBottom: i < carOutput.colleges.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 12, alignItems: "baseline" }}>
                      <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{c.country} · {c.why}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mono cin" style={{ marginBottom: 10 }}>Entrance exams</div>
                <div style={{ border: "1px solid var(--ink)" }}>
                  {carOutput.exams.map((e, i) => (
                    <div key={i} style={{ padding: "12px 16px", borderBottom: i < carOutput.exams.length - 1 ? "1px solid var(--rule)" : "none" }}>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)" }}>{e.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 40 }}>
            <div className="mono cin" style={{ marginBottom: 14 }}>Five-year roadmap</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: "1px solid var(--ink)", borderLeft: "1px solid var(--ink)" }}>
              {carOutput.roadmap.map((r, i) => (
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
            <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
          </div>
        </main>
      )}
    </div>
  );
}
