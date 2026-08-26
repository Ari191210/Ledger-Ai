"use client";
// ═══════════════════════════════════════════════════════════════════════════
// About.
//
// Written in the first person because the product's credibility rests on a
// specific, checkable fact: it is built by a student who is currently going
// through this, not by an edtech company describing students from outside.
//
// Nothing here claims a user count, a funding round, or an outcome. The
// honest version is stronger, and the dishonest version is the thing the
// Constitution exists to prevent.
// ═══════════════════════════════════════════════════════════════════════════

import Link from "next/link";

export default function AboutPage() {
  return (
    <div data-os>
      <div className="os-bar">
        <div className="os-bar-inner">
          <Link href="/" className="os-wordmark">StudyLedger</Link>
          <nav className="os-nav" aria-label="Main">
            <Link href="/#systems" className="os-nav-item">Systems</Link>
            <Link href="/#principles" className="os-nav-item">Principles</Link>
            <Link href="/about" className="os-nav-item" data-active="true">About</Link>
            <Link href="/os/pricing" className="os-nav-item">Pricing</Link>
          </nav>
          <div style={{ marginLeft: "auto" }}>
            <Link href="/journey" className="os-btn" data-variant="primary" data-size="sm">
              Open StudyLedger
            </Link>
          </div>
        </div>
      </div>

      <main className="os-shell" id="main-content">
        <section className="os-measure" style={{ padding: "80px 0 48px" }}>
          <p className="os-eyebrow">About</p>
          <h1 style={{
            fontSize: "clamp(32px, 5vw, 46px)", lineHeight: 1.1,
            letterSpacing: "-0.03em", fontWeight: 600, color: "var(--os-ink)", margin: 0,
          }}>
            Built by a student who needed it
          </h1>
          <p style={{
            fontSize: 17, lineHeight: 1.65, color: "var(--os-ink-3)", margin: "20px 0 0",
          }}>
            StudyLedger is made in Delhi by someone currently in the middle of the thing
            it is built for. That is the whole reason it behaves the way it does.
          </p>
        </section>

        <section className="os-measure" style={{ marginBottom: 72 }}>
          <div className="os-stack">
            <div>
              <h2 style={h2}>Why it refuses to guess</h2>
              <p style={body}>
                Most study apps are generous with numbers. They will show you a readiness
                score on your first day, before you have told them anything, because a
                dashboard full of zeroes looks broken and a dashboard full of invented
                figures looks impressive.
              </p>
              <p style={body}>
                The problem is that once you know one number was decoration, you stop
                trusting all of them — and a tool you do not trust is one you stop opening
                in the week that actually matters. So StudyLedger shows a dash where it has
                no data, and tells you what it would need in order to say something.
              </p>
            </div>

            <div>
              <h2 style={h2}>Why it is one system</h2>
              <p style={body}>
                The version of this product that came before was forty-six separate tools.
                Each one worked. None of them knew about each other, so a test result never
                became a study plan, and a college deadline never became a task.
              </p>
              <p style={body}>
                Now a weak section on a practice paper produces a recommendation with the
                score history quoted underneath it. Adding a college opens its application
                checklist and files its deadline in your calendar. The connections are the
                product; the individual screens are just where you type.
              </p>
            </div>

            <div>
              <h2 style={h2}>Why it will not write your essay</h2>
              <p style={body}>
                There is no generate button in the essay workspace and there will not be
                one. An admissions reader can tell, and an essay that is not yours is worth
                less than a plain one that is.
              </p>
              <p style={body}>
                What the system does instead is keep every draft you have ever saved, so
                that writing a braver version costs you nothing — you can always go back.
                That is a more useful thing to give a nervous writer than a paragraph
                generator.
              </p>
            </div>

            <div>
              <h2 style={h2}>What it does not claim</h2>
              <p style={body}>
                StudyLedger has no admissions data, so it will never tell you your chances
                at a university. It scores how well a school matches what you have recorded
                about yourself, says which factors it could and could not compute, and
                stops there.
              </p>
              <p style={body}>
                It also ships no directory of competitions or scholarships. A listing with a
                stale deadline is worse than no listing, because you plan against it. You
                record what you find, with its source, and the system manages the dates and
                chases you when they approach.
              </p>
            </div>
          </div>
        </section>

        <section className="os-measure" style={{ marginBottom: 72 }}>
          <div className="os-card" style={{ padding: "36px 34px" }}>
            <h2 style={{ ...h2, marginTop: 0 }}>Where it is going</h2>
            <p style={{ ...body, marginBottom: 20 }}>
              The long version is a system that stops waiting to be asked — that notices
              your application deadlines are close while your supplementals are untouched,
              and says so before you have thought to check.
            </p>
            <Link href="/journey" className="os-btn" data-variant="primary">
              Open StudyLedger
            </Link>
          </div>
        </section>

        <footer style={{
          borderTop: "1px solid var(--os-line)", paddingTop: 26, paddingBottom: 40,
          display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center",
        }}>
          <span style={{ fontSize: 13, color: "var(--os-ink-4)" }}>
            StudyLedger — built by a student, in Delhi.
          </span>
          <div className="os-row" style={{ marginLeft: "auto", gap: 18 }}>
            <Link href="/" className="os-link">Home</Link>
            <Link href="/os/pricing" className="os-link">Pricing</Link>
            <Link href="/legal/privacy" className="os-link">Privacy</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

const h2: React.CSSProperties = {
  fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em",
  color: "var(--os-ink)", margin: "0 0 12px",
};

const body: React.CSSProperties = {
  fontSize: 15.5, lineHeight: 1.7, color: "var(--os-ink-3)", margin: "0 0 14px",
};
