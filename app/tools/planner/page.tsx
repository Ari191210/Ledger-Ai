"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

type Subject = {
  id: string;
  name: string;
  color: string;
  exam: string;
  weak: string[];
  priority: number;
};

type Slot = {
  subject: Subject;
  startMin: number;
  endMin: number;
  task: string;
  hard: boolean;
};

type PlanDay = {
  iso: string;
  dayOfWeek: string;
  isWeekend: boolean;
  hoursToday: number;
  slots: Slot[];
};

const COLORS = [
  "#C44B2A",
  "#2A7A52",
  "#2A5FAA",
  "#8A7A20",
  "#6A2A8A",
  "#2A7A8A",
];

function daysUntil(isoDate: string, today: Date): number {
  const d = new Date(isoDate + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function fmtDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function fmtTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function buildPlan(subjects: Subject[], hoursPerDay: number, chronotype: string, today: Date): PlanDay[] {
  if (!subjects.length) return [];
  const plan: PlanDay[] = [];
  const tasks = [
    (s: Subject) => `Revise: ${s.weak[0] || s.name}`,
    () => "Past paper — 12 questions",
    () => "Flashcards (Ledger deck)",
    () => "Notes simplifier: 1 chapter",
    () => "Topic quiz — medium tier",
    () => "Worked solutions review",
  ];

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const iso = date.toISOString().slice(0, 10);
    const dow = date.toLocaleDateString("en-US", { weekday: "short" });
    const isWeekend = dow === "Sat" || dow === "Sun";
    const hoursToday = isWeekend ? Math.min(hoursPerDay + 2, 10) : hoursPerDay;
    const blockCount = Math.max(1, Math.round(hoursToday * 2));

    const ranked = subjects
      .map((s) => {
        const dLeft = Math.max(1, daysUntil(s.exam, today) - i);
        return { s, score: s.priority * (30 / dLeft) + s.weak.length * 0.8 + Math.random() * 0.3 };
      })
      .sort((a, b) => b.score - a.score);

    const slots: Slot[] = [];
    let curHour = chronotype === "morning" ? 7 : chronotype === "evening" ? 15 : 10;
    if (isWeekend) curHour = chronotype === "evening" ? 14 : 9;

    for (let b = 0; b < blockCount; b++) {
      const subject = ranked[b % Math.min(3, ranked.length)].s;
      const startMin = Math.round(curHour * 60);
      curHour += 30 / 60;
      if ((b + 1) % 4 === 0) curHour += 10 / 60;
      slots.push({ subject, startMin, endMin: startMin + 25, task: tasks[(i + b) % tasks.length](subject), hard: subject.priority >= 4 });
    }
    plan.push({ iso, dayOfWeek: dow, isWeekend, hoursToday, slots });
  }
  return plan;
}

function makeDefaultSubjects(today: Date): Subject[] {
  const d = (n: number) => {
    const t = new Date(today);
    t.setDate(t.getDate() + n);
    return t.toISOString().slice(0, 10);
  };
  return [
    { id: "phy", name: "Physics",     color: COLORS[0], exam: d(22), weak: ["Rotational", "EM Induction"], priority: 5 },
    { id: "chm", name: "Chemistry",   color: COLORS[1], exam: d(26), weak: ["Organic"],                    priority: 4 },
    { id: "mth", name: "Mathematics", color: COLORS[2], exam: d(29), weak: ["Conics", "Integrals"],        priority: 5 },
    { id: "eng", name: "English",     color: COLORS[3], exam: d(17), weak: [],                             priority: 2 },
    { id: "cs",  name: "Comp. Sci",   color: COLORS[4], exam: d(33), weak: ["Recursion"],                  priority: 3 },
  ];
}

function DebtMeter({ subjects, today }: { subjects: Subject[]; today: Date }) {
  const { apr, minPay } = useMemo(() => {
    const debt = subjects.reduce((s, x) => {
      const d = Math.max(1, daysUntil(x.exam, today));
      return s + (x.weak.length * 8 + (x.priority - 1) * 4) / d;
    }, 0);
    return { apr: Math.min(99, Math.round(debt * 12)), minPay: Math.round(debt * 6) / 10 };
  }, [subjects, today]);

  return (
    <div style={{ border: "1px solid var(--ink)", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div className="mono cin">α · Cognitive Debt Meter</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>live</div>
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 72, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 0.95, marginTop: 10 }}>
        {apr}<span style={{ fontSize: 28, marginLeft: 4 }}>% APR</span>
      </div>
      <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)", marginTop: 10, lineHeight: 1.5 }}>
        Minimum payment to stay solvent before exams: <strong>{minPay}h / day</strong>. Miss three days and interest compounds.
      </p>
      <div style={{ marginTop: 16, height: 8, background: "var(--paper-2)", border: "1px solid var(--rule)", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${apr}%`, background: "var(--cinnabar)", transition: "width 400ms ease" }} />
      </div>
    </div>
  );
}

function DayRow({ day, idx }: { day: PlanDay; idx: number }) {
  const totals: Record<string, number> = {};
  day.slots.forEach((sl) => { totals[sl.subject.id] = (totals[sl.subject.id] || 0) + 25; });
  const totalMins = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <div style={{ borderTop: "1px solid var(--rule)", padding: "20px 0", display: "grid", gridTemplateColumns: "80px 120px 1fr 260px", gap: 24, alignItems: "start" }}>
      <div>
        <div className="mono cin">Day {String(idx + 1).padStart(2, "0")}</div>
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 32, lineHeight: 1, marginTop: 6, letterSpacing: "-0.02em" }}>{day.dayOfWeek}</div>
        {day.isWeekend && <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>Weekend</div>}
      </div>
      <div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>{fmtDate(day.iso)}</div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 13, marginTop: 6, color: "var(--ink-2)" }}>{day.hoursToday}h · {day.slots.length} blocks</div>
      </div>
      <div>
        {day.slots.map((sl, k) => (
          <div key={k} style={{ display: "grid", gridTemplateColumns: "100px 10px 1fr auto", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: k < day.slots.length - 1 ? "1px solid var(--rule-2)" : "none" }}>
            <div className="mono" style={{ color: "var(--ink-3)" }}>{fmtTime(sl.startMin)}–{fmtTime(sl.endMin)}</div>
            <div style={{ width: 10, height: 10, background: sl.subject.color, border: "1px solid var(--ink)", flexShrink: 0 }} />
            <div style={{ fontFamily: "var(--sans)", fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{sl.subject.name}</span>
              <span style={{ color: "var(--ink-3)", margin: "0 6px" }}>·</span>
              <span style={{ color: "var(--ink-2)" }}>{sl.task}</span>
            </div>
            {sl.hard && <div className="mono cin" style={{ fontSize: 9 }}>hard</div>}
          </div>
        ))}
      </div>
      <div>
        <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 6 }}>Subject mix</div>
        <div style={{ display: "flex", height: 20, border: "1px solid var(--ink)" }}>
          {Object.entries(totals).map(([id, mins], i) => {
            const subj = day.slots.find((x) => x.subject.id === id)!.subject;
            return <div key={id} title={subj.name} style={{ flex: mins / totalMins, background: subj.color, borderRight: i < Object.keys(totals).length - 1 ? "1px solid var(--ink)" : "none" }} />;
          })}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {Object.entries(totals).map(([id, mins]) => {
            const subj = day.slots.find((x) => x.subject.id === id)!.subject;
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)" }}>
                <div style={{ width: 7, height: 7, background: subj.color }} />
                {subj.name} · {(mins / 60).toFixed(1)}h
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PlannerPage() {
  const [today] = useState(() => new Date());
  const [subjects, setSubjects] = useState<Subject[]>(() => makeDefaultSubjects(new Date()));
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [chronotype, setChronotype] = useState<"morning" | "midday" | "evening">("evening");
  const [showAdd, setShowAdd] = useState(false);
  const [newSubj, setNewSubj] = useState({ name: "", exam: "", weak: "", priority: 3 });
  const [saveLabel, setSaveLabel] = useState<"idle" | "saved">("idle");
  const [syncLabel, setSyncLabel] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ledger-plan-v1");
      if (raw) {
        const { subjects: s, hoursPerDay: h, chronotype: c } = JSON.parse(raw);
        if (Array.isArray(s) && s.length) setSubjects(s);
        if (typeof h === "number") setHoursPerDay(h);
        if (c) setChronotype(c);
      }
    } catch {}
  }, []);

  function savePlan() {
    try {
      localStorage.setItem("ledger-plan-v1", JSON.stringify({ subjects, hoursPerDay, chronotype }));
    } catch {}
    setSaveLabel("saved");
    setTimeout(() => setSaveLabel("idle"), 2200);
  }

  async function copyPlan() {
    const text = plan.map((d) =>
      `${d.dayOfWeek} ${fmtDate(d.iso)}\n${d.slots.map((s) => `  ${fmtTime(s.startMin)}  ${s.subject.name} — ${s.task}`).join("\n")}`
    ).join("\n\n");
    try { await navigator.clipboard.writeText(text); } catch {}
    setSyncLabel("copied");
    setTimeout(() => setSyncLabel("idle"), 2200);
  }

  const plan = useMemo(
    () => buildPlan(subjects, hoursPerDay, chronotype, today),
    [subjects, hoursPerDay, chronotype, today]
  );

  function addSubject() {
    if (!newSubj.name || !newSubj.exam) return;
    setSubjects((prev) => [
      ...prev,
      {
        id: newSubj.name.toLowerCase().replace(/\s+/g, "-").slice(0, 6) + Date.now(),
        name: newSubj.name,
        color: COLORS[prev.length % COLORS.length],
        exam: newSubj.exam,
        weak: newSubj.weak.split(",").map((x) => x.trim()).filter(Boolean),
        priority: newSubj.priority,
      },
    ]);
    setNewSubj({ name: "", exam: "", weak: "", priority: 3 });
    setShowAdd(false);
  }

  const todayStr = today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <div>
      <header style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 01 · Smart Study Planner</div>
        <div className="mono" style={{ color: "var(--ink-3)" }}>Today · {todayStr}</div>
      </header>

      <main style={{ padding: "32px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
        {/* Intro + Debt Meter */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 40, marginBottom: 48 }}>
          <div>
            <div className="mono cin">Section 1</div>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: 64, fontWeight: 400, lineHeight: 0.98, letterSpacing: "-0.03em", margin: "8px 0 0" }}>
              What you&apos;re<br />
              <em style={{ fontWeight: 500 }}>studying, and when.</em>
            </h1>
            <p style={{ fontFamily: "var(--sans)", fontSize: 15, lineHeight: 1.55, color: "var(--ink-2)", marginTop: 20, maxWidth: 520 }}>
              Enter subjects, exam dates, weak chapters, and available hours. The plan below rewrites itself every time you change anything.
            </p>
          </div>
          <DebtMeter subjects={subjects} today={today} />
        </div>

        {/* Input row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 40, alignItems: "start" }}>
          {/* Subjects table */}
          <div>
            <div className="mono cin">Input · Subjects &amp; exams</div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontFamily: "var(--sans)", fontSize: 13 }}>
              <thead>
                <tr className="mono" style={{ color: "var(--ink-3)", textAlign: "left" }}>
                  {["", "Subject", "Exam", "Days", "Weak chapters", "Priority", ""].map((h, i) => (
                    <th key={i} style={{ padding: "8px 4px 8px 0", borderBottom: "1px solid var(--ink)", fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjects.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                    <td style={{ padding: "10px 8px 10px 0" }}>
                      <div style={{ width: 12, height: 12, background: s.color, border: "1px solid var(--ink)" }} />
                    </td>
                    <td style={{ padding: "10px 8px 10px 0", fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>{s.name}</td>
                    <td style={{ padding: "10px 8px 10px 0" }}>
                      <input
                        type="date"
                        value={s.exam}
                        onChange={(e) => { const ns = [...subjects]; ns[i] = { ...s, exam: e.target.value }; setSubjects(ns); }}
                        style={{ fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--rule)", background: "var(--paper)", padding: "4px 6px", color: "var(--ink)" }}
                      />
                    </td>
                    <td className="mono cin" style={{ padding: "10px 8px 10px 0", whiteSpace: "nowrap" }}>{daysUntil(s.exam, today)}d</td>
                    <td style={{ padding: "10px 8px 10px 0" }}>
                      <input
                        value={s.weak.join(", ")}
                        placeholder="chapter, chapter…"
                        onChange={(e) => { const ns = [...subjects]; ns[i] = { ...s, weak: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }; setSubjects(ns); }}
                        style={{ fontFamily: "var(--sans)", fontSize: 12, border: "1px solid var(--rule)", background: "var(--paper)", padding: "4px 8px", width: "100%", color: "var(--ink)" }}
                      />
                    </td>
                    <td style={{ padding: "10px 8px 10px 0", whiteSpace: "nowrap" }}>
                      <input
                        type="range" min="1" max="5" value={s.priority}
                        onChange={(e) => { const ns = [...subjects]; ns[i] = { ...s, priority: +e.target.value }; setSubjects(ns); }}
                        style={{ width: 64, accentColor: "var(--cinnabar-ink)" }}
                      />
                      <span className="mono" style={{ marginLeft: 6, color: "var(--ink-3)" }}>{s.priority}/5</span>
                    </td>
                    <td style={{ padding: "10px 0", textAlign: "right" }}>
                      <button onClick={() => setSubjects(subjects.filter((_, k) => k !== i))}
                        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {showAdd ? (
              <div style={{ marginTop: 8, padding: "12px 0", display: "grid", gridTemplateColumns: "1fr 130px 1fr 80px auto", gap: 8, alignItems: "center", borderTop: "1px dashed var(--rule)" }}>
                <input placeholder="Subject name" value={newSubj.name} onChange={(e) => setNewSubj({ ...newSubj, name: e.target.value })}
                  style={{ fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "6px 8px", color: "var(--ink)" }} />
                <input type="date" value={newSubj.exam} onChange={(e) => setNewSubj({ ...newSubj, exam: e.target.value })}
                  style={{ fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--rule)", background: "var(--paper)", padding: "6px 6px", color: "var(--ink)" }} />
                <input placeholder="Weak chapters (comma sep)" value={newSubj.weak} onChange={(e) => setNewSubj({ ...newSubj, weak: e.target.value })}
                  style={{ fontFamily: "var(--sans)", fontSize: 12, border: "1px solid var(--rule)", background: "var(--paper)", padding: "6px 8px", color: "var(--ink)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="range" min="1" max="5" value={newSubj.priority} onChange={(e) => setNewSubj({ ...newSubj, priority: +e.target.value })}
                    style={{ width: 52, accentColor: "var(--cinnabar-ink)" }} />
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{newSubj.priority}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={addSubject} className="btn" style={{ padding: "6px 14px", fontSize: 11 }}>Add</button>
                  <button onClick={() => setShowAdd(false)} className="btn ghost" style={{ padding: "6px 10px", fontSize: 11 }}>✕</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAdd(true)} style={{ marginTop: 10, background: "none", border: "1px dashed var(--rule)", padding: "10px 16px", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", color: "var(--ink-2)", width: "100%" }}>
                + Add subject
              </button>
            )}
          </div>

          {/* Hours + Chronotype */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div>
              <div className="mono cin">Input · Hours you actually have</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 12 }}>
                <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 72, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>{hoursPerDay}h</span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>per weekday</span>
              </div>
              <input type="range" min="1" max="8" step="0.5" value={hoursPerDay} onChange={(e) => setHoursPerDay(+e.target.value)}
                style={{ width: "100%", accentColor: "var(--cinnabar-ink)", marginTop: 12 }} />
              <div className="mono" style={{ color: "var(--ink-3)", display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span>1h</span><span>4h</span><span>8h</span>
              </div>
            </div>

            <div>
              <div className="mono cin">β · Circadian Window</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", border: "1px solid var(--ink)", marginTop: 10 }}>
                {(["morning", "midday", "evening"] as const).map((v, i) => (
                  <button key={v} onClick={() => setChronotype(v)} style={{ padding: "12px 10px", background: chronotype === v ? "var(--ink)" : "var(--paper)", color: chronotype === v ? "var(--paper)" : "var(--ink)", border: "none", borderRight: i < 2 ? "1px solid var(--ink)" : "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{v.charAt(0).toUpperCase() + v.slice(1)}</div>
                    <div className="mono" style={{ marginTop: 4, opacity: 0.7, fontSize: 9 }}>{v === "morning" ? "5–10 AM" : v === "midday" ? "10 AM–3 PM" : "3–10 PM"}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Plan output */}
        <section style={{ marginTop: 72, borderTop: "3px double var(--ink)", paddingTop: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
            <div>
              <div className="mono cin">Output · Your next 14 days</div>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: 48, fontWeight: 400, lineHeight: 1, letterSpacing: "-0.025em", margin: "6px 0 0" }}>
                The <em style={{ fontWeight: 500 }}>plan.</em>
              </h2>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn ghost" onClick={() => window.print()}>Export PDF</button>
              <button className="btn ghost" onClick={copyPlan}>
                {syncLabel === "copied" ? "Copied ✓" : "Copy plan"}
              </button>
              <button
                className={saveLabel === "saved" ? "btn success" : "btn"}
                onClick={savePlan}
              >
                {saveLabel === "saved" ? "Saved ✓" : "Save plan"}
              </button>
            </div>
          </div>
          {plan.map((d, i) => <DayRow key={d.iso} day={d} idx={i} />)}
        </section>

        <div style={{ marginTop: 60, borderTop: "1px solid var(--ink)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/dashboard" className="mono" style={{ color: "var(--ink-3)" }}>← Dashboard</Link>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Tool 01 of 10.</div>
        </div>
      </main>
    </div>
  );
}
