"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

// ── Types ──────────────────────────────────────────────────────────────────

type Issue = { type: string; original: string; suggestion: string; explanation: string };
type GrammarResult = { overallScore: number; band: string; issues: Issue[]; strengths: string[]; rewrite: string; academicPhrases: string[]; examTip: string };
type PSFeedback = { score: number; hook: string; structure: string[]; paragraphNotes: string[]; tone: string; suggestions: string[]; rewrite: string };

type SourceType = "book" | "journal" | "website" | "newspaper" | "video";

// ── Constants ──────────────────────────────────────────────────────────────

const PURPOSES    = ["Essay", "Report", "Personal Statement", "Dissertation", "Email"];
const WORD_LIMITS = [250, 500, 650, 700, 1000];
const STYLES      = ["APA 7", "MLA 9", "Chicago 17", "Harvard", "Vancouver"];

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

// ── Citation helper ────────────────────────────────────────────────────────

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
    if (type === "journal") return `${authors} (${year}) &apos;${title}&apos;, *${pub}*, ${vol || ""}${iss ? `(${iss})` : ""}, pp. ${pp || ""}. ${doi ? `doi: ${doi}` : ""}`;
    if (type === "website") return `${authors} (${year}) *${title}* [Online]. Available at: ${url} (Accessed: ${accessed}).`;
    return `${authors} (${year}) ${title}. ${pub}.`;
  }
  return `${authors} (${year}). ${title}. ${pub}.`;
}

// ── Tab: Writing Polish ────────────────────────────────────────────────────

function WritingPolishTab() {
  const [mode, setMode] = useState<"grammar" | "ps">("grammar");

  // Grammar state
  const [text,        setText]        = useState("");
  const [purpose,     setPurpose]     = useState("Essay");
  const [result,      setResult]      = useState<GrammarResult | null>(null);
  const [grLoading,   setGrLoading]   = useState(false);
  const [grError,     setGrError]     = useState("");
  const [showRewrite, setShowRewrite] = useState(false);

  // Personal Statement state
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
    border: "none", borderRight: "1px solid var(--ink)", cursor: "pointer", letterSpacing: "0.05em",
  });

  return (
    <div>
      {/* Sub-mode switcher */}
      <div style={{ display: "flex", border: "1px solid var(--ink)", marginBottom: 28, width: "fit-content" }}>
        <button style={subTabStyle(mode === "grammar")} onClick={() => { setMode("grammar"); setResult(null); setFeedback(null); }}>Grammar Coach</button>
        <button style={{ ...subTabStyle(mode === "ps"), borderRight: "none" }} onClick={() => { setMode("ps"); setResult(null); setFeedback(null); }}>Personal Statement</button>
      </div>

      {/* ── GRAMMAR COACH: input ── */}
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
              placeholder="Paste a paragraph or more of your writing. The tool checks grammar, style, vocabulary, and academic register."
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
          </div>
          {grError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{grError}</div>}
          <button className="btn" onClick={checkGrammar} disabled={grLoading} style={{ width: "100%", opacity: grLoading ? 0.5 : 1 }}>
            {grLoading ? "Checking writing…" : "Check my writing →"}
          </button>
          {grLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
        </div>
      )}

      {/* ── GRAMMAR COACH: results ── */}
      {mode === "grammar" && result && (
        <div style={{ maxWidth: 860 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <button className="btn ghost" onClick={() => setResult(null)}>Check new text</button>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ border: "2px solid var(--ink)", padding: "18px 24px", flexShrink: 0 }}>
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
          <div style={{ border: "1px solid var(--ink)", padding: "16px 18px", marginBottom: 12 }}>
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

      {/* ── PERSONAL STATEMENT: input ── */}
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
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject / course</div>
              <input value={course} onChange={e => setCourse(e.target.value)} placeholder="Computer Science, Medicine…"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Word limit</div>
              <select value={psLimit} onChange={e => setPsLimit(Number(e.target.value))} style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 8px", color: "var(--ink)" }}>
                {WORD_LIMITS.map(l => <option key={l} value={l}>{l} words</option>)}
              </select>
            </div>
          </div>
          <div style={{ height: 4, background: "var(--paper-2)", border: "1px solid var(--rule)", marginBottom: 8 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: wcColor, transition: "width 200ms" }} />
          </div>
          <textarea value={ps} onChange={e => setPs(e.target.value)} rows={20} placeholder="Start writing your personal statement here…"
            style={{ width: "100%", fontFamily: "Georgia, serif", fontSize: 15, border: "1px solid var(--ink)", background: "var(--paper)", padding: "16px 18px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.8, marginBottom: 16 }} />
          {psError && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{psError}</div>}
          <button className="btn" onClick={analysePS} disabled={psLoading || wc < 50} style={{ width: "100%", opacity: psLoading ? 0.5 : 1 }}>
            {psLoading ? "Analysing…" : "Get feedback →"}
          </button>
          {psLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
        </div>
      )}

      {/* ── PERSONAL STATEMENT: feedback ── */}
      {mode === "ps" && feedback && (
        <div style={{ maxWidth: 1100 }}>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32 }}>
            <div>
              <div style={{ border: "2px solid var(--ink)", padding: "20px 28px", marginBottom: 20, display: "flex", gap: 24, alignItems: "center" }}>
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>OVERALL SCORE</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 52, fontWeight: 700, color: "var(--cinnabar-ink)", lineHeight: 1 }}>{feedback.score}<span style={{ fontSize: 20, color: "var(--ink-3)" }}>/10</span></div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 6 }}>HOOK STRENGTH</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", fontStyle: "italic" }}>&ldquo;{feedback.hook}&rdquo;</div>
                </div>
              </div>
              <div style={{ border: "1px solid var(--ink)", marginBottom: 20 }}>
                <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}><div className="mono cin">Structure analysis</div></div>
                {feedback.structure.map((s, i) => (
                  <div key={i} style={{ padding: "10px 18px", borderBottom: i < feedback.structure.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 10 }}>
                    <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{String(i+1).padStart(2,"0")}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
              </div>
              <div style={{ border: "1px solid var(--ink)", marginBottom: 20 }}>
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
              <div style={{ border: "1px solid var(--ink)", padding: "18px", marginBottom: 14 }}>
                <div className="mono cin" style={{ marginBottom: 10 }}>Tone &amp; voice</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{feedback.tone}</div>
              </div>
              <div style={{ border: "1px solid var(--ink)", padding: "18px", marginBottom: 14 }}>
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

// ── Tab: Citation Generator ────────────────────────────────────────────────

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

      <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)", marginBottom: 20, flexWrap: "wrap" }}>
        {(["book","journal","website","newspaper","video"] as SourceType[]).map((t, i, arr) => (
          <button key={t} onClick={() => { setSourceType(t); setFields({}); setCitations([]); }}
            style={{ flex: 1, minWidth: 80, padding: "10px", fontFamily: "var(--mono)", fontSize: 10, background: sourceType === t ? "var(--ink)" : "var(--paper)", color: sourceType === t ? "var(--paper)" : "var(--ink-3)", border: "none", borderRight: i < arr.length - 1 ? "1px solid var(--ink)" : "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {currentFields.map(f => (
          <div key={f.key} style={{ gridColumn: ["title","doi","url"].includes(f.key) ? "1/-1" : "auto" }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 5, fontSize: 10 }}>{f.label}</div>
            <input value={fields[f.key] || ""} onChange={e => setField(f.key, e.target.value)} placeholder={f.placeholder}
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <select value={style} onChange={e => setStyle(e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", cursor: "pointer" }}>
          {[...STYLES, "All styles"].map(s => <option key={s}>{s}</option>)}
        </select>
        <button className="btn" onClick={generate} style={{ flex: 1, cursor: "pointer" }}>Generate citation &rarr;</button>
      </div>

      {citations.length > 0 && (
        <div style={{ border: "1px solid var(--ink)" }}>
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

// ── Page ───────────────────────────────────────────────────────────────────

type Tab = "polish" | "citation";
const TABS: [Tab, string][] = [["polish", "Writing Polish"], ["citation", "Citation Generator"]];

export default function WritingToolsPage() {
  const [tab, setTab] = useState<Tab>("polish");
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Writing Tools</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Grammar, style, citations.</div>
        </div>
        <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)" }}>
          {TABS.map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 18px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRight: i < TABS.length - 1 ? "1px solid var(--ink)" : "none", cursor: "pointer", letterSpacing: "0.05em" }}>
              {l}
            </button>
          ))}
        </div>
        <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>&larr; Dashboard</Link>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "polish" && <WritingPolishTab />}
        {tab === "citation" && <CitationTab />}
      </main>
    </div>
  );
}
