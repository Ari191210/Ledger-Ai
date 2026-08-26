"use client";
// ═══════════════════════════════════════════════════════════════════════════
// The landing page.
//
// Positioned as an operating system for academic life, which sets the tone:
// an OS is judged on whether it disappears while you work, so the page is
// quiet, specific, and free of the vocabulary the Constitution bans.
//
// Every claim here describes a mechanism that exists in this codebase. There
// are no invented statistics, no fabricated testimonials, and no student
// counts — Vision §34 and Constitution §3. The illustration is explicitly
// labelled as an illustration, in the same visual unit, per §8.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";

const SYSTEMS = [
  {
    name: "Academics",
    line: "Subjects, results, and the topics you name as weak.",
    detail: "A named weakness enters your action queue. Vague discomfort with a subject cannot be planned around; \u201cvectors\u201d can.",
  },
  {
    name: "Testing",
    line: "Every attempt, dated, section by section.",
    detail: "One score is a data point. The system reads the movement between attempts and tells you which section is actually holding you back.",
  },
  {
    name: "Colleges",
    line: "Your list, and whether its shape is honest.",
    detail: "Adding a college opens its application checklist and puts its deadline on your calendar in the same action.",
  },
  {
    name: "Applications",
    line: "One workspace per school, with a real checklist.",
    detail: "Progress is the share of items you have actually ticked. Nothing here is estimated on your behalf.",
  },
  {
    name: "Essays",
    line: "Prompts, drafts, and full version history.",
    detail: "Saving never overwrites. You can always retrieve the safer draft, which is what makes writing the braver one possible.",
  },
  {
    name: "Calendar",
    line: "Every date, entered once.",
    detail: "Deadlines arrive from the record that owns them \u2014 a college, a test, an essay. You never type a date twice.",
  },
];

const PRINCIPLES = [
  {
    title: "It will not invent a number",
    body: "Where there is no data, StudyLedger shows a dash and says why. \u201c0%\u201d and \u201cnot measured\u201d look identical on a screen and mean opposite things, and one fabricated figure makes every other figure on the page worth less.",
  },
  {
    title: "Every recommendation cites its source",
    body: "Nothing is suggested without quoting the record that produced it. If the system tells you to work on Advanced Algebra, it is because your last two papers say so, and it shows you that.",
  },
  {
    title: "It is one system, not a folder of tools",
    body: "A test score becomes a weak topic, which becomes a task, which appears on your calendar. A college becomes an application, which becomes essays and deadlines. The connections are the product.",
  },
];

export default function LandingPage() {
  return (
    <div data-os>
      <div className="os-bar">
        <div className="os-bar-inner">
          <Link href="/" className="os-wordmark">StudyLedger</Link>
          <nav className="os-nav" aria-label="Main">
            <Link href="#systems" className="os-nav-item">Systems</Link>
            <Link href="#principles" className="os-nav-item">Principles</Link>
            <Link href="/about" className="os-nav-item">About</Link>
            <Link href="/pricing" className="os-nav-item">Pricing</Link>
          </nav>
          <div style={{ marginLeft: "auto" }}>
            <Link href="/journey" className="os-btn" data-variant="primary" data-size="sm">
              Open StudyLedger
            </Link>
          </div>
        </div>
      </div>

      <main className="os-shell" id="main-content">
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section style={{ padding: "88px 0 64px", maxWidth: "72ch" }}>
          <p className="os-eyebrow">The academic operating system</p>
          <h1 style={{
            fontSize: "clamp(38px, 6vw, 60px)",
            lineHeight: 1.06,
            letterSpacing: "-0.035em",
            fontWeight: 600,
            color: "var(--os-ink)",
            margin: 0,
          }}>
            Know where you stand.<br />
            Know what to do next.
          </h1>
          <p style={{
            fontSize: 18, lineHeight: 1.6, color: "var(--os-ink-3)",
            margin: "22px 0 0", maxWidth: "58ch",
          }}>
            One place that holds your academics, tests, activities, projects, colleges,
            applications and essays — and reads across all of them to answer the only
            question that matters on a given Tuesday.
          </p>
          <div className="os-row" style={{ marginTop: 32, gap: 12 }}>
            <Link href="/journey" className="os-btn" data-variant="primary" data-size="lg">
              Open StudyLedger
            </Link>
            <Link href="#systems" className="os-btn" data-size="lg">
              See how it works
            </Link>
          </div>
          <p className="os-basis" style={{ marginTop: 18 }}>
            Works immediately, with no account. Your record is stored on your own device
            until you choose to sign in.
          </p>
        </section>

        {/* ── The illustration ────────────────────────────────────────
            Labelled inside the same visual unit, per Constitution §8. The
            figures are a fixed constant and are never dressed as live. */}
        <section aria-label="Illustration of the interface" style={{ marginBottom: 96 }}>
          <div className="os-card os-card-raised" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "11px 16px", borderBottom: "1px solid var(--os-line)",
              background: "var(--os-surface-sunk)",
            }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--os-line-strong)" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--os-line-strong)" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--os-line-strong)" }} />
              <span className="os-pill" style={{ marginLeft: "auto" }}>
                Illustration — not a real student
              </span>
            </div>

            <div style={{ padding: "26px 28px" }}>
              <p className="os-eyebrow">Tuesday, 14 October</p>
              <h2 style={{
                fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em",
                color: "var(--os-ink)", margin: "0 0 22px",
              }}>Good morning</h2>

              <div style={{ display: "flex", gap: 40, flexWrap: "wrap", marginBottom: 26 }}>
                {[
                  ["Journey on track", "68", "%"],
                  ["Profile strength", "7.4", "/10"],
                  ["Open tasks", "5", ""],
                ].map(([label, value, unit]) => (
                  <div key={label}>
                    <div className="os-figure-label">{label}</div>
                    <div className="os-figure-value os-num" data-size="lg">
                      {value}<span className="os-figure-unit">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="os-action" data-rank={0} style={{ marginBottom: 10 }}>
                <div className="os-row" style={{ gap: 9, marginBottom: 5 }}>
                  <span className="os-pill" data-tone="accent">Do this next</span>
                  <span className="os-action-title">SAT Math — Advanced Algebra</span>
                  <span className="os-pill" data-tone="warn">32 days</span>
                  <span className="os-pill">35 min</span>
                </div>
                <p className="os-basis">
                  Across 3 attempts, Math is your lowest section at 78% (+40 since your first).
                </p>
              </div>

              <div className="os-action">
                <div className="os-row" style={{ gap: 9, marginBottom: 5 }}>
                  <span className="os-action-title">Supplemental essay — Purdue</span>
                  <span className="os-pill" data-tone="risk">4 days</span>
                </div>
                <p className="os-basis">
                  240 words drafted, due 18 October. 6 of 10 checklist items remain.
                </p>
              </div>
            </div>
          </div>
          <p className="os-basis" style={{ marginTop: 10 }}>
            The figures above illustrate the form of the interface. They are a fixed
            example — not a real student's record, and no such student exists.
          </p>
        </section>

        {/* ── Systems ─────────────────────────────────────────────────── */}
        <section id="systems" style={{ marginBottom: 96, scrollMarginTop: 76 }}>
          <p className="os-eyebrow">The systems</p>
          <h2 style={{
            fontSize: 32, fontWeight: 600, letterSpacing: "-0.025em",
            color: "var(--os-ink)", margin: "0 0 10px",
          }}>Eleven sections, not forty-six tools</h2>
          <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--os-ink-3)", margin: "0 0 32px", maxWidth: "62ch" }}>
            A menu of everything is a route through nothing. Each section holds one part
            of your record, and they read each other.
          </p>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(268px,1fr))", gap: 14,
          }}>
            {SYSTEMS.map(s => (
              <div key={s.name} className="os-card">
                <h3 className="os-card-title" style={{ marginBottom: 6 }}>{s.name}</h3>
                <p style={{ fontSize: 14, color: "var(--os-ink-2)", margin: "0 0 8px", lineHeight: 1.55 }}>
                  {s.line}
                </p>
                <p className="os-basis" style={{ margin: 0 }}>{s.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Principles ──────────────────────────────────────────────── */}
        <section id="principles" style={{ marginBottom: 96, scrollMarginTop: 76 }}>
          <p className="os-eyebrow">How it behaves</p>
          <h2 style={{
            fontSize: 32, fontWeight: 600, letterSpacing: "-0.025em",
            color: "var(--os-ink)", margin: "0 0 32px",
          }}>Three rules it will not break</h2>

          <div className="os-stack">
            {PRINCIPLES.map((p, i) => (
              <div key={p.title} style={{
                display: "grid", gridTemplateColumns: "44px 1fr", gap: 20,
                paddingBottom: 22, borderBottom: i < PRINCIPLES.length - 1 ? "1px solid var(--os-line)" : "none",
              }}>
                <span className="os-num" style={{
                  fontSize: 15, fontWeight: 600, color: "var(--os-ink-4)",
                }}>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 style={{
                    fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em",
                    color: "var(--os-ink)", margin: "0 0 7px",
                  }}>{p.title}</h3>
                  <p style={{
                    fontSize: 14.5, lineHeight: 1.65, color: "var(--os-ink-3)",
                    margin: 0, maxWidth: "64ch",
                  }}>{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Close ───────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div className="os-card" style={{
            padding: "44px 40px",
            background: "linear-gradient(180deg, var(--os-accent-soft) 0%, var(--os-surface) 70%)",
            borderColor: "var(--os-accent-line)",
          }}>
            <h2 style={{
              fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em",
              color: "var(--os-ink)", margin: "0 0 10px", maxWidth: "24ch",
            }}>Start with one record</h2>
            <p style={{
              fontSize: 15.5, lineHeight: 1.6, color: "var(--os-ink-3)",
              margin: "0 0 26px", maxWidth: "56ch",
            }}>
              Add a college, a test date, or your marks. The system has nothing to say
              until you give it something true to work from — and then it will not stop
              telling you what comes next.
            </p>
            <Link href="/journey" className="os-btn" data-variant="primary" data-size="lg">
              Open StudyLedger
            </Link>
          </div>
        </section>

        <footer style={{
          borderTop: "1px solid var(--os-line)", paddingTop: 26,
          display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center",
        }}>
          <span style={{ fontSize: 13, color: "var(--os-ink-4)" }}>
            StudyLedger — built by a student, in Delhi.
          </span>
          <div className="os-row" style={{ marginLeft: "auto", gap: 18 }}>
            <Link href="/about" className="os-link">About</Link>
            <Link href="/pricing" className="os-link">Pricing</Link>
            <Link href="/legal/privacy" className="os-link">Privacy</Link>
            <Link href="/legal/terms" className="os-link">Terms</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
