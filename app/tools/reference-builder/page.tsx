"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

// ─── Mind Map types & components ───────────────────────────────────────────

type MMNode = { label: string; children?: MMNode[] };
type MapData = { center: string; branches: MMNode[] };

function Branch({ node, depth = 0 }: { node: MMNode; depth?: number }) {
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

function MindMapTab() {
  const [topic, setTopic]   = useState("");
  const [detail, setDetail] = useState("medium");
  const [map, setMap]       = useState<MapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

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

  if (map) return (
    <>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ display: "inline-block", padding: "14px 28px", background: "var(--ink)", color: "var(--paper)", fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", fontWeight: 700 }}>{map.center}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
        {map.branches.map((b, i) => (
          <div key={i} style={{ border: "1px solid var(--rule)", padding: "16px" }}>
            <Branch node={b} depth={0} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <button className="btn ghost" onClick={() => setMap(null)} style={{ marginRight: 10, cursor: "pointer" }}>New map</button>
        <button className="btn ghost" onClick={() => window.print()} style={{ cursor: "pointer" }}>Print / PDF ↗</button>
      </div>
    </>
  );

  return (
    <>
      <div className="mono cin" style={{ marginBottom: 8 }}>Build a mind map</div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.015em", margin: "0 0 28px" }}>Any topic. Full concept breakdown.</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 20 }}>
        <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} placeholder="e.g. Photosynthesis, French Revolution, Machine Learning, Supply and Demand&hellip;"
          style={{ fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 14px", color: "var(--ink)" }} />
        <select value={detail} onChange={e => setDetail(e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 10px", color: "var(--ink)", cursor: "pointer" }}>
          <option value="brief">Overview (3 branches)</option>
          <option value="medium">Standard (5 branches)</option>
          <option value="deep">Deep dive (7+ branches)</option>
        </select>
      </div>
      {error && <div style={{ marginBottom: 12, color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13 }}>{error}</div>}
      <button className="btn" onClick={generate} disabled={loading || !topic.trim()} style={{ width: "100%", opacity: loading ? 0.5 : 1, cursor: "pointer" }}>
        {loading ? "Building map…" : "Generate mind map →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </>
  );
}

// ─── Formula Sheet types & logic ────────────────────────────────────────────

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

function FormulaTab() {
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
    <>
      <style>{`@media print{.no-print{display:none!important}nav{display:none!important}.formula-output{border:none!important;padding:0!important}body{background:white!important}}`}</style>

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
                style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)", boxSizing: "border-box", cursor: "pointer" }}>
                {BOARDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Grade</div>
              <select value={grade} onChange={e => setGrade(e.target.value)}
                style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)", boxSizing: "border-box", cursor: "pointer" }}>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <button className="btn" onClick={generate}
            disabled={loading || !subject.trim() || !chapter.trim()}
            style={{ width: "100%", opacity: loading || !subject.trim() || !chapter.trim() ? 0.5 : 1, cursor: "pointer" }}>
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
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{h.subject} &middot; {h.chapter}</div>
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
                ["Be specific", "&quot;Integration by Parts&quot; beats &quot;Integration&quot;"],
                ["Board-matched", "Formulas follow your board&apos;s notation and marking scheme"],
                ["Print-ready", "One click exports a clean reference card to PDF"],
              ].map(([t, d]) => (
                <div key={t} style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600 }}>{t}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginTop: 2 }} dangerouslySetInnerHTML={{ __html: d }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Output panel ── */}
        <div className="formula-output">
          {!sheet ? (
            <div style={{ border: "1px solid var(--rule)", padding: "60px 40px", textAlign: "center", background: "var(--paper-2)", minHeight: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              {loading ? (
                <AIThinking />
              ) : (
                <>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", color: "var(--ink-2)", marginBottom: 8 }}>
                    Your formula sheet will appear here.
                  </div>
                  <div className="mono" style={{ color: "var(--ink-3)" }}>
                    Enter a subject and chapter to begin.
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Action bar */}
              <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 20, justifyContent: "flex-end" }}>
                <button className="btn ghost" onClick={handleSave} disabled={saved} style={{ padding: "8px 18px", opacity: saved ? 0.5 : 1, cursor: "pointer" }}>
                  {saved ? "Saved ✓" : "Save →"}
                </button>
                <button className="btn ghost" onClick={() => { setSheet(null); setSaved(false); }} style={{ padding: "8px 18px", cursor: "pointer" }}>
                  New sheet
                </button>
                <button className="btn" onClick={() => window.print()} style={{ padding: "8px 18px", cursor: "pointer" }}>
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
    </>
  );
}

// ─── Concept Connect types & logic ──────────────────────────────────────────

type Connection = { conceptA: string; conceptB: string; links: { type: string; description: string; example: string }[]; deepInsight: string; crossSubjectValue: string; examAngles: string[]; examTip: string };

function ConceptConnectTab() {
  const [conceptA, setConceptA] = useState("");
  const [conceptB, setConceptB] = useState("");
  const [result, setResult]     = useState<Connection | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

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
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <div style={{ flex: 1, border: "2px solid var(--ink)", padding: "14px 18px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>{result.conceptA}</div>
        </div>
        <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 20, flexShrink: 0 }}>&#8596;</div>
        <div style={{ flex: 1, border: "2px solid var(--ink)", padding: "14px 18px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>{result.conceptB}</div>
        </div>
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
        {result.examAngles.map((a, i) => <div key={i} style={{ fontFamily: "var(--sans)", fontSize: 13, marginBottom: 5 }}>&middot; {a}</div>)}
      </div>

      <div style={{ border: "1px solid #1a6091", padding: "14px 16px", background: "rgba(26,96,145,0.04)", marginBottom: 20 }}>
        <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 6 }}>EXAM TIP</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>{result.examTip}</div>
      </div>

      <button className="btn ghost" onClick={() => setResult(null)} style={{ cursor: "pointer" }}>New connection</button>
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
      <button className="btn" onClick={generate} disabled={loading} style={{ width: "100%", opacity: loading ? 0.5 : 1, cursor: "pointer" }}>
        {loading ? "Finding connections…" : "Find the connection →"}
      </button>
      {loading && <div style={{ marginTop: 20 }}><AIThinking /></div>}
    </div>
  );
}

// ─── Page shell ─────────────────────────────────────────────────────────────

type Tab = "mindmap" | "formula" | "connect";
const TABS: [Tab, string][] = [["mindmap", "Mind Map"], ["formula", "Formula Sheet"], ["connect", "Concept Connect"]];

export default function ReferenceBuilderPage() {
  const [tab, setTab] = useState<Tab>("mindmap");
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Reference Builder</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Mind maps, formula sheets, and concept connections in one place.</div>
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
        {tab === "mindmap"  && <MindMapTab />}
        {tab === "formula"  && <FormulaTab />}
        {tab === "connect"  && <ConceptConnectTab />}
      </main>
    </div>
  );
}
