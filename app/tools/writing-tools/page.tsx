"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI, callAIOrThrow, AIError } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";
import { AIErrorDisplay } from "@/components/ai-error";

// ── Shared essay types ────────────────────────────────────────────────────────

type Section      = { title: string; purpose: string; points: string[]; wordCount: number; openWith: string };
type Blueprint    = { title: string; thesis: string; totalWords: number; sections: Section[]; dos: string[]; donts: string[]; keyTerms: string[] };
type Point        = { point: string; evidence: string; explain: string; link: string };
type ArgumentPlan = { thesis: string; intro: string; points: Point[]; counter: { argument: string; rebuttal: string }; conclusion: string; keyPhrases: string[]; examTip: string };
type Criterion    = { name: string; score: number; max: number; feedback: string };
type Grade        = { overall: string; band: string; totalScore: number; maxScore: number; criteria: Criterion[]; strengths: string[]; improvements: string[]; summary: string };

// ── Writing Polish types ──────────────────────────────────────────────────────

type Issue         = { type: string; original: string; suggestion: string; explanation: string };
type GrammarResult = { overallScore: number; band: string; issues: Issue[]; strengths: string[]; rewrite: string; academicPhrases: string[]; examTip: string };
type PSFeedback    = { score: number; hook: string; structure: string[]; paragraphNotes: string[]; tone: string; suggestions: string[]; rewrite: string };
type SourceType    = "book" | "journal" | "website" | "newspaper" | "video";

// ── Constants ─────────────────────────────────────────────────────────────────

const SUBJECTS    = ["Economics","History","English Literature","English Language","Biology","Geography","Psychology","Sociology","Philosophy","Political Science","Business","ToK"];
const LEVELS      = ["GCSE","IGCSE","A-Level","IB HL","IB SL","AP","University"];
const ESSAY_TYPES = [["analytical","Analytical"],["argumentative","Argumentative"],["comparative","Comparative"],["narrative","Narrative"]];
const GRADE_TYPES = ["Argumentative","Analytical","Narrative","Descriptive","Comparative","Research"];
const PURPOSES    = ["Essay","Report","Personal Statement","Dissertation","Email"];
const WORD_LIMITS = [250, 500, 650, 700, 1000];
const STYLES      = ["APA 7","MLA 9","Chicago 17","Harvard","Vancouver"];

const TYPE_COLORS: Record<string, string> = {
  Grammar: "var(--cinnabar-ink)", Style: "#1a6091",
  Vocabulary: "#2d7a3c", Punctuation: "#7a5c2d", Structure: "#6b3fa0",
};

const SOURCE_FIELDS: Record<SourceType, { key: string; label: string; placeholder: string }[]> = {
  book:      [{ key:"authors",label:"Author(s)",placeholder:"Last, F. M., & Last, F." },{ key:"year",label:"Year",placeholder:"2023" },{ key:"title",label:"Book title",placeholder:"The title of the book" },{ key:"publisher",label:"Publisher",placeholder:"Oxford University Press" },{ key:"doi",label:"DOI (optional)",placeholder:"10.xxxx/xxxxx" }],
  journal:   [{ key:"authors",label:"Author(s)",placeholder:"Last, F. M." },{ key:"year",label:"Year",placeholder:"2023" },{ key:"title",label:"Article title",placeholder:"The article title" },{ key:"journal",label:"Journal name",placeholder:"Nature" },{ key:"volume",label:"Volume",placeholder:"12" },{ key:"issue",label:"Issue",placeholder:"3" },{ key:"pages",label:"Pages",placeholder:"45-67" },{ key:"doi",label:"DOI",placeholder:"10.xxxx/xxxxx" }],
  website:   [{ key:"authors",label:"Author / Organisation",placeholder:"Last, F. or BBC" },{ key:"year",label:"Year",placeholder:"2024" },{ key:"title",label:"Page title",placeholder:"Article or page title" },{ key:"website",label:"Website name",placeholder:"BBC News" },{ key:"url",label:"URL",placeholder:"https://..." },{ key:"accessed",label:"Date accessed",placeholder:"15 March 2024" }],
  newspaper: [{ key:"authors",label:"Author",placeholder:"Last, F." },{ key:"year",label:"Year",placeholder:"2024" },{ key:"title",label:"Article title",placeholder:"Headline here" },{ key:"publisher",label:"Newspaper",placeholder:"The Guardian" },{ key:"pages",label:"Page (optional)",placeholder:"p. 12" }],
  video:     [{ key:"authors",label:"Creator / Channel",placeholder:"Name, F. or Channel Name" },{ key:"year",label:"Year",placeholder:"2023" },{ key:"title",label:"Video title",placeholder:"Video title" },{ key:"url",label:"URL",placeholder:"https://youtube.com/..." },{ key:"accessed",label:"Date accessed",placeholder:"5 Jan 2024" }],
};

// ── Citation formatter (no AI) ─────────────────────────────────────────────────

function formatCitation(type: SourceType, style: string, f: Record<string, string>): string {
  const authors  = f.authors || "Unknown Author";
  const year     = f.year    || "n.d.";
  const title    = f.title   || "Untitled";
  const pub      = f.publisher || f.journal || f.website || "";
  const vol      = f.volume; const iss = f.issue; const pp = f.pages;
  const url      = f.url; const doi = f.doi; const accessed = f.accessed || "n.d.";

  if (style === "APA 7") {
    if (type === "book")    return `${authors} (${year}). *${title}*. ${pub}. ${doi ? `https://doi.org/${doi}` : ""}`;
    if (type === "journal") return `${authors} (${year}). ${title}. *${pub}*, *${vol || ""}*${iss ? `(${iss})` : ""}, ${pp || ""}. ${doi ? `https://doi.org/${doi}` : url || ""}`;
    if (type === "website") return `${authors} (${year}, ${accessed}). *${title}*. ${pub}. ${url}`;
    return `${authors} (${year}). ${title}. ${pub}.`;
  }
  if (style === "MLA 9") {
    if (type === "book")    return `${authors}. *${title}*. ${pub}, ${year}.`;
    if (type === "journal") return `${authors}. "${title}." *${pub}*, vol. ${vol || ""}, no. ${iss || ""}, ${year}, pp. ${pp || ""}. ${doi ? `doi:${doi}` : ""}`;
    if (type === "website") return `${authors}. "${title}." *${pub}*, ${year}, ${url}. Accessed ${accessed}.`;
    return `${authors}. "${title}." ${pub}, ${year}.`;
  }
  if (style === "Chicago 17") {
    if (type === "book")    return `${authors}. *${title}*. ${pub}, ${year}.`;
    if (type === "journal") return `${authors}. "${title}." *${pub}* ${vol || ""}${iss ? `, no. ${iss}` : ""} (${year}): ${pp || ""}. ${doi ? `https://doi.org/${doi}` : ""}`;
    return `${authors}. "${title}." ${pub}, ${year}. ${url || ""}`;
  }
  if (style === "Harvard") {
    if (type === "book")    return `${authors} (${year}) *${title}*. ${pub}.`;
    if (type === "journal") return `${authors} (${year}) '${title}', *${pub}*, ${vol || ""}${iss ? `(${iss})` : ""}, pp. ${pp || ""}. ${doi ? `doi: ${doi}` : ""}`;
    if (type === "website") return `${authors} (${year}) *${title}* [Online]. Available at: ${url} (Accessed: ${accessed}).`;
    return `${authors} (${year}) ${title}. ${pub}.`;
  }
  return `${authors} (${year}). ${title}. ${pub}.`;
}

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = "blueprint" | "argue" | "grade" | "polish" | "citation";
const TABS: [Tab, string][] = [
  ["blueprint", "Essay Blueprint"],
  ["argue",     "Argument Builder"],
  ["grade",     "Essay Grader"],
  ["polish",    "Writing Polish"],
  ["citation",  "Citation"],
];

// ── Tab: Essay Blueprint ──────────────────────────────────────────────────────

function EssayBlueprintTab({ subject, level, onArgue }: { subject: string; level: string; onArgue: (claim: string) => void }) {
  const [prompt,      setPrompt]      = useState("");
  const [words,       setWords]       = useState("1000");
  const [essayType,   setEssayType]   = useState("analytical");
  const [blueprint,   setBlueprint]   = useState<Blueprint | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<AIError | string | null>(null);

  async function generate() {
    if (!prompt.trim()) { setError("Enter your essay question."); return; }
    setLoading(true); setError(null);
    try {
      const data = await callAIOrThrow<Blueprint>({ tool: "essay_blueprint", subject, level, prompt, words, type: essayType });
      if (!data.sections) { setError("Could not generate blueprint. Please try again."); return; }
      setBlueprint(data);
    } catch (err) { setError(err instanceof AIError ? err : "Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  if (!blueprint) return (
    <div style={{ maxWidth: 800 }}>
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
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical" }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Word limit: {words}</div>
        <input type="range" min="400" max="3000" step="100" value={words} onChange={e => setWords(e.target.value)} style={{ width: "100%", accentColor: "var(--cinnabar-ink)" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>400</span>
          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>3000 words</span>
        </div>
      </div>
      {error && <AIErrorDisplay error={error} onRetry={generate} inline />}
      <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
        {loading ? "Building blueprint…" : "Build my essay blueprint →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Blueprint · {subject} · {level}</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>{blueprint.totalWords} words total</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={() => onArgue(blueprint.thesis)}>Argue from thesis →</button>
          <button className="btn ghost" onClick={() => setBlueprint(null)}>New blueprint</button>
        </div>
      </div>
      <div style={{ border: "none", padding: "20px 24px", marginBottom: 28 }}>
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
    </div>
  );
}

// ── Tab: Argument Builder ─────────────────────────────────────────────────────

function ArgumentBuilderTab({ subject, level, initialClaim }: { subject: string; level: string; initialClaim: string }) {
  const [claim,      setClaim]      = useState(initialClaim);
  const [evidence,   setEvidence]   = useState("");
  const [argPlan,    setArgPlan]    = useState<ArgumentPlan | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<AIError | string | null>(null);
  const [copied,     setCopied]     = useState(false);

  async function generate() {
    if (!claim.trim()) { setError("Enter a claim or essay question."); return; }
    setLoading(true); setError(null);
    try {
      const data = await callAIOrThrow<ArgumentPlan>({ tool: "argument", claim, subject, level, evidence });
      if (!data.points) { setError("Could not build argument. Please try again."); return; }
      setArgPlan(data);
    } catch (err) { setError(err instanceof AIError ? err : "Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  function copyPlan() {
    if (!argPlan) return;
    const t = [`THESIS: ${argPlan.thesis}`, `\nINTRODUCTION:\n${argPlan.intro}`, ...argPlan.points.map((p, i) => `\nPOINT ${i+1}:\nP: ${p.point}\nE: ${p.evidence}\nE: ${p.explain}\nL: ${p.link}`), `\nCOUNTER:\n${argPlan.counter.argument}`, `REBUTTAL: ${argPlan.counter.rebuttal}`, `\nCONCLUSION:\n${argPlan.conclusion}`].join("\n");
    navigator.clipboard.writeText(t).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (!argPlan) return (
    <div style={{ maxWidth: 820 }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Point. Evidence. Explain. Link.</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Build a full P-E-E-L argument from any claim.</h2>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Claim, thesis, or essay question <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
        <textarea value={claim} onChange={e => setClaim(e.target.value)} rows={3}
          placeholder="e.g. 'To what extent was nationalism the primary cause of WWI?'"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Key evidence you have (optional)</div>
        <input value={evidence} onChange={e => setEvidence(e.target.value)} placeholder="e.g. Treaty of Versailles, economic data, specific quotes…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      {error && <AIErrorDisplay error={error} onRetry={generate} inline />}
      <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
        {loading ? "Building argument…" : "Build my argument →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Argument · {subject}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={copyPlan}>{copied ? "Copied!" : "Copy plan"}</button>
          <button className="btn ghost" onClick={() => setArgPlan(null)}>New argument</button>
        </div>
      </div>
      <div style={{ border: "none", padding: "18px 22px", marginBottom: 20 }}>
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
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 12 }}>COUNTER-ARGUMENT &amp; REBUTTAL</div>
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
    </div>
  );
}

// ── Tab: Essay Grader ─────────────────────────────────────────────────────────

function EssayGraderTab({ subject, level }: { subject: string; level: string }) {
  const [essay,        setEssay]        = useState("");
  const [gradePrompt,  setGradePrompt]  = useState("");
  const [gradeType,    setGradeType]    = useState("Argumentative");
  const [grade,        setGrade]        = useState<Grade | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<AIError | string | null>(null);

  const wc = essay.trim().split(/\s+/).filter(Boolean).length;

  async function gradeEssay() {
    if (essay.trim().length < 100) { setError("Essay must be at least 100 characters."); return; }
    setLoading(true); setError(null); setGrade(null);
    try {
      const data = await callAIOrThrow<Grade>({ tool: "essay_grade", essay, subject, level, type: gradeType, prompt: gradePrompt });
      if (!data.criteria) { setError("Could not grade — try again."); return; }
      setGrade(data);
    } catch (err) { setError(err instanceof AIError ? err : "Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  if (!grade) return (
    <div style={{ maxWidth: 800 }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Grade my essay</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Paste your essay. Get a real grade.</h2>
      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Essay type</div>
          <select value={gradeType} onChange={e => setGradeType(e.target.value)} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "none", background: "var(--paper)", padding: "9px 8px", color: "var(--ink)" }}>
            {GRADE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Essay prompt / question (optional)</div>
          <input value={gradePrompt} onChange={e => setGradePrompt(e.target.value)} placeholder="Paste the question or title…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
      </div>
      <div style={{ marginBottom: 6 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Your essay *</div>
        <textarea value={essay} onChange={e => setEssay(e.target.value)} rows={16} placeholder="Paste your full essay here…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.7 }} />
      </div>
      <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 14, textAlign: "right" }}>{wc} words</div>
      {error && <AIErrorDisplay error={error} onRetry={gradeEssay} inline />}
      <button className="btn" onClick={gradeEssay} disabled={loading || essay.trim().length < 100} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
        {loading ? "Grading essay…" : "Grade my essay →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Essay Graded · {subject} · {level}</div>
        <button className="btn ghost" onClick={() => setGrade(null)}>Grade another →</button>
      </div>
      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32 }}>
        <div>
          <div style={{ border: "none", padding: "28px 32px", marginBottom: 24, display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
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
          <div style={{ border: "none", marginBottom: 24 }}>
            <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}><div className="mono cin">Marking criteria</div></div>
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
          <div style={{ border: "none", padding: "18px", marginBottom: 16 }}>
            <div className="mono cin" style={{ marginBottom: 10 }}>Strengths</div>
            {grade.strengths.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <span style={{ color: "#2d7a3c", fontFamily: "var(--mono)", fontSize: 11 }}>✓</span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ border: "none", padding: "18px" }}>
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
    </div>
  );
}

// ── Tab: Writing Polish ────────────────────────────────────────────────────────

function WritingPolishTab() {
  const [mode, setMode] = useState<"grammar" | "ps">("grammar");

  const [text,        setText]        = useState("");
  const [purpose,     setPurpose]     = useState("Essay");
  const [result,      setResult]      = useState<GrammarResult | null>(null);
  const [grLoading,   setGrLoading]   = useState(false);
  const [grError,     setGrError]     = useState("");
  const [showRewrite, setShowRewrite] = useState(false);

  const [ps,        setPs]        = useState("");
  const [psLimit,   setPsLimit]   = useState(650);
  const [uni,       setUni]       = useState("");
  const [course,    setCourse]    = useState("");
  const [feedback,  setFeedback]  = useState<PSFeedback | null>(null);
  const [psLoading, setPsLoading] = useState(false);
  const [psError,   setPsError]   = useState("");

  const wc  = ps.trim().split(/\s+/).filter(Boolean).length;
  const pct = Math.min(wc / psLimit * 100, 100);
  const wcColor = wc > psLimit ? "#c44b2a" : wc > psLimit * 0.9 ? "#c97a1a" : "#2d7a3c";

  async function checkGrammar() {
    if (text.trim().length < 30) { setGrError("Paste at least a paragraph of text."); return; }
    setGrLoading(true); setGrError("");
    try {
      const res  = await callAI({ tool: "grammar", text, purpose });
      const data = await res.json();
      if (!res.ok || !data.issues) { setGrError(data.error || "Could not check grammar."); return; }
      setResult(data);
    } catch { setGrError("Network error."); }
    finally { setGrLoading(false); }
  }

  async function analysePS() {
    if (wc < 50) { setPsError("Write at least 50 words first."); return; }
    setPsLoading(true); setPsError(""); setFeedback(null);
    try {
      const res  = await callAI({ tool: "personal_statement", ps, limit: psLimit, uni, course });
      const data = await res.json();
      if (!res.ok || !data.suggestions) { setPsError(data.error || "Could not analyse — try again."); return; }
      setFeedback(data);
    } catch { setPsError("Network error."); }
    finally { setPsLoading(false); }
  }

  const subTabStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 22px", fontFamily: "var(--mono)", fontSize: 10,
    background: active ? "var(--ink)" : "var(--paper)", color: active ? "var(--paper)" : "var(--ink)",
    border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em",
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 4, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "4px", marginBottom: 28, width: "fit-content" }}>
        <button style={subTabStyle(mode === "grammar")} onClick={() => { setMode("grammar"); setResult(null); setFeedback(null); }}>Grammar Coach</button>
        <button style={subTabStyle(mode === "ps")} onClick={() => { setMode("ps"); setResult(null); setFeedback(null); }}>Personal Statement</button>
      </div>

      {mode === "grammar" && !result && (
        <div style={{ maxWidth: 640 }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Write like an examiner expects.</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Improve grammar, style, and academic register — instantly.</h2>
          <div style={{ marginBottom: 14 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Writing type</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PURPOSES.map(p => (
                <button key={p} onClick={() => setPurpose(p)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${purpose === p ? "var(--ink)" : "var(--rule)"}`, background: purpose === p ? "var(--ink)" : "var(--paper)", color: purpose === p ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Your text <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={8}
              placeholder="Paste a paragraph or more of your writing."
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
          </div>
          {grError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{grError}</div>}
          <button className="btn" onClick={checkGrammar} disabled={grLoading} style={{ width: "100%", opacity: grLoading ? 0.5 : 1 }}>
            {grLoading ? "Checking writing…" : "Check my writing →"}
          </button>
          {grLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
        </div>
      )}

      {mode === "grammar" && result && (
        <div style={{ maxWidth: 860 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <button className="btn ghost" onClick={() => setResult(null)}>Check new text</button>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ border: "none", padding: "18px 24px", flexShrink: 0 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>WRITING SCORE</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 64, fontStyle: "italic", fontWeight: 700, lineHeight: 1, color: result.overallScore >= 80 ? "#2d7a3c" : result.overallScore >= 60 ? "var(--ink)" : "var(--cinnabar-ink)" }}>{result.overallScore}</div>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 4 }}>/ 100 &middot; {result.band}</div>
            </div>
            <div style={{ flex: 1, border: "1px solid var(--rule)", padding: "16px 18px" }}>
              <div className="mono" style={{ fontSize: 9, color: "#2d7a3c", marginBottom: 8 }}>STRENGTHS</div>
              {result.strengths.map((s, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5 }}>&middot; {s}</div>)}
            </div>
          </div>
          {result.issues.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 10 }}>ISSUES TO FIX ({result.issues.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.issues.map((issue, i) => {
                  const color = TYPE_COLORS[issue.type] || "var(--ink-3)";
                  return (
                    <div key={i} style={{ border: `1px solid ${color}`, padding: "12px 16px" }}>
                      <span className="mono" style={{ fontSize: 9, color, marginBottom: 8, display: "block" }}>{issue.type}</span>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 6 }}>
                        <div>
                          <div className="mono" style={{ fontSize: 8, color: "var(--cinnabar-ink)", marginBottom: 3 }}>ORIGINAL</div>
                          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", textDecoration: "line-through" }}>{issue.original}</div>
                        </div>
                        <div>
                          <div className="mono" style={{ fontSize: 8, color: "#2d7a3c", marginBottom: 3 }}>SUGGESTION</div>
                          <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{issue.suggestion}</div>
                        </div>
                      </div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.4 }}>{issue.explanation}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>ACADEMIC PHRASES TO USE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {result.academicPhrases.map((p, i) => <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "3px 8px", border: "1px solid var(--rule)", color: "var(--ink-2)" }}>{p}</span>)}
            </div>
          </div>
          <div style={{ border: "none", padding: "16px 18px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showRewrite ? 12 : 0 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>IMPROVED REWRITE</div>
              <button onClick={() => setShowRewrite(!showRewrite)} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "4px 10px", border: "1px solid var(--rule)", background: "none", cursor: "pointer", color: "var(--ink-3)" }}>
                {showRewrite ? "Hide" : "Show rewrite"}
              </button>
            </div>
            {showRewrite && <AIOutput text={result.rewrite} />}
          </div>
          <div style={{ border: "1px solid #1a6091", padding: "14px 16px", background: "rgba(26,96,145,0.04)" }}>
            <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 6 }}>EXAM TIP</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.examTip}</div>
          </div>
        </div>
      )}

      {mode === "ps" && !feedback && (
        <div style={{ maxWidth: 1100 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div className="mono cin" style={{ marginBottom: 4 }}>Personal statement workshop</div>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: 0 }}>Write it here. Get coached in real time.</h2>
            </div>
            <span className="mono" style={{ color: wcColor }}>{wc} / {psLimit} words</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>University / programme</div>
              <input value={uni} onChange={e => setUni(e.target.value)} placeholder="Oxford, UCL, Common App…"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject / course</div>
              <input value={course} onChange={e => setCourse(e.target.value)} placeholder="Computer Science, Medicine…"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Word limit</div>
              <select value={psLimit} onChange={e => setPsLimit(Number(e.target.value))} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "none", background: "var(--paper)", padding: "9px 8px", color: "var(--ink)" }}>
                {WORD_LIMITS.map(l => <option key={l} value={l}>{l} words</option>)}
              </select>
            </div>
          </div>
          <div style={{ height: 4, background: "var(--paper-2)", border: "1px solid var(--rule)", marginBottom: 8 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: wcColor, transition: "width 200ms" }} />
          </div>
          <textarea value={ps} onChange={e => setPs(e.target.value)} rows={20} placeholder="Start writing your personal statement here…"
            style={{ width: "100%", fontFamily: "Georgia, serif", fontSize: 15, border: "none", background: "var(--paper)", padding: "16px 18px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.8, marginBottom: 16 }} />
          {psError && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{psError}</div>}
          <button className="btn" onClick={analysePS} disabled={psLoading || wc < 50} style={{ width: "100%", opacity: psLoading ? 0.5 : 1 }}>
            {psLoading ? "Analysing…" : "Get feedback →"}
          </button>
          {psLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
        </div>
      )}

      {mode === "ps" && feedback && (
        <div style={{ maxWidth: 1100 }}>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32 }}>
            <div>
              <div style={{ border: "none", padding: "20px 28px", marginBottom: 20, display: "flex", gap: 24, alignItems: "center" }}>
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>OVERALL SCORE</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 52, fontWeight: 700, color: "var(--cinnabar-ink)", lineHeight: 1 }}>{feedback.score}<span style={{ fontSize: 20, color: "var(--ink-3)" }}>/10</span></div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 6 }}>HOOK STRENGTH</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", fontStyle: "italic" }}>&ldquo;{feedback.hook}&rdquo;</div>
                </div>
              </div>
              <div style={{ border: "none", marginBottom: 20 }}>
                <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}><div className="mono cin">Structure analysis</div></div>
                {feedback.structure.map((s, i) => (
                  <div key={i} style={{ padding: "10px 18px", borderBottom: i < feedback.structure.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 10 }}>
                    <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i+1).padStart(2,"0")}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
              </div>
              <div style={{ border: "none", marginBottom: 20 }}>
                <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}><div className="mono cin">Paragraph-by-paragraph notes</div></div>
                {feedback.paragraphNotes.map((n, i) => (
                  <div key={i} style={{ padding: "10px 18px", borderBottom: i < feedback.paragraphNotes.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 10 }}>
                    <span className="mono" style={{ color: "var(--ink-3)", flexShrink: 0 }}>&para;{i+1}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)" }}>{n}</span>
                  </div>
                ))}
              </div>
              {feedback.rewrite && (
                <div style={{ border: "1px solid var(--rule)", padding: "20px 24px" }}>
                  <div className="mono cin" style={{ marginBottom: 10 }}>Suggested opening rewrite</div>
                  <AIOutput text={feedback.rewrite} variant="principle" />
                </div>
              )}
            </div>
            <div>
              <div style={{ border: "none", padding: "18px", marginBottom: 14 }}>
                <div className="mono cin" style={{ marginBottom: 10 }}>Tone &amp; voice</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{feedback.tone}</div>
              </div>
              <div style={{ border: "none", padding: "18px", marginBottom: 14 }}>
                <div className="mono cin" style={{ marginBottom: 10 }}>Priority improvements</div>
                {feedback.suggestions.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i+1).padStart(2,"0")}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
              </div>
              <button className="btn ghost" onClick={() => setFeedback(null)} style={{ width: "100%", cursor: "pointer" }}>&larr; Back to editing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Citation Generator ────────────────────────────────────────────────────

function CitationTab() {
  const [sourceType, setSourceType] = useState<SourceType>("journal");
  const [style, setStyle]           = useState(STYLES[0]);
  const [fields, setFields]         = useState<Record<string, string>>({});
  const [citations, setCitations]   = useState<{ style: string; text: string }[]>([]);
  const [copied, setCopied]         = useState<string | null>(null);

  function setField(k: string, v: string) { setFields(f => ({ ...f, [k]: v })); }

  function generate() {
    const results = (style === "All styles" ? STYLES : [style]).map(s => ({ style: s, text: formatCitation(sourceType, s, fields) }));
    setCitations(results);
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 2000); });
  }

  const currentFields = SOURCE_FIELDS[sourceType] || SOURCE_FIELDS.book;

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Format a citation</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>APA, MLA, Chicago, Harvard &mdash; instantly.</h2>

      <div style={{ display: "flex", gap: 4, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "4px", marginBottom: 20, flexWrap: "wrap" }}>
        {(["book","journal","website","newspaper","video"] as SourceType[]).map((t, i, arr) => (
          <button key={t} onClick={() => { setSourceType(t); setFields({}); setCitations([]); }}
            style={{ flex: 1, minWidth: 80, padding: "10px", fontFamily: "var(--mono)", fontSize: 10, background: sourceType === t ? "var(--ink)" : "var(--paper)", color: sourceType === t ? "var(--paper)" : "var(--ink-3)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {currentFields.map(f => (
          <div key={f.key} style={{ gridColumn: ["title","doi","url"].includes(f.key) ? "1/-1" : "auto" }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 5, fontSize: 10 }}>{f.label}</div>
            <input value={fields[f.key] || ""} onChange={e => setField(f.key, e.target.value)} placeholder={f.placeholder}
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <select value={style} onChange={e => setStyle(e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 11, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", cursor: "pointer" }}>
          {[...STYLES, "All styles"].map(s => <option key={s}>{s}</option>)}
        </select>
        <button className="btn" onClick={generate} style={{ flex: 1, cursor: "pointer" }}>Generate citation &rarr;</button>
      </div>

      {citations.length > 0 && (
        <div style={{ border: "none" }}>
          <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
            <div className="mono cin">Your citation{citations.length > 1 ? "s" : ""}</div>
          </div>
          {citations.map((c, i) => (
            <div key={i} style={{ padding: "16px 18px", borderBottom: i < citations.length - 1 ? "1px solid var(--rule)" : "none" }}>
              {citations.length > 1 && <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, marginBottom: 6 }}>{c.style}</div>}
              <div style={{ fontFamily: "Georgia, serif", fontSize: 14, lineHeight: 1.8, color: "var(--ink)", marginBottom: 10 }}>{c.text}</div>
              <button onClick={() => copy(c.text, c.style)} style={{ fontFamily: "var(--mono)", fontSize: 10, background: "none", border: "1px solid var(--rule)", padding: "5px 12px", cursor: "pointer", color: copied === c.style ? "#2d7a3c" : "var(--ink-3)" }}>
                {copied === c.style ? "Copied ✓" : "Copy"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function WritingToolsPage() {
  const [tab, setTab]       = useState<Tab>("blueprint");
  const [subject, setSubject] = useState("History");
  const [level, setLevel]   = useState("A-Level");
  const [argueClaim, setArgueClaim] = useState("");

  function goToArgue(claim: string) {
    setArgueClaim(claim);
    setTab("argue");
  }

  const isEssayTab = tab === "blueprint" || tab === "argue" || tab === "grade";

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Writing Tools</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Essays, grammar, arguments, citations.</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "4px", flexWrap: "wrap" }}>
          {TABS.map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 16px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em" }}>
              {l}
            </button>
          ))}
        </div>
        <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>&larr; Dashboard</Link>
      </header>

      {isEssayTab && (
        <div style={{ borderBottom: "1px solid var(--rule)", padding: "10px 44px", background: "var(--paper-2)", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
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
      )}

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "blueprint" && <EssayBlueprintTab subject={subject} level={level} onArgue={goToArgue} />}
        {tab === "argue"     && <ArgumentBuilderTab subject={subject} level={level} initialClaim={argueClaim} />}
        {tab === "grade"     && <EssayGraderTab subject={subject} level={level} />}
        {tab === "polish"    && <WritingPolishTab />}
        {tab === "citation"  && <CitationTab />}
      </main>
    </div>
  );
}
