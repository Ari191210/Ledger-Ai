import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Ring } from "@/components/ui/ring";
import { computeScore } from "@/lib/score/compute";

const TITLE = "See how the score works";
const OG_TITLE = "See how the score works · StudyLedger";
const DESC =
  "A worked example: one student's logged past papers, mistakes, syllabus and streak, run through the real StudyLedger scoring engine.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/sample" },
  openGraph: {
    type: "website",
    url: "/sample",
    siteName: "StudyLedger",
    title: OG_TITLE,
    description: DESC,
  },
  twitter: { card: "summary_large_image", title: OG_TITLE, description: DESC },
};

// ── the sample student's raw log ─────────────────────────────────────
// Illustrative figures, but they are the only inputs used below: the score
// on this page is produced by the same computeScore() the product runs.
const LOG = {
  pyqAttempts: [
    { paper: "CBSE 2023 Physics, Set 1", attempted: 35, correct: 26 },
    { paper: "CBSE 2022 Physics, Set 2", attempted: 35, correct: 24 },
    { paper: "CBSE 2023 Chemistry, Set 1", attempted: 35, correct: 29 },
    { paper: "CBSE 2022 Maths, Set 1", attempted: 38, correct: 25 },
  ],
  mistakes: [
    { subject: "physics", topic: "Rotational Motion", count: 6 },
    { subject: "chemistry", topic: "Chemical Bonding", count: 4 },
    { subject: "maths", topic: "Definite Integrals", count: 3 },
    { subject: "physics", topic: "Thermodynamics", count: 2 },
  ],
  mistakesRecent7d: 7,
  syllabusTotal: 140,
  syllabusCovered: 105,
  streakDays: 16,
  hoursLogged: 41,
};

const pyqTotal = LOG.pyqAttempts.reduce((s, a) => s + a.attempted, 0);
const pyqCorrect = LOG.pyqAttempts.reduce((s, a) => s + a.correct, 0);
const mistakesEverLogged = LOG.mistakes.reduce((s, m) => s + m.count, 0);

// the real engine, same function the signed-in dashboard calls
const score = computeScore({
  pyqTotal,
  pyqCorrect,
  syllabusTotal: LOG.syllabusTotal,
  syllabusCovered: LOG.syllabusCovered,
  mistakesEverLogged,
  mistakesRecent7d: LOG.mistakesRecent7d,
  streakDays: LOG.streakDays,
});

const PILLAR_MATH: Record<string, string> = {
  pyq: `${pyqCorrect} correct of ${pyqTotal} attempted = ${Math.round((pyqCorrect / pyqTotal) * 100)}%, of 400`,
  coverage: `${LOG.syllabusCovered} topics covered of ${LOG.syllabusTotal} logged = ${Math.round((LOG.syllabusCovered / LOG.syllabusTotal) * 100)}%, of 250`,
  mistakes: `${LOG.mistakesRecent7d} new mistakes in 7 days, against a 30 ceiling, of 200`,
  consistency: `${LOG.streakDays}-day streak against a 14-day target, capped, of 150`,
};

export default function SamplePage() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <SiteNav />

      <section className="py-10 sm:py-14">
        <span className="u-label">worked example</span>
        <h1 className="mt-3 max-w-[20ch] text-3xl font-extrabold tracking-[-0.03em] text-text sm:text-4xl">
          This is the whole product, on one page.
        </h1>
        <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-text-2 sm:text-base">
          Below is a sample Class 12 CBSE student&apos;s log, the exact arithmetic
          StudyLedger runs on it, the score that comes out, and what it tells them to do
          next. The numbers are illustrative, but they are not mocked up: this page calls
          the same scoring function the signed-in dashboard uses, so what you see is what
          it would compute.
        </p>
      </section>

      {/* ── 1. what they logged ──────────────────────────────── */}
      <section className="border-t border-border py-12 sm:py-14">
        <h2 className="max-w-[22ch] text-2xl font-extrabold tracking-[-0.02em] text-text sm:text-3xl">
          What they logged.
        </h2>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <div className="u-card p-5">
            <span className="u-label">past papers attempted</span>
            <div className="mt-3 divide-y divide-dashed divide-border">
              {LOG.pyqAttempts.map((a) => (
                <div key={a.paper} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="min-w-0 flex-1 truncate text-xs text-text">{a.paper}</span>
                  <span className="u-mono shrink-0 text-2xs text-text-2">
                    {a.correct}/{a.attempted}
                  </span>
                </div>
              ))}
            </div>
            <p className="u-mono mt-3 border-t border-border pt-3 text-2xs text-text-3">
              {pyqCorrect} correct of {pyqTotal} attempted
            </p>
          </div>

          <div className="u-card p-5">
            <span className="u-label">mistakes logged</span>
            <div className="mt-3 divide-y divide-dashed divide-border">
              {LOG.mistakes.map((m) => (
                <div key={m.topic} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-text">{m.topic}</p>
                    <p className="u-label mt-0.5">{m.subject}</p>
                  </div>
                  <span className="u-stat-number shrink-0 text-sm text-accent-strong">
                    {String(m.count).padStart(2, "0")}
                  </span>
                </div>
              ))}
            </div>
            <p className="u-mono mt-3 border-t border-border pt-3 text-2xs text-text-3">
              {mistakesEverLogged} total, {LOG.mistakesRecent7d} in the last 7 days
            </p>
          </div>

          <div className="u-card flex items-center justify-between p-5">
            <span className="u-label">syllabus covered</span>
            <span className="u-mono text-sm text-text-2">
              {LOG.syllabusCovered} of {LOG.syllabusTotal} topics
            </span>
          </div>

          <div className="u-card flex items-center justify-between p-5">
            <span className="u-label">study streak</span>
            <span className="u-mono text-sm text-text-2">
              {LOG.streakDays} days · {LOG.hoursLogged}h logged
            </span>
          </div>
        </div>
      </section>

      {/* ── 2. the arithmetic ────────────────────────────────── */}
      <section className="border-t border-border py-12 sm:py-14">
        <h2 className="max-w-[22ch] text-2xl font-extrabold tracking-[-0.02em] text-text sm:text-3xl">
          The arithmetic, in full.
        </h2>
        <p className="mt-3 max-w-[54ch] text-sm leading-relaxed text-text-2">
          Four weighted pillars. No hidden adjustments, no engagement multiplier.
        </p>

        <div className="mt-6 u-card p-5 sm:p-6">
          <div className="space-y-5">
            {score.pillars.map((p) => (
              <div key={p.key}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-sm font-semibold text-text">
                    {p.label} <span className="u-mono text-2xs text-text-3">{p.weight}</span>
                  </span>
                  <span className="u-mono text-sm text-text-2">
                    {p.pts}
                    <span className="text-text-3">/{p.max}</span>
                  </span>
                </div>
                <p className="u-mono mt-1 text-2xs text-text-3">{PILLAR_MATH[p.key]}</p>
                <div className="mt-2 h-1 bg-surface-3">
                  <div className="h-full bg-accent" style={{ width: `${(p.pts / p.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
            <span className="u-label">total</span>
            <span className="u-mono text-lg font-bold text-text">
              {score.pillars.map((p) => p.pts).join(" + ")} = {score.total}
            </span>
          </div>
        </div>
      </section>

      {/* ── 3. the score ─────────────────────────────────────── */}
      <section className="border-t border-border py-12 sm:py-14">
        <h2 className="max-w-[22ch] text-2xl font-extrabold tracking-[-0.02em] text-text sm:text-3xl">
          The number that comes out.
        </h2>

        <div className="mt-6 u-card flex flex-col items-center gap-7 p-6 sm:flex-row sm:gap-9 sm:p-8">
          <Ring value={score.total} max={score.max} size={148} stroke={12} color="var(--accent-strong)">
            <div>
              <div className="u-stat-number text-4xl leading-none">{score.total}</div>
              <div className="u-mono text-2xs text-text-3">/{score.max}</div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-lg font-bold text-text">{score.tier}</p>
            <p className="u-mono mt-1 text-2xs text-text-3">
              {score.nextTier
                ? `${score.nextTier.at - score.total} points to ${score.nextTier.label.toLowerCase()}`
                : "top tier"}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-text-2">
              The weakest pillar is the one to work on. Here that is{" "}
              <span className="text-text">
                {[...score.pillars].sort((a, b) => a.pts / a.max - b.pts / b.max)[0].label}
              </span>
              , which is why the shortlist below leads with it.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. what it says to do ────────────────────────────── */}
      <section className="border-t border-border py-12 sm:py-14">
        <h2 className="max-w-[24ch] text-2xl font-extrabold tracking-[-0.02em] text-text sm:text-3xl">
          What it actually tells them to do.
        </h2>
        <p className="mt-3 max-w-[54ch] text-sm leading-relaxed text-text-2">
          Fix Next ranks open mistakes by how often the same topic keeps coming back, so
          the list is ordered by evidence rather than by feeling.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {LOG.mistakes.map((m) => (
            <div key={m.topic} className="u-card flex flex-col justify-between p-4">
              <div className="flex items-start justify-between">
                <span className="u-stat-number text-sm text-accent-strong">
                  {String(m.count).padStart(2, "0")}
                </span>
                <ArrowUpRight size={13} className="text-text-3" />
              </div>
              <div className="mt-6">
                <p className="text-xs font-semibold text-text">{m.topic}</p>
                <p className="u-label mt-0.5">{m.subject}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="u-mono mt-5 text-2xs text-text-3">
          sample data · a real account shows your own papers, mistakes and topics
        </p>
      </section>

      {/* ── cta ──────────────────────────────────────────────── */}
      <section className="border-t border-border py-14 text-center sm:py-16">
        <h2 className="mx-auto max-w-[22ch] text-2xl font-extrabold tracking-[-0.03em] text-text sm:text-3xl">
          Your ledger starts empty, and that is the point.
        </h2>
        <p className="mx-auto mt-3 max-w-[46ch] text-sm leading-relaxed text-text-2">
          Log one past paper and you get your first real number today.
        </p>
        <div className="mt-7 flex justify-center">
          <Link href="/login">
            <Button size="lg">
              Start your ledger <ArrowRight size={15} />
            </Button>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
