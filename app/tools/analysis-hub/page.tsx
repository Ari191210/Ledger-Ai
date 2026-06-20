"use client";
import { useState } from "react";
import Link from "next/link";
import { callAIOrThrow } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

// ── Types ──────────────────────────────────────────────────────────────────

// Compare
type Row = { criterion: string; items: string[] };
type Chart = { title: string; items: string[]; rows: Row[]; similarities: string[]; differences: string[]; verdict: string };

// Source
type SourceAnalysis = {
  origin: { who: string; what: string; when: string; context: string };
  purpose: string; content: string;
  value: { origin: string; purpose: string; content: string };
  limitation: { origin: string; purpose: string; content: string };
  bias: string[]; utility: string; examTip: string;
};

type ReadingResult = {
  title: string; summary: string; tone: string; themes: string[];
  devices: { name: string; example: string; effect: string }[];
  questions: { q: string; level: string; modelAnswer: string }[];
  vocabHighlights: { word: string; meaning: string }[];
  examTip: string;
};

// Case Study
type CaseStudy = { title: string; summary: string; situation: string; problem: string; stakeholders: string[]; analysis: { framework: string; points: string[] }[]; recommendations: string[]; conclusion: string; examTip: string };

// Timeline
type TimelineEvent = { date: string; title: string; description: string; significance: string; category: string };
type Timeline = { title: string; period: string; events: TimelineEvent[]; themes: string[]; examTip: string };

// ── Constants ──────────────────────────────────────────────────────────────

const SOURCE_SUBJECTS = ["History", "Economics", "Politics", "English Literature", "Geography", "TOK / Theory of Knowledge", "Other"];
const READ_SUBJECTS   = ["English Literature", "English Language", "History", "Economics", "Politics", "Other"];
const FRAMEWORKS = ["SWOT", "Porter&apos;s Five Forces", "PESTLE", "BCG Matrix", "ANSOFF", "Auto-select best"];
const TL_SUBJECTS = ["History", "Economics", "Science", "Politics", "Literature", "Geography", "Other"];

// ── Sub-components ─────────────────────────────────────────────────────────

const ValueBox = ({ label, text, accent }: { label: string; text: string; accent: string }) => (
  <div style={{ border: `1px solid ${accent}`, padding: "14px 16px" }}>
    <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: accent, marginBottom: 8, letterSpacing: "0.06em" }}>{label}</div>
    <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>{text}</div>
  </div>
);

// ── Tab components ─────────────────────────────────────────────────────────

function CompareTab() {
  const [items, setItems]     = useState(["", ""]);
  const [subject, setSubject] = useState("");
  const [criteria, setCriteria] = useState("");
  const [chart, setChart]     = useState<Chart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  function setItem(i: number, v: string) { setItems(prev => prev.map((x, j) => j === i ? v : x)); }
  function addItem() { if (items.length < 4) setItems(prev => [...prev, ""]); }
  function removeItem(i: number) { if (items.length > 2) setItems(prev => prev.filter((_, j) => j !== i)); }

  async function generate() {
    const filled = items.filter(x => x.trim());
    if (filled.length < 2) { setError("Enter at least two items to compare."); return; }
    setLoading(true); setError("");
    try {
      const data = await callAIOrThrow<Chart>({ tool: "compare", items: filled, subject, criteria });
      setChart(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (chart) return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button className="btn ghost" onClick={() => setChart(null)}>New comparison</button>
      </div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", fontWeight: 500, margin: "0 0 28px" }}>{chart.title}</h2>

      <div style={{ overflowX: "auto", marginBottom: 28 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.08em", color: "var(--ink-3)", textAlign: "left", padding: "10px 14px", borderBottom: "2px solid var(--ink)", background: "var(--paper-2)", width: 160 }}>CRITERION</th>
              {chart.items.map((item, i) => (
                <th key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, textAlign: "left", padding: "10px 14px", borderBottom: "2px solid var(--ink)", borderLeft: "1px solid var(--rule)", background: i === 0 ? "var(--ink)" : "var(--paper-2)", color: i === 0 ? "var(--paper)" : "var(--ink)" }}>
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: "1px solid var(--rule)" }}>
                <td style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--cinnabar-ink)", padding: "12px 14px", background: "var(--paper-2)", verticalAlign: "top" }}>{row.criterion}</td>
                {row.items.map((cell, ci) => (
                  <td key={ci} style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5, padding: "12px 14px", borderLeft: "1px solid var(--rule)", verticalAlign: "top", color: "var(--ink)" }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
          <div className="mono" style={{ color: "var(--sage)", fontSize: 9, marginBottom: 10 }}>SIMILARITIES</div>
          {chart.similarities.map((s, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 6 }}>· {s}</div>)}
        </div>
        <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
          <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, marginBottom: 10 }}>KEY DIFFERENCES</div>
          {chart.differences.map((d, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 6 }}>· {d}</div>)}
        </div>
      </div>

      <div style={{ border: "none", padding: "16px 20px" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>Verdict</div>
        <AIOutput text={chart.verdict} variant="principle" />
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Side by side, instantly</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Compare any concepts, events, or theories.</h2>

      <div style={{ marginBottom: 16 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Items to compare <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={item} onChange={e => setItem(i, e.target.value)} placeholder={`Item ${i + 1} — e.g. Mitosis`}
              style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            {items.length > 2 && <button onClick={() => removeItem(i)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "0 10px", border: "1px solid var(--rule)", background: "none", cursor: "pointer", color: "var(--ink-3)" }}>✕</button>}
          </div>
        ))}
        {items.length < 4 && (
          <button onClick={addItem} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "5px 12px", border: "1px solid var(--rule)", background: "none", cursor: "pointer", color: "var(--ink-3)" }}>+ Add item</button>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject / context (optional)</div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. A-Level Biology, IB Economics…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Specific criteria to compare (optional)</div>
        <input value={criteria} onChange={e => setCriteria(e.target.value)} placeholder="e.g. cause, effect, time period, key figures…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>

      {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
        {loading ? "Building comparison…" : "Build comparison chart →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );
}

function SourceTab() {
  type SrcMode = "source" | "reading";
  const [mode, setMode] = useState<SrcMode>("source");

  // Source state
  const [sourceText, setSourceText] = useState("");
  const [origin,     setOrigin]     = useState("");
  const [srcSubject, setSrcSubject] = useState("History");
  const [srcQuestion, setSrcQuestion] = useState("");
  const [analysis,   setAnalysis]   = useState<SourceAnalysis | null>(null);
  const [srcLoading, setSrcLoading] = useState(false);
  const [srcError,   setSrcError]   = useState("");

  // Reading state
  const [passage,     setPassage]     = useState("");
  const [rdSubject,   setRdSubject]   = useState("English Literature");
  const [rdQuestion,  setRdQuestion]  = useState("");
  const [reading,     setReading]     = useState<ReadingResult | null>(null);
  const [rdLoading,   setRdLoading]   = useState(false);
  const [rdError,     setRdError]     = useState("");
  const [openQ,       setOpenQ]       = useState<number | null>(null);

  async function analyseSource() {
    if (sourceText.trim().length < 30) { setSrcError("Paste at least a sentence from the source."); return; }
    setSrcLoading(true); setSrcError("");
    try {
      const data = await callAIOrThrow<SourceAnalysis>({ tool: "source", sourceText, origin, subject: srcSubject, question: srcQuestion });
      setAnalysis(data);
    } catch { setSrcError("Network error."); }
    finally { setSrcLoading(false); }
  }

  async function analyseReading() {
    if (passage.trim().length < 40) { setRdError("Paste at least a paragraph to analyse."); return; }
    setRdLoading(true); setRdError("");
    try {
      const data = await callAIOrThrow<ReadingResult>({ tool: "reading", passage, subject: rdSubject, question: rdQuestion });
      setReading(data);
    } catch { setRdError("Network error."); }
    finally { setRdLoading(false); }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 18px", fontFamily: "var(--mono)", fontSize: 10,
    background: active ? "var(--ink)" : "transparent",
    color: active ? "var(--paper)" : "var(--ink-3)",
    border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em",
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 8, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "6px", overflowX: "auto" as const, marginBottom: 32, width: "fit-content" }}>
        <button style={tabStyle(mode === "source")} onClick={() => { setMode("source"); setAnalysis(null); setReading(null); }}>Source Analysis</button>
        <button style={{ ...tabStyle(mode === "reading"), borderRight: "none" }} onClick={() => { setMode("reading"); setAnalysis(null); setReading(null); }}>Passage Analysis</button>
      </div>

      {/* ── SOURCE ANALYSIS ── */}
      {mode === "source" && !analysis && (
        <div style={{ maxWidth: 640 }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Origin. Purpose. Value. Limitation.</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Analyse any source. Exam-ready in seconds.</h2>
          <div style={{ marginBottom: 16 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SOURCE_SUBJECTS.map(s => <button key={s} onClick={() => setSrcSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${srcSubject === s ? "var(--ink)" : "var(--rule)"}`, background: srcSubject === s ? "var(--ink)" : "var(--paper)", color: srcSubject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Source text or description <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
            <textarea value={sourceText} onChange={e => setSourceText(e.target.value)} rows={6}
              placeholder="Paste the source text, or describe it: &apos;A photograph taken by a German soldier in 1942 showing…&apos;"
              style={{ width: "100%", fontFamily: "var(--serif)", fontSize: 13, border: "none", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.7 }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Origin details (optional but recommended)</div>
            <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="e.g. Speech by Churchill, 1940; Newspaper article from The Times, 1956"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Exam question context (optional)</div>
            <input value={srcQuestion} onChange={e => setSrcQuestion(e.target.value)} placeholder="e.g. &apos;Evaluate the usefulness of this source for studying the causes of WWI&apos;"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          {srcError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{srcError}</div>}
          <button className="btn" onClick={analyseSource} disabled={srcLoading} style={{ width: "100%", opacity: srcLoading ? 0.5 : 1 }}>
            {srcLoading ? "Analysing source…" : "Analyse source →"}
          </button>
          {srcLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
        </div>
      )}

      {mode === "source" && analysis && (
        <div style={{ maxWidth: 860 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <button className="btn ghost" onClick={() => setAnalysis(null)}>New source</button>
          </div>
          <div style={{ border: "none", padding: "20px 24px", marginBottom: 20 }}>
            <div className="mono cin" style={{ marginBottom: 12 }}>Origin</div>
            <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {[["WHO", analysis.origin.who], ["WHAT", analysis.origin.what], ["WHEN", analysis.origin.when], ["CONTEXT", analysis.origin.context]].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 8 }}>PURPOSE</div>
              <AIOutput text={analysis.purpose} />
            </div>
            <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 8 }}>CONTENT</div>
              <AIOutput text={analysis.content} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div className="mono" style={{ color: "var(--sage)", fontSize: 9, marginBottom: 10, letterSpacing: "0.08em" }}>VALUE</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ValueBox label="VALUE OF ORIGIN" text={analysis.value.origin} accent="var(--sage)" />
              <ValueBox label="VALUE OF PURPOSE" text={analysis.value.purpose} accent="var(--sage)" />
              <ValueBox label="VALUE OF CONTENT" text={analysis.value.content} accent="var(--sage)" />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, marginBottom: 10, letterSpacing: "0.08em" }}>LIMITATION</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ValueBox label="LIMITATION OF ORIGIN" text={analysis.limitation.origin} accent="var(--cinnabar-ink)" />
              <ValueBox label="LIMITATION OF PURPOSE" text={analysis.limitation.purpose} accent="var(--cinnabar-ink)" />
              <ValueBox label="LIMITATION OF CONTENT" text={analysis.limitation.content} accent="var(--cinnabar-ink)" />
            </div>
          </div>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 8 }}>POSSIBLE BIAS</div>
              {analysis.bias.map((b, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5 }}>· {b}</div>)}
            </div>
            <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 8 }}>OVERALL UTILITY</div>
              <AIOutput text={analysis.utility} />
            </div>
          </div>
          <div style={{ border: "1px solid var(--ink-2)", padding: "14px 18px", background: "color-mix(in oklch, var(--ink-2) 4%, transparent)" }}>
            <div className="mono" style={{ color: "var(--ink-2)", fontSize: 9, marginBottom: 6 }}>EXAM TIP</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{analysis.examTip}</div>
          </div>
        </div>
      )}

      {/* ── PASSAGE ANALYSIS ── */}
      {mode === "reading" && !reading && (
        <div style={{ maxWidth: 640 }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Read deeper. Answer better.</div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Paste any passage. Get full analysis, questions, and model answers.</h2>
          <div style={{ marginBottom: 16 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {READ_SUBJECTS.map(s => <button key={s} onClick={() => setRdSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${rdSubject === s ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: rdSubject === s ? "var(--cinnabar-ink)" : "var(--paper)", color: rdSubject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Passage <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
            <textarea value={passage} onChange={e => setPassage(e.target.value)} rows={7}
              placeholder="Paste the text you want to analyse — a poem, prose extract, article, speech, or source document."
              style={{ width: "100%", fontFamily: "var(--serif)", fontSize: 13, border: "none", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.7 }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Exam question or focus (optional)</div>
            <input value={rdQuestion} onChange={e => setRdQuestion(e.target.value)} placeholder="e.g. &apos;How does the writer create tension?&apos; or &apos;What is the author&apos;s viewpoint?&apos;"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          {rdError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{rdError}</div>}
          <button className="btn" onClick={analyseReading} disabled={rdLoading} style={{ width: "100%", opacity: rdLoading ? 0.5 : 1 }}>
            {rdLoading ? "Analysing passage…" : "Analyse passage →"}
          </button>
          {rdLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
        </div>
      )}

      {mode === "reading" && reading && (
        <div style={{ maxWidth: 860 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <button className="btn ghost" onClick={() => setReading(null)}>New passage</button>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <div style={{ flex: 2, border: "1px solid var(--rule)", padding: "14px 16px" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>SUMMARY</div>
              <AIOutput text={reading.summary} />
            </div>
            <div style={{ flex: 1, border: "1px solid var(--rule)", padding: "14px 16px" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>TONE</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontStyle: "italic" }}>{reading.tone}</div>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6, marginTop: 12 }}>THEMES</div>
              {reading.themes.map((t, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 3 }}>· {t}</div>)}
            </div>
          </div>
          {reading.devices.length > 0 && (
            <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 10 }}>LITERARY / LANGUAGE DEVICES</div>
              {reading.devices.map((d, i) => (
                <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < reading.devices.length - 1 ? "1px solid var(--rule)" : "none" }}>
                  <div style={{ display: "flex", gap: 16, marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", flexShrink: 0 }}>{d.name}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", fontStyle: "italic" }}>&ldquo;{d.example}&rdquo;</span>
                  </div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)" }}>Effect: {d.effect}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 10 }}>COMPREHENSION QUESTIONS</div>
            {reading.questions.map((q, i) => (
              <div key={i} style={{ border: "1px solid var(--rule)", marginBottom: 6 }}>
                <button onClick={() => setOpenQ(openQ === i ? null : i)} style={{ width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "left" }}>
                    <span className="mono" style={{ fontSize: 8, color: q.level === "Analysis" ? "var(--cinnabar-ink)" : q.level === "Evaluation" ? "var(--ink-2)" : "var(--sage)", marginRight: 8 }}>{q.level}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)" }}>{q.q}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", flexShrink: 0 }}>{openQ === i ? "▲" : "▼"}</span>
                </button>
                {openQ === i && <div style={{ padding: "0 14px 12px", borderTop: "1px solid var(--rule)", paddingTop: 10 }}><AIOutput text={q.modelAnswer} /></div>}
              </div>
            ))}
          </div>
          <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>KEY VOCABULARY</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {reading.vocabHighlights.map((v, i) => (
                <div key={i} style={{ padding: "4px 10px", border: "1px solid var(--rule)" }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600 }}>{v.word}</span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)" }}> — {v.meaning}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ border: "1px solid var(--ink-2)", padding: "14px 16px", background: "color-mix(in oklch, var(--ink-2) 4%, transparent)" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-2)", marginBottom: 6 }}>EXAM TIP</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{reading.examTip}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function CaseTab() {
  const [caseText, setCaseText]     = useState("");
  const [question, setQuestion]     = useState("");
  const [framework, setFramework]   = useState("Auto-select best");
  const [result, setResult]         = useState<CaseStudy | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  async function analyse() {
    if (caseText.trim().length < 20) { setError("Paste a case study or describe the scenario."); return; }
    setLoading(true); setError("");
    try {
      const data = await callAIOrThrow<CaseStudy>({ tool: "case_study", caseText, question, framework });
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (result) return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Case Study Pro · {result.title}</div>
        <button className="btn ghost" onClick={() => setResult(null)}>New case</button>
      </div>
      <div style={{ border: "none", padding: "18px 22px", marginBottom: 20 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>SUMMARY</div>
        <AIOutput text={result.summary} />
      </div>

      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>SITUATION</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.situation}</div>
        </div>
        <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 8 }}>CORE PROBLEM</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.problem}</div>
        </div>
      </div>

      <div style={{ border: "1px solid var(--rule)", padding: "16px 18px", marginBottom: 20 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>STAKEHOLDERS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {result.stakeholders.map((s, i) => <span key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, padding: "4px 10px", border: "1px solid var(--rule)", color: "var(--ink-2)" }}>{s}</span>)}
        </div>
      </div>

      {result.analysis.map((a, i) => (
        <div key={i} style={{ border: "1px solid var(--rule)", padding: "16px 18px", marginBottom: 12 }}>
          <div className="mono cin" style={{ marginBottom: 12 }}>{a.framework}</div>
          {a.points.map((p, j) => <div key={j} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}>· {p}</div>)}
        </div>
      ))}

      <div style={{ border: "1px solid var(--sage)", padding: "16px 18px", marginBottom: 20 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--sage)", marginBottom: 10 }}>RECOMMENDATIONS</div>
        {result.recommendations.map((r, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>{i + 1}. {r}</div>)}
      </div>

      <div style={{ border: "none", padding: "16px 20px", marginBottom: 12 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>CONCLUSION</div>
        <AIOutput text={result.conclusion} variant="principle" />
      </div>

      <div style={{ border: "1px solid var(--ink-2)", padding: "14px 18px", background: "color-mix(in oklch, var(--ink-2) 4%, transparent)" }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-2)", marginBottom: 6 }}>EXAM TIP</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.examTip}</div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Structure. Analyse. Recommend.</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Business and economics case study analysis in seconds.</h2>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Case study text or scenario <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
        <textarea value={caseText} onChange={e => setCaseText(e.target.value)} rows={6}
          placeholder="Paste the case study text, or describe the scenario: &apos;A UK supermarket chain is losing market share to discount retailers…&apos;"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Exam question (optional)</div>
        <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. &apos;Evaluate the most appropriate strategy for the business&apos;"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Analysis framework</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {FRAMEWORKS.map(f => <button key={f} onClick={() => setFramework(f)} style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "5px 10px", border: `1px solid ${framework === f ? "var(--ink)" : "var(--rule)"}`, background: framework === f ? "var(--ink)" : "var(--paper)", color: framework === f ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{f}</button>)}
        </div>
      </div>
      {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <button className="btn" onClick={analyse} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
        {loading ? "Analysing case…" : "Analyse case study →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );
}

function TimelineTab() {
  const [topic, setTopic]     = useState("");
  const [subject, setSubject] = useState("History");
  const [result, setResult]   = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const CAT_COLORS: Record<string, string> = { Political: "var(--cinnabar-ink)", Economic: "var(--sage)", Social: "var(--ink-2)", Military: "var(--gold)", Scientific: "var(--ink-2)", Other: "var(--ink-3)" };

  async function generate() {
    if (!topic.trim()) { setError("Enter a topic or period."); return; }
    setLoading(true); setError("");
    try {
      const data = await callAIOrThrow<Timeline>({ tool: "timeline", topic, subject });
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (result) return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Timeline Builder</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>{result.period}</div>
        </div>
        <button className="btn ghost" onClick={() => setResult(null)}>New timeline</button>
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 500, marginBottom: 24 }}>{result.title}</div>

      <div style={{ position: "relative", paddingLeft: 24 }}>
        <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 1, background: "var(--ink)" }} />
        {result.events.map((ev, i) => {
          const color = CAT_COLORS[ev.category] || "var(--ink-3)";
          return (
            <div key={i} style={{ position: "relative", marginBottom: 20 }}>
              <div style={{ position: "absolute", left: -20, top: 6, width: 10, height: 10, background: color, borderRadius: "50%", border: "2px solid var(--paper)" }} />
              <div style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="mono" style={{ fontSize: 9, color: color }}>{ev.category} · {ev.date}</span>
                </div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{ev.title}</div>
                <AIOutput text={ev.description} />
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--sage)" }}>SIGNIFICANCE · <span style={{ fontFamily: "var(--sans)", fontSize: 11, textTransform: "none", letterSpacing: 0, color: "var(--ink-2)" }}>{ev.significance}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>KEY THEMES</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {result.themes.map((t, i) => <span key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, padding: "4px 10px", border: "1px solid var(--rule)", color: "var(--ink-2)" }}>{t}</span>)}
        </div>
      </div>
      <div style={{ border: "1px solid var(--ink-2)", padding: "14px 16px", background: "color-mix(in oklch, var(--ink-2) 4%, transparent)" }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-2)", marginBottom: 6 }}>EXAM TIP</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.examTip}</div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="mono cin" style={{ marginBottom: 8 }}>Chronology, annotated.</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Build a fully annotated timeline for any topic or period.</h2>
      <div style={{ marginBottom: 16 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {TL_SUBJECTS.map(s => <button key={s} onClick={() => setSubject(s)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${subject === s ? "var(--cinnabar-ink)" : "var(--rule)"}`, background: subject === s ? "var(--cinnabar-ink)" : "var(--paper)", color: subject === s ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{s}</button>)}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Topic or period <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. The Cold War 1945-1991, Industrial Revolution, DNA discovery…"
          style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
      </div>
      {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
        {loading ? "Building timeline…" : "Build timeline →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

type Tab = "compare" | "source" | "case" | "timeline";
const TABS: [Tab, string][] = [["compare", "Compare"], ["source", "Source Analyst"], ["case", "Case Study"], ["timeline", "Timeline"]];

export default function AnalysisHubPage() {
  const [tab, setTab] = useState<Tab>("compare");
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Analysis Hub</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Compare, source, case study, and timeline tools in one place.</div>
        </div>
        <div style={{ display: "flex", gap: 8, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "6px", overflowX: "auto" as const }}>
          {TABS.map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 18px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em" }}>
              {l}
            </button>
          ))}
        </div>
        <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "compare"  && <CompareTab />}
        {tab === "source"   && <SourceTab />}
        {tab === "case"     && <CaseTab />}
        {tab === "timeline" && <TimelineTab />}
      </main>
    </div>
  );
}
