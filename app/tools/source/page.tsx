"use client";
import { useState } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type Mode = "source" | "reading";

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

const SOURCE_SUBJECTS = ["History", "Economics", "Politics", "English Literature", "Geography", "TOK / Theory of Knowledge", "Other"];
const READ_SUBJECTS   = ["English Literature", "English Language", "History", "Economics", "Politics", "Other"];

const ValueBox = ({ label, text, accent }: { label: string; text: string; accent: string }) => (
  <div style={{ border: `1px solid ${accent}`, padding: "14px 16px" }}>
    <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: accent, marginBottom: 8, letterSpacing: "0.06em" }}>{label}</div>
    <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>{text}</div>
  </div>
);

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  padding: "10px 22px", fontFamily: "var(--mono)", fontSize: 10,
  background: active ? "var(--ink)" : "var(--paper)", color: active ? "var(--paper)" : "var(--ink)",
  border: "none", borderRadius: 8, transition: "background 160ms, color 160ms", cursor: "pointer", letterSpacing: "0.05em",
});

export default function TextAnalystPage() {
  const [mode, setMode] = useState<Mode>("source");

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
      const res  = await callAI({ tool: "source", sourceText, origin, subject: srcSubject, question: srcQuestion });
      const data = await res.json();
      if (!res.ok || !data.value) { setSrcError(data.error || "Could not analyse source."); return; }
      setAnalysis(data);
    } catch { setSrcError("Network error."); }
    finally { setSrcLoading(false); }
  }

  async function analyseReading() {
    if (passage.trim().length < 40) { setRdError("Paste at least a paragraph to analyse."); return; }
    setRdLoading(true); setRdError("");
    try {
      const res  = await callAI({ tool: "reading", passage, subject: rdSubject, question: rdQuestion });
      const data = await res.json();
      if (!res.ok || !data.themes) { setRdError(data.error || "Could not analyse passage."); return; }
      setReading(data);
    } catch { setRdError("Network error."); }
    finally { setRdLoading(false); }
  }

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Text Analyst</div>
        <div style={{ display: "flex", gap: 4, background: "color-mix(in srgb, var(--ink) 7%, transparent)", borderRadius: 12, padding: "4px" }}>
          <button style={TAB_STYLE(mode === "source")} onClick={() => { setMode("source"); setAnalysis(null); setReading(null); }}>Source Analysis</button>
          <button style={TAB_STYLE(mode === "reading")} onClick={() => { setMode("reading"); setAnalysis(null); setReading(null); }}>Passage Analysis</button>
        </div>
      </header>

      {/* ── SOURCE ANALYSIS ── */}
      {mode === "source" && !analysis && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
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
              placeholder="Paste the source text, or describe it: 'A photograph taken by a German soldier in 1942 showing…'"
              style={{ width: "100%", fontFamily: "var(--serif)", fontSize: 13, border: "none", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.7 }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Origin details (optional but recommended)</div>
            <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="e.g. Speech by Churchill, 1940; Newspaper article from The Times, 1956"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Exam question context (optional)</div>
            <input value={srcQuestion} onChange={e => setSrcQuestion(e.target.value)} placeholder="e.g. 'Evaluate the usefulness of this source for studying the causes of WWI'"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          {srcError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{srcError}</div>}
          <button className="btn" onClick={analyseSource} disabled={srcLoading} style={{ width: "100%", opacity: srcLoading ? 0.5 : 1 }}>
            {srcLoading ? "Analysing source…" : "Analyse source →"}
          </button>
          {srcLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}

      {mode === "source" && analysis && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
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
            <div className="mono" style={{ color: "#2d7a3c", fontSize: 9, marginBottom: 10, letterSpacing: "0.08em" }}>VALUE</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ValueBox label="VALUE OF ORIGIN" text={analysis.value.origin} accent="#2d7a3c" />
              <ValueBox label="VALUE OF PURPOSE" text={analysis.value.purpose} accent="#2d7a3c" />
              <ValueBox label="VALUE OF CONTENT" text={analysis.value.content} accent="#2d7a3c" />
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
          <div style={{ border: "1px solid #1a6091", padding: "14px 18px", background: "rgba(26,96,145,0.04)" }}>
            <div className="mono" style={{ color: "#1a6091", fontSize: 9, marginBottom: 6 }}>EXAM TIP</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{analysis.examTip}</div>
          </div>
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}

      {/* ── PASSAGE ANALYSIS ── */}
      {mode === "reading" && !reading && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
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
            <input value={rdQuestion} onChange={e => setRdQuestion(e.target.value)} placeholder="e.g. 'How does the writer create tension?' or 'What is the author's viewpoint?'"
              style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
          </div>
          {rdError && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{rdError}</div>}
          <button className="btn" onClick={analyseReading} disabled={rdLoading} style={{ width: "100%", opacity: rdLoading ? 0.5 : 1 }}>
            {rdLoading ? "Analysing passage…" : "Analyse passage →"}
          </button>
          {rdLoading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}

      {mode === "reading" && reading && (
        <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 860, margin: "0 auto" }}>
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
                    <span className="mono" style={{ fontSize: 8, color: q.level === "Analysis" ? "var(--cinnabar-ink)" : q.level === "Evaluation" ? "#6b3fa0" : "#2d7a3c", marginRight: 8 }}>{q.level}</span>
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
          <div style={{ border: "1px solid #1a6091", padding: "14px 16px", background: "rgba(26,96,145,0.04)" }}>
            <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 6 }}>EXAM TIP</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{reading.examTip}</div>
          </div>
          <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
            <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          </div>
        </main>
      )}
    </div>
  );
}
