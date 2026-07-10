"use client";
import { useState, useEffect } from "react";
import { GRADES, BOARDS } from "@/lib/onboarding-constants";
import {
  computeTemporaryScore,
  type Confidence,
  type DiagnosticInputs,
  type TemporaryLedgerScore,
} from "@/lib/ledger-score";

// Cold-start diagnostic for Exam-Day Mode: five self-report steps that
// produce a TemporaryLedgerScore (kind: "temporary") without touching any
// real score input — nothing here writes to localStorage or Supabase.

const CONF_LABELS: Record<Confidence, string> = { shaky: "Shaky", ok: "OK", solid: "Solid" };
const CONF_ORDER: Confidence[] = ["shaky", "ok", "solid"];

const label: React.CSSProperties = { fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 10 };
const h: React.CSSProperties = { fontFamily: "var(--serif)", fontSize: "clamp(22px,3.5vw,30px)", fontWeight: 500, fontStyle: "italic", letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 6px" };
const chipRow: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", background: "var(--paper)", border: "1px solid var(--rule)", color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 14 };

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ padding: "9px 14px", border: `1px solid ${active ? "var(--cinnabar-ink)" : "var(--rule)"}`,
        background: active ? "var(--cinnabar-ink)" : "var(--paper)", color: active ? "var(--paper)" : "var(--ink)",
        cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>
      {children}
    </button>
  );
}

export default function ExamDayDiagnostic({
  onComplete, onCancel,
}: {
  onComplete: (diag: DiagnosticInputs, temp: TemporaryLedgerScore) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [board, setBoard] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [topicsRaw, setTopicsRaw] = useState("");
  const [conf, setConf] = useState<Record<string, Confidence>>({});
  const [marks, setMarks] = useState("");
  const [weakRaw, setWeakRaw] = useState("");

  // Prefill from existing profile/syllabus where present — the diagnostic
  // asks only for what the app doesn't already know.
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("ledger-profile") || "{}");
      if (p.board && BOARDS.includes(p.board)) setBoard(p.board);
      if (p.grade && GRADES.includes(p.grade)) setGrade(p.grade);
      const subs = JSON.parse(localStorage.getItem("ledger-syllabus-subjects") || "[]");
      if (Array.isArray(subs)) setSubjectOptions(subs);
    } catch {}
  }, []);

  const topics = [...new Set(topicsRaw.split(/[,\n]/).map(t => t.trim()).filter(Boolean))].slice(0, 8);

  const STEP_VALID = [
    board !== "" && grade !== "",
    subject.trim() !== "",
    topics.length >= 3,
    topics.every(t => conf[t] !== undefined),
    true, // marks + weak areas are optional
  ];

  function finish() {
    const diag: DiagnosticInputs = {
      board, grade,
      subject: subject.trim(),
      topicConfidence: topics.map(t => ({ topic: t, confidence: conf[t] ?? "ok" })),
      recentMarksPercent: marks.trim() === "" ? undefined : Math.min(100, Math.max(0, parseFloat(marks))),
      weakAreas: weakRaw.split(/[,\n]/).map(w => w.trim()).filter(Boolean),
    };
    onComplete(diag, computeTemporaryScore(diag));
  }

  return (
    <div style={{ borderTop: "1px solid var(--ink)", paddingTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <span className="mono cin" style={{ fontSize: 10 }}>5-minute diagnostic · Step {step + 1} / 5</span>
        <button onClick={onCancel} className="mono" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 10 }}>cancel</button>
      </div>

      {step === 0 && (
        <div>
          <h2 style={h}>Where are you studying?</h2>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 24 }}>No history needed — this builds today&apos;s plan from scratch.</div>
          <div style={label}>Board</div>
          <div style={{ ...chipRow, marginBottom: 20 }}>
            {BOARDS.map(b => <Chip key={b} active={board === b} onClick={() => setBoard(b)}>{b}</Chip>)}
          </div>
          <div style={label}>Grade</div>
          <div style={chipRow}>
            {GRADES.map(g => <Chip key={g} active={grade === g} onClick={() => setGrade(g)}>{g}</Chip>)}
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 style={h}>Which paper is it today?</h2>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 24 }}>One subject. The sweep drills only this.</div>
          {subjectOptions.length > 0 && (
            <div style={{ ...chipRow, marginBottom: 16 }}>
              {subjectOptions.map(s => <Chip key={s} active={subject === s} onClick={() => setSubject(s)}>{s}</Chip>)}
            </div>
          )}
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Physics" style={inputStyle} aria-label="Subject sitting today" />
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 style={h}>List the topics on today&apos;s paper.</h2>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 24 }}>3–8 topics, separated by commas. From the syllabus, past papers, or memory.</div>
          <textarea value={topicsRaw} onChange={e => setTopicsRaw(e.target.value)} rows={4}
            placeholder="e.g. Optics, Electrostatics, Current Electricity, Magnetism"
            style={{ ...inputStyle, resize: "vertical" }} aria-label="Topics on today's paper" />
          <div className="mono" style={{ color: topics.length >= 3 ? "var(--cinnabar-ink)" : "var(--ink-3)", fontSize: 9, marginTop: 8 }}>
            {topics.length} topic{topics.length === 1 ? "" : "s"} {topics.length < 3 ? "· need at least 3" : "✓"}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 style={h}>How solid is each one — honestly?</h2>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 24 }}>Shaky answers make the plan better, not worse.</div>
          {topics.map(t => (
            <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 2px", borderBottom: "1px solid var(--rule)", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 500 }}>{t}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {CONF_ORDER.map(c => (
                  <Chip key={c} active={conf[t] === c} onClick={() => setConf(p => ({ ...p, [t]: c }))}>{CONF_LABELS[c]}</Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 style={h}>Last two — both optional.</h2>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 24 }}>Skip anything you don&apos;t know. The plan still works.</div>
          <div style={label}>Most recent marks in {subject.trim() || "this subject"} (%)</div>
          <input value={marks} onChange={e => setMarks(e.target.value.replace(/[^\d.]/g, ""))} placeholder="e.g. 62" inputMode="numeric"
            style={{ ...inputStyle, maxWidth: 160, marginBottom: 20 }} aria-label="Most recent marks percentage" />
          <div style={label}>Anything else you know you&apos;re weak at?</div>
          <textarea value={weakRaw} onChange={e => setWeakRaw(e.target.value)} rows={2}
            placeholder="e.g. Numericals under time pressure, Ray diagrams"
            style={{ ...inputStyle, resize: "vertical" }} aria-label="Known weak areas" />
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
        {step > 0 && <button className="btn ghost" onClick={() => setStep(s => s - 1)}>← Back</button>}
        {step < 4
          ? <button className="btn" onClick={() => setStep(s => s + 1)} disabled={!STEP_VALID[step]} style={{ opacity: STEP_VALID[step] ? 1 : 0.5 }}>Next →</button>
          : <button className="btn" onClick={finish}>Get my plan →</button>}
      </div>
    </div>
  );
}
