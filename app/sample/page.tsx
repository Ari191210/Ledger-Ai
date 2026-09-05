import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Ring } from "@/components/ui/ring";
import { getSampleLedger } from "@/lib/sample-ledger";

const TITLE = "See how the score works";
const OG_TITLE = "See how the score works · StudyLedger";
const DESC =
  "A worked example from a real demo account: logged past papers, mistakes, syllabus and streak, run through the actual StudyLedger scoring engine.";

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

// read the demo account hourly rather than on every request: the page stays
// static and fast, but never drifts from what the account actually holds
export const revalidate = 3600;

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

export default async function SamplePage() {
  const led = await getSampleLedger();

  if (!led) {
    return (
      <main className="mx-auto max-w-5xl px-6">
        <SiteNav />
        <section className="py-20">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-text">
            The worked example is temporarily unavailable.
          </h1>
          <p className="mt-3 max-w-[50ch] text-sm text-text-2">
            This page reads a live demo account and could not reach it just now. Try again
            shortly.
          </p>
          <div className="mt-7">
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

  const { score } = led;
  const weakest = [...score.pillars].sort((a, b) => a.pts / a.max - b.pts / b.max)[0];

  const PILLAR_MATH: Record<string, string> = {
    pyq: `${led.pyqCorrect} correct of ${led.pyqTotal} attempted = ${pct(led.pyqCorrect, led.pyqTotal)}%, of 400`,
    coverage: `${led.syllabusCovered} topics covered of ${led.syllabusTotal} logged = ${pct(led.syllabusCovered, led.syllabusTotal)}%, of 250`,
    mistakes: `${led.mistakesRecent7d} new mistakes in the last 7 days, against a 30 ceiling, of 200`,
    consistency: `${led.streakDays}-day streak against a 14-day target, of 150`,
  };

  return (
    <main className="mx-auto max-w-5xl px-6">
      <SiteNav />

      <section className="py-10 sm:py-14">
        <span className="u-label">worked example · live demo account</span>
        <h1 className="mt-3 max-w-[20ch] text-3xl font-extrabold tracking-[-0.03em] text-text sm:text-4xl">
          This is the whole product, on one page.
        </h1>
        <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-text-2 sm:text-base">
          Everything below is read from a real StudyLedger account and scored by the same
          function the signed-in dashboard calls. Nothing here is written by hand, which
          is why the numbers are not always flattering.
        </p>
      </section>

      {/* ── 1. what was logged ───────────────────────────────── */}
      <section className="border-t border-border py-12 sm:py-14">
        <h2 className="max-w-[22ch] text-2xl font-extrabold tracking-[-0.02em] text-text sm:text-3xl">
          What was logged.
        </h2>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <div className="u-card p-5">
            <span className="u-label">past papers attempted</span>
            <div className="mt-3 divide-y divide-dashed divide-border">
              {led.pyq.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="min-w-0 flex-1 truncate text-xs text-text">
                    {a.subject}
                    <span className="u-mono ml-2 text-2xs text-text-3">{fmtDay(a.takenAt)}</span>
                  </span>
                  <span className="u-mono shrink-0 text-2xs text-text-2">
                    {a.correct}/{a.total}
                  </span>
                </div>
              ))}
            </div>
            <p className="u-mono mt-3 border-t border-border pt-3 text-2xs text-text-3">
              {led.pyqCorrect} correct of {led.pyqTotal} attempted
            </p>
          </div>

          <div className="u-card p-5">
            <span className="u-label">mistakes logged</span>
            <div className="mt-3 divide-y divide-dashed divide-border">
              {led.topMistakes.map((m) => (
                <div key={`${m.subject}-${m.topic}`} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
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
              {led.mistakesTotal} total, {led.mistakesOpen} still open,{" "}
              {led.mistakesRecent7d} in the last 7 days
            </p>
          </div>

          <div className="u-card flex items-center justify-between p-5">
            <span className="u-label">syllabus covered</span>
            <span className="u-mono text-sm text-text-2">
              {led.syllabusCovered} of {led.syllabusTotal} topics
            </span>
          </div>

          <div className="u-card flex items-center justify-between p-5">
            <span className="u-label">study time</span>
            <span className="u-mono text-sm text-text-2">
              {Math.round(led.minutesLogged / 60)}h across {led.activeDays} days
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

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5">
            <span className="u-label">total</span>
            <span className="u-mono text-lg font-bold text-text">
              {score.pillars.map((p) => p.pts).join(" + ")} = {score.total}
            </span>
          </div>
        </div>

        {led.streakDays === 0 && (
          <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-text-2">
            Consistency is sitting at <span className="u-mono text-text">0</span> because
            this account has not logged a session today
            {led.lastLoggedDay ? ` (last one was ${fmtDay(led.lastLoggedDay)})` : ""}. The
            streak resets the moment a day is missed, and the score drops with it. That is
            the point: it measures what you did, not what you meant to do.
          </p>
        )}
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
              <span className="text-text">{weakest.label}</span> at {weakest.pts} of{" "}
              {weakest.max}, so that is where the next session should go.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. what it says to do ────────────────────────────── */}
      <section className="border-t border-border py-12 sm:py-14">
        <h2 className="max-w-[24ch] text-2xl font-extrabold tracking-[-0.02em] text-text sm:text-3xl">
          What it actually says to do.
        </h2>
        <p className="mt-3 max-w-[54ch] text-sm leading-relaxed text-text-2">
          Fix Next ranks logged mistakes by how often the same topic keeps coming back, so
          the list is ordered by evidence rather than by feeling.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {led.topMistakes.map((m) => (
            <div key={`${m.subject}-${m.topic}`} className="u-card flex flex-col justify-between p-4">
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
          read live from a demo account · your own account shows your papers and topics
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
