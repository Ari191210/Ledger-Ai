"use client";
import { useState, useEffect } from "react";
import { useUserLevel } from "@/hooks/use-user-level";
import Link from "next/link";
import ElasticSlider from "@/components/ui/elastic-slider";
import { callAIOrThrow } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

type ModelAnswer = { question: string; marks: number; modelAnswer: string; markingPoints: string[]; keywordsRequired?: string[]; whatMakesItGood: string[]; structureGuide: string; examTip: string };

const LEVELS = ["GCSE", "IGCSE", "A-Level", "IB", "CBSE", "JEE", "NEET"];
const BOARDS  = ["AQA", "Edexcel", "OCR", "CIE", "WJEC", "IB", "CBSE", "ICSE"];

export default function ModelAnswerPage() {
  const profileLevel = useUserLevel();
  const [question, setQuestion] = useState("");
  const [subject, setSubject]   = useState("");
  const [level, setLevel]       = useState("A-Level");

  useEffect(() => {
    const mapped = profileLevel.startsWith("CBSE") ? "CBSE" : profileLevel;
    if (LEVELS.includes(mapped)) setLevel(mapped);
  }, [profileLevel]);
  const [examBoard, setExamBoard] = useState("");
  const [marks, setMarks]       = useState(6);
  const [result, setResult]     = useState<ModelAnswer | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [copied, setCopied]     = useState(false);

  async function generate() {
    if (!question.trim()) { setError("Enter an exam question."); return; }
    setLoading(true); setError("");
    try {
      const data = await callAIOrThrow<ModelAnswer>({ tool: "model_answer", question, subject, level, marks, examBoard: examBoard || undefined });
      setResult(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.modelAnswer).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (result) return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Model Answer · {result.marks} marks</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={copy}>{copied ? "Copied!" : "Copy answer"}</button>
          <button className="btn ghost" onClick={() => setResult(null)}>New question</button>
        </div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 820, margin: "0 auto" }}>
        <div style={{ border: "1px solid var(--rule)", padding: "14px 18px", marginBottom: 20, background: "var(--paper-2)" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>QUESTION</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.6, fontStyle: "italic" }}>{result.question}</div>
        </div>

        <div style={{ border: "none", padding: "20px 24px", marginBottom: 20 }}>
          <div className="mono cin" style={{ marginBottom: 12 }}>Model Answer</div>
          <AIOutput text={result.modelAnswer} />
        </div>

        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ border: "1px solid var(--sage)", padding: "14px 16px" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--sage)", marginBottom: 8 }}>MARKING POINTS COVERED</div>
            {result.markingPoints.map((p, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
              <span style={{ color: "var(--sage)", fontFamily: "var(--mono)", fontSize: 9 }}>✓</span>
              <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.4 }}>{p}</span>
            </div>)}
          </div>
          <div style={{ border: "1px solid var(--rule)", padding: "14px 16px" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-2)", marginBottom: 8 }}>WHAT MAKES IT GOOD</div>
            {result.whatMakesItGood.map((w, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, marginBottom: 5, color: "var(--ink-2)" }}>· {w}</div>)}
          </div>
        </div>
        {result.keywordsRequired && result.keywordsRequired.length > 0 && (
          <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12, background: "color-mix(in oklch, var(--sage) 4%, transparent)" }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--sage)", marginBottom: 10 }}>KEYWORDS EXAMINERS REWARD</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {result.keywordsRequired.map((kw, i) => (
                <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "3px 8px", border: "1px solid var(--sage)", color: "var(--sage)", background: "transparent" }}>{kw}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ border: "1px solid var(--rule)", padding: "14px 16px", marginBottom: 12 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8 }}>STRUCTURE GUIDE</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.structureGuide}</div>
        </div>

        <div style={{ border: "1px solid var(--ink-2)", padding: "14px 16px", background: "color-mix(in oklch, var(--ink-2) 4%, transparent)" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-2)", marginBottom: 6 }}>EXAM TIP</div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.examTip}</div>
        </div>
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Model Answer Factory</div>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 640, margin: "0 auto" }}>
        <div className="mono cin" style={{ marginBottom: 8 }}>See what full marks looks like.</div>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, fontStyle: "italic", margin: "0 0 28px" }}>Generate a perfect model answer for any exam question.</h2>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Exam question <span style={{ color: "var(--cinnabar-ink)" }}>*</span></div>
          <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3}
            placeholder="e.g. 'Evaluate the causes of WWI.' or 'Explain how enzymes work. [6 marks]'"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "none", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject (optional)</div>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. History, Biology…"
            style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Level</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {LEVELS.map(l => <button key={l} onClick={() => setLevel(l)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${level === l ? "var(--ink)" : "var(--rule)"}`, background: level === l ? "var(--ink)" : "var(--paper)", color: level === l ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{l}</button>)}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Exam board <span style={{ color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 9 }}>(optional — for board-specific answers)</span></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {BOARDS.map(b => <button key={b} onClick={() => setExamBoard(examBoard === b ? "" : b)} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "5px 10px", border: `1px solid ${examBoard === b ? "var(--ink)" : "var(--rule)"}`, background: examBoard === b ? "var(--ink)" : "var(--paper)", color: examBoard === b ? "var(--paper)" : "var(--ink)", cursor: "pointer" }}>{b}</button>)}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Marks: {marks}</div>
          <ElasticSlider defaultValue={marks} startingValue={1} maxValue={25} isStepped stepSize={1} onChange={setMarks} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>1</span>
            <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>25</span>
          </div>
        </div>
        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Generating model answer…" : "Generate model answer →"}
        </button>
        {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
