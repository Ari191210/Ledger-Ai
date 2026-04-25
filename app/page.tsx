import Link from "next/link";
import PaletteToggle from "@/components/palette-toggle";

const tools = [
  { n: "01", slug: "planner",    ttl: "Smart Study Planner",  sub: "Subjects in. Timetable out.",     desc: "Enter subjects, exam dates, and the hours you actually have. We return a plan for every remaining day — not a calendar template."      },
  { n: "02", slug: "marks",      ttl: "Marks Predictor",      sub: "The math of your report card.",   desc: "Current scores, weightages, and upcoming tests. Get the final percentage, the score you need for 90+, and the GPA a US admissions office will see." },
  { n: "03", slug: "notes",      ttl: "Notes Simplifier",     sub: "Textbook → plain English.",       desc: "Paste or upload a chapter. Receive a one-page explanation, a summary, flashcards, and a quiz — graded."                              },
  { n: "04", slug: "doubt",      ttl: "Doubt Solver",         sub: "A question, a worked answer.",    desc: "Type the problem. Receive a worked solution, the underlying principle, and three similar problems at the same difficulty."            },
  { n: "05", slug: "focus",      ttl: "Focus Dashboard",      sub: "Pomodoro, streaks, tasks.",       desc: "A single pane: timer, task list, and a streak you can't quietly abandon. No notifications you didn't ask for."                      },
  { n: "06", slug: "career",     ttl: "Career Pathfinder",    sub: "For the 14–18 year olds.",        desc: "A quiz grounded in actual coursework — not personality archetypes. Output: streams, colleges, entrance exams, a five-year roadmap."  },
  { n: "07", slug: "papers",     ttl: "Past Papers",          sub: "CBSE, JEE, NEET, SAT, IB.",      desc: "Topic-wise practice across boards and difficulty tiers. NEET, JEE Mains, SAT, IB, CBSE, and ICSE — all in one engine."               },
  { n: "08", slug: "assignment", ttl: "Assignment Rescue",    sub: "From prompt to outline.",         desc: "Paste the brief. Receive structure, argument options, and research directions. Plagiarism-safe guidance — not a submission."         },
  { n: "09", slug: "resume",     ttl: "Resume Builder",       sub: "For applications, not LinkedIn.", desc: "For internships, summer programs, and college essays. Activities, achievements, and one polished PDF."                              },
  { n: "10", slug: "rooms",      ttl: "Study Rooms",          sub: "Silent accountability.",          desc: "Private rooms with a shared timer and shared task list. If your friend bails, you both lose the streak."                            },
] as const;

const nicheFeats = [
  { tag: "α", ttl: "Cognitive Debt Meter",       body: "Unfinished chapters accrue interest. The meter shows your academic APR — and the minimum daily payment to stay solvent before exams." },
  { tag: "β", ttl: "Circadian Study Window",      body: "We map your chronotype from sleep times and place the hardest subject inside your personal peak — not a generic morning/evening default." },
  { tag: "γ", ttl: "Forgetting-Curve Revision",  body: "Past-paper questions resurface on Ebbinghaus intervals. Not by topic. Not by date. By the precise moment before you would have forgotten." },
  { tag: "δ", ttl: "Peer Heatmap",               body: "Anonymous map of which chapters students in your board, grade, and week are struggling with right now. You are not alone on Conic Sections." },
  { tag: "ε", ttl: "Syllabus Parser",            body: "Upload your school's PDF syllabus. We read it and build the full plan — not a template you then edit for an hour." },
  { tag: "ζ", ttl: "Accountability Pact",        body: "Lock a session with a friend. If either of you bails, both streaks reset. The only social feature that works by being uncomfortable." },
  { tag: "η", ttl: "Marks→College Simulator",    body: "A live feedback loop: score X on this week's test and these colleges move in or out of reach. Based on actual historic cutoffs." },
] as const;

const testimonials = [
  { q: "I opened Ledger once and deleted four other apps. The debt meter is what finally got me to revise organic chem.",                                         by: "Ananya R.", ctx: "Class 12, CBSE — Pune",    score: "Physics 94 → 97"          },
  { q: "The chronotype thing sounds like astrology until you do calculus at 10pm and realize you actually are better at it at 10pm.",                            by: "Marcus O.", ctx: "IB Diploma — Singapore",   score: "HL Math 6 → 7"            },
  { q: "My school's syllabus PDF is 41 pages of chaos. Ledger turned it into 84 days of study in about six seconds.",                                           by: "Rohan K.",  ctx: "Class 10, ICSE — Mumbai",  score: "Overall 88% → 94%"        },
  { q: "Accountability pact means I can't bail on my study sessions anymore. My streak is currently hostage to a girl in Chennai.",                              by: "Dev P.",    ctx: "JEE Advanced prep",        score: "Mock rank 14,200 → 3,860"  },
] as const;

const stats = [
  ["+ 14.2%", "Median score lift after 8 weeks"],
  ["7h 24m",  "Recovered per student, per week"],
  ["94%",     "Renew after the first board/mock exam"],
  ["42",      "Schools piloting Ledger this term"],
] as const;

const tickerItems = [
  "Figures updated hourly",
  "14,382 timetables generated this week",
  "Average user recovered 7.4 hours per week",
  "Chemistry is the most-feared subject in CBSE Class 12",
  "Peer heatmap: Conic Sections trending ↑ 41% — Week 16",
  "Pro members save an average of 22 minutes per study day",
  "Debt meter holders revised 2.6× more often",
];

const footerGroups = [
  { h: "Tools",        l: ["Planner", "Marks Predictor", "Notes", "Doubt Solver", "Focus", "Pathfinder", "Past Papers", "Rescue", "Resume", "Rooms"] },
  { h: "Institutions", l: ["For Schools", "For Tuition Centres", "Syllabus Parser", "Data Export", "API"] },
  { h: "The Ledger",   l: ["Changelog", "Roadmap", "Colophon", "Masthead", "Press", "Contact"] },
];

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function Home() {
  const today = formatDate(new Date());
  return (
    <div>
      <article
        data-v="broadsheet"
        className="grain"
        style={{
          maxWidth: 1280,
          width: "100%",
          margin: "0 auto",
          background: "var(--paper)",
          color: "var(--ink)",
          fontFamily: "var(--serif)",
        }}
      >
        {/* ── Top meta bar ──────────────────────────────────────────────── */}
        <div className="mono lp-metabar">
          <span>Vol. I · №&nbsp;01 · {today}</span>
          <span>A Periodical for the Studious · Since 2026</span>
          <span>Free to use · All tools included</span>
        </div>

        {/* ── Masthead ──────────────────────────────────────────────────── */}
        <header className="lp-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 4 }}>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Est. MMXXVI — New Delhi · Singapore · Mumbai</div>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Issue Ten · Tools · One Ledger</div>
          </div>
          <h1 className="lp-title">The Ledger</h1>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4, marginTop: 10 }} className="mono">
            <span>The Student&apos;s Operating System</span>
            <span>studyledger.in</span>
          </div>
        </header>

        {/* ── Lede ──────────────────────────────────────────────────────── */}
        <section className="lp-lede">
          <div>
            <div className="mono" style={{ color: "var(--cinnabar-ink)" }}>Leader · №&nbsp;1</div>
            <div className="mono" style={{ marginTop: 6, color: "var(--ink-3)" }}>Filed 04:22 · Editorial</div>
            <div className="smc" style={{ marginTop: 18 }}>
              On the question of whether students actually need ten different apps
            </div>
          </div>

          <div>
            <h2 className="lp-h2">
              Ten tools. One ledger. Built for the student who would rather be studying than picking software.
            </h2>
            <p
              className="dropcap cols-2"
              style={{ marginTop: 28, fontSize: 17, lineHeight: 1.55 }}
            >
              The problem with student productivity is that it has been solved eleven times and none of the solutions talk to each other. Your planner does not know your marks. Your notes app does not know your exam date. Your Pomodoro timer does not know you have a Chemistry practical on Thursday.{" "}
              <span className="mark">
                Ledger is the single book where all of it is entered, measured, and scheduled
              </span>{" "}
              — a study planner, marks predictor, notes tool, doubt solver, focus dashboard, career quiz, past-paper engine, assignment helper, resume builder, and study room, sharing one calendar and one streak.
            </p>
          </div>

          <aside style={{ borderLeft: "1px solid var(--rule)", paddingLeft: 22 }}>
            <div className="mono" style={{ color: "var(--cinnabar-ink)" }}>In this issue</div>
            <ol
              className="plain"
              style={{ marginTop: 12, fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.75, color: "var(--ink-2)" }}
            >
              <li><span className="mono">p.1</span>&nbsp; The Ten Tools</li>
              <li><span className="mono">p.2</span>&nbsp; Seven things nobody else ships</li>
              <li><span className="mono">p.3</span>&nbsp; Field reports from students</li>
            </ol>
            <Link href="/dashboard" className="btn" style={{ marginTop: 22, display: "inline-flex" }}>
              Open the Ledger →
            </Link>
          </aside>
        </section>

        {/* ── Ticker ────────────────────────────────────────────────────── */}
        <div style={{ borderBottom: "1px solid var(--ink)", padding: "10px 0", background: "var(--paper-2)" }}>
          <div className="ticker">
            <div className="ticker-track mono" style={{ color: "var(--ink-2)" }}>
              {[0, 1].flatMap((k) =>
                tickerItems.map((item, i) => (
                  <span key={`${k}-${i}`}>{item}</span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Tools grid ────────────────────────────────────────────────── */}
        <section id="tools" className="lp-pad-t" style={{ borderBottom: "1px solid var(--ink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
            <div>
              <div className="mono cin">Section A — The Ten Tools</div>
              <h3 className="lp-h3">Ten tools. One place to study.</h3>
            </div>
            <div className="mono" style={{ color: "var(--ink-3)" }}>Fig. A · 2 × 5 grid</div>
          </div>

          <div className="lp-5col">
            {tools.map((t, i) => (
              <Link
                key={t.n}
                href={`/tools/${t.slug}`}
                style={{
                  textDecoration: "none",
                  color: "var(--ink)",
                  borderRight: "1px solid var(--ink)",
                  borderBottom: "1px solid var(--ink)",
                  padding: "20px 18px 22px",
                  minHeight: 200,
                  background: i === 0 ? "var(--paper-2)" : "var(--paper)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="mono cin">№ {t.n}</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, lineHeight: 1.1, marginTop: 10 }}>
                  {t.ttl}
                </div>
                <div className="mono" style={{ color: "var(--ink-3)", marginTop: 6, fontSize: 9 }}>{t.sub}</div>
                <div style={{ fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.5, color: "var(--ink-2)", marginTop: 10 }}>
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
                  }}
                >
                  <span style={{ color: "var(--ink-3)" }}>Tool {t.n}</span>
                  <span>↗</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Niche features ────────────────────────────────────────────── */}
        <section className="lp-pad" style={{ borderBottom: "1px solid var(--ink)", background: "var(--paper-2)" }}>
          <div className="lp-feats">
            <div>
              <div className="mono cin">Section B — Seven things nobody else ships</div>
              <h3 className="lp-h3">The features we are quietly strange about.</h3>
              <p style={{ fontFamily: "var(--sans)", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)", marginTop: 20 }}>
                The tools above are the price of entry. These are the reason you stay. None of them are available in another student app we have been able to find — we looked, and then we built them.
              </p>
              <div className="fignum" style={{ marginTop: 40 }}>Fig. B · Seven signatures</div>
              <div className="figbox" style={{ marginTop: 8, height: 160 }}>
                <div className="fiblab">Schematic · Debt Meter</div>
              </div>
            </div>

            <div className="lp-feats2">
              {nicheFeats.map((f) => (
                <div
                  key={f.tag}
                  style={{
                    borderRight: "1px solid var(--ink)",
                    borderBottom: "1px solid var(--ink)",
                    padding: "22px 20px",
                    background: "var(--paper)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 34, color: "var(--cinnabar-ink)", fontWeight: 400 }}>
                      {f.tag}
                    </span>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, lineHeight: 1.1 }}>
                      {f.ttl}
                    </span>
                  </div>
                  <p style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)", marginTop: 10 }}>
                    {f.body}
                  </p>
                </div>
              ))}

              <div
                style={{
                  borderRight: "1px solid var(--ink)",
                  borderBottom: "1px solid var(--ink)",
                  padding: "22px 20px",
                  background: "var(--ink)",
                  color: "var(--paper)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div className="mono" style={{ color: "var(--paper)", opacity: 0.7 }}>Coming Q3</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, lineHeight: 1.1, marginTop: 14 }}>
                    Exam-Day Mode
                  </div>
                  <p style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.55, opacity: 0.85, marginTop: 10 }}>
                    The morning of the paper, Ledger locks to a single-screen revision of only what you got wrong in the last 14 days.
                  </p>
                </div>
                <div className="mono" style={{ opacity: 0.7 }}>Waitlist: 3,204</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Field reports ─────────────────────────────────────────────── */}
        <section className="lp-pad" style={{ borderBottom: "1px solid var(--ink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
            <div>
              <div className="mono cin">Section C — Field reports</div>
              <h3 className="lp-h3">Dispatches from the desks of actual students.</h3>
            </div>
            <div className="mono" style={{ color: "var(--ink-3)" }}>n = 11,482 · Self-reported · Apr &apos;26</div>
          </div>

          <div className="lp-2col">
            {testimonials.map((t, i) => (
              <div
                key={i}
                style={{
                  borderRight: "1px solid var(--ink)",
                  borderBottom: "1px solid var(--ink)",
                  padding: "24px 20px",
                }}
              >
                <div className="mono cin">Dispatch № {String(i + 1).padStart(2, "0")}</div>
                <blockquote
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: 20,
                    fontStyle: "italic",
                    lineHeight: 1.35,
                    margin: "14px 0 20px",
                    letterSpacing: "-0.008em",
                  }}
                >
                  &ldquo;{t.q}&rdquo;
                </blockquote>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid var(--rule)", paddingTop: 12 }}>
                  <div>
                    <div className="mono" style={{ color: "var(--ink-3)" }}>Filed by</div>
                    <div style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 13, marginTop: 4 }}>{t.by}</div>
                  </div>
                  <div>
                    <div className="mono" style={{ color: "var(--ink-3)" }}>Desk</div>
                    <div style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 12, marginTop: 4, color: "var(--ink-2)" }}>{t.ctx}</div>
                  </div>
                  <div>
                    <div className="mono" style={{ color: "var(--ink-3)" }}>Result</div>
                    <div style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 13, marginTop: 4, color: "var(--cinnabar-ink)" }}>{t.score}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats strip */}
          <div className="lp-4col" style={{ marginTop: -1 }}>
            {stats.map(([big, sm], i) => (
              <div
                key={i}
                style={{
                  borderRight: i < 3 ? "1px solid var(--ink)" : "none",
                  borderBottom: "1px solid var(--ink)",
                  padding: "20px 20px",
                }}
              >
                <div style={{ fontFamily: "var(--serif)", fontSize: 40, fontWeight: 700, fontStyle: "italic", lineHeight: 1, letterSpacing: "-0.02em" }}>
                  {big}
                </div>
                <div className="mono" style={{ marginTop: 8, color: "var(--ink-3)" }}>{sm}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="lp-footer">
          <div>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 700, fontSize: 40, letterSpacing: "-0.02em", lineHeight: 0.9 }}>
              Ledger
            </div>
            <div className="mono" style={{ marginTop: 10, color: "var(--ink-3)" }}>
              The Student&apos;s Operating System
            </div>
            <p style={{ fontFamily: "var(--sans)", fontSize: 12.5, color: "var(--ink-3)", marginTop: 20, maxWidth: 300, lineHeight: 1.55 }}>
              Ledger is independent, student-funded, and not accepting venture capital until version 2.0. We will never sell your study data.
            </p>
          </div>

          {footerGroups.map((g) => (
            <div key={g.h}>
              <div className="mono cin">{g.h}</div>
              <ul className="plain" style={{ marginTop: 14, fontFamily: "var(--sans)", fontSize: 13, lineHeight: 2 }}>
                {g.l.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          ))}

          <div
            className="mono"
            style={{
              gridColumn: "1 / -1",
              borderTop: "1px solid var(--ink)",
              paddingTop: 18,
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>© MMXXVI Ledger Study Co.</span>
            <span>Set in Source Serif, Inter Tight &amp; JetBrains Mono</span>
            <span>studyledger.in</span>
          </div>
        </footer>
      </article>

      <PaletteToggle />
    </div>
  );
}
