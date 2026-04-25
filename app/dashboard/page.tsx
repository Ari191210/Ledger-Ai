"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { patchUserData, loadUserData, type Exam } from "@/lib/user-data";

const TOOLS = [
  { n: "01", slug: "planner",    ttl: "Smart Study Planner",  sub: "Subjects in. Timetable out.",     tier: "Free",  desc: "14-day reactive plan built around your exam dates and daily hours." },
  { n: "02", slug: "marks",      ttl: "Marks Predictor",      sub: "The math of your report card.",   tier: "Free",  desc: "Weighted GPA, CBSE grade, and the score you need in remaining subjects." },
  { n: "03", slug: "notes",      ttl: "Notes Simplifier",     sub: "Textbook → plain English.",       tier: "Free",  desc: "AI explanations, summaries, flashcards, and a graded quiz. Saves history." },
  { n: "04", slug: "doubt",      ttl: "Doubt Solver",         sub: "A question, a worked answer.",    tier: "Pro",   desc: "Type the problem, get a full worked solution with the underlying principle." },
  { n: "05", slug: "focus",      ttl: "Focus Dashboard",      sub: "Pomodoro, streaks, tasks.",       tier: "Free",  desc: "25-min timer that runs in the background across every tool." },
  { n: "06", slug: "career",     ttl: "Career Pathfinder",    sub: "For the 14–18 year olds.",        tier: "Pro",   desc: "Quiz → recommended streams, colleges, entrance exams, 5-yr roadmap." },
  { n: "07", slug: "papers",     ttl: "Past Papers",          sub: "CBSE, JEE, NEET, SAT, IB.",      tier: "Pro",   desc: "47 papers, 900+ questions. 10 random questions per session. Tracks weak topics." },
  { n: "08", slug: "assignment", ttl: "Assignment Rescue",    sub: "From prompt to outline.",         tier: "Pro",   desc: "Paste the brief. Get structure, argument options, and research directions." },
  { n: "09", slug: "resume",     ttl: "Resume Builder",       sub: "For applications, not LinkedIn.", tier: "Pro+",  desc: "Internships, summer programs, college essays — one polished PDF." },
  { n: "10", slug: "rooms",      ttl: "Study Rooms",          sub: "Silent accountability.",          tier: "Pro+",  desc: "Shared timer and tasks with friends. Code-based rooms, no sign-up needed." },
] as const;

const TIER_COLOR: Record<string, string> = {
  Free: "var(--ink-3)",
  Pro: "var(--cinnabar-ink)",
  "Pro+": "var(--cinnabar-ink)",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type WeakTopic = { topic: string; count: number };
type NextExam = { name: string; days: number };

function useStats() {
  const [streak, setStreak] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [nextExam, setNextExam] = useState<NextExam | null>(null);
  const [notesCount, setNotesCount] = useState(0);
  const [papersCount, setPapersCount] = useState(0);

  useEffect(() => {
    try {
      setStreak(parseInt(localStorage.getItem("ledger-focus-streak") || "0", 10));

      const timer = JSON.parse(localStorage.getItem("ledger-focus-timer") || "{}");
      setSessionsToday(timer.n || 0);

      const wt = JSON.parse(localStorage.getItem("ledger-weak-topics") || "{}") as Record<string, number>;
      const sorted = Object.entries(wt).sort(([, a], [, b]) => b - a).slice(0, 5).map(([topic, count]) => ({ topic, count }));
      setWeakTopics(sorted);

      const plan = JSON.parse(localStorage.getItem("ledger-plan-v1") || "{}");
      if (plan.subjects?.length) {
        const today = new Date();
        const upcoming = (plan.subjects as Array<{ name: string; exam: string }>)
          .map((s) => ({ name: s.name, days: Math.ceil((new Date(s.exam).getTime() - today.getTime()) / 86400000) }))
          .filter((s) => s.days > 0)
          .sort((a, b) => a.days - b.days);
        if (upcoming.length) setNextExam(upcoming[0]);
      }

      const notes = JSON.parse(localStorage.getItem("ledger-notes-history") || "[]");
      setNotesCount(notes.length);

      const papers = JSON.parse(localStorage.getItem("ledger-papers-log") || "[]");
      setPapersCount(papers.length);
    } catch {}
  }, []);

  return { streak, sessionsToday, weakTopics, nextExam, notesCount, papersCount };
}

const BOARDS = ["CBSE", "ICSE", "IB", "State Board", "JEE", "NEET", "Other"];

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function ExamSchedule({ userId, userEmail, userName }: { userId: string; userEmail: string; userName: string }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", date: "", board: "CBSE" });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadUserData(userId).then((ud) => {
      if (ud) {
        setExams(ud.exams || []);
        setEmailEnabled(ud.emailEnabled || false);
      }
      setLoaded(true);
    });
  }, [userId]);

  async function addExam() {
    if (!form.name || !form.date) return;
    setSaving(true);
    const updated = [...exams, { ...form }].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setExams(updated);
    await patchUserData(userId, "exams", updated);
    setForm({ name: "", subject: "", date: "", board: "CBSE" });
    setShowForm(false);
    setSaving(false);
  }

  async function removeExam(i: number) {
    const updated = exams.filter((_, idx) => idx !== i);
    setExams(updated);
    await patchUserData(userId, "exams", updated);
  }

  async function toggleEmail(val: boolean) {
    setEmailEnabled(val);
    await patchUserData(userId, "emailEnabled", val);
  }

  async function sendNow() {
    setSending(true);
    setSendMsg("");
    try {
      const res = await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email: userEmail, name: userName }),
      });
      const json = await res.json();
      setSendMsg(res.ok ? "Report sent. Check your inbox." : `Error: ${json.error}`);
    } catch {
      setSendMsg("Network error. Try again.");
    } finally {
      setSending(false);
    }
  }

  if (!loaded) return (
    <div style={{ padding: "20px 0" }}>
      <div className="mono" style={{ color: "var(--ink-3)" }}>Loading schedule…</div>
    </div>
  );

  const upcoming = exams.filter(e => daysUntil(e.date) >= 0).sort((a, b) => daysUntil(a.date) - daysUntil(b.date));
  const past = exams.filter(e => daysUntil(e.date) < 0);

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Section header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--ink)", paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic" }}>Exam Schedule</div>
        <button onClick={() => setShowForm(!showForm)} className="btn ghost" style={{ padding: "4px 12px", fontSize: 11 }}>
          {showForm ? "Cancel" : "+ Add exam"}
        </button>
      </div>

      {/* Add exam form */}
      {showForm && (
        <div style={{ border: "1px solid var(--ink)", padding: "20px", marginBottom: 16, background: "var(--paper-2)" }}>
          <div className="mono cin" style={{ marginBottom: 14 }}>New exam</div>
          <div className="mob-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 4 }}>Exam name</div>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Physics Unit Test"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "8px 10px", color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 4 }}>Subject</div>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Physics"
                style={{ width: "100%", fontFamily: "var(--sans)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "8px 10px", color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 4 }}>Date</div>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "8px 10px", color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div className="mono" style={{ color: "var(--ink-3)", marginBottom: 4 }}>Board</div>
              <select value={form.board} onChange={e => setForm(f => ({ ...f, board: e.target.value }))}
                style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 13, border: "1px solid var(--ink)", background: "var(--paper)", padding: "8px 10px", color: "var(--ink)", outline: "none", boxSizing: "border-box" }}>
                {BOARDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <button className="btn" onClick={addExam} disabled={saving || !form.name || !form.date} style={{ opacity: saving || !form.name || !form.date ? 0.5 : 1 }}>
            {saving ? "Saving…" : "Add exam →"}
          </button>
        </div>
      )}

      {/* Exam list */}
      {upcoming.length === 0 && !showForm ? (
        <div style={{ padding: "20px", border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <div className="mono" style={{ color: "var(--ink-3)" }}>No exams scheduled. Add your upcoming exams to get personalised progress emails.</div>
        </div>
      ) : upcoming.length > 0 ? (
        <div style={{ border: "1px solid var(--ink)", marginBottom: 16 }}>
          <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--paper-2)" }}>
                {["Exam", "Subject", "Board", "Date", "Days", ""].map((h, i) => (
                  <th key={i} style={{ padding: "8px 14px", textAlign: "left", fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-3)", fontWeight: "normal", letterSpacing: "0.06em", borderBottom: "1px solid var(--rule)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcoming.map((e, i) => {
                const d = daysUntil(e.date);
                return (
                  <tr key={i}>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--serif)", fontSize: 14, fontWeight: 600, borderBottom: i < upcoming.length - 1 ? "1px solid var(--rule)" : "none" }}>{e.name}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)", borderBottom: i < upcoming.length - 1 ? "1px solid var(--rule)" : "none" }}>{e.subject}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", borderBottom: i < upcoming.length - 1 ? "1px solid var(--rule)" : "none" }}>{e.board}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", borderBottom: i < upcoming.length - 1 ? "1px solid var(--rule)" : "none" }}>{new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: d <= 7 ? "var(--cinnabar-ink)" : "var(--ink)", borderBottom: i < upcoming.length - 1 ? "1px solid var(--rule)" : "none" }}>{d}d</td>
                    <td style={{ padding: "10px 14px", borderBottom: i < upcoming.length - 1 ? "1px solid var(--rule)" : "none" }}>
                      <button onClick={() => removeExam(i)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {past.length > 0 && (
        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 10, marginBottom: 16 }}>{past.length} past exam{past.length > 1 ? "s" : ""} hidden.</div>
      )}

      {/* Email reports section */}
      <div style={{ border: "1px solid var(--rule)", padding: "16px 20px", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>Weekly Progress Email</div>
          <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4 }}>Exam countdown · weak topics · marks · AI study plan · every Monday 8 AM IST</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div onClick={() => toggleEmail(!emailEnabled)}
              style={{ width: 36, height: 20, background: emailEnabled ? "var(--ink)" : "var(--rule)", borderRadius: 10, position: "relative", cursor: "pointer", transition: "background 200ms", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 3, left: emailEnabled ? 19 : 3, width: 14, height: 14, background: "white", borderRadius: "50%", transition: "left 200ms" }} />
            </div>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-2)" }}>{emailEnabled ? "On" : "Off"}</span>
          </label>
          <button className="btn ghost" onClick={sendNow} disabled={sending} style={{ padding: "6px 14px", fontSize: 11, opacity: sending ? 0.5 : 1 }}>
            {sending ? "Sending…" : "Send now →"}
          </button>
        </div>
      </div>
      {sendMsg && (
        <div className="mono" style={{ marginTop: 8, fontSize: 11, color: sendMsg.startsWith("Error") ? "var(--cinnabar-ink)" : "var(--ink-2)" }}>{sendMsg}</div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const name = user?.email?.split("@")[0] ?? "student";
  const greeting = getGreeting();
  const { streak, sessionsToday, weakTopics, nextExam, notesCount, papersCount } = useStats();

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <main className="mob-p" style={{ padding: "40px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 24, marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="mono cin">{today}</div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 48, fontWeight: 400, fontStyle: "italic", letterSpacing: "-0.025em", lineHeight: 1.05, margin: "8px 0 0" }}>
            {greeting}, {name}.
          </h1>
        </div>
        <div className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>studyledger.in</div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", border: "1px solid var(--ink)", marginBottom: 40 }}>
        {[
          { label: "Study streak",    value: `${streak}d`,           sub: streak === 0 ? "Start today" : streak === 1 ? "Keep it up" : "On a roll" },
          { label: "Sessions today",  value: String(sessionsToday),  sub: sessionsToday === 0 ? "None yet" : `${sessionsToday * 25} min focused` },
          { label: "Notes saved",     value: String(notesCount),     sub: notesCount === 0 ? "Generate your first" : "In your library" },
          { label: "Papers done",     value: String(papersCount),    sub: papersCount === 0 ? "Start practising" : "Sessions completed" },
          { label: "Next exam",       value: nextExam ? `${nextExam.days}d` : "—", sub: nextExam ? nextExam.name : "Add below" },
        ].map((s, i) => (
          <div key={i} style={{ padding: "18px 20px", borderRight: i < 4 ? "1px solid var(--ink)" : "none" }}>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1, marginTop: 6, color: i === 4 && nextExam && nextExam.days <= 7 ? "var(--cinnabar-ink)" : "var(--ink)" }}>{s.value}</div>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Weak topics strip */}
      {weakTopics.length > 0 && (
        <div style={{ marginBottom: 32, padding: "16px 20px", border: "1px solid var(--rule)", background: "var(--paper-2)", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div className="mono cin" style={{ flexShrink: 0 }}>Weak topics</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
            {weakTopics.map((wt, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", border: "1px solid var(--rule)", background: "var(--paper)" }}>
                <span style={{ fontFamily: "var(--sans)", fontSize: 12 }}>{wt.topic}</span>
                <span className="mono" style={{ color: "var(--cinnabar-ink)", fontSize: 9 }}>{wt.count}✗</span>
              </div>
            ))}
          </div>
          <Link href="/tools/papers" className="mono" style={{ color: "var(--ink-3)", fontSize: 10, whiteSpace: "nowrap" }}>Practice → </Link>
        </div>
      )}

      {/* Exam schedule */}
      {user && (
        <ExamSchedule
          userId={user.id}
          userEmail={user.email ?? ""}
          userName={name}
        />
      )}

      {/* Tools grid */}
      <div
        className="mob-2col"
        style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", borderTop: "1px solid var(--ink)", borderLeft: "1px solid var(--ink)" }}
      >
        {TOOLS.map((t) => (
          <Link
            key={t.n}
            href={`/tools/${t.slug}`}
            style={{
              textDecoration: "none", borderRight: "1px solid var(--ink)", borderBottom: "1px solid var(--ink)",
              padding: "22px 18px 20px", minHeight: 200, background: "var(--paper)", display: "flex",
              flexDirection: "column", color: "var(--ink)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div className="mono cin">№ {t.n}</div>
              <div className="mono" style={{ fontSize: 9, color: TIER_COLOR[t.tier] }}>{t.tier}</div>
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, lineHeight: 1.2, marginTop: 10 }}>{t.ttl}</div>
            <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4, fontSize: 9 }}>{t.sub}</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5, marginTop: 10 }}>{t.desc}</div>
            <div style={{ flex: 1 }} />
            <div className="mono" style={{ borderTop: "1px solid var(--rule)", marginTop: 14, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--ink-3)" }}>
              <span>Tool {t.n} of 10</span><span>↗</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mono" style={{ marginTop: 24, color: "var(--ink-3)", fontSize: 10, textAlign: "right" }}>
        {user?.email} · <Link href="/" style={{ color: "var(--ink-3)" }}>Back to home</Link>
      </div>
    </main>
  );
}
