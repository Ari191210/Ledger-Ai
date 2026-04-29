"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { patchUserData } from "@/lib/user-data";
import { callAI } from "@/lib/ai-fetch";

type Chapter  = { name: string; topics: string[] };
type Subject  = { name: string; chapters: Chapter[] };
type ParsedExam = { name: string; date: string | null; note: string };
type ParsedSyllabus = {
  grade: string | null;
  board: string | null;
  academicYear: string | null;
  subjects: Subject[];
  exams: ParsedExam[];
  notes: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SyllabusPage() {
  const { user } = useAuth();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [mode,      setMode]      = useState<"upload" | "text">("upload");
  const [file,      setFile]      = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [syllabus,  setSyllabus]  = useState<ParsedSyllabus | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [saved,     setSaved]     = useState(false);
  const [expanded,  setExpanded]  = useState<Record<number, boolean>>({});
  const [dragging,  setDragging]  = useState(false);

  // Load previously saved syllabus
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ledger-syllabus");
      if (raw) setSyllabus(JSON.parse(raw));
    } catch {}
  }, []);

  function handleFile(f: File) {
    const ok = f.type === "application/pdf" || f.type.startsWith("image/");
    if (!ok) { setError("Please upload a PDF or image file."); return; }
    if (f.size > 20 * 1024 * 1024) { setError("File must be under 20 MB."); return; }
    setFile(f);
    setError("");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function parse() {
    if (!file && !pastedText.trim()) return;
    setLoading(true); setError(""); setSaved(false);

    try {
      const body: Record<string, unknown> = { tool: "syllabus" };

      if (file) {
        const b64 = await fileToBase64(file);
        if (file.type === "application/pdf") {
          body.pdf = b64;
        } else {
          body.image = `data:${file.type};base64,${b64}`;
        }
      } else {
        body.text = pastedText;
      }

      const res  = await callAI(body);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Parsing failed. Try again."); return; }
      setSyllabus(data as ParsedSyllabus);
      setExpanded({});
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const saveSyllabus = useCallback(async () => {
    if (!syllabus) return;
    try {
      localStorage.setItem("ledger-syllabus", JSON.stringify(syllabus));
      // Merge detected grade/board into profile
      const profile = JSON.parse(localStorage.getItem("ledger-profile") || "{}");
      if (syllabus.grade && !profile.grade)  profile.grade = syllabus.grade;
      if (syllabus.board && !profile.board)  profile.board = syllabus.board;
      localStorage.setItem("ledger-profile", JSON.stringify(profile));
      // Push subjects to planner data
      const subjectNames = syllabus.subjects.map(s => s.name);
      localStorage.setItem("ledger-syllabus-subjects", JSON.stringify(subjectNames));
      if (user) {
        await patchUserData(user.id, "grade" as never, syllabus.grade ?? undefined).catch(() => {});
      }
      setSaved(true);
    } catch {}
  }, [syllabus, user]);

  function toggleExpand(i: number) {
    setExpanded(p => ({ ...p, [i]: !p[i] }));
  }

  const totalChapters = syllabus?.subjects.reduce((n, s) => n + s.chapters.length, 0) ?? 0;

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Syllabus Parser</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Upload a PDF or photo. Get your year mapped in seconds.</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: syllabus ? "1fr 1.5fr" : "1fr", gap: 48 }}>

          {/* Input panel */}
          <div>
            {/* Mode toggle */}
            <div style={{ display: "flex", border: "1px solid var(--ink)", marginBottom: 20 }}>
              {(["upload", "text"] as const).map((m, i) => (
                <button key={m} onClick={() => { setMode(m); setFile(null); setError(""); }}
                  style={{ flex: 1, padding: "10px 0", background: mode === m ? "var(--ink)" : "transparent", color: mode === m ? "var(--paper)" : "var(--ink-2)", border: "none", borderRight: i === 0 ? "1px solid var(--rule)" : "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {m === "upload" ? "Upload file" : "Paste text"}
                </button>
              ))}
            </div>

            {mode === "upload" ? (
              <>
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  style={{ border: `2px dashed ${dragging ? "var(--ink)" : "var(--rule)"}`, background: dragging ? "var(--paper-2)" : "transparent", padding: "48px 24px", textAlign: "center", cursor: "pointer", transition: "all 200ms", marginBottom: 12 }}>
                  {file ? (
                    <>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", marginBottom: 6 }}>{file.name}</div>
                      <div className="mono" style={{ color: "var(--ink-3)" }}>{(file.size / 1024).toFixed(0)} KB · Click to change</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", marginBottom: 8 }}>Drop your syllabus here</div>
                      <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 4 }}>PDF or photo of a printed syllabus</div>
                      <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>Up to 20 MB · JPG, PNG, PDF</div>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="application/pdf,image/*" style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </>
            ) : (
              <textarea
                value={pastedText} onChange={e => setPastedText(e.target.value)}
                placeholder={"Paste your syllabus here. It can be messy — chapter lists, unit breakdowns, exam schedules, anything.\n\nExample:\nMathematics\n1. Relations and Functions\n   - Composition of functions\n   - Invertible functions\n2. Inverse Trigonometric Functions\n..."}
                rows={14}
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "16px", color: "var(--ink)", resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: 12 }}
              />
            )}

            <button className="btn" onClick={parse}
              disabled={loading || (mode === "upload" ? !file : !pastedText.trim())}
              style={{ opacity: loading || (mode === "upload" ? !file : !pastedText.trim()) ? 0.5 : 1, width: "100%" }}>
              {loading ? "Reading your syllabus…" : "Parse syllabus →"}
            </button>

            {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}

            {/* What this does */}
            {!syllabus && !loading && (
              <div style={{ marginTop: 28, border: "1px solid var(--rule)", padding: "18px 20px" }}>
                <div className="mono cin" style={{ marginBottom: 12 }}>What happens</div>
                {[
                  ["01", "AI reads your document", "PDFs, photos of printed sheets, messy text — anything works."],
                  ["02", "Subjects & chapters extracted", "Every unit, chapter, and topic is pulled into a clean structure."],
                  ["03", "All AI tools personalised", "Notes Simplifier, Doubt Solver, Tutor — all know your exact syllabus."],
                  ["04", "Planner pre-filled", "Your subjects are ready to drop into the Study Planner."],
                ].map(([n, title, desc]) => (
                  <div key={n} style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: n !== "04" ? "1px solid var(--rule)" : "none" }}>
                    <span className="mono" style={{ color: "var(--cinnabar-ink)", flexShrink: 0 }}>{n}</span>
                    <div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{title}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results panel */}
          {syllabus && (
            <div>
              {/* Meta row */}
              <div style={{ border: "1px solid var(--ink)", padding: "20px 24px", marginBottom: 20, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 3 }}>Grade</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 700 }}>{syllabus.grade ?? "—"}</div>
                </div>
                <div style={{ width: 1, height: 36, background: "var(--rule)" }} />
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 3 }}>Board</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 700 }}>{syllabus.board ?? "—"}</div>
                </div>
                <div style={{ width: 1, height: 36, background: "var(--rule)" }} />
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 3 }}>Year</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 700 }}>{syllabus.academicYear ?? "—"}</div>
                </div>
                <div style={{ width: 1, height: 36, background: "var(--rule)" }} />
                <div>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 3 }}>Total</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 700 }}>{syllabus.subjects.length} subjects · {totalChapters} chapters</div>
                </div>
              </div>

              {/* Subjects */}
              <div style={{ border: "1px solid var(--ink)", marginBottom: 20 }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="mono cin">Subjects & Chapters</div>
                  <button onClick={() => setExpanded(syllabus.subjects.reduce((a, _, i) => ({ ...a, [i]: true }), {}))}
                    className="mono" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 9 }}>
                    Expand all
                  </button>
                </div>

                {syllabus.subjects.map((subj, i) => (
                  <div key={i} style={{ borderBottom: i < syllabus.subjects.length - 1 ? "1px solid var(--rule)" : "none" }}>
                    {/* Subject header */}
                    <button onClick={() => toggleExpand(i)}
                      style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600 }}>{subj.name}</div>
                        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 2 }}>
                          {subj.chapters.length} chapter{subj.chapters.length !== 1 ? "s" : ""} · {subj.chapters.reduce((n, c) => n + c.topics.length, 0)} topics
                        </div>
                      </div>
                      <span className="mono" style={{ color: "var(--ink-3)", fontSize: 10 }}>{expanded[i] ? "▲" : "▼"}</span>
                    </button>

                    {/* Chapters */}
                    {expanded[i] && (
                      <div style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                        {subj.chapters.map((ch, j) => (
                          <div key={j} style={{ padding: "12px 20px 12px 32px", borderBottom: j < subj.chapters.length - 1 ? "1px solid var(--rule)" : "none" }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: ch.topics.length > 0 ? 6 : 0 }}>
                              <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9, flexShrink: 0 }}>{String(j + 1).padStart(2, "0")}</span>
                              <span style={{ fontFamily: "var(--sans)", fontSize: 13 }}>{ch.name}</span>
                            </div>
                            {ch.topics.length > 0 && (
                              <div style={{ paddingLeft: 22, display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                {ch.topics.map((t, k) => (
                                  <span key={k} className="mono" style={{ fontSize: 9, padding: "2px 7px", border: "1px solid var(--rule)", color: "var(--ink-3)" }}>{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Exams (if any) */}
              {syllabus.exams.length > 0 && (
                <div style={{ border: "1px solid var(--ink)", marginBottom: 20 }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}>
                    <div className="mono cin">Exam Schedule</div>
                  </div>
                  {syllabus.exams.map((ex, i) => (
                    <div key={i} style={{ padding: "12px 20px", borderBottom: i < syllabus.exams.length - 1 ? "1px solid var(--rule)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 13 }}>{ex.name}</span>
                      <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>{ex.date ?? ex.note ?? ""}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {syllabus.notes && (
                <div style={{ border: "1px solid var(--rule)", padding: "14px 20px", marginBottom: 20, background: "var(--paper-2)" }}>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 4 }}>Additional notes from your syllabus</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>{syllabus.notes}</div>
                </div>
              )}

              {/* Save buttons */}
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button className="btn" onClick={saveSyllabus} disabled={saved}>
                  {saved ? "Saved ✓" : "Save to profile →"}
                </button>
                <Link href="/tools/planner" className="btn ghost" style={{ textDecoration: "none" }}>
                  Open Planner →
                </Link>
                <button className="btn ghost" onClick={() => { setSyllabus(null); setFile(null); setPastedText(""); setSaved(false); }}>
                  Parse another
                </button>
              </div>

              {saved && (
                <div className="mono" style={{ color: "var(--cinnabar-ink)", marginTop: 12, fontSize: 9 }}>
                  Syllabus saved. All AI tools will now reference your exact curriculum.
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Ledger.</div>
        </div>
      </main>
    </div>
  );
}
