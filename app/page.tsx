import Link from "next/link";
import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./landing.css";

import { SpineTracker } from "@/components/landing/spine";
import { Paper } from "@/components/landing/paper";
import { Moment } from "@/components/landing/moment";
import { Vault } from "@/components/landing/vault";
import Readout from "@/components/console/readout";
import Track from "@/components/console/track";

// ═══════════════════════════════════════════════════════════════════════════
// THE LANDING PAGE
//
// One paper, followed all the way down.
//
// Not eight sections about a product — one marked Physics paper entering at the
// top and becoming memory by the bottom. Every section exists because the
// previous one demanded it: the paper's death creates the problem, the problem
// needs a villain, the villain demands a counter-example, the counter-example
// claims permanence, permanence has to be shown once, and a permanent record
// raises the question of who else can see it.
//
// Underneath runs the ledger spine. Marks accumulate as sections are reached,
// and The Moment spends them. The page DEMONSTRATES memory rather than
// describing it — the one argument here a competitor cannot copy by rewriting
// a headline.
//
// EVERYTHING RENDERS WITHOUT JAVASCRIPT. Motion is scroll-driven CSS behind an
// @supports gate, and every animated element rests at its final state. Two
// client components remain: the rolling figure, and the monotonic spine.
//
// GOVERNED BY:
//   §5    banned — no bento, no glass, no gradients, no eyebrows, no columns
//   §6.2  colour is earned — two instances on the entire page
//   §6.5  press · slide · roll · fill — nothing here fades
//   §6.6  controls have rest, hover, press and focus states
//   §9.1  strip every colour and it must still work
//   law 5 numbers are the heroes
//   law 7 never lie — every figure is a labelled specimen
// ═══════════════════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title: "StudyLedger — Your mistakes are your syllabus",
  description:
    "Every marked paper you photograph becomes a permanent record of how you learn — so the mistake you keep repeating stops being invisible, and you always know what to fix next.",
};

// The Console faces, scoped to this route for the same reason app/console
// scopes them to its own: the 46 legacy routes must not download families they
// never use. Latin only — this page is English marketing copy, and the Indic
// faces exist for student content, which never appears on it.
//
// Without these, `--console-sans` and `--console-mono` are undefined outside
// /console and the page silently falls back to system-ui. On a page where
// typography carries the entire hierarchy, that is a defect, not a nuance.
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--console-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--console-mono",
  display: "swap",
});

/** The ledger mark for one section. Struck by SpineTracker when reached. */
function Mark() {
  return <span className="spine__mark" aria-hidden="true" />;
}

export default function Landing() {
  return (
    <main data-console className={`landing ${sans.variable} ${mono.variable}`}>
      <SpineTracker />

      {/* ── 0 · THESIS ────────────────────────────────────────────────────
          What is this? One statement, one action. The paper is already on the
          page, because it is the subject of everything that follows.        */}
      <section className="landing__section landing__hero" data-spine-index="0">
        <Mark />
        <div className="landing__hero-copy">
          <h1 className="reveal">
            <span className="landing__statement">
              Your mistakes are your syllabus.
            </span>
          </h1>

          <div className="reveal" style={{ "--i": 1 } as React.CSSProperties}>
            <p className="landing__lede">
              Every marked paper you photograph becomes a permanent record of
              how you learn — so the mistake you keep repeating stops being
              invisible.
            </p>
          </div>

          <div className="reveal" style={{ "--i": 2 } as React.CSSProperties}>
            <span className="landing__cta-block">
              <Link href="/onboard" className="cta">
                Start your record
              </Link>
              <span className="cta__note">CBSE CLASS 11 &amp; 12 PHYSICS</span>
            </span>
          </div>
        </div>

        <div className="landing__hero-paper">
          <Paper />
        </div>
      </section>

      {/* ── 1 · LIFECYCLE ─────────────────────────────────────────────────
          Why do I repeat mistakes? Because the evidence is destroyed within a
          week. Four lines; the fourth is the one that hurts.                */}
      <section className="landing__section" data-spine-index="1">
        <Mark />
        <div className="landing__measure">
          <h2 className="reveal">
            <span className="landing__statement">A paper has a short life.</span>
          </h2>

          <ol className="life">
            {[
              "Your teacher marks it.",
              "You look at the total.",
              "It goes into a bag.",
              "The same mistake comes back in March.",
            ].map((line, i) => (
              <li
                className="reveal"
                key={line}
                style={{ "--i": i + 1 } as React.CSSProperties}
              >
                <span className={i === 3 ? "life__last" : "landing__quiet"}>
                  {line}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 2 · BLIND SPOT ────────────────────────────────────────────────
          Why has nobody fixed it? Every institution around a student remembers
          something — just never the thing that would help.                  */}
      <section className="landing__section" data-spine-index="2">
        <Mark />
        <div className="landing__measure">
          <h2 className="reveal">
            <span className="landing__statement">
              Everyone remembers the wrong thing.
            </span>
          </h2>

          <div className="ledger-list">
            {[
              ["Schools", "remember marks."],
              ["Coaching", "remembers ranks."],
              ["Boards", "remember one afternoon."],
            ].map(([who, what], i) => (
              <p
                className="reveal"
                key={who}
                style={{ "--i": i + 1 } as React.CSSProperties}
              >
                <span className="ledger-list__row">
                  <span className="ledger-list__who">{who}</span>
                  <span className="landing__quiet">{what}</span>
                </span>
              </p>
            ))}

            <p className="reveal" style={{ "--i": 4 } as React.CSSProperties}>
              <span className="ledger-list__row ledger-list__row--final">
                <span className="ledger-list__who">Nobody</span>
                <span>remembers how you learn.</span>
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ── 3 · THE MOMENT ────────────────────────────────────────────────
          What changes? The page recalls what it has quietly been keeping. The
          centrepiece, and the reason every section above it exists.

          The heading is visually hidden because the design states it far more
          powerfully than a heading could — but the narrative climax must still
          exist in the document outline, or a reader navigating by heading
          skips the product's central claim entirely.                        */}
      <section
        className="landing__section landing__section--moment"
        data-spine-index="3"
      >
        <Mark />
        <h2 className="vh">You have made this same mistake four times.</h2>
        <Moment />
      </section>

      {/* ── 4 · THE VAULT ─────────────────────────────────────────────────
          Is it permanent? The Moment claims memory; this shows duration — and
          that a gap closes on proof, never on a student saying so.          */}
      <section className="landing__section" data-spine-index="4">
        <Mark />
        <div className="landing__measure">
          <h2 className="reveal">
            <span className="landing__statement">Nothing is ever deleted.</span>
          </h2>
          <div className="reveal" style={{ "--i": 1 } as React.CSSProperties}>
            <p className="landing__lede">
              One mistake, across five months. It closes when you prove it —
              not when you decide you understand it.
            </p>
          </div>
        </div>

        <Vault />

        <p className="specimen specimen--spaced">Specimen record.</p>
      </section>

      {/* ── 5 · THE INSTRUMENT ────────────────────────────────────────────
          Is this real? One glimpse, built from the components the app ships —
          not a screenshot and not a render. The roll below is the same Readout
          a student sees on their own score.                                  */}
      <section className="landing__section" data-spine-index="5">
        <Mark />
        <div className="landing__measure">
          <h2 className="reveal">
            <span className="landing__statement">
              Then it tells you one thing to do.
            </span>
          </h2>
        </div>

        <div className="reveal" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="instrument">
            <div className="instrument__head">
              <span className="c-label instrument__eyebrow">
                WHAT SHOULD I FIX NEXT
              </span>
            </div>

            <p className="instrument__gap">Sign convention for torque</p>
            <p className="c-micro instrument__meta">
              ROTATIONAL MOTION · 4 OCCURRENCES · 23 MARKS LOST
            </p>

            <div className="instrument__track">
              <Track value={0.34} label="Progress closing this gap" />
            </div>

            <div className="instrument__foot">
              <span className="c-label instrument__eyebrow">LEDGER SCORE</span>
              <span className="instrument__score">
                <Readout value={742} step="figure" from={0} label="742" />
              </span>
            </div>
          </div>
        </div>

        <p className="specimen specimen--spaced">
          Live components. Specimen figures.
        </p>
      </section>

      {/* ── 6 · PARENTS ───────────────────────────────────────────────────
          Can I trust it? A permanent record of everything you got wrong is
          only safe if it can never become a weapon. The contrast IS the
          section — which is why the retired line is struck, not removed.    */}
      <section className="landing__section" data-spine-index="6">
        <Mark />
        <div className="landing__measure">
          <h2 className="reveal">
            <span className="landing__statement">
              Your parents see progress.
            </span>
          </h2>

          <div className="contrast">
            <p className="reveal" style={{ "--i": 1 } as React.CSSProperties}>
              <span className="landing__statement landing__struck">
                What your child got wrong.
              </span>
            </p>
            <p className="reveal" style={{ "--i": 2 } as React.CSSProperties}>
              <span className="landing__statement">
                What your child is fixing.
              </span>
            </p>
          </div>

          <div className="reveal" style={{ "--i": 3 } as React.CSSProperties}>
            <p className="landing__lede">
              Marks lost, wrong answers and open gaps are never sent. Not by
              policy — the report is unable to contain them.
            </p>
          </div>
        </div>
      </section>

      {/* ── 7 · CLOSE ─────────────────────────────────────────────────────
          What now? The thesis returns, now earned. One action, nothing else. */}
      <section
        className="landing__section landing__section--close"
        data-spine-index="7"
      >
        <Mark />
        <h2 className="reveal">
          <span className="landing__statement">
            Your mistakes are your syllabus.
          </span>
        </h2>

        <div className="reveal" style={{ "--i": 1 } as React.CSSProperties}>
          <span className="landing__cta-block">
            <Link href="/onboard" className="cta">
              Start your record
            </Link>
          </span>
        </div>

        <p className="colophon">
          StudyLedger · CBSE Class 11 &amp; 12 Physics ·{" "}
          <Link href="/legal/terms">Terms</Link>
        </p>
      </section>
    </main>
  );
}
