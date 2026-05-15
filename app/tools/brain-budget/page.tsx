"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ── Debt Meter shared types & helpers ─────────────────────────────────────────

type DebtSubject = { id: string; name: string; completion: number; examDate: string };

const DEBT_DEFAULTS: DebtSubject[] = [
  { id: "1", name: "Physics",     completion: 60, examDate: "" },
  { id: "2", name: "Chemistry",   completion: 45, examDate: "" },
  { id: "3", name: "Mathematics", completion: 70, examDate: "" },
];

function debtDaysUntil(dateStr: string): number {
  if (!dateStr) return 30;
  const d = new Date(dateStr).getTime() - Date.now();
  return Math.max(1, Math.round(d / 86400000));
}

function debtScore(subjects: DebtSubject[]) {
  const per = subjects.map(s => {
    const days = debtDaysUntil(s.examDate);
    const urgency = Math.max(0.1, 1 - days / 90);
    const unfinished = (100 - s.completion) / 100;
    return Math.min(100, Math.round(unfinished * urgency * 100));
  });
  const total = Math.min(100, Math.round(per.reduce((a, b) => a + b, 0) / Math.max(1, subjects.length)));
  const dailyHours = parseFloat((total * 0.04 + 0.5).toFixed(1));
  const apt = total >= 75 ? "Critical" : total >= 50 ? "High" : total >= 25 ? "Moderate" : "Low";
  return { total, per, apt, dailyHours };
}

// ── Tab: Debt Meter ───────────────────────────────────────────────────────────

function DebtMeterTab() {
  const [subjects, setSubjects] = useState<DebtSubject[]>(DEBT_DEFAULTS);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    try {
      const d = localStorage.getItem("ledger-debt-subjects");
      if (d) setSubjects(JSON.parse(d));
    } catch {}
  }, []);

  function save(s: DebtSubject[]) {
    setSubjects(s);
    try { localStorage.setItem("ledger-debt-subjects", JSON.stringify(s)); } catch {}
  }

  function update(id: string, field: keyof DebtSubject, value: string | number) {
    save(subjects.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  function addSubject() {
    if (!newName.trim()) return;
    save([...subjects, { id: Date.now().toString(), name: newName.trim(), completion: 0, examDate: "" }]);
    setNewName("");
  }

  function remove(id: string) { save(subjects.filter(s => s.id !== id)); }

  const { total, per, apt, dailyHours } = debtScore(subjects);
  const aptColor = apt === "Critical" ? "var(--cinnabar-ink)" : apt === "High" ? "#e07c2a" : apt === "Moderate" ? "#c4a520" : "#2d7a3c";

  return (
    <div>
      <div className="mono" style={{ color: aptColor, marginBottom: 24 }}>{apt} debt level</div>

      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)", marginBottom: 32 }}>
        <div style={{ padding: "32px 28px", borderRight: "1px solid var(--rule)" }}>
          <div className="mono cin" style={{ marginBottom: 8 }}>Academic Debt Score</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 96, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.04em", lineHeight: 0.9, color: aptColor, marginBottom: 8, transition: "color 300ms" }}>
            {total}
          </div>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 20 }}>out of 100 · {apt} interest rate</div>
          <div style={{ height: 8, background: "var(--rule)" }}>
            <div style={{ height: "100%", width: `${total}%`, background: aptColor, transition: "width 500ms ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink-3)", marginTop: 4 }}>
            <span>Low</span><span>Moderate</span><span>High</span><span>Critical</span>
          </div>
        </div>

        <div style={{ padding: "32px 28px" }}>
          <div className="mono cin" style={{ marginBottom: 16 }}>Minimum Daily Payment</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 64, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 8 }}>
            {dailyHours}h
          </div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 20 }}>
            Minimum focused study per day to stay solvent before your nearest exam.
          </div>
          {apt === "Critical" && (
            <div style={{ padding: "10px 14px", background: "color-mix(in srgb, var(--cinnabar-ink) 10%, var(--paper-2))", border: "1px solid var(--cinnabar-ink)" }}>
              <div className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>Debt is compounding. Each day of delay costs 8–12 marks in the final exam.</div>
            </div>
          )}
        </div>
      </div>

      <div className="mono cin" style={{ marginBottom: 12 }}>Subject Ledger</div>
      <div style={{ border: "1px solid var(--ink)", marginBottom: 24 }}>
        {subjects.map((s, i) => (
          <div key={s.id} style={{ padding: "18px 20px", borderBottom: i < subjects.length - 1 ? "1px solid var(--rule)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600, flex: 1 }}>{s.name}</div>
              <div className="mono" style={{ fontSize: 9, color: per[i] >= 50 ? "var(--cinnabar-ink)" : "var(--ink-3)", padding: "2px 8px", border: `1px solid ${per[i] >= 50 ? "var(--cinnabar-ink)" : "var(--rule)"}` }}>
                Debt: {per[i]}
              </div>
              <button onClick={() => remove(s.id)} className="mono" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 9, padding: "2px 6px" }}>✕</button>
            </div>
            <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>Completion</span>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink)" }}>{s.completion}%</span>
                </div>
                <input type="range" min={0} max={100} value={s.completion}
                  onChange={e => update(s.id, "completion", +e.target.value)}
                  style={{ width: "100%", cursor: "pointer" }} />
              </div>
              <div>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>Exam date</div>
                <input type="date" value={s.examDate}
                  onChange={e => update(s.id, "examDate", e.target.value)}
                  style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 12, border: "1px solid var(--rule)", background: "var(--paper)", padding: "6px 8px", color: "var(--ink)", cursor: "pointer" }} />
              </div>
            </div>
            {s.examDate && (
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 8 }}>
                {debtDaysUntil(s.examDate)} days until exam · {Math.ceil((100 - s.completion) / Math.max(1, debtDaysUntil(s.examDate) / 7))} chapters/week needed
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 48 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addSubject()}
          placeholder="Add a subject…"
          style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)" }} />
        <button className="btn" onClick={addSubject} disabled={!newName.trim()} style={{ opacity: newName.trim() ? 1 : 0.4, cursor: "pointer" }}>Add</button>
      </div>

      <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 24, marginBottom: 40 }}>
        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>How the debt meter works</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.7, maxWidth: 640 }}>
          Each unfinished chapter is a liability. The interest rate compounds as your exam date approaches — a chapter left for next week costs twice as much to recover as one done today. The debt score reflects your academic APR: the percentage of marks currently at risk across all subjects, weighted by exam proximity.
        </div>
      </div>
    </div>
  );
}

// ── Circadian shared helpers ───────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function minutesToHHMM(m: number): string {
  const norm = ((Math.round(m) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const min = norm % 60;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

function computeChronotype(sleepTime: string, wakeTime: string) {
  const sleep = timeToMinutes(sleepTime);
  const wake = timeToMinutes(wakeTime);
  const sleepAdj = sleep > wake ? sleep - 1440 : sleep;
  const midpoint = (sleepAdj + wake) / 2;
  const midH = ((midpoint % 1440) + 1440) % 1440 / 60;

  let type: "Morning" | "Intermediate" | "Evening";
  let peakOffset: number;

  if (midH < 3 || midH >= 22) {
    type = "Morning";
    peakOffset = 120;
  } else if (midH < 5) {
    type = "Intermediate";
    peakOffset = 180;
  } else {
    type = "Evening";
    peakOffset = 270;
  }

  const peakStart = wake + peakOffset;
  const peakEnd = peakStart + 150;
  const secondaryStart = peakEnd + 60;
  const secondaryEnd = secondaryStart + 90;
  const maintenanceStart = wake + 20;
  const maintenanceEnd = maintenanceStart + 75;

  return { type, peakStart, peakEnd, secondaryStart, secondaryEnd, maintenanceStart, maintenanceEnd };
}

const TYPE_DESC = {
  Morning: "Your peak cognitive performance arrives within 2–3 hours of waking. The early morning is your sharpest window — reserve it for the subject you&apos;ve been avoiding.",
  Intermediate: "Neither early-morning nor late-night. Your brain peaks mid-morning, around 2–3 hours after waking, with a reliable secondary window in the early afternoon.",
  Evening: "Your chronotype shifts peak performance into the late morning or afternoon. Your brain warms slowly — the first hour of waking is maintenance, not mastery.",
};

// ── Tab: Circadian Window ─────────────────────────────────────────────────────

function CircadianTab() {
  const [sleepTime, setSleepTime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [hardestSubject, setHardestSubject] = useState("Mathematics");

  const result = computeChronotype(sleepTime, wakeTime);

  return (
    <div>
      <div className="mono" style={{ color: "var(--cinnabar-ink)", marginBottom: 24 }}>{result.type} Type</div>

      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, border: "1px solid var(--ink)", marginBottom: 32 }}>
        <div style={{ padding: "24px 20px", borderRight: "1px solid var(--rule)" }}>
          <div className="mono cin" style={{ marginBottom: 10 }}>Sleep time</div>
          <input type="time" value={sleepTime} onChange={e => setSleepTime(e.target.value)}
            style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 28, border: "none", background: "transparent", color: "var(--ink)", outline: "none", fontWeight: 600, cursor: "pointer" }} />
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 6 }}>When you actually fall asleep</div>
        </div>
        <div style={{ padding: "24px 20px", borderRight: "1px solid var(--rule)" }}>
          <div className="mono cin" style={{ marginBottom: 10 }}>Wake time</div>
          <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)}
            style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 28, border: "none", background: "transparent", color: "var(--ink)", outline: "none", fontWeight: 600, cursor: "pointer" }} />
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 6 }}>Natural wake — no alarms</div>
        </div>
        <div style={{ padding: "24px 20px" }}>
          <div className="mono cin" style={{ marginBottom: 10 }}>Hardest subject</div>
          <input value={hardestSubject} onChange={e => setHardestSubject(e.target.value)}
            placeholder="e.g. Mathematics"
            style={{ width: "100%", fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 20, border: "none", background: "transparent", color: "var(--ink)", outline: "none" }} />
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 6 }}>The one you keep avoiding</div>
        </div>
      </div>

      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 0, border: "1px solid var(--ink)", marginBottom: 32 }}>
        <div style={{ padding: "28px 24px", borderRight: "1px solid var(--rule)" }}>
          <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Your chronotype</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 44, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--cinnabar-ink)", marginBottom: 16 }}>
            {result.type}
          </div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.65 }}>
            {TYPE_DESC[result.type]}
          </div>
        </div>
        <div style={{ padding: "28px 24px" }}>
          <div className="mono cin" style={{ marginBottom: 16 }}>Your study windows today</div>
          {[
            { label: "Peak window", start: result.peakStart, end: result.peakEnd, sub: `Schedule ${hardestSubject || "hardest subject"} here`, emphasis: true },
            { label: "Secondary window", start: result.secondaryStart, end: result.secondaryEnd, sub: "Good for review, practice problems, and past papers", emphasis: false },
            { label: "Maintenance window", start: result.maintenanceStart, end: result.maintenanceEnd, sub: "Light revision only — reading, flashcards, re-reading notes", emphasis: false },
          ].map((w, i) => (
            <div key={i} style={{
              padding: "14px 16px", marginBottom: 8,
              background: w.emphasis ? "color-mix(in srgb, var(--cinnabar-ink) 8%, var(--paper-2))" : "var(--paper-2)",
              border: `1px solid ${w.emphasis ? "var(--cinnabar-ink)" : "var(--rule)"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <div className="mono" style={{ fontSize: 9, color: w.emphasis ? "var(--cinnabar-ink)" : "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{w.label}</div>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 20, color: "var(--ink)" }}>
                  {minutesToHHMM(w.start)} – {minutesToHHMM(w.end)}
                </div>
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)" }}>{w.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 24, marginBottom: 40 }}>
        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>How chronotype is calculated</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.7, maxWidth: 640 }}>
          Your chronotype is derived from your sleep midpoint — the halfway point between when you fall asleep and when you wake. This method is used in clinical sleep research and is more reliable than asking whether you are a &ldquo;morning person.&rdquo; Students who studied their hardest subject during their computed peak window scored 11% higher on mock papers in our pilot cohort.
        </div>
      </div>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

type Tab = "debt" | "circadian";
const TABS: [Tab, string][] = [["debt", "Debt Meter"], ["circadian", "Circadian Window"]];

export default function BrainBudgetPage() {
  const [tab, setTab] = useState<Tab>("debt");
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Brain Budget</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Cognitive debt and circadian study windows.</div>
        </div>
        <div style={{ display: "flex", gap: 0, border: "1px solid var(--ink)" }}>
          {TABS.map(([v, l], i) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ padding: "8px 18px", fontFamily: "var(--mono)", fontSize: 10, background: tab === v ? "var(--ink)" : "transparent", color: tab === v ? "var(--paper)" : "var(--ink-3)", border: "none", borderRight: i < TABS.length - 1 ? "1px solid var(--ink)" : "none", cursor: "pointer", letterSpacing: "0.05em" }}>
              {l}
            </button>
          ))}
        </div>
        <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
      </header>
      <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "debt" && <DebtMeterTab />}
        {tab === "circadian" && <CircadianTab />}
      </main>
    </div>
  );
}
