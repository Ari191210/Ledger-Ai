"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { getLocalProfile } from "@/lib/user-data";
import { callAIOrThrow, AIError } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";
import { AIErrorDisplay } from "@/components/ai-error";
import SaveOutputButton from "@/components/save-output-button";
import TierGate from "@/components/tier-gate";

// ── Types ─────────────────────────────────────────────────────────────────────
type DerivationStep = { step: number; expression: string; explanation: string };
type Variable = { symbol: string; meaning: string; unit: string };
type RelatedFormula = { name: string; formula: string; relationship: string };
type Application = { context: string; howUsed: string };
type PracticeQ = { q: string; difficulty: "easy" | "medium" | "hard"; hint: string; solution: string };
type DecoderOutput = {
  formula: string;
  name: string;
  subject: string;
  derivation: DerivationStep[];
  variables: Variable[];
  conditions: string[];
  relatedFormulas: RelatedFormula[];
  applications: Application[];
  practiceQuestions: PracticeQ[];
  examTip: string;
};

type FormulaSection = { title: string; formulas: { name: string; formula: string; variables: string; notes?: string | null }[] };
type FormulaSheetOutput = {
  subject: string;
  chapter: string;
  board: string;
  sections: FormulaSection[];
  keyConcepts: string[];
  units: { quantity: string; unit: string; dimensions: string }[];
  examTips: string[];
};

const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Computer Science", "Statistics", "Other"];

// ── Difficulty chip ───────────────────────────────────────────────────────────
function DiffChip({ d }: { d: "easy" | "medium" | "hard" }) {
  const map = { easy: "#2d6a2d", medium: "#7a5c00", hard: "#8b1a1a" };
  return (
    <span style={{ fontSize: 10, padding: "2px 8px", background: map[d] + "22", color: map[d], border: `1px solid ${map[d]}44`, borderRadius: 4, fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {d}
    </span>
  );
}

// ── Practice accordion ────────────────────────────────────────────────────────
function PracticeCard({ q, i }: { q: PracticeQ; i: number }) {
  const [open, setOpen] = useState(false);
  const [showSol, setShowSol] = useState(false);
  return (
    <div style={{ border: "1px solid var(--rule)", marginBottom: 8 }}>
      <div onClick={() => setOpen(p => !p)} style={{ padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span className="mono cin" style={{ fontSize: 11, minWidth: 20 }}>{String(i + 1).padStart(2, "0")}</span>
          <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.5 }}>{q.q}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <DiffChip d={q.difficulty} />
          <span className="mono" style={{ fontSize: 11, opacity: 0.5 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: "0 18px 14px 50px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>
            <span className="mono" style={{ opacity: 0.5, marginRight: 6 }}>Hint</span>{q.hint}
          </div>
          {!showSol ? (
            <button onClick={() => setShowSol(true)} style={{ alignSelf: "flex-start", padding: "6px 14px", border: "1px solid var(--rule)", background: "transparent", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink)" }}>
              Show Solution
            </button>
          ) : (
            <div style={{ fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.7, color: "var(--ink)", background: "var(--paper-2)", padding: "12px 14px" }}>
              {q.solution}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Formula Decoder result renderer ──────────────────────────────────────────
function DecoderResult({ data }: { data: DecoderOutput }) {
  const [tab, setTab] = useState<"derivation" | "related" | "applications" | "practice">("derivation");
  const tabs = [
    { id: "derivation" as const, label: "Derivation" },
    { id: "related" as const, label: "Related" },
    { id: "applications" as const, label: "Applications" },
    { id: "practice" as const, label: "Practice" },
  ];

  return (
    <div className="ai-3d-reveal" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Formula hero */}
      <div style={{ padding: "28px 24px", background: "var(--paper-2)", borderBottom: "1px solid var(--rule)" }}>
        <div className="mono" style={{ fontSize: 10, opacity: 0.5, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{data.subject}</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 6 }}>{data.formula}</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-3)" }}>{data.name}</div>
      </div>

      {/* Variables legend */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--rule)", display: "flex", flexWrap: "wrap", gap: 8 }}>
        {data.variables.map((v, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 10px", border: "1px solid var(--rule)", fontSize: 12 }}>
            <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 15 }}>{v.symbol}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ fontFamily: "var(--sans)" }}>{v.meaning}</span>
            {v.unit && <span className="mono" style={{ opacity: 0.5, fontSize: 10 }}>({v.unit})</span>}
          </div>
        ))}
      </div>

      {/* Conditions */}
      {data.conditions.length > 0 && (
        <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--rule)", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 10, opacity: 0.5, alignSelf: "center" }}>VALID WHEN</span>
          {data.conditions.map((c, i) => (
            <span key={i} style={{ fontFamily: "var(--sans)", fontSize: 11, padding: "2px 10px", background: "var(--paper-2)", border: "1px solid var(--rule)" }}>{c}</span>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--rule)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 4px", background: "transparent", border: "none", borderBottom: tab === t.id ? "2px solid var(--cinnabar-ink)" : "2px solid transparent", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, color: tab === t.id ? "var(--cinnabar-ink)" : "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", transition: "color 150ms" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: "20px 24px" }}>
        {tab === "derivation" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {data.derivation.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: i < data.derivation.length - 1 ? "1px solid var(--rule)" : "none" }}>
                <div style={{ minWidth: 28, height: 28, border: "1px solid var(--rule)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="mono cin" style={{ fontSize: 10 }}>{s.step}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{s.expression}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>{s.explanation}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "related" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {data.relatedFormulas.map((f, i) => (
              <div key={i} style={{ padding: "16px 0", borderBottom: i < data.relatedFormulas.length - 1 ? "1px solid var(--rule)" : "none" }}>
                <div className="mono" style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>{f.name}</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 700, marginBottom: 6 }}>{f.formula}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>{f.relationship}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "applications" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {data.applications.map((a, i) => (
              <div key={i} style={{ padding: "16px 0", borderBottom: i < data.applications.length - 1 ? "1px solid var(--rule)" : "none" }}>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{a.context}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>{a.howUsed}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "practice" && (
          <div>
            {data.practiceQuestions.map((q, i) => <PracticeCard key={i} q={q} i={i} />)}
          </div>
        )}
      </div>

      {/* Exam tip */}
      <div style={{ padding: "14px 24px", borderTop: "1px solid var(--rule)", background: "var(--paper-2)", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span className="mono cin" style={{ fontSize: 10, paddingTop: 2, flexShrink: 0 }}>EXAM TIP</span>
        <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>{data.examTip}</span>
      </div>
    </div>
  );
}

// ── Formula Sheet result renderer ─────────────────────────────────────────────
function SheetResult({ data }: { data: FormulaSheetOutput }) {
  return (
    <div className="ai-3d-reveal" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
        <div className="mono" style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>{data.board} · {data.subject}</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 700 }}>{data.chapter}</div>
      </div>

      {data.sections.map((sec, si) => (
        <div key={si} style={{ borderBottom: "1px solid var(--rule)" }}>
          <div style={{ padding: "12px 24px", background: "var(--paper-2)" }}>
            <span className="mono" style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{sec.title}</span>
          </div>
          {sec.formulas.map((f, fi) => (
            <div key={fi} style={{ padding: "14px 24px", borderTop: "1px solid var(--rule)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{f.name}</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", fontWeight: 700, marginBottom: 4 }}>{f.formula}</div>
                {f.notes && <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)" }}>{f.notes}</div>}
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)", lineHeight: 1.6 }}>{f.variables}</div>
            </div>
          ))}
        </div>
      ))}

      {data.examTips.length > 0 && (
        <div style={{ padding: "16px 24px" }}>
          <div className="mono" style={{ fontSize: 10, opacity: 0.5, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Exam Tips</div>
          {data.examTips.map((tip, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <span className="mono cin" style={{ fontSize: 10, paddingTop: 3, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Image upload area ─────────────────────────────────────────────────────────
function ImageUpload({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [onChange]);

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
      {!value ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); }}
          style={{ border: `2px dashed ${dragging ? "var(--cinnabar-ink)" : "var(--rule)"}`, padding: "32px 24px", textAlign: "center", cursor: "pointer", transition: "border-color 150ms" }}
        >
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", marginBottom: 6 }}>Drop a photo of your formula</div>
          <div className="mono" style={{ fontSize: 10, opacity: 0.5 }}>or click to browse · JPG, PNG, WEBP</div>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Uploaded formula" style={{ width: "100%", maxHeight: 220, objectFit: "contain", border: "1px solid var(--rule)", background: "var(--paper-2)" }} />
          <button onClick={() => onChange(null)} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, border: "1px solid var(--rule)", background: "var(--paper)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11 }}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FormulaPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"decoder" | "sheet">("decoder");

  // Decoder state
  const [formulaText, setFormulaText] = useState("");
  const [formulaImage, setFormulaImage] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [decoderResult, setDecoderResult] = useState<DecoderOutput | null>(null);
  const [decoderLoading, setDecoderLoading] = useState(false);
  const [decoderError, setDecoderError] = useState<AIError | null>(null);

  // Sheet state
  const [sheetSubject, setSheetSubject] = useState("");
  const [sheetChapter, setSheetChapter] = useState("");
  const [sheetBoard, setSheetBoard] = useState("CBSE");
  const [sheetGrade, setSheetGrade] = useState("");
  const [sheetResult, setSheetResult] = useState<FormulaSheetOutput | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<AIError | null>(null);

  const profile = getLocalProfile();

  async function runDecoder() {
    if (!formulaText.trim() && !formulaImage) return;
    setDecoderLoading(true);
    setDecoderError(null);
    setDecoderResult(null);
    try {
      const body: Record<string, unknown> = {
        tool: "formula_decoder",
        formula: formulaText.trim() || undefined,
        subject: subject || undefined,
        level: level || profile?.grade || undefined,
        grade: profile?.grade,
        board: profile?.board,
        stream: profile?.stream,
      };
      if (formulaImage) body.image = formulaImage;
      const data = await callAIOrThrow<DecoderOutput>(body);
      setDecoderResult(data);
    } catch (e) {
      setDecoderError(e instanceof AIError ? e : new AIError("Something went wrong."));
    } finally {
      setDecoderLoading(false);
    }
  }

  async function runSheet() {
    if (!sheetSubject.trim() || !sheetChapter.trim()) return;
    setSheetLoading(true);
    setSheetError(null);
    setSheetResult(null);
    try {
      const data = await callAIOrThrow<FormulaSheetOutput>({
        tool: "formula",
        subject: sheetSubject.trim(),
        chapter: sheetChapter.trim(),
        board: sheetBoard,
        grade: sheetGrade || profile?.grade,
      });
      setSheetResult(data);
    } catch (e) {
      setSheetError(e instanceof AIError ? e : new AIError("Something went wrong."));
    } finally {
      setSheetLoading(false);
    }
  }

  const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid var(--rule)", background: "transparent", fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink)", outline: "none", boxSizing: "border-box" as const };
  const labelStyle = { fontFamily: "var(--mono)", fontSize: 10, opacity: 0.5, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6, display: "block" };

  return (
    <TierGate requires="formula">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div className="mono" style={{ fontSize: 10, opacity: 0.5, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>LEARN · Formula</div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>Formula Lab</h1>
          <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.5 }}>
            Decode any formula — derivation, variables, applications, and practice. Or generate a complete formula sheet for any chapter.
          </p>
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--rule)", marginBottom: 28 }}>
          {(["decoder", "sheet"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: "10px 24px", background: "transparent", border: "none", borderBottom: mode === m ? "2px solid var(--cinnabar-ink)" : "2px solid transparent", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, color: mode === m ? "var(--cinnabar-ink)" : "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", transition: "color 150ms" }}>
              {m === "decoder" ? "Formula Decoder" : "Formula Sheet"}
            </button>
          ))}
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 24, alignItems: "start" }}>

          {/* ── Left: inputs ──────────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {mode === "decoder" && (
              <>
                <div>
                  <label style={labelStyle}>Type your formula</label>
                  <input
                    value={formulaText}
                    onChange={e => setFormulaText(e.target.value)}
                    placeholder="e.g. F = ma  or  E = mc²"
                    style={inputStyle}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runDecoder(); }}}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
                  <span className="mono" style={{ fontSize: 10, opacity: 0.4 }}>or upload</span>
                  <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
                </div>

                <ImageUpload value={formulaImage} onChange={setFormulaImage} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Subject (optional)</label>
                    <select value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputStyle, padding: "9px 12px" }}>
                      <option value="">Auto-detect</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Level (optional)</label>
                    <input value={level} onChange={e => setLevel(e.target.value)} placeholder="e.g. Class 12" style={inputStyle} />
                  </div>
                </div>

                <button
                  onClick={runDecoder}
                  disabled={decoderLoading || (!formulaText.trim() && !formulaImage)}
                  className="btn"
                  style={{ width: "100%", padding: "12px 0", opacity: decoderLoading || (!formulaText.trim() && !formulaImage) ? 0.5 : 1 }}
                >
                  {decoderLoading ? "Decoding…" : "Decode Formula"}
                </button>
              </>
            )}

            {mode === "sheet" && (
              <>
                <div>
                  <label style={labelStyle}>Subject</label>
                  <input value={sheetSubject} onChange={e => setSheetSubject(e.target.value)} placeholder="e.g. Physics" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Chapter / Topic</label>
                  <input value={sheetChapter} onChange={e => setSheetChapter(e.target.value)} placeholder="e.g. Laws of Motion" style={inputStyle} onKeyDown={e => { if (e.key === "Enter") runSheet(); }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Board</label>
                    <select value={sheetBoard} onChange={e => setSheetBoard(e.target.value)} style={{ ...inputStyle, padding: "9px 12px" }}>
                      {["CBSE", "ICSE", "IB", "IGCSE", "A-Level", "State Board"].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Grade (optional)</label>
                    <input value={sheetGrade} onChange={e => setSheetGrade(e.target.value)} placeholder="e.g. 12" style={inputStyle} />
                  </div>
                </div>
                <button
                  onClick={runSheet}
                  disabled={sheetLoading || !sheetSubject.trim() || !sheetChapter.trim()}
                  className="btn"
                  style={{ width: "100%", padding: "12px 0", opacity: sheetLoading || !sheetSubject.trim() || !sheetChapter.trim() ? 0.5 : 1 }}
                >
                  {sheetLoading ? "Generating…" : "Generate Sheet"}
                </button>
              </>
            )}
          </div>

          {/* ── Right: output ─────────────────────────────────────────────── */}
          <div style={{ border: "1px solid var(--rule)", minHeight: 320 }}>
            {mode === "decoder" && (
              <>
                {decoderLoading && <div style={{ padding: 24 }}><AIThinking /></div>}
                {decoderError && <div style={{ padding: 24 }}><AIErrorDisplay error={decoderError} /></div>}
                {decoderResult && (
                  <>
                    <DecoderResult data={decoderResult} />
                    {user && <div style={{ padding: "12px 24px", borderTop: "1px solid var(--rule)" }}><SaveOutputButton toolSlug="formula" toolName="Formula Decoder" input={decoderResult.formula} outputText={JSON.stringify(decoderResult, null, 2)} /></div>}
                  </>
                )}
                {!decoderLoading && !decoderError && !decoderResult && (
                  <div style={{ padding: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.4, minHeight: 320 }}>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 48, fontStyle: "italic", opacity: 0.3 }}>∫</div>
                    <div className="mono" style={{ fontSize: 11 }}>Enter or upload a formula to decode it</div>
                  </div>
                )}
              </>
            )}
            {mode === "sheet" && (
              <>
                {sheetLoading && <div style={{ padding: 24 }}><AIThinking /></div>}
                {sheetError && <div style={{ padding: 24 }}><AIErrorDisplay error={sheetError} /></div>}
                {sheetResult && (
                  <>
                    <SheetResult data={sheetResult} />
                    {user && <div style={{ padding: "12px 24px", borderTop: "1px solid var(--rule)" }}><SaveOutputButton toolSlug="formula" toolName="Formula Sheet" input={`${sheetResult.subject} · ${sheetResult.chapter}`} outputText={JSON.stringify(sheetResult, null, 2)} /></div>}
                  </>
                )}
                {!sheetLoading && !sheetError && !sheetResult && (
                  <div style={{ padding: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.4, minHeight: 320 }}>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 48, fontStyle: "italic", opacity: 0.3 }}>Σ</div>
                    <div className="mono" style={{ fontSize: 11 }}>Enter a subject and chapter to generate a formula sheet</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </TierGate>
  );
}
