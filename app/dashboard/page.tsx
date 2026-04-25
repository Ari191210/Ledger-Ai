"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

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
          { label: "Next exam",       value: nextExam ? `${nextExam.days}d` : "—", sub: nextExam ? nextExam.name : "Add in Planner" },
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
