"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";

type Formula = {
  name: string;
  formula: string;
  variables: string;
  notes: string | null;
};

type Section = {
  title: string;
  formulas: Formula[];
};

type FormulaSheet = {
  subject: string;
  chapter: string;
  board: string;
  sections: Section[];
  keyConcepts: string[];
  units: Array<{ quantity: string; unit: string; dimensions?: string }>;
  examTips: string[];
};

type HistoryEntry = {
  date: string;
  subject: string;
  chapter: string;
  data: FormulaSheet;
};

const SUBJECTS = [
  "Physics", "Chemistry", "Mathematics", "Biology",
  "Economics", "Accountancy", "Business Studies",
  "English Literature", "History", "Geography",
  "Political Science", "Computer Science",
];

const BOARDS = ["CBSE", "ICSE", "IB", "IGCSE", "State Board"];
const GRADES = ["Any", "Class 9", "Class 10", "Class 11", "Class 12", "JEE", "NEET", "CUET"];

export default function FormulaPage() {
  const [subject,     setSubject]     = useState("");
  const [chapter,     setChapter]     = useState("");
  const [board,       setBoard]       = useState("CBSE");
  const [grade,       setGrade]       = useState("Any");
  const [sheet,       setSheet]       = useState<FormulaSheet | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [saved,       setSaved]       = useState(false);
  const [history,     setHistory]     = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("ledger-profile") || "{}");
      if (profile.board) setBoard(profile.board);
      if (profile.grade) setGrade(profile.grade);
      const hist: HistoryEntry[] = JSON.parse(localStorage.getItem("ledger-formula-history") || "[]");
      setHistory(hist);
    } catch {}
  }, []);

  async function generate() {
    if (!subject.trim() || !chapter.trim()) return;
    setLoading(true); setError(""); setSaved(false); setSheet(null);
    try {
      const res = await callAI({ tool: "formula", subject, chapter, board, grade: grade === "Any" ? "" : grade });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to generate. Try again."); return; }
      if (!Array.isArray(data.sections) || data.sections.length === 0) {
        setError("Generation failed — please try again."); return;
      }
      setSheet({
        subject:     data.subject     || subject,
        chapter:     data.chapter     || chapter,
        board:       data.board       || board,
        sections:    data.sections,
        keyConcepts: Array.isArray(data.keyConcepts) ? data.keyConcepts : [],
        units:       Array.isArray(data.units)       ? data.units       : [],
        examTips:    Array.isArray(data.examTips)    ? data.examTips    : [],
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (!sheet) return;
    try {
      const entry: HistoryEntry = { date: new Date().toISOString(), subject, chapter, data: sheet };
      const hist = [entry, ...history].slice(0, 20);
      localStorage.setItem("ledger-formula-history", JSON.stringify(hist));
      setHistory(hist);
      setSaved(true);
    } catch {}
  }

  function loadFromHistory(entry: HistoryEntry) {
    setSubject(entry.subject); setChapter(entry.chapter);
    setSheet({
      ...entry.data,
      sections:    Array.isArray(entry.data.sections)    ? entry.data.sections    : [],
      keyConcepts: Array.isArray(entry.data.keyConcepts) ? entry.data.keyConcepts : [],
      units:       Array.isArray(entry.data.units)       ? entry.data.units       : [],
      examTips:    Array.isArray(entry.data.examTips)    ? entry.data.examTips    : [],
    });
    setShowHistory(false); setSaved(true);
  }

  return (
    <div>
      <style>{`@media print{.no-print{display:none!important}nav{display:none!important}.formula-output{border:none!important;padding:0!important}body{background:white!important}}`}</style>

      <header className="mob-hp no-print" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 15 · Formula Sheet</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Subject + Chapter → complete reference card</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 40 }}>

          {/* ── Input panel ── */}
          <div className="no-print">
            <div className="mono cin" style={{ marginBottom: 16 }}>Generate</div>

            <div style={{ marginBottom: 14 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
              <input list="subj-list" value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Physics, Mathematics…"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
              <datalist id="subj-list">{SUBJECTS.map(s => <option key={s} value={s} />)}</datalist>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Chapter / Topic</div>
              <input value={chapter} onChange={e => setChapter(e.target.value)}
                placeholder="Laws of Motion, Integration…"
                onKeyDown={e => e.key === "Enter" && generate()}
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              <div>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Board</div>
                <select value={board} onChange={e => setBoard(e.target.value)}
                  style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)", boxSizing: "border-box" }}>
                  {BOARDS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Grade</div>
                <select value={grade} onChange={e => setGrade(e.target.value)}
                  style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)", boxSizing: "border-box" }}>
                  {GRADES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <button className="btn" onClick={generate}
              disabled={loading || !subject.trim() || !chapter.trim()}
              style={{ width: "100%", opacity: loading || !subject.trim() || !chapter.trim() ? 0.5 : 1 }}>
              {loading ? "Generating…" : "Generate formula sheet →"}
            </button>

            {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}

            {/* History */}
            {history.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <button onClick={() => setShowHistory(v => !v)}
                  className="mono" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 0 }}>
                  {showHistory ? "▲" : "▼"} History ({history.length})
                </button>
                {showHistory && (
                  <div style={{ marginTop: 8, border: "1px solid var(--rule)" }}>
                    {history.slice(0, 8).map((h, i) => (
                      <button key={i} onClick={() => loadFromHistory(h)}
                        style={{ display: "block", width: "100%", padding: "10px 14px", background: "none", border: "none", borderBottom: i < Math.min(history.length - 1, 7) ? "1px solid var(--rule)" : "none", cursor: "pointer", textAlign: "left" }}>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{h.subject} · {h.chapter}</div>
                        <div className="mono" style={{ color: "var(--ink-3)", marginTop: 2 }}>
                          {new Date(h.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!sheet && !loading && (
              <div style={{ marginTop: 28, border: "1px solid var(--rule)", padding: "18px" }}>
                <div className="mono cin" style={{ marginBottom: 12 }}>Good to know</div>
                {[
                  ["Be specific", '"Integration by Parts" beats "Integration"'],
                  ["Board-matched", "Formulas follow your board's notation and marking scheme"],
                  ["Print-ready", "One click exports a clean reference card to PDF"],
                ].map(([t, d]) => (
                  <div key={t} style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600 }}>{t}</div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{d}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Output panel ── */}
          <div className="formula-output">
            {!sheet ? (
              <div style={{ border: "1px solid var(--rule)", padding: "60px 40px", textAlign: "center", background: "var(--paper-2)", minHeight: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", color: "var(--ink-2)", marginBottom: 8 }}>
                  {loading ? "Reading the chapter…" : "Your formula sheet will appear here."}
                </div>
                <div className="mono" style={{ color: "var(--ink-3)" }}>
                  {loading ? "This takes about 10 seconds." : "Enter a subject and chapter to begin."}
                </div>
              </div>
            ) : (
              <>
                {/* Action bar */}
                <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 20, justifyContent: "flex-end" }}>
                  <button className="btn ghost" onClick={handleSave} disabled={saved} style={{ padding: "8px 18px", opacity: saved ? 0.5 : 1 }}>
                    {saved ? "Saved ✓" : "Save →"}
                  </button>
                  <button className="btn ghost" onClick={() => { setSheet(null); setSaved(false); }} style={{ padding: "8px 18px" }}>
                    New sheet
                  </button>
                  <button className="btn" onClick={() => window.print()} style={{ padding: "8px 18px" }}>
                    Print / PDF ↗
                  </button>
                </div>

                {/* Sheet header */}
                <div style={{ border: "1px solid var(--ink)", padding: "20px 24px", marginBottom: 16, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap", background: "var(--ink)", color: "var(--paper)" }}>
                  <div>
                    <div className="mono" style={{ opacity: 0.5, fontSize: 9 }}>Subject</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 700, marginTop: 2 }}>{sheet.subject}</div>
                  </div>
                  <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="mono" style={{ opacity: 0.5, fontSize: 9 }}>Chapter</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 700, marginTop: 2 }}>{sheet.chapter}</div>
                  </div>
                  <div>
                    <div className="mono" style={{ opacity: 0.5, fontSize: 9 }}>Board</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 12, marginTop: 2 }}>{sheet.board}</div>
                  </div>
                  {grade !== "Any" && (
                    <div>
                      <div className="mono" style={{ opacity: 0.5, fontSize: 9 }}>Grade</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 12, marginTop: 2 }}>{grade}</div>
                    </div>
                  )}
                </div>

                {/* Formula sections */}
                {(sheet.sections || []).map((section, si) => (
                  <div key={si} style={{ marginBottom: 16, border: "1px solid var(--ink)" }}>
                    <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                      <div className="mono cin">{section.title}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                      {(section.formulas || []).map((f, fi) => (
                        <div key={fi} style={{ padding: "16px 18px", borderRight: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)" }}>
                          <div style={{ fontFamily: "var(--sans)", fontSize: 10, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{f.name}</div>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 18, color: "var(--ink)", marginBottom: 10, lineHeight: 1.4, letterSpacing: "-0.01em" }}>{f.formula}</div>
                          <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.6 }}>{f.variables}</div>
                          {f.notes && (
                            <div style={{ fontFamily: "var(--sans)", fontSize: 11, fontStyle: "italic", color: "var(--ink-3)", borderTop: "1px solid var(--rule)", paddingTop: 6, marginTop: 8 }}>{f.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Key concepts */}
                {(sheet.keyConcepts || []).length > 0 && (
                  <div style={{ marginBottom: 16, border: "1px solid var(--ink)" }}>
                    <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                      <div className="mono cin">Key Concepts</div>
                    </div>
                    <div style={{ padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(sheet.keyConcepts || []).map((c, i) => (
                        <span key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, padding: "4px 10px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Units & dimensions */}
                {(sheet.units || []).length > 0 && (
                  <div style={{ marginBottom: 16, border: "1px solid var(--ink)" }}>
                    <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                      <div className="mono cin">Units &amp; Dimensions</div>
                    </div>
                    <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["Quantity", "SI Unit", "Dimensions"].map(h => (
                            <th key={h} style={{ padding: "8px 18px", textAlign: "left", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", fontWeight: "normal", letterSpacing: "0.06em", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(sheet.units || []).map((u, i) => (
                          <tr key={i}>
                            <td style={{ padding: "10px 18px", fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, borderBottom: i < sheet.units.length - 1 ? "1px solid var(--rule)" : "none" }}>{u.quantity}</td>
                            <td style={{ padding: "10px 18px", fontFamily: "var(--mono)", fontSize: 12, borderBottom: i < sheet.units.length - 1 ? "1px solid var(--rule)" : "none" }}>{u.unit}</td>
                            <td style={{ padding: "10px 18px", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-2)", borderBottom: i < sheet.units.length - 1 ? "1px solid var(--rule)" : "none" }}>{u.dimensions || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Exam tips */}
                {(sheet.examTips || []).length > 0 && (
                  <div style={{ border: "1px solid var(--ink)" }}>
                    <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--ink)", color: "var(--paper)" }}>
                      <div className="mono" style={{ letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 9 }}>Exam tips for this chapter</div>
                    </div>
                    {(sheet.examTips || []).map((tip, i) => (
                      <div key={i} style={{ padding: "12px 18px", borderBottom: i < sheet.examTips.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0, marginTop: 1 }}>{String(i + 1).padStart(2, "0")}</span>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.55 }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="no-print" style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 15 of 44.</div>
        </div>
      </main>
    </div>
  );
}
