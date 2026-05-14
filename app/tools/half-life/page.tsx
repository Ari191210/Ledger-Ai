"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { callAI } from "@/lib/ai-fetch";
import { AIThinking } from "@/components/ai-thinking";

type DecayStatus = "fresh" | "aging" | "critical";

type DecayEntry = {
  chapter: string;
  weeks_since: number;
  original_mastery: number;
  current_recall_pct: number;
  status: DecayStatus;
};

type ReviveDay = {
  day: number;
  chapter: string;
  method: string;
  time_budget: string;
};

type HalfLifeResult = {
  decay_table: DecayEntry[];
  critical_chapters: string[];
  revive_sequence: ReviveDay[];
};

const STATUS_COLOR: Record<DecayStatus, string> = {
  fresh:    "var(--ink)",
  aging:    "var(--ink-2)",
  critical: "var(--cinnabar-ink)",
};

const STATUS_LABEL: Record<DecayStatus, string> = {
  fresh:    "Fresh",
  aging:    "Aging",
  critical: "Critical",
};

const LS_KEY = "ledger-half-life-history";

const PLACEHOLDER = `Rotational Motion | 14 | 4
Thermodynamics | 8 | 3
Electrochemistry | 20 | 2
Organic: Aldehydes | 3 | 5
Calculus: Integration | 6 | 4`;

const EXAM_OPTIONS = ["JEE", "NEET", "CBSE", "IB", "IGCSE", "A-Level", "SAT"];

export default function HalfLifePage() {
  const [chaptersLog, setChaptersLog] = useState("");
  const [exam,        setExam]        = useState("JEE");
  const [subject,     setSubject]     = useState("");
  const [result,      setResult]      = useState<HalfLifeResult | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  // Restore last result from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const { result: r, inputs } = JSON.parse(saved);
        setResult(r);
        setChaptersLog(inputs.chaptersLog ?? "");
        setExam(inputs.exam ?? "JEE");
        setSubject(inputs.subject ?? "");
      }
    } catch { /* ignore */ }
  }, []);

  async function generate() {
    if (!chaptersLog.trim() || !subject.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res  = await callAI({ tool: "topic_half_life", chaptersLog: chaptersLog.trim(), exam, subject: subject.trim() });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setResult(data);
      localStorage.setItem(LS_KEY, JSON.stringify({ result: data, inputs: { chaptersLog, exam, subject } }));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() { setResult(null); setError(""); }

  return (
    <div>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Topic Half-Life Tracker</div>
        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10 }}>Every chapter is decaying. See which ones are about to expire.</div>
      </header>

      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <div className="mob-col" style={{ display: "grid", gridTemplateColumns: result || loading ? "380px 1fr" : "1fr", gap: 48, alignItems: "start" }}>

          {/* ── Input panel ── */}
          <div>
            <div className="mono cin" style={{ marginBottom: 8 }}>01 · Chapter log</div>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 10, lineHeight: 1.7 }}>
              One chapter per line. Format:<br />
              <span style={{ color: "var(--ink-2)" }}>Chapter name | weeks ago | mastery 1–5</span>
            </div>
            <textarea
              value={chaptersLog}
              onChange={e => setChaptersLog(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={10}
              style={{
                width: "100%", boxSizing: "border-box",
                fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.75,
                border: "1px solid var(--ink)", background: "var(--paper-2)",
                padding: "14px 16px", color: "var(--ink)", outline: "none", resize: "vertical",
              }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20, marginBottom: 20 }}>
              <div>
                <div className="mono cin" style={{ marginBottom: 8, fontSize: 9 }}>02 · Exam</div>
                <select
                  value={exam}
                  onChange={e => setExam(e.target.value)}
                  style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "10px 12px", color: "var(--ink)", outline: "none" }}
                >
                  {EXAM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <div className="mono cin" style={{ marginBottom: 8, fontSize: 9 }}>03 · Subject</div>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Physics, Chemistry…"
                  style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper-2)", padding: "10px 12px", color: "var(--ink)", outline: "none" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="btn"
                onClick={generate}
                disabled={loading || !chaptersLog.trim() || !subject.trim()}
                style={{ opacity: loading || !chaptersLog.trim() || !subject.trim() ? 0.5 : 1 }}
              >
                {loading ? "Modeling decay…" : "Run decay model →"}
              </button>
              {result && <button className="btn ghost" onClick={reset}>Clear</button>}
            </div>

            {error && <div style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, color: "var(--cinnabar-ink)" }}>{error}</div>}

            {/* Mastery key */}
            <div style={{ marginTop: 28, borderTop: "1px solid var(--rule)", paddingTop: 20 }}>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginBottom: 12 }}>Mastery scale</div>
              {[["1", "Barely covered — just attended class"],["2", "Read once, no practice"],["3", "Did some problems, understood basics"],["4", "Solid — could explain it to someone"],["5", "Expert — solved complex problems"]].map(([n, l]) => (
                <div key={n} style={{ display: "flex", gap: 10, marginBottom: 6, alignItems: "baseline" }}>
                  <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, fontWeight: 500, color: "var(--cinnabar-ink)", lineHeight: 1, flexShrink: 0, width: 14 }}>{n}</span>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Output panel ── */}
          {loading && !result && (
            <div style={{ paddingTop: 40 }}>
              <AIThinking />
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 16 }}>Applying Ebbinghaus forgetting curve across all chapters…</div>
            </div>
          )}

          {result && (
            <div>

              {/* ── Decay map ── */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--ink)", paddingBottom: 12, marginBottom: 0 }}>
                  <div className="mono cin">Decay Map</div>
                  <div style={{ display: "flex", gap: 20 }}>
                    {(["critical", "aging", "fresh"] as DecayStatus[]).map(s => (
                      <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, background: STATUS_COLOR[s], flexShrink: 0 }} />
                        <span className="mono" style={{ color: "var(--ink-3)", fontSize: 9 }}>{STATUS_LABEL[s]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {result.decay_table.map((entry, i) => {
                  const pct     = Math.max(0, Math.min(100, entry.current_recall_pct));
                  const color   = STATUS_COLOR[entry.status];
                  const isCrit  = entry.status === "critical";
                  return (
                    <div
                      key={i}
                      style={{
                        borderBottom: "1px solid var(--rule)",
                        padding: "14px 0",
                        background: isCrit ? "color-mix(in srgb, var(--cinnabar-ink) 4%, var(--paper))" : "transparent",
                        paddingLeft: isCrit ? 12 : 0,
                        paddingRight: isCrit ? 12 : 0,
                        marginLeft: isCrit ? -12 : 0,
                        marginRight: isCrit ? -12 : 0,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 12 }}>
                        <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)", flex: 1, minWidth: 0 }}>{entry.chapter}</span>
                        <div style={{ display: "flex", gap: 16, alignItems: "baseline", flexShrink: 0 }}>
                          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{entry.weeks_since}w ago · m{entry.original_mastery}</span>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 600, color, fontVariantNumeric: "tabular-nums", minWidth: 38, textAlign: "right" }}>
                            {pct}%
                          </span>
                        </div>
                      </div>

                      {/* Decay bar */}
                      <div style={{ height: 4, background: "var(--rule)", position: "relative" }}>
                        <div style={{
                          position: "absolute", left: 0, top: 0, bottom: 0,
                          width: `${pct}%`,
                          background: color,
                          transition: "width 0.6s ease",
                          opacity: entry.status === "fresh" ? 0.5 : 1,
                        }} />
                        {/* Threshold line at 40% */}
                        <div style={{ position: "absolute", left: "40%", top: -3, bottom: -3, width: 1, background: "var(--cinnabar-ink)", opacity: 0.4 }} />
                      </div>
                    </div>
                  );
                })}

                {/* Threshold label */}
                <div style={{ position: "relative", height: 20, marginTop: 4 }}>
                  <div className="mono" style={{ position: "absolute", left: "calc(40% - 28px)", fontSize: 8, color: "var(--cinnabar-ink)", opacity: 0.6 }}>40% threshold</div>
                </div>
              </div>

              {/* ── Critical chapters callout ── */}
              {result.critical_chapters.length > 0 && (
                <div style={{ border: "1px solid var(--cinnabar-ink)", padding: "16px 20px", marginBottom: 32, background: "color-mix(in srgb, var(--cinnabar-ink) 6%, var(--paper))" }}>
                  <div className="mono cin" style={{ marginBottom: 10 }}>Critical — below 40% recall</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {result.critical_chapters.map((ch, i) => (
                      <span key={i} style={{ fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, color: "var(--cinnabar-ink)", padding: "4px 10px", border: "1px solid var(--cinnabar-ink)", background: "transparent" }}>
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 7-day revive sequence ── */}
              <div>
                <div style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 12, marginBottom: 0 }}>
                  <div className="mono cin">7-Day Revive Sequence</div>
                  <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 4 }}>Quick-revive methods only — not full re-study</div>
                </div>

                {result.revive_sequence.map((day, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid", gridTemplateColumns: "36px 1fr auto",
                      alignItems: "start", gap: 16,
                      borderBottom: i < result.revive_sequence.length - 1 ? "1px solid var(--rule)" : "none",
                      padding: "14px 0",
                    }}
                  >
                    <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, fontWeight: 400, color: "var(--cinnabar-ink)", lineHeight: 1, paddingTop: 2 }}>
                      {day.day}
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{day.chapter}</div>
                      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55 }}>{day.method}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", flexShrink: 0, paddingTop: 3, whiteSpace: "nowrap" }}>{day.time_budget}</div>
                  </div>
                ))}
              </div>

              {/* Re-run */}
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--rule)" }}>
                <button className="btn ghost" onClick={reset} style={{ marginRight: 10 }}>Update log</button>
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>Run weekly to track decay progress</span>
              </div>
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
