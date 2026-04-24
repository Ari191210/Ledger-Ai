"use client";
import Link from "next/link";

const TOOLS = [
  { n: "01", slug: "planner",    ttl: "Smart Study Planner",  sub: "Subjects in. Timetable out.",     tier: "Free",  desc: "14-day reactive study plan" },
  { n: "02", slug: "marks",      ttl: "Marks Predictor",      sub: "The math of your report card.",   tier: "Free",  desc: "Predict final % and GPA" },
  { n: "03", slug: "notes",      ttl: "Notes Simplifier",     sub: "Textbook → plain English.",       tier: "Free",  desc: "AI-powered chapter summaries" },
  { n: "04", slug: "doubt",      ttl: "Doubt Solver",         sub: "A question, a worked answer.",    tier: "Pro",   desc: "Instant worked solutions" },
  { n: "05", slug: "focus",      ttl: "Focus Dashboard",      sub: "Pomodoro, streaks, tasks.",       tier: "Free",  desc: "25-min timer + task list" },
  { n: "06", slug: "career",     ttl: "Career Pathfinder",    sub: "For the 14–18 year olds.",        tier: "Pro",   desc: "Quiz → streams, colleges, roadmap" },
  { n: "07", slug: "papers",     ttl: "Past Papers",          sub: "Boards, JEE, SAT, Olympiads.",   tier: "Pro",   desc: "Practice with scoring" },
  { n: "08", slug: "assignment", ttl: "Assignment Rescue",    sub: "Brief → outline in 30 seconds.", tier: "Pro",   desc: "Structure + arguments" },
  { n: "09", slug: "resume",     ttl: "Resume Builder",       sub: "For applications, not LinkedIn.", tier: "Pro+",  desc: "Form → polished PDF" },
  { n: "10", slug: "rooms",      ttl: "Study Rooms",          sub: "Silent accountability.",          tier: "Pro+",  desc: "Co-timer + shared tasks" },
] as const;

export default function Dashboard() {

  return (
    <main style={{ padding: "48px 44px 80px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 28, marginBottom: 40 }}>
        <div className="mono cin">Dashboard</div>
        <h1
          style={{
            fontFamily: "var(--serif)",
            fontSize: 56,
            fontWeight: 400,
            fontStyle: "italic",
            letterSpacing: "-0.025em",
            lineHeight: 1,
            margin: "8px 0 0",
          }}
        >
          Ten tools. What will you work on today?
        </h1>
      </div>

      {/* Tools grid */}
      <div
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
              padding: "20px 18px 22px",
              minHeight: 180,
              background: i === 0 ? "var(--paper-2)" : "var(--paper)",
              display: "flex",
              flexDirection: "column",
              color: "var(--ink)",
            }}
          >
            <div className="mono cin">№ {t.n}</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, lineHeight: 1.15, marginTop: 10 }}>
              {t.ttl}
            </div>
            <div className="mono" style={{ color: "var(--ink-3)", marginTop: 4, fontSize: 10 }}>{t.sub}</div>
            <div style={{ flex: 1 }} />
            <div
              className="mono"
              style={{
                borderTop: "1px solid var(--rule)",
                marginTop: 12,
                paddingTop: 8,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "var(--ink-3)" }}>Tool {t.n}</span>
              <span>→</span>
            </div>
          </Link>
        ))}
      </div>

    </main>
  );
}
