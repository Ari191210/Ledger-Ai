"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

const TOOLS = [
  { n: "01", slug: "planner",    ttl: "Smart Study Planner",  sub: "Subjects in. Timetable out.",     tier: "Free",  desc: "14-day reactive study plan built around your exam dates and daily hours." },
  { n: "02", slug: "marks",      ttl: "Marks Predictor",      sub: "The math of your report card.",   tier: "Free",  desc: "Weighted GPA, CBSE grade, and the score you need in remaining subjects." },
  { n: "03", slug: "notes",      ttl: "Notes Simplifier",     sub: "Textbook → plain English.",       tier: "Free",  desc: "AI-powered explanations, summaries, flashcards, and a graded quiz." },
  { n: "04", slug: "doubt",      ttl: "Doubt Solver",         sub: "A question, a worked answer.",    tier: "Pro",   desc: "Type the problem, get a full solution with the underlying principle." },
  { n: "05", slug: "focus",      ttl: "Focus Dashboard",      sub: "Pomodoro, streaks, tasks.",       tier: "Free",  desc: "25-min timer with session tracking. Runs in background across all tools." },
  { n: "06", slug: "career",     ttl: "Career Pathfinder",    sub: "For the 14–18 year olds.",        tier: "Pro",   desc: "Quiz → recommended streams, target colleges, entrance exams, 5-yr roadmap." },
  { n: "07", slug: "papers",     ttl: "Past Papers",          sub: "CBSE, JEE, NEET, SAT, IB.",      tier: "Pro",   desc: "47 papers, 900+ questions. 10 random questions per session from each pool." },
  { n: "08", slug: "assignment", ttl: "Assignment Rescue",    sub: "From prompt to outline.",         tier: "Pro",   desc: "Paste the brief. Get structure, arguments, and research directions." },
  { n: "09", slug: "resume",     ttl: "Resume Builder",       sub: "For applications, not LinkedIn.", tier: "Pro+",  desc: "Internships, summer programs, and college essays — exported as a PDF." },
  { n: "10", slug: "rooms",      ttl: "Study Rooms",          sub: "Silent accountability.",          tier: "Pro+",  desc: "Shared timer and task list with friends. Anyone who bails loses the streak." },
] as const;

const TIER_COLOR: Record<string, string> = {
  Free:  "var(--ink-3)",
  Pro:   "var(--cinnabar-ink)",
  "Pro+": "var(--cinnabar-ink)",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const name = user?.email?.split("@")[0] ?? "student";
  const greeting = getGreeting();

  return (
    <main className="mob-p" style={{ padding: "48px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 28, marginBottom: 40 }}>
        <div className="mono cin">Dashboard · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 52, fontWeight: 400, fontStyle: "italic", letterSpacing: "-0.025em", lineHeight: 1.05, margin: "10px 0 0" }}>
          {greeting}, {name}.
        </h1>
        <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", marginTop: 10, lineHeight: 1.5 }}>
          Ten tools. Pick one and get to work.
        </p>
      </div>

      {/* Tools grid */}
      <div
        className="mob-2col"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          borderTop: "1px solid var(--ink)",
          borderLeft: "1px solid var(--ink)",
        }}
      >
        {TOOLS.map((t, i) => (
          <Link
            key={t.n}
            href={`/tools/${t.slug}`}
            style={{
              textDecoration: "none",
              borderRight: "1px solid var(--ink)",
              borderBottom: "1px solid var(--ink)",
              padding: "22px 18px 20px",
              minHeight: 200,
              background: "var(--paper)",
              display: "flex",
              flexDirection: "column",
              color: "var(--ink)",
              transition: "background 120ms",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div className="mono cin">№ {t.n}</div>
              <div className="mono" style={{ fontSize: 9, color: TIER_COLOR[t.tier] }}>{t.tier}</div>
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, lineHeight: 1.2, marginTop: 10 }}>
              {t.ttl}
            </div>
            <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4, fontSize: 9, letterSpacing: "0.04em" }}>{t.sub}</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5, marginTop: 10 }}>
              {t.desc}
            </div>
            <div style={{ flex: 1 }} />
            <div
              className="mono"
              style={{
                borderTop: "1px solid var(--rule)",
                marginTop: 14,
                paddingTop: 10,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 9,
                color: "var(--ink-3)",
              }}
            >
              <span>Tool {t.n} of 10</span>
              <span>↗</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mono" style={{ marginTop: 32, color: "var(--ink-3)", fontSize: 11, textAlign: "right" }}>
        Logged in as {user?.email}
      </div>
    </main>
  );
}
