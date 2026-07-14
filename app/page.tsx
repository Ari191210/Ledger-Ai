import Link from "next/link";
import type { Metadata } from "next";
import { EditorialShell } from "@/components/editorial/shell";
import { Masthead, EditionBar, SectionStrip } from "@/components/editorial/masthead";
import { IndexReport, Sparkline } from "@/components/editorial/index-report";
import { buildMarketReport, type ScoreSnapshot } from "@/lib/score-market";
import { DESKS, SECTIONS, desksBySection, NAV_SECTIONS } from "@/lib/desks";

export const metadata: Metadata = {
  title: "StudyLedger | The Daily Intelligence System For Students",
  description:
    "Your academic performance, tracked and analysed like a public company. One Academic Performance Index out of 1,000, moved by every past paper, every session, every mistake — with the movement, momentum and sector analysis to explain it.",
};

// ═══════════════════════════════════════════════════════════════════════════
// THE FRONT PAGE
//
// A visitor has no account, therefore no index, therefore no track record.
//
// The obvious move is to invent one — print "842" and a rising chart and hope
// nobody asks. This product has already had one purge of fabricated stats and
// fake testimonials, and it is not doing that again: the moment a reader learns
// a number was decoration, every OTHER number in the product becomes suspect,
// and the entire premise here is that the figures can be trusted.
//
// So the front page is a SPECIMEN EDITION — a real publishing convention: the
// sample copy a paper prints to show what a subscriber receives. It is labelled
// as such in the masthead bar and again beneath the chart. It demonstrates the
// form without claiming to be anyone's actual record.
// ═══════════════════════════════════════════════════════════════════════════

const SPECIMEN: ScoreSnapshot[] = (() => {
  // A plausible fortnight for a Class 11 student who has just started logging
  // past papers. Deliberately not a clean rocket: it dips on day 9 (a bad
  // paper), because a chart that only goes up is the first thing that reads as
  // marketing rather than as data.
  const shape = [
    { d: 13, t: 612, pqa: 214, syl: 180, mis: 158, con: 60 },
    { d: 12, t: 618, pqa: 218, syl: 180, mis: 160, con: 60 },
    { d: 11, t: 640, pqa: 232, syl: 190, mis: 158, con: 60 },
    { d: 10, t: 651, pqa: 238, syl: 190, mis: 156, con: 67 },
    { d:  9, t: 634, pqa: 226, syl: 190, mis: 143, con: 75 },
    { d:  8, t: 658, pqa: 240, syl: 196, mis: 147, con: 75 },
    { d:  7, t: 671, pqa: 248, syl: 201, mis: 147, con: 75 },
    { d:  6, t: 690, pqa: 258, syl: 208, mis: 152, con: 72 },
    { d:  5, t: 704, pqa: 266, syl: 210, mis: 156, con: 72 },
    { d:  4, t: 722, pqa: 276, syl: 214, mis: 157, con: 75 },
    { d:  3, t: 741, pqa: 288, syl: 218, mis: 153, con: 82 },
    { d:  2, t: 768, pqa: 302, syl: 224, mis: 160, con: 82 },
    { d:  1, t: 799, pqa: 318, syl: 232, mis: 159, con: 90 },
    { d:  0, t: 842, pqa: 344, syl: 240, mis: 161, con: 97 },
  ];
  return shape.map(s => {
    const dt = new Date();
    dt.setDate(dt.getDate() - s.d);
    return {
      captured_on: dt.toISOString().slice(0, 10),
      total: s.t, pqa: s.pqa, syllabus: s.syl, mistakes: s.mis, consistency: s.con,
      streak: Math.max(0, 13 - s.d), papers_count: 14 - s.d, recent_mistakes: 6,
    };
  });
})();

const TICKER = [
  "EXAMINATION +26 SESSION",
  "COVERAGE +8 SESSION",
  "RISK −2 SESSION",
  "MOMENTUM +7 SESSION",
  "STREAK 13 DAYS",
  "PAPERS LOGGED 14",
  "INDEX AT ALL-TIME HIGH",
];

export default function FrontPage() {
  const report = buildMarketReport(SPECIMEN);

  // <EditorialShell> emits data-ui="editorial" — the marker every rule in
  // app/editorial.css is scoped beneath. Without it this page would render with
  // the legacy design system, exactly as the other 46 routes still do.
  // This route is listed in lib/editorial-routes.ts, which is also what tells
  // <LegacyChrome /> not to mount the cursor, shader and gradient here.
  return (
    <EditorialShell>
    <main id="main-content">
      <div className="ed-page">
        <Masthead />
        <EditionBar specimen />
        <SectionStrip items={NAV_SECTIONS} />
      </div>

      {/* ── The ticker band ───────────────────────────────────────────────── */}
      <div className="ed-ticker" style={{ marginTop: 0 }} aria-hidden="true">
        <div className="ed-ticker__track">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="ed-ticker__item">{t}</span>
          ))}
        </div>
      </div>

      <div className="ed-page">
        {/* ── The lead ───────────────────────────────────────────────────── */}
        <div
          className="ed-grid ed-fade"
          style={{ paddingTop: 34, paddingBottom: 40 }}
        >
          <div style={{ gridColumn: "span 8" }} className="lead-col">
            <IndexReport report={report} />

            <p
              className="ed-byline"
              style={{
                marginTop: 20,
                paddingTop: 12,
                borderTop: "1px solid var(--rule-2)",
              }}
            >
              Specimen edition. The figures above illustrate the form of the report —
              they are not a real student&apos;s record, and no such student exists.
              Your own index begins at your first close.
            </p>
          </div>

          {/* The editorial sidebar — what the paper actually is. */}
          <aside style={{ gridColumn: "span 4" }} className="ed-rule-left side-col">
            <div className="ed-section-head">
              <h2 className="ed-headline--section" style={{ margin: 0 }}>Leader</h2>
              <span className="ed-kicker">Opinion</span>
            </div>

            <div className="ed-body" style={{ fontSize: 16 }}>
              <p>
                A student is judged, in the end, by a number. Every school in the
                country reports it far too late to be useful — after the paper, after
                the year, after anything can be done about it.
              </p>
              <p>
                StudyLedger reports it every day. The Academic Performance Index is
                a single figure out of 1,000, built from four sectors: how you score
                on past papers, how much of the specification you have covered, how
                fast you clear your mistakes, and whether you actually turn up.
              </p>
              <p>
                It moves. That is the point. A score that only tells you where you
                stand is a verdict; a score that tells you which way you are
                travelling, and what moved it, is an instrument.
              </p>
            </div>

            <blockquote className="ed-pullquote">
              Treat your revision like a position you are managing, not a chore you
              are enduring.
            </blockquote>

            <Link
              href="/auth"
              className="ed-kicker"
              style={{
                display: "inline-block",
                marginTop: 4,
                padding: "11px 20px",
                border: "1px solid var(--ink)",
                color: "var(--ink)",
                textDecoration: "none",
                letterSpacing: "0.17em",
              }}
            >
              Open your ledger →
            </Link>
          </aside>
        </div>

        {/* ── How the index is built ─────────────────────────────────────── */}
        <section style={{ paddingBottom: 44 }}>
          <div className="ed-section-head">
            <h2 className="ed-headline--section" style={{ margin: 0 }}>
              How the index is calculated
            </h2>
            <span className="ed-kicker">Methodology</span>
          </div>

          <div className="ed-grid">
            {[
              { n: "400", k: "Examination", d: "Past-paper accuracy, weighted by how many sessions you have logged. The heaviest sector, because it is the only one that measures performance under exam conditions." },
              { n: "250", k: "Coverage",    d: "How much of your actual specification you have worked through — measured against the syllabus you upload, not a generic curriculum." },
              { n: "200", k: "Risk",        d: "How quickly you clear mistakes. Errors left unresolved in the last seven days drag the index down; this is the only sector that falls on its own." },
              { n: "150", k: "Momentum",    d: "Consistency. Turning up is worth points, and the run is worth more than any single day of it." },
            ].map((s, i) => (
              <div key={s.k} style={{ gridColumn: "span 3" }} className={i > 0 ? "ed-rule-left" : ""}>
                <div className="ed-figure" style={{ fontSize: 34, fontWeight: 700 }}>{s.n}</div>
                <div className="ed-kicker" style={{ margin: "6px 0 8px" }}>{s.k}</div>
                <p style={{ margin: 0, fontSize: 15, color: "var(--ink-2)", lineHeight: 1.5 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── The desks ──────────────────────────────────────────────────── */}
        <section style={{ paddingBottom: 48 }}>
          <div className="ed-section-head">
            <h2 className="ed-headline--section" style={{ margin: 0 }}>The desks</h2>
            <span className="ed-kicker">{DESKS.length} departments</span>
          </div>

          <div className="ed-grid">
            {SECTIONS.map((section, si) => (
              <div
                key={section}
                style={{ gridColumn: "span 4", marginBottom: 26 }}
                className={si % 3 !== 0 ? "ed-rule-left" : ""}
              >
                <h3
                  className="ed-kicker"
                  style={{
                    margin: "0 0 12px",
                    paddingBottom: 7,
                    borderBottom: "1px solid var(--ink)",
                    color: "var(--ink)",
                  }}
                >
                  {section}
                </h3>

                {desksBySection(section).map(d => (
                  <article key={d.href} style={{ marginBottom: 15 }}>
                    <Link href={d.href} className="ed-link" style={{ fontWeight: 600, fontSize: 16 }}>
                      {d.name}
                    </Link>
                    <p style={{ margin: "3px 0 0", fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.45 }}>
                      {d.brief}
                    </p>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ── Subscribe ──────────────────────────────────────────────────── */}
        <section
          className="ed-rule-heavy"
          style={{ paddingTop: 22, paddingBottom: 56 }}
        >
          <div className="ed-grid">
            <div style={{ gridColumn: "span 7" }}>
              <h2 className="ed-headline" style={{ margin: "0 0 12px" }}>
                Your first close is one past paper away.
              </h2>
              <p className="ed-standfirst" style={{ margin: "0 0 22px" }}>
                The index opens the moment you log a session. Movement and sector
                analysis begin at the second — from there the ledger keeps its own
                record, and you stop guessing how ready you are.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link
                  href="/auth"
                  className="ed-kicker"
                  style={{
                    padding: "13px 26px",
                    background: "var(--ink)",
                    color: "var(--paper)",
                    textDecoration: "none",
                    letterSpacing: "0.17em",
                  }}
                >
                  Open your ledger
                </Link>
                <Link
                  href="/pricing"
                  className="ed-kicker"
                  style={{
                    padding: "13px 26px",
                    border: "1px solid var(--ink)",
                    color: "var(--ink)",
                    textDecoration: "none",
                    letterSpacing: "0.17em",
                  }}
                >
                  Subscription rates
                </Link>
              </div>
            </div>

            <div style={{ gridColumn: "span 5" }} className="ed-rule-left">
              <div className="ed-kicker" style={{ marginBottom: 10 }}>Specimen · 14 sessions</div>
              <Sparkline series={report.series} height={110} />
              <p className="ed-byline" style={{ marginTop: 10 }}>
                Note the fall on session five. A real index does not only rise, and a
                chart that did would be worth nothing to you.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ── Colophon ─────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid var(--ink)",
          background: "var(--paper-2)",
          padding: "26px 0 34px",
        }}
      >
        <div className="ed-page" style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div className="ed-kicker" style={{ color: "var(--ink)" }}>StudyLedger</div>
            <p className="ed-byline" style={{ margin: "6px 0 0" }}>
              Published daily from Delhi. Founded by a student, for students.
            </p>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <Link href="/pricing"       className="ed-dateline" style={{ textDecoration: "none" }}>Rates</Link>
            <Link href="/faq"           className="ed-dateline" style={{ textDecoration: "none" }}>Questions</Link>
            <Link href="/legal/privacy" className="ed-dateline" style={{ textDecoration: "none" }}>Privacy</Link>
            <Link href="/legal/terms"   className="ed-dateline" style={{ textDecoration: "none" }}>Terms</Link>
          </div>
        </div>
      </footer>

      {/* Column behaviour on a phone: the front page keeps its hierarchy, it
          does not become a stack of equal cards. */}
      <style>{`
        @media (max-width: 900px) {
          .lead-col, .side-col { grid-column: span 12 !important; }
          .side-col { margin-top: 30px; }
          .ed-grid > [style*="span 3"],
          .ed-grid > [style*="span 4"],
          .ed-grid > [style*="span 5"],
          .ed-grid > [style*="span 7"],
          .ed-grid > [style*="span 8"] { grid-column: span 12 !important; }
        }
        @media (max-width: 760px) {
          .ed-grid > [style*="span 3"],
          .ed-grid > [style*="span 4"],
          .ed-grid > [style*="span 5"],
          .ed-grid > [style*="span 7"],
          .ed-grid > [style*="span 8"],
          .lead-col, .side-col { grid-column: span 4 !important; }
        }
      `}</style>
    </main>
    </EditorialShell>
  );
}
