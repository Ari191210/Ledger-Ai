"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { patchUserData, loadUserData } from "@/lib/user-data";
import { callAI } from "@/lib/ai-fetch";
import { AIOutput } from "@/components/ai-output";
import { AIThinking } from "@/components/ai-thinking";

// ── Planner shared constants ───────────────────────────────────────────────────

const SUBJECT_SUGGESTIONS = [
  "Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", "Biotechnology",
  "Applied Mathematics", "Physical Education", "Environmental Science",
  "Accountancy", "Business Studies", "Economics", "Entrepreneurship", "Information Practices",
  "History", "Geography", "Political Science", "Sociology", "Psychology", "Philosophy",
  "Legal Studies", "Fine Arts", "Music", "Drama", "Home Science",
  "English", "Hindi", "French", "Spanish", "German", "Sanskrit", "Urdu",
  "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Marathi", "Gujarati",
  "Theory of Knowledge", "Global Politics", "Environmental Systems & Societies",
  "Sports, Exercise & Health Science", "Media Studies", "Film Studies",
  "Agriculture", "Mass Communication", "Tourism", "Fashion Studies",
  "Painting", "Informatics Practices",
];

type PlannerSubject = {
  id: string;
  name: string;
  color: string;
  exam: string;
  weak: string[];
  priority: number;
};

type Slot = {
  subject: PlannerSubject;
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

function plannerDaysUntil(isoDate: string, today: Date): number {
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

function buildPlan(subjects: PlannerSubject[], hoursPerDay: number, chronotype: string, today: Date): PlanDay[] {
  if (!subjects.length) return [];
  const plan: PlanDay[] = [];
  const tasks = [
    (s: PlannerSubject) => `Revise: ${s.weak[0] || s.name}`,
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
        const dLeft = Math.max(1, plannerDaysUntil(s.exam, today) - i);
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

function makeDefaultSubjects(today: Date): PlannerSubject[] {
  const d = (n: number) => {
    const t = new Date(today);
    t.setDate(t.getDate() + n);
    return t.toISOString().slice(0, 10);
  };
  return [
    { id: "s1", name: "Subject 1", color: COLORS[0], exam: d(21), weak: [], priority: 3 },
    { id: "s2", name: "Subject 2", color: COLORS[1], exam: d(28), weak: [], priority: 3 },
    { id: "s3", name: "Subject 3", color: COLORS[2], exam: d(35), weak: [], priority: 3 },
  ];
}

function DebtMeterWidget({ subjects, today }: { subjects: PlannerSubject[]; today: Date }) {
  const { apr, minPay } = useMemo(() => {
    const debt = subjects.reduce((s, x) => {
      const d = Math.max(1, plannerDaysUntil(x.exam, today));
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
      <div className="mob-n72" style={{ fontFamily: "var(--serif)", fontSize: 72, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 0.95, marginTop: 10 }}>
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
    <div className="mob-day-row" style={{ borderTop: "1px solid var(--rule)", padding: "20px 0", display: "grid", gridTemplateColumns: "80px 120px 1fr 260px", gap: 24, alignItems: "start" }}>
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
          <div key={k} className="mob-slot-row" style={{ display: "grid", gridTemplateColumns: "100px 10px 1fr auto", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: k < day.slots.length - 1 ? "1px solid var(--rule-2)" : "none" }}>
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

// ── Tab: Planner ──────────────────────────────────────────────────────────────
function PlannerTab() {
  const { user } = useAuth();
  const [today] = useState(() => new Date());
  const [subjects, setSubjects] = useState<PlannerSubject[]>(() => makeDefaultSubjects(new Date()));
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [chronotype, setChronotype] = useState<"morning" | "midday" | "evening">("evening");
  const [showAdd, setShowAdd] = useState(false);
  const [newSubj, setNewSubj] = useState({ name: "", exam: "", weak: "", priority: 3 });
  const [saveLabel, setSaveLabel] = useState<"idle" | "saved">("idle");
  const [syncLabel, setSyncLabel] = useState<"idle" | "copied">("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      if (user) {
        const data = await loadUserData(user.id);
        if (data?.plan) {
          const { subjects: s, hoursPerDay: h, chronotype: c } = data.plan as { subjects: PlannerSubject[]; hoursPerDay: number; chronotype: string };
          if (Array.isArray(s) && s.length) setSubjects(s);
          if (typeof h === "number") setHoursPerDay(h);
          if (c) setChronotype(c as "morning" | "midday" | "evening");
          return;
        }
      }
      try {
        const raw = localStorage.getItem("ledger-plan-v1");
        if (raw) {
          const { subjects: s, hoursPerDay: h, chronotype: c } = JSON.parse(raw);
          if (Array.isArray(s) && s.length) setSubjects(s);
          if (typeof h === "number") setHoursPerDay(h);
          if (c) setChronotype(c);
        }
      } catch {}
    }
    load();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      patchUserData(user.id, "plan", { subjects, hoursPerDay, chronotype });
      localStorage.setItem("ledger-plan-v1", JSON.stringify({ subjects, hoursPerDay, chronotype }));
    }, 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [subjects, hoursPerDay, chronotype, user]);

  function savePlan() {
    try {
      localStorage.setItem("ledger-plan-v1", JSON.stringify({ subjects, hoursPerDay, chronotype }));
      if (user) patchUserData(user.id, "plan", { subjects, hoursPerDay, chronotype });
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
      <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 8 }}>Today · {todayStr}</div>

      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 40, marginBottom: 48 }}>
        <div>
          <div className="mono cin">Section 1</div>
          <h1 className="mob-n64" style={{ fontFamily: "var(--serif)", fontSize: 64, fontWeight: 400, lineHeight: 0.98, letterSpacing: "-0.03em", margin: "8px 0 0" }}>
            What you&apos;re<br />
            <em style={{ fontWeight: 500 }}>studying, and when.</em>
          </h1>
          <p style={{ fontFamily: "var(--sans)", fontSize: 15, lineHeight: 1.55, color: "var(--ink-2)", marginTop: 20, maxWidth: 520 }}>
            Enter subjects, exam dates, weak chapters, and available hours. The plan below rewrites itself every time you change anything.
          </p>
        </div>
        <DebtMeterWidget subjects={subjects} today={today} />
      </div>

      <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 40, alignItems: "start" }}>
        <div>
          <div className="mono cin">Input · Subjects &amp; exams</div>
          <div className="mob-scroll">
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
                        style={{ fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--rule)", background: "var(--paper)", padding: "4px 6px", color: "var(--ink)", cursor: "pointer" }}
                      />
                    </td>
                    <td className="mono cin" style={{ padding: "10px 8px 10px 0", whiteSpace: "nowrap" }}>{plannerDaysUntil(s.exam, today)}d</td>
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
                        style={{ width: 64, accentColor: "var(--cinnabar-ink)", cursor: "pointer" }}
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
          </div>
          {showAdd ? (
            <div className="mob-add-subj" style={{ marginTop: 8, padding: "12px 0", display: "grid", gridTemplateColumns: "1fr 130px 1fr 80px auto", gap: 8, alignItems: "center", borderTop: "1px dashed var(--rule)" }}>
              <div style={{ position: "relative" }}>
                <input placeholder="Subject name" value={newSubj.name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNewSubj({ ...newSubj, name: v });
                    setSuggestions(v.length >= 1 ? SUBJECT_SUGGESTIONS.filter((s) => s.toLowerCase().includes(v.toLowerCase()) && s !== v).slice(0, 6) : []);
                  }}
                  onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                  style={{ fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--rule)", background: "var(--paper)", padding: "6px 8px", color: "var(--ink)", width: "100%" }} />
                {suggestions.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--paper)", border: "1px solid var(--ink)", borderTop: "none", zIndex: 50 }}>
                    {suggestions.map((s) => (
                      <button key={s} onMouseDown={() => { setNewSubj((p) => ({ ...p, name: s })); setSuggestions([]); }}
                        style={{ display: "block", width: "100%", padding: "8px 10px", background: "none", border: "none", borderBottom: "1px solid var(--rule)", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink)" }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input type="date" value={newSubj.exam} onChange={(e) => setNewSubj({ ...newSubj, exam: e.target.value })}
                style={{ fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--rule)", background: "var(--paper)", padding: "6px 6px", color: "var(--ink)", cursor: "pointer" }} />
              <input placeholder="Weak chapters (comma sep)" value={newSubj.weak} onChange={(e) => setNewSubj({ ...newSubj, weak: e.target.value })}
                style={{ fontFamily: "var(--sans)", fontSize: 12, border: "1px solid var(--rule)", background: "var(--paper)", padding: "6px 8px", color: "var(--ink)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input type="range" min="1" max="5" value={newSubj.priority} onChange={(e) => setNewSubj({ ...newSubj, priority: +e.target.value })}
                  style={{ width: 52, accentColor: "var(--cinnabar-ink)", cursor: "pointer" }} />
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

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div>
            <div className="mono cin">Input · Hours you actually have</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 12 }}>
              <span className="mob-n72" style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 72, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>{hoursPerDay}h</span>
              <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)" }}>per weekday</span>
            </div>
            <input type="range" min="1" max="8" step="0.5" value={hoursPerDay} onChange={(e) => setHoursPerDay(+e.target.value)}
              style={{ width: "100%", accentColor: "var(--cinnabar-ink)", marginTop: 12, cursor: "pointer" }} />
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

      <section style={{ marginTop: 72, borderTop: "3px double var(--ink)", paddingTop: 40 }}>
        <div className="mob-plan-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
          <div>
            <div className="mono cin">Output · Your next 14 days</div>
            <h2 className="mob-n48" style={{ fontFamily: "var(--serif)", fontSize: 48, fontWeight: 400, lineHeight: 1, letterSpacing: "-0.025em", margin: "6px 0 0" }}>
              The <em style={{ fontWeight: 500 }}>plan.</em>
            </h2>
          </div>
          <div className="mob-plan-btns" style={{ display: "flex", gap: 10 }}>
            <button className="btn ghost" onClick={() => window.print()} style={{ cursor: "pointer" }}>Export PDF</button>
            <button className="btn ghost" onClick={copyPlan} style={{ cursor: "pointer" }}>
              {syncLabel === "copied" ? "Copied ✓" : "Copy plan"}
            </button>
            <button
              className={saveLabel === "saved" ? "btn success" : "btn"}
              onClick={savePlan}
              style={{ cursor: "pointer" }}
            >
              {saveLabel === "saved" ? "Saved ✓" : "Save plan"}
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          {plan.map((d, i) => <DayRow key={d.iso} day={d} idx={i} />)}
        </div>
      </section>
    </div>
  );
}

// ── Deadlines shared types ─────────────────────────────────────────────────────

type DeadlinePriority = "high" | "medium" | "low";
type DeadlineCategory = "exam" | "assignment" | "application" | "project" | "other";

type Deadline = {
  id: string;
  title: string;
  date: string;
  time: string;
  category: DeadlineCategory;
  priority: DeadlinePriority;
  notes: string;
  done: boolean;
};

const CAT_COLORS: Record<DeadlineCategory, string> = {
  exam: "#c44b2a",
  assignment: "#1a6091",
  application: "#8b5a2b",
  project: "#2d7a3c",
  other: "#6b3fa0",
};

const CAT_LABELS: Record<DeadlineCategory, string> = {
  exam: "Exam",
  assignment: "Assignment",
  application: "Application",
  project: "Project",
  other: "Other",
};

function deadlineDaysUntil(dateStr: string, timeStr: string): number {
  const dt = new Date(`${dateStr}T${timeStr || "23:59"}`);
  return Math.ceil((dt.getTime() - Date.now()) / 86400000);
}

function urgencyLabel(days: number): { label: string; color: string } {
  if (days < 0)  return { label: "Overdue", color: "#c44b2a" };
  if (days === 0) return { label: "Due today!", color: "#c44b2a" };
  if (days === 1) return { label: "Due tomorrow", color: "#c97a1a" };
  if (days <= 3) return { label: `${days} days`, color: "#c97a1a" };
  if (days <= 7) return { label: `${days} days`, color: "#2d7a3c" };
  return { label: `${days} days`, color: "var(--ink-3)" };
}

const EMPTY_DEADLINE: Omit<Deadline, "id" | "done"> = { title: "", date: "", time: "23:59", category: "assignment", priority: "medium", notes: "" };

// ── Tab: Deadlines ────────────────────────────────────────────────────────────
function DeadlinesTab() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [form, setForm] = useState({ ...EMPTY_DEADLINE });
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "done">("upcoming");
  const [catFilter, setCatFilter] = useState<DeadlineCategory | "all">("all");

  useEffect(() => {
    try { const d = localStorage.getItem("ledger-deadlines"); if (d) setDeadlines(JSON.parse(d)); } catch {}
  }, []);

  function save(list: Deadline[]) {
    setDeadlines(list);
    try { localStorage.setItem("ledger-deadlines", JSON.stringify(list)); } catch {}
  }

  function addDeadline() {
    if (!form.title.trim() || !form.date) return;
    save([...deadlines, { ...form, id: Date.now().toString(), done: false }]);
    setForm({ ...EMPTY_DEADLINE }); setAdding(false);
  }

  function toggle(id: string) { save(deadlines.map(d => d.id === id ? { ...d, done: !d.done } : d)); }
  function remove(id: string) { save(deadlines.filter(d => d.id !== id)); }

  const visible = deadlines
    .filter(d => {
      if (catFilter !== "all" && d.category !== catFilter) return false;
      if (filter === "upcoming") return !d.done;
      if (filter === "done") return d.done;
      return true;
    })
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return new Date(a.date + "T" + (a.time || "23:59")).getTime() - new Date(b.date + "T" + (b.time || "23:59")).getTime();
    });

  const overdue = deadlines.filter(d => !d.done && deadlineDaysUntil(d.date, d.time) < 0).length;
  const dueThis7 = deadlines.filter(d => !d.done && deadlineDaysUntil(d.date, d.time) >= 0 && deadlineDaysUntil(d.date, d.time) <= 7).length;

  return (
    <div>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
        {overdue > 0 && <span className="mono" style={{ color: "#c44b2a", fontSize: 11 }}>{overdue} overdue</span>}
        {dueThis7 > 0 && <span className="mono" style={{ color: "#c97a1a", fontSize: 11 }}>{dueThis7} this week</span>}
        <button className="btn" onClick={() => setAdding(true)} style={{ cursor: "pointer" }}>+ Add deadline</button>
      </div>

      {adding && (
        <div style={{ border: "2px solid var(--ink)", padding: "24px", marginBottom: 32 }}>
          <div className="mono cin" style={{ marginBottom: 16 }}>New deadline</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginBottom: 4 }}>Title *</div>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Chemistry exam, History essay…"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 14, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginBottom: 4 }}>Date *</div>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 12, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)", boxSizing: "border-box", cursor: "pointer" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginBottom: 4 }}>Time</div>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 12, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)", boxSizing: "border-box", cursor: "pointer" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginBottom: 4 }}>Category</div>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as DeadlineCategory }))}
                style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)", cursor: "pointer" }}>
                {(Object.keys(CAT_LABELS) as DeadlineCategory[]).map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginBottom: 4 }}>Priority</div>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as DeadlinePriority }))}
                style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 11, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 8px", color: "var(--ink)", cursor: "pointer" }}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginBottom: 4 }}>Notes (optional)</div>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes…"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "10px 12px", color: "var(--ink)", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={addDeadline} disabled={!form.title.trim() || !form.date} style={{ cursor: "pointer" }}>Save deadline</button>
            <button className="btn ghost" onClick={() => { setAdding(false); setForm({ ...EMPTY_DEADLINE }); }} style={{ cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {(["upcoming", "all", "done"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "6px 14px", border: "1px solid var(--ink)", background: filter === f ? "var(--ink)" : "var(--paper)", color: filter === f ? "var(--paper)" : "var(--ink)", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {f}
          </button>
        ))}
        <div style={{ width: 1, background: "var(--rule)", margin: "0 4px" }} />
        {(["all", ...Object.keys(CAT_LABELS)] as (DeadlineCategory | "all")[]).map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "6px 14px", border: `1px solid ${c === "all" ? "var(--ink)" : CAT_COLORS[c as DeadlineCategory]}`, background: catFilter === c ? (c === "all" ? "var(--ink)" : CAT_COLORS[c as DeadlineCategory]) : "var(--paper)", color: catFilter === c ? "var(--paper)" : (c === "all" ? "var(--ink)" : CAT_COLORS[c as DeadlineCategory]), cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {c === "all" ? "All types" : CAT_LABELS[c as DeadlineCategory]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-3)" }}>
          {deadlines.length === 0 ? "No deadlines yet — add your first one." : "Nothing matches the current filter."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {visible.map((d, i) => {
            const days = deadlineDaysUntil(d.date, d.time);
            const urg  = urgencyLabel(days);
            const color = CAT_COLORS[d.category];
            return (
              <div key={d.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px", border: "1px solid var(--ink)", borderBottom: i < visible.length - 1 ? "none" : "1px solid var(--ink)", background: d.done ? "var(--paper-2)" : "var(--paper)", opacity: d.done ? 0.6 : 1 }}>
                <button onClick={() => toggle(d.id)} style={{ width: 20, height: 20, border: `2px solid ${d.done ? "#2d7a3c" : "var(--ink)"}`, background: d.done ? "#2d7a3c" : "transparent", cursor: "pointer", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--paper)", fontSize: 11 }}>
                  {d.done ? "✓" : ""}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, textDecoration: d.done ? "line-through" : "none", color: d.done ? "var(--ink-3)" : "var(--ink)" }}>{d.title}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "2px 6px", background: color + "18", color, border: `1px solid ${color}40` }}>{CAT_LABELS[d.category]}</span>
                    {d.priority === "high" && <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#c44b2a" }}>HIGH PRIORITY</span>}
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {new Date(d.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      {d.time && ` · ${d.time}`}
                    </span>
                    {!d.done && <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: urg.color }}>{urg.label}</span>}
                    {d.notes && <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)" }}>{d.notes}</span>}
                  </div>
                </div>
                <button onClick={() => remove(d.id)} style={{ fontFamily: "var(--mono)", fontSize: 10, background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: "4px 6px", flexShrink: 0 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Habits shared constants ────────────────────────────────────────────────────

type Habit = { id: string; name: string; emoji: string; target: number };
type HabitLog = Record<string, Record<string, number>>;

const DEFAULT_HABITS: Habit[] = [
  { id: "read",     name: "Read / review notes", emoji: "📖", target: 1 },
  { id: "practice", name: "Practice problems",   emoji: "✏️", target: 1 },
  { id: "revise",   name: "Active recall / flashcards", emoji: "🃏", target: 1 },
  { id: "nophone",  name: "Phone-free study hour", emoji: "📵", target: 1 },
  { id: "sleep",    name: "8 hours sleep",        emoji: "🌙", target: 1 },
];

function habitDateStr(d: Date) { return d.toISOString().split("T")[0]; }
function last14() { return Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return habitDateStr(d); }); }

// ── Tab: Habits ───────────────────────────────────────────────────────────────
function HabitsTab() {
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [log, setLog]       = useState<HabitLog>({});
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("⭐");
  const today = habitDateStr(new Date());
  const dates  = last14();

  useEffect(() => {
    try {
      const h = localStorage.getItem("ledger-habits-list");
      const l = localStorage.getItem("ledger-habits-log");
      if (h) setHabits(JSON.parse(h));
      if (l) setLog(JSON.parse(l));
    } catch {}
  }, []);

  function save(h: Habit[], l: HabitLog) {
    setHabits(h); setLog(l);
    try { localStorage.setItem("ledger-habits-list", JSON.stringify(h)); localStorage.setItem("ledger-habits-log", JSON.stringify(l)); } catch {}
  }

  function toggle(habitId: string, date: string) {
    const newLog = { ...log, [habitId]: { ...(log[habitId] || {}), [date]: log[habitId]?.[date] ? 0 : 1 } };
    save(habits, newLog);
  }

  function addHabit() {
    if (!newName.trim()) return;
    const h: Habit = { id: Date.now().toString(), name: newName.trim(), emoji: newEmoji, target: 1 };
    save([...habits, h], log);
    setNewName(""); setNewEmoji("⭐");
  }

  function removeHabit(id: string) { save(habits.filter(h => h.id !== id), log); }

  function streak(habitId: string): number {
    let s = 0;
    const d = new Date();
    while (true) {
      if (log[habitId]?.[habitDateStr(d)]) { s++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return s;
  }

  function weekScore(): number {
    const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return habitDateStr(d); });
    const done  = habits.reduce((acc, h) => acc + week.filter(d => log[h.id]?.[d]).length, 0);
    return Math.round((done / (habits.length * 7)) * 100);
  }

  const score = weekScore();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <span className="mono" style={{ color: score >= 70 ? "#2d7a3c" : score >= 40 ? "#c97a1a" : "var(--cinnabar-ink)" }}>This week: {score}%</span>
      </div>

      <div className="mono cin" style={{ marginBottom: 12 }}>Today — {new Date().toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long" })}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 36 }}>
        {habits.map(h => {
          const done = !!log[h.id]?.[today];
          const s    = streak(h.id);
          return (
            <button key={h.id} onClick={() => toggle(h.id, today)}
              style={{ padding: "20px 16px", border: `2px solid ${done ? "#2d7a3c" : "var(--ink)"}`, background: done ? "#2d7a3c" : "var(--paper)", cursor: "pointer", textAlign: "left", transition: "all 150ms" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{h.emoji}</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: done ? "var(--paper)" : "var(--ink)", lineHeight: 1.3, marginBottom: 6 }}>{h.name}</div>
              <div className="mono" style={{ fontSize: 9, color: done ? "rgba(255,255,255,0.7)" : "var(--ink-3)" }}>{s > 0 ? `${s} day streak 🔥` : "Not done yet"}</div>
            </button>
          );
        })}
      </div>

      <div className="mono cin" style={{ marginBottom: 12 }}>14-day history</div>
      <div style={{ overflowX: "auto", marginBottom: 36 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ padding: "6px 12px", textAlign: "left", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", fontWeight: "normal", width: 180 }}>Habit</th>
              {dates.map(d => (
                <th key={d} style={{ padding: "6px 4px", textAlign: "center", fontFamily: "var(--mono)", fontSize: 8, color: d === today ? "var(--cinnabar-ink)" : "var(--ink-3)", fontWeight: d === today ? 700 : "normal" }}>
                  {new Date(d).toLocaleDateString("en-GB", { day:"numeric", month:"short" }).replace(" ", "\n")}
                </th>
              ))}
              <th style={{ padding: "6px 8px", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", fontWeight: "normal" }}>Streak</th>
            </tr>
          </thead>
          <tbody>
            {habits.map(h => (
              <tr key={h.id}>
                <td style={{ padding: "6px 12px", fontFamily: "var(--sans)", fontSize: 12 }}>{h.emoji} {h.name}</td>
                {dates.map(d => {
                  const done = !!log[h.id]?.[d];
                  return (
                    <td key={d} onClick={() => toggle(h.id, d)} style={{ padding: "4px", textAlign: "center", cursor: "pointer" }}>
                      <div style={{ width: 20, height: 20, borderRadius: 2, background: done ? "#2d7a3c" : d === today ? "var(--paper-2)" : "var(--paper)", border: `1px solid ${done ? "#2d7a3c" : "var(--rule)"}`, margin: "0 auto" }} />
                    </td>
                  );
                })}
                <td style={{ padding: "6px 8px", textAlign: "center", fontFamily: "var(--mono)", fontSize: 11, color: "var(--cinnabar-ink)" }}>{streak(h.id) > 0 ? `${streak(h.id)}🔥` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mono cin" style={{ marginBottom: 10 }}>Add a habit</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)} style={{ width: 50, fontFamily: "var(--sans)", fontSize: 18, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 8px", color: "var(--ink)", textAlign: "center" }} />
        <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addHabit()} placeholder="Habit name…"
          style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 12px", color: "var(--ink)" }} />
        <button className="btn" onClick={addHabit} disabled={!newName.trim()} style={{ opacity: newName.trim() ? 1 : 0.4, cursor: "pointer" }}>Add</button>
      </div>
      {habits.length > DEFAULT_HABITS.length && (
        <div style={{ marginTop: 16 }}>
          {habits.slice(DEFAULT_HABITS.length).map(h => (
            <button key={h.id} onClick={() => removeHabit(h.id)} style={{ fontFamily: "var(--mono)", fontSize: 10, background: "none", border: "1px solid var(--rule)", padding: "4px 10px", cursor: "pointer", color: "var(--ink-3)", marginRight: 6, marginTop: 6 }}>
              {h.emoji} {h.name} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Coach shared helpers ──────────────────────────────────────────────────────

type CoachMessage  = { role: "user" | "assistant"; text: string };
type CoachBriefing = { greeting: string; priorities: { task: string; why: string }[]; insight: string; focus: string; warning: string | null };

function gatherCoachContext() {
  const habits = (() => {
    try {
      const list = JSON.parse(localStorage.getItem("ledger-habits-list") || "[]");
      const log  = JSON.parse(localStorage.getItem("ledger-habits-log")  || "{}");
      const today = new Date().toISOString().slice(0, 10);
      return (list as { name: string }[]).slice(0, 8).map(h => ({ name: h.name, doneToday: !!(log[today] && log[today][h.name]) }));
    } catch { return []; }
  })();
  const streak = (() => { try { return parseInt(localStorage.getItem("ledger-focus-streak") || "0"); } catch { return 0; } })();
  const weakTopics = (() => { try { return JSON.parse(localStorage.getItem("ledger-weak-topics") || "[]"); } catch { return []; } })();
  const deadlines = (() => {
    try {
      const all = JSON.parse(localStorage.getItem("ledger-deadlines") || "[]");
      const today = new Date();
      return (all as { done: boolean; date: string; title: string; category: string }[])
        .filter(d => !d.done)
        .map(d => ({ title: d.title, daysLeft: Math.ceil((new Date(d.date).getTime() - today.getTime()) / 86400000), category: d.category }))
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 5);
    } catch { return []; }
  })();
  const recentSubjects = (() => { try { return JSON.parse(localStorage.getItem("ledger-notes-history") || "[]").slice(0, 5); } catch { return []; } })();
  return { habits, streak, weakTopics, deadlines, recentSubjects, date: new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) };
}

// ── Tab: Coach ────────────────────────────────────────────────────────────────

function CoachTab() {
  const [briefing, setBriefing]       = useState<CoachBriefing | null>(null);
  const [loading, setLoading]         = useState(false);
  const [messages, setMessages]       = useState<CoachMessage[]>([]);
  const [input, setInput]             = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError]             = useState("");
  const [ctx, setCtx]                 = useState<ReturnType<typeof gatherCoachContext> | null>(null);
  const bottomRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = gatherCoachContext();
    setCtx(c);
    fetchBriefing(c);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function fetchBriefing(c: ReturnType<typeof gatherCoachContext>) {
    setLoading(true); setError("");
    try {
      const res  = await callAI({ tool: "coach_briefing", context: c });
      const data = await res.json();
      if (!res.ok || !data.greeting) { setError("Couldn't load briefing."); return; }
      setBriefing(data);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  async function sendChat() {
    if (!input.trim()) return;
    const msg = input.trim(); setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setChatLoading(true);
    try {
      const res  = await callAI({ tool: "coach_chat", message: msg, context: ctx, history: messages.slice(-6).map(m => `${m.role === "user" ? "Student" : "Coach"}: ${m.text}`).join("\n") });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.reply || data.raw || "Try again." }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", text: "Network error." }]); }
    finally { setChatLoading(false); }
  }

  const COACH_SUGGESTIONS = ["What should I study today?", "How do I improve my weak topics?", "Give me a revision plan for next week."];

  return (
    <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--ink)", minHeight: 560 }}>
      {/* Briefing panel */}
      <div style={{ borderRight: "1px solid var(--rule)", padding: "28px 32px", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="mono cin">Today&apos;s Briefing</div>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13, color: "var(--ink-2)" }}>{ctx?.date || ""}</div>
        </div>
        {loading && <AIThinking />}
        {error && <div style={{ color: "var(--cinnabar-ink)", fontFamily: "var(--sans)", fontSize: 13, marginBottom: 12 }}>{error} <button className="btn ghost" style={{ marginLeft: 8 }} onClick={() => ctx && fetchBriefing(ctx)}>Retry</button></div>}

        {briefing && !loading && (
          <>
            <div style={{ marginBottom: 20 }}><AIOutput text={briefing.greeting} variant="principle" /></div>
            <div style={{ marginBottom: 16 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 8, letterSpacing: "0.08em" }}>TODAY&apos;S PRIORITIES</div>
              {briefing.priorities.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, padding: "10px 12px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
                  <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 10, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{p.task}</div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{p.why}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "12px 14px", border: "2px solid var(--ink)", marginBottom: 10 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>INSIGHT</div>
              <AIOutput text={briefing.insight} variant="principle" />
            </div>
            <div style={{ padding: "10px 12px", border: "1px solid var(--rule)", background: "var(--paper-2)", marginBottom: briefing.warning ? 10 : 0 }}>
              <div className="mono" style={{ fontSize: 9, color: "#1a6091", marginBottom: 4 }}>FOCUS RECOMMENDATION</div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 13 }}>{briefing.focus}</div>
            </div>
            {briefing.warning && (
              <div style={{ padding: "10px 12px", border: "1px solid var(--cinnabar-ink)", background: "rgba(196,75,42,0.05)" }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--cinnabar-ink)", marginBottom: 4 }}>⚠ HEADS UP</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 13 }}>{briefing.warning}</div>
              </div>
            )}
            {ctx && ctx.weakTopics.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginBottom: 6 }}>WEAK AREAS TO REVISIT</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {(ctx.weakTopics as string[]).slice(0, 6).map((t, i) => (
                    <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 10, padding: "3px 8px", border: "1px solid var(--cinnabar-ink)", color: "var(--cinnabar-ink)" }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Chat panel */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>ASK YOUR COACH · Studies, schedule, strategy, anything</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10, minHeight: 280 }}>
          {messages.length === 0 && (
            <div style={{ color: "var(--ink-3)", fontFamily: "var(--sans)", fontSize: 13, textAlign: "center", paddingTop: 32 }}>
              Your coach is ready.
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                {COACH_SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => setInput(s)} style={{ fontFamily: "var(--sans)", fontSize: 12, padding: "7px 12px", border: "1px solid var(--rule)", background: "var(--paper-2)", color: "var(--ink-2)", cursor: "pointer", textAlign: "left" }}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "80%", padding: "9px 13px", background: m.role === "user" ? "var(--ink)" : "var(--paper-2)", color: m.role === "user" ? "var(--paper)" : "var(--ink)", border: m.role === "assistant" ? "1px solid var(--rule)" : "none", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6 }}>
                {m.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "9px 13px", border: "1px solid var(--rule)", background: "var(--paper-2)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>Thinking…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ borderTop: "1px solid var(--rule)", padding: "12px 14px", display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }} placeholder="Ask your coach…"
            style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "9px 11px", color: "var(--ink)", outline: "none" }} />
          <button className="btn" onClick={sendChat} disabled={chatLoading || !input.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

type Tab = "planner" | "deadlines" | "habits" | "coach";
const TABS: [Tab, string][] = [["planner", "Planner"], ["deadlines", "Deadlines"], ["habits", "Habits"], ["coach", "AI Coach"]];

export default function StudyCommandPage() {
  const [tab, setTab] = useState<Tab>("planner");
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--ink)" }}>
      <header className="mob-hp" style={{ padding: "24px 44px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="mono" style={{ color: "var(--ink-3)" }}>Study Command</div>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>Planner, deadlines, and habits in one place.</div>
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
        {tab === "planner"   && <PlannerTab />}
        {tab === "deadlines" && <DeadlinesTab />}
        {tab === "habits"    && <HabitsTab />}
        {tab === "coach"     && <CoachTab />}
      </main>
    </div>
  );
}
