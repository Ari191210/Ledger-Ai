import Link from "next/link";
import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./landing.css";

import { Spine } from "@/components/landing/spine";
import { Reveal } from "@/components/landing/reveal";
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
// Underneath runs the ledger spine. Four marks accumulate before The Moment
// spends them. The page DEMONSTRATES memory rather than describing it — which
// is the only argument this product can make that a competitor cannot copy by
// rewriting their headline.
//
// This replaces the "Specimen Edition" front page: a masthead, desks and a
// market report. That was the newspaper costume PRODUCT_PRINCIPLES §5 bans by
// name, and which the Console amendment log records as removed for making the
// product feel like a publication instead of an instrument.
//
// GOVERNED BY:
//   §5    banned — no bento, no glass, no gradients, no eyebrows, no columns
//   §6.2  colour is earned — two instances on the entire page
//   §6.5  press · slide · roll · fill — nothing here fades
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
// never use. Latin only here — this page is English marketing copy, and the
// Indic faces exist for student content, which never appears on it.
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

/** One mark per section. The Moment recalls four of them. */
const SECTIONS = 8;

export default function Landing() {
  return (
    <main data-console className={`landing ${sans.variable} ${mono.variable}`}>
      <Spine count={SECTIONS} />

      {/* ── 0 · THESIS ────────────────────────────────────────────────────
          What is this? One statement, one action. The paper is already on the
          page, because it is the subject of everything that follows.        */}
      <section className="landing__section landing__hero" data-spine-index="0">
        <div className="landing__hero-copy">
          <Reveal as="h1">
            <span className="landing__statement">
              Your mistakes are your syllabus.
            </span>
          </Reveal>

          <Reveal delay={90}>
            <p className="landing__lede">
              Every marked paper you photograph becomes a permanent record of
              how you learn — so the mistake you keep repeating stops being
              invisible.
            </p>
          </Reveal>

          <Reveal delay={180}>
            <span className="landing__cta-block">
              <Link href="/onboard" className="cta">
                Start your record
              </Link>
              <span className="cta__note">CBSE CLASS 11 &amp; 12 PHYSICS</span>
            </span>
          </Reveal>
        </div>

        <div className="landing__hero-paper">
          <Paper />
        </div>
      </section>

      {/* ── 1 · LIFECYCLE ─────────────────────────────────────────────────
          Why do I repeat mistakes? Because the evidence is destroyed within a
          week. Four lines; the fourth is the one that hurts.                */}
      <section className="landing__section" data-spine-index="1">
        <div className="landing__measure">
          <Reveal as="h2">
            <span className="landing__statement">A paper has a short life.</span>
          </Reveal>

          <ol className="life">
            {[
              "Your teacher marks it.",
              "You look at the total.",
              "It goes into a bag.",
              "The same mistake comes back in March.",
            ].map((line, i) => (
              <Reveal as="li" key={line} delay={i * 80}>
                <span className={i === 3 ? "life__last" : "landing__quiet"}>
                  {line}
                </span>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 2 · BLIND SPOT ────────────────────────────────────────────────
          Why has nobody fixed it? Every institution around a student remembers
          something — just never the thing that would help.                  */}
      <section className="landing__section" data-spine-index="2">
        <div className="landing__measure">
          <Reveal as="h2">
            <span className="landing__statement">
              Everyone remembers the wrong thing.
            </span>
          </Reveal>

          <div className="ledger-list">
            {[
              ["Schools", "remember marks."],
              ["Coaching", "remembers ranks."],
              ["Boards", "remember one afternoon."],
            ].map(([who, what], i) => (
              <Reveal key={who} delay={i * 80}>
                <span className="ledger-list__row">
                  <span className="ledger-list__who">{who}</span>
                  <span className="landing__quiet">{what}</span>
                </span>
              </Reveal>
            ))}

            <Reveal delay={280}>
              <span className="ledger-list__row ledger-list__row--final">
                <span className="ledger-list__who">Nobody</span>
                <span>remembers how you learn.</span>
              </span>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 3 · THE MOMENT ────────────────────────────────────────────────
          What changes? The page recalls what it has quietly been keeping. The
          centrepiece, and the reason every section above it exists.         */}
      <section
        className="landing__section landing__section--moment"
        data-spine-index="3"
      >
        <Moment />
      </section>

      {/* ── 4 · THE VAULT ─────────────────────────────────────────────────
          Is it permanent? The Moment claims memory; this shows duration — and
          that a gap closes on proof, never on a student saying so.          */}
      <section className="landing__section" data-spine-index="4">
        <div className="landing__measure">
          <Reveal as="h2">
            <span className="landing__statement">Nothing is ever deleted.</span>
          </Reveal>
          <Reveal delay={90}>
            <p className="landing__lede">
              One mistake, across five months. It closes when you prove it —
              not when you decide you understand it.
            </p>
          </Reveal>
        </div>

        <Vault />

        <Reveal delay={140}>
          <p className="specimen specimen--spaced">Specimen record.</p>
        </Reveal>
      </section>

      {/* ── 5 · THE INSTRUMENT ────────────────────────────────────────────
          Is this real? One glimpse, built from the components the app ships —
          not a screenshot and not a render. The roll below is the same Readout
          a student sees on their own score.                                  */}
      <section className="landing__section" data-spine-index="5">
        <div className="landing__measure">
          <Reveal as="h2">
            <span className="landing__statement">
              Then it tells you one thing to do.
            </span>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <span className="instrument">
            <span className="instrument__head">
              <span className="c-label instrument__eyebrow">
                WHAT SHOULD I FIX NEXT
              </span>
            </span>

            <span className="instrument__gap">Sign convention for torque</span>
            <span className="c-micro instrument__meta">
              ROTATIONAL MOTION · 4 OCCURRENCES · 23 MARKS LOST
            </span>

            <span className="instrument__track">
              <Track value={0.34} label="Progress closing this gap" />
            </span>

            <span className="instrument__foot">
              <span className="c-label instrument__eyebrow">LEDGER SCORE</span>
              <span className="instrument__score">
                <Readout value={742} step="figure" from={0} label="742" />
              </span>
            </span>
          </span>
        </Reveal>

        <Reveal delay={200}>
          <p className="specimen specimen--spaced">
            Live components. Specimen figures.
          </p>
        </Reveal>
      </section>

      {/* ── 6 · PARENTS ───────────────────────────────────────────────────
          Can I trust it? A permanent record of everything you got wrong is
          only safe if it can never become a weapon. The contrast IS the
          section — which is why the retired line is struck, not removed.    */}
      <section className="landing__section" data-spine-index="6">
        <div className="landing__measure">
          <Reveal as="h2">
            <span className="landing__statement">
              Your parents see progress.
            </span>
          </Reveal>

          <div className="contrast">
            <Reveal>
              <span className="landing__statement landing__struck">
                What your child got wrong.
              </span>
            </Reveal>
            <Reveal delay={150}>
              <span className="landing__statement">
                What your child is fixing.
              </span>
            </Reveal>
          </div>

          <Reveal delay={240}>
            <p className="landing__lede">
              Marks lost, wrong answers and open gaps are never sent. Not by
              policy — the report is unable to contain them.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 7 · CLOSE ─────────────────────────────────────────────────────
          What now? The thesis returns, now earned. One action, nothing else. */}
      <section
        className="landing__section landing__section--close"
        data-spine-index="7"
      >
        <Reveal as="h2">
          <span className="landing__statement">
            Your mistakes are your syllabus.
          </span>
        </Reveal>

        <Reveal delay={110}>
          <span className="landing__cta-block landing__cta-block--close">
            <Link href="/onboard" className="cta">
              Start your record
            </Link>
          </span>
        </Reveal>

        <Reveal delay={200}>
          <p className="colophon">
            StudyLedger · CBSE Class 11 &amp; 12 Physics ·{" "}
            <Link href="/legal/terms">Terms</Link>
          </p>
        </Reveal>
      </section>
    </main>
  );
}
