import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SignatureShowcase } from "@/components/marketing/signature-showcase";
import { HeroInstrument } from "@/components/marketing/hero-instrument";
import { ScrollReveal, ScrollGroup, ScrollItem } from "@/components/motion/scroll-reveal";
import { CountUp } from "@/components/motion/count-up";
import { CATEGORIES } from "@/lib/tools/registry";
import { BOARDS } from "@/lib/onboarding";

export const metadata: Metadata = {
  title: "StudyLedger — know where you stand, know what to fix next",
  description:
    "One honest score built from your real PYQs, syllabus coverage, mistakes, and consistency, plus 25 tools to act on it. Built for CBSE, ICSE, IB, IGCSE, State Board, and home school.",
};

const PILLARS = [
  { n: 40, label: "pyq accuracy", note: "Correct vs attempted on real past papers, last 30 days." },
  { n: 25, label: "syllabus coverage", note: "Topics you've actually marked covered, out of everything logged." },
  { n: 20, label: "mistake velocity", note: "Fewer new mistakes in the last 7 days scores higher." },
  { n: 15, label: "consistency", note: "Your current study streak, against a 14-day target." },
];

const TIERS = [
  { label: "Beginner", at: 0 },
  { label: "Building", at: 200 },
  { label: "Developing", at: 400 },
  { label: "Strong", at: 600 },
  { label: "Exam Ready", at: 800 },
];

const STEPS = [
  { k: "log", t: "Log what you already do", b: "Past-paper attempts, mistakes, study time, syllabus. A few taps, or the Quick Log from any page." },
  { k: "score", t: "Get one honest number", b: "Four weighted pillars roll into a single 0–1000 score and a tier. No vanity metrics, no streak confetti." },
  { k: "act", t: "Work the shortlist", b: "Fix Next, Spaced Review, Debt Meter and 22 more tools turn the score into a specific thing to do today." },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <SiteNav />

      {/* ── hero ───────────────────────────────────────────── */}
      <section className="grid items-center gap-10 pb-14 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-16 lg:pt-10">
        <ScrollReveal y={20}>
          <span className="u-label">academic instrument · built for India</span>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.03] tracking-[-0.03em] text-text sm:text-5xl lg:text-[3.75rem]">
            Know where you stand.
            <span className="block text-accent-strong">Know what to fix next.</span>
          </h1>
          <p className="mt-5 max-w-[46ch] text-sm leading-relaxed text-text-2 sm:text-base">
            Every past paper, every mistake, every hour you study — folded into one honest
            score, and one shortlist of what to do about it. 25 tools, no fluff.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/login">
              <Button size="lg">
                Start your ledger <ArrowRight size={15} />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary">
                See a live score
              </Button>
            </Link>
          </div>
          <p className="u-mono mt-4 text-2xs text-text-3">
            free while in beta · no card · CBSE · ICSE · IB · IGCSE · State · NIOS
          </p>
        </ScrollReveal>

        <ScrollReveal y={28} delay={0.08}>
          <HeroInstrument />
        </ScrollReveal>
      </section>

      {/* ── 01 the number ──────────────────────────────────── */}
      <section className="border-t border-border py-12 sm:py-14">
        <ScrollReveal>
          <span className="u-label">01 — the number</span>
          <h2 className="mt-3 max-w-[24ch] text-2xl font-extrabold tracking-[-0.02em] text-text sm:text-3xl">
            Four things that actually predict an exam result.
          </h2>
          <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-text-2">
            Each is measured from data you log, weighted, and rolled into a 0–1000 score.
            Change the inputs and the number moves the same day.
          </p>
        </ScrollReveal>

        <ScrollGroup className="mt-6 grid gap-3 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <ScrollItem key={p.label}>
              <div className="u-card h-full p-5">
                <div className="flex items-baseline gap-2">
                  <CountUp
                    to={p.n}
                    suffix="%"
                    className="u-stat-number text-3xl leading-none text-accent-strong"
                  />
                  <span className="u-label">of the score</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-text">{p.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-text-2">{p.note}</p>
              </div>
            </ScrollItem>
          ))}
        </ScrollGroup>
      </section>

      {/* ── 02 the ladder ──────────────────────────────────── */}
      <section className="border-t border-border py-12 sm:py-14">
        <ScrollReveal>
          <span className="u-label">02 — the ladder</span>
          <h2 className="mt-3 max-w-[26ch] text-2xl font-extrabold tracking-[-0.02em] text-text sm:text-3xl">
            Five tiers, from first log to exam ready.
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.05} className="mt-6">
          <div className="u-card p-5 sm:p-6">
            <div className="relative flex items-center">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
              <div className="relative grid w-full grid-cols-5 gap-2">
                {TIERS.map((t, i) => (
                  <div key={t.label} className="flex flex-col items-center text-center">
                    <span
                      className={
                        i === 3
                          ? "u-led relative z-10"
                          : "relative z-10 size-1.5 rounded-full bg-text-3"
                      }
                    />
                    <span className="mt-3 text-xs font-semibold text-text">{t.label}</span>
                    <span className="u-mono mt-0.5 text-2xs text-text-3">{t.at}+</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── 03 the tools ───────────────────────────────────── */}
      <section className="border-t border-border py-12 sm:py-14">
        <ScrollReveal>
          <span className="u-label">03 — the tools</span>
          <h2 className="mt-3 max-w-[24ch] text-2xl font-extrabold tracking-[-0.02em] text-text sm:text-3xl">
            25 tools, in six honest buckets.
          </h2>
          <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-text-2">
            Every one reads from the same data your score does, so nothing you do in a tool
            is busywork — it moves the number.
          </p>
        </ScrollReveal>

        <ScrollGroup className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <ScrollItem key={c.id}>
              <div className="u-card flex h-full items-center gap-3 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-surface-2 text-accent-strong">
                  <c.icon size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-text">{c.label}</p>
                  <p className="u-mono text-2xs text-text-3">{c.blurb}</p>
                </div>
              </div>
            </ScrollItem>
          ))}
        </ScrollGroup>

        <ScrollReveal delay={0.05} className="mt-6">
          <span className="u-label">signature tools</span>
        </ScrollReveal>
        <ScrollReveal delay={0.08} className="mt-3">
          <SignatureShowcase />
        </ScrollReveal>
      </section>

      {/* ── 04 how it works ────────────────────────────────── */}
      <section className="border-t border-border py-12 sm:py-14">
        <ScrollReveal>
          <span className="u-label">04 — how it works</span>
          <h2 className="mt-3 max-w-[22ch] text-2xl font-extrabold tracking-[-0.02em] text-text sm:text-3xl">
            Three steps. About two minutes.
          </h2>
        </ScrollReveal>
        <ScrollGroup className="mt-6 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <ScrollItem key={s.k}>
              <div className="u-card h-full p-5">
                <span className="u-stat-number text-lg text-text-3">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-3 text-sm font-semibold text-text">{s.t}</p>
                <p className="mt-1 text-xs leading-relaxed text-text-2">{s.b}</p>
              </div>
            </ScrollItem>
          ))}
        </ScrollGroup>
      </section>

      {/* ── 05 boards ──────────────────────────────────────── */}
      <section className="border-t border-border py-12 sm:py-14">
        <ScrollReveal>
          <span className="u-label">05 — your board</span>
          <h2 className="mt-3 max-w-[28ch] text-2xl font-extrabold tracking-[-0.02em] text-text sm:text-3xl">
            One instrument, tuned to your syllabus.
          </h2>
        </ScrollReveal>
        <ScrollGroup className="mt-6 flex flex-wrap gap-2.5">
          {BOARDS.map((b) => (
            <ScrollItem key={b.value}>
              <span className="u-mono inline-block rounded-full border border-border-2 bg-surface-2 px-3.5 py-1.5 text-xs text-text-2">
                {b.label}
              </span>
            </ScrollItem>
          ))}
        </ScrollGroup>
      </section>

      {/* ── final cta ──────────────────────────────────────── */}
      <section className="border-t border-border py-16 text-center lg:py-20">
        <ScrollReveal>
          <h2 className="mx-auto max-w-[20ch] text-3xl font-extrabold tracking-[-0.03em] text-text sm:text-4xl">
            Stop guessing how prepared you are.
          </h2>
          <div className="mt-7 flex justify-center">
            <Link href="/login">
              <Button size="lg">
                Start your ledger <ArrowRight size={15} />
              </Button>
            </Link>
          </div>
          <p className="u-mono mt-4 text-2xs text-text-3">takes about two minutes to see a real number</p>
        </ScrollReveal>
      </section>

      <SiteFooter />
    </main>
  );
}
