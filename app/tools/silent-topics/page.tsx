"use client";
import { useState } from "react";
import Link from "next/link";
import { callAIOrThrow, AIError } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";
import { AIErrorDisplay } from "@/components/ai-error";
import { AIOutput } from "@/components/ai-output";

const LS_KEY = "ledger-silent-topics-history";

type Chapter = {
  chapter:        string;
  weightage:      "high" | "medium" | "low";
  engagement:     "none" | "minimal" | "moderate" | "good";
  last_seen:      string;
  avoidance_score: number;
};

type AuditResult = {
  chapters:       Chapter[];
  reckoning_note: string;
  reentry_plan:   string;
};

type HistoryEntry = {
  id:      number;
  date:    string;
  exam:    string;
  subject: string;
  result:  AuditResult;
};

const EXAMS = ["JEE Mains", "JEE Advanced", "NEET", "CBSE Class 12", "CBSE Class 11", "IB HL", "IB SL", "IGCSE", "A-Level"];

// ── Color mapping ──────────────────────────────────────────────────────────────

function tileStyle(score: number): React.CSSProperties {
  if (score >= 80) return { background: "var(--cinnabar-ink)",  color: "var(--paper)",  border: "1px solid var(--cinnabar-ink)" };
  if (score >= 60) return { background: "color-mix(in srgb, var(--cinnabar-ink) 40%, var(--paper-2))", color: "var(--ink)", border: "1px solid color-mix(in srgb, var(--cinnabar-ink) 50%, var(--rule))" };
  if (score >= 40) return { background: "color-mix(in srgb, var(--ochre) 30%, var(--paper-2))", color: "var(--ink)", border: "1px solid color-mix(in srgb, var(--ochre) 45%, var(--rule))" };
  if (score >= 15) return { background: "var(--paper-2)", color: "var(--ink-2)", border: "1px solid var(--rule)" };
  return                  { background: "var(--paper)",   color: "var(--ink-3)", border: "1px solid var(--rule)" };
}

function tileLabel(score: number): string {
  if (score >= 80) return "critical";
  if (score >= 60) return "avoid";
  if (score >= 40) return "sparse";
  if (score >= 15) return "partial";
  return "covered";
}

// ── Persistence ────────────────────────────────────────────────────────────────

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}

function saveAudit(entry: HistoryEntry) {
  try { localStorage.setItem(LS_KEY, JSON.stringify([entry, ...loadHistory()].slice(0, 20))); } catch { /* ignore */ }
}

// ── Silence map ────────────────────────────────────────────────────────────────

function SilenceMap({ chapters }: { chapters: Chapter[] }) {
  const [selected, setSelected] = useState<Chapter | null>(null);
  const sorted = [...chapters].sort((a, b) => b.avoidance_score - a.avoidance_score);

  return (
    <div>
      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))", gap: 5 }}>
        {sorted.map((ch) => {
          const style = tileStyle(ch.avoidance_score);
          const isSelected = selected?.chapter === ch.chapter;
          return (
            <button
              key={ch.chapter}
              onClick={() => setSelected(isSelected ? null : ch)}
              style={{
                ...style,
                padding: "10px 11px",
                cursor: "pointer",
                textAlign: "left" as const,
                outline: isSelected ? "2px solid var(--ink)" : "none",
                outlineOffset: -2,
                transition: "opacity 150ms",
              }}
            >
              <div style={{ fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600, lineHeight: 1.3, marginBottom: 7 }}>
                {ch.chapter}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 7, letterSpacing: "0.1em", opacity: 0.65 }}>
                  {ch.weightage.toUpperCase()}
                </span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 7, opacity: 0.6 }}>
                  {tileLabel(ch.avoidance_score)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected tile detail */}
      {selected && (
        <div style={{ marginTop: 8, border: "1px solid var(--rule)", padding: "16px 20px", background: "var(--paper-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", fontWeight: 500 }}>
              {selected.chapter}
            </div>
            <button onClick={() => setSelected(null)} style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 4 }}>Last seen</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>{selected.last_seen}</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 4 }}>Engagement</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", textTransform: "capitalize" as const }}>{selected.engagement}</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 4 }}>Weightage</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", textTransform: "capitalize" as const }}>{selected.weightage}</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 4 }}>Avoidance score</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: selected.avoidance_score >= 60 ? "var(--cinnabar-ink)" : "var(--ink-2)", fontWeight: 700 }}>{selected.avoidance_score} / 100</div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 14, flexWrap: "wrap" as const }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink-3)", letterSpacing: "0.1em" }}>AVOIDANCE:</div>
        {[
          { label: "Critical",  score: 90 },
          { label: "Avoid",     score: 65 },
          { label: "Sparse",    score: 45 },
          { label: "Partial",   score: 25 },
          { label: "Covered",   score: 5  },
        ].map(({ label, score }) => {
          const s = tileStyle(score);
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, background: s.background, border: s.border, flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink-3)" }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SilentTopicsPage() {
  const [studyLog, setStudyLog] = useState("");
  const [exam,     setExam]     = useState("JEE Mains");
  const [subject,  setSubject]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<AIError | string | null>(null);
  const [result,   setResult]   = useState<AuditResult | null>(null);
  const [meta,     setMeta]     = useState<{ exam: string; subject: string } | null>(null);

  const canSubmit = studyLog.trim().length > 40 && subject.trim();

  async function analyse() {
    if (!canSubmit) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await callAIOrThrow<AuditResult>({
        tool:     "silent_topic_audit",
        studyLog: studyLog.trim(),
        exam,
        subject:  subject.trim(),
      });
      if (!data.chapters?.length) throw new Error("No chapters returned — try again.");
      const entry: HistoryEntry = { id: Date.now(), date: new Date().toISOString(), exam, subject: subject.trim(), result: data };
      saveAudit(entry);
      setMeta({ exam, subject: subject.trim() });
      setResult(data);
    } catch (err) {
      setError(err as AIError);
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 13, boxSizing: "border-box" as const };
  const silentCount = result ? result.chapters.filter(c => c.avoidance_score >= 60).length : 0;

  return (
    <div className="mob-p" style={{ minHeight: "100vh", padding: "40px 44px 80px", maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--rule)", paddingBottom: 16, marginBottom: 44 }}>
        <Link href="/dashboard" style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", textDecoration: "none" }}>← Dashboard</Link>
        {result && (
          <button onClick={() => { setResult(null); setMeta(null); }} style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer" }}>
            New scan →
          </button>
        )}
      </div>

      {/* Title */}
      <div style={{ fontFamily: "var(--serif)", fontSize: 13, fontStyle: "italic", color: "var(--ink-3)", marginBottom: 16 }}>
        The chapters you&apos;ve been quietly avoiding for weeks.
      </div>
      <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px, 5vw, 52px)", fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1.05, margin: "0 0 44px" }}>
        Silent Topic Finder.
      </h1>

      {/* ── Result view ── */}
      {result && meta && (
        <div>
          {/* Map header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: 4 }}>
                {meta.exam} · {meta.subject}
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>
                {silentCount} chapter{silentCount !== 1 ? "s" : ""} with high avoidance score — click any tile to inspect
              </div>
            </div>
          </div>

          {/* Silence map */}
          <SilenceMap chapters={result.chapters} />

          {/* Reckoning note */}
          <div style={{ border: "1px solid var(--rule)", padding: "20px 24px", margin: "36px 0 0", background: "var(--paper-2)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "var(--ink-3)", marginBottom: 12 }}>
              The pattern
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", lineHeight: 1.6, color: "var(--ink)" }}>
              {result.reckoning_note}
            </div>
          </div>

          {/* Reentry plan */}
          <div style={{ marginTop: 36 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "var(--ink-3)", marginBottom: 16 }}>
              3-day reentry plan
            </div>
            <AIOutput text={result.reentry_plan} />
          </div>
        </div>
      )}

      {/* ── Compose view ── */}
      {!result && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 24, maxWidth: 640 }}>

          {/* Study log */}
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--ink-3)", marginBottom: 8 }}>
              Your last 14 days — paste anything
            </div>
            <textarea
              value={studyLog}
              onChange={e => setStudyLog(e.target.value)}
              rows={12}
              placeholder={"Paste your last 14 days of study notes. Rough is fine — whatever you wrote, typed, or logged each day.\n\nDay 1: Did derivatives, some limits MCQs.\nDay 2: Organic chemistry reactions — SN1/SN2.\nDay 7: Went back to integration again...\n\nThe AI will find what's missing."}
              style={{ ...inp, fontFamily: "var(--sans)", fontSize: 13, lineHeight: "1.7", resize: "vertical" as const }}
            />
          </div>

          {/* Exam + Subject */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--ink-3)", marginBottom: 8 }}>Exam</div>
              <select value={exam} onChange={e => setExam(e.target.value)}
                style={{ ...inp, appearance: "none" as const }}>
                {EXAMS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--ink-3)", marginBottom: 8 }}>Subject</div>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Physics"
                style={inp} />
            </div>
          </div>

          {error && <AIErrorDisplay error={error} onRetry={analyse} />}
          {loading && (
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)", marginBottom: 12 }}>Scanning your log…</div>
              <AIThinking />
            </div>
          )}

          <button className="btn" onClick={analyse} disabled={loading || !canSubmit}
            style={{ opacity: loading || !canSubmit ? 0.4 : 1 }}>
            {loading ? "Scanning…" : "Find the silence →"}
          </button>

          {/* Past audits */}
          {loadHistory().length > 0 && !loading && (
            <div style={{ marginTop: 8, borderTop: "1px solid var(--rule)", paddingTop: 24 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--ink-3)", marginBottom: 14 }}>
                Previous scans
              </div>
              {loadHistory().slice(0, 4).map(h => {
                const silent = h.result.chapters.filter(c => c.avoidance_score >= 60).length;
                const d = new Date(h.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                return (
                  <button key={h.id}
                    onClick={() => { setMeta({ exam: h.exam, subject: h.subject }); setResult(h.result); }}
                    style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "10px 0", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--rule)", textAlign: "left" as const }}>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 14, fontStyle: "italic" }}>{h.exam} · {h.subject}</span>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: silent > 0 ? "var(--cinnabar-ink)" : "var(--ink-3)" }}>{silent} silent</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)" }}>{d}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
