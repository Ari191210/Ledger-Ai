import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Ring } from "@/components/ui/ring";
import { SignatureShowcase } from "@/components/marketing/signature-showcase";
import { CATEGORIES } from "@/lib/tools/registry";
import { BOARDS } from "@/lib/onboarding";

export const metadata: Metadata = {
  title: "StudyLedger — know where you stand, know what to fix next",
  description:
    "One honest score built from your real PYQs, syllabus coverage, mistakes, and consistency, plus 25 tools to act on it. Built for CBSE, ICSE, IB, IGCSE, State Board, and home school.",
};

const TIERS = ["Beginner", "Building", "Developing", "Strong", "Exam Ready"];

const PILLARS = [
  { key: "pyq", label: "pyq accuracy", weight: "40%", pts: 320, max: 400, note: "Correct vs attempted on real PYQs, last 30 days." },
  { key: "coverage", label: "syllabus coverage", weight: "25%", pts: 195, max: 250, note: "Topics you've actually marked covered, out of everything logged." },
  { key: "mistakes", label: "mistake velocity", weight: "20%", pts: 142, max: 200, note: "Fewer new mistakes in the last 7 days scores higher." },
  { key: "consistency", label: "consistency", weight: "15%", pts: 85, max: 150, note: "Current study streak, out of a 14-day target." },
];
const SAMPLE_TOTAL = PILLARS.reduce((s, p) => s + p.pts, 0);

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <nav className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <span className="u-led" />
          <span className="u-brand text-base text-text">StudyLedger</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm">
              Get started <ArrowRight size={13} />
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── hero ──────────────────────────────────────────────────────── */}
      <section className="grid gap-10 py-14 lg:grid-cols-[1fr_auto] lg:items-center lg:py-20">
        <div>
          <span className="u-label">the thesis</span>
          <h1 className="mt-3 max-w-[16ch] text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-text sm:text-5xl">
            Know where you stand.{" "}
            <span className="text-accent-strong">Know what to fix next.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-text-2">
            Every PYQ, every mistake, every hour of study, folded into one
            honest number and one list of what to do about it. No vague
            encouragement, just what's actually behind and what closes the
            gap fastest.
          </p>
          <div className="mt-7 flex items-center gap-3">
            <Link href="/login">
              <Button size="lg">
                Get started <ArrowRight size={14} />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign in
              </Button>
            </Link>
          </div>

          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6">
            {[
              ["01", "the number"],
              [String(BOARDS.length).padStart(2, "0"), "boards"],
              ["25", "tools"],
            ].map(([n, label]) => (
              <div key={label}>
                <dt className="u-stat-number text-xl text-text">{n}</dt>
                <dd className="u-label mt-1">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="u-card u-grille w-full max-w-sm p-6 lg:w-[22rem]">
          <span className="u-label">the ledger score · example</span>
          <div className="mt-4 flex items-center gap-6">
            <Ring value={SAMPLE_TOTAL} max={1000} size={128} stroke={11} color="var(--accent-strong)">
              <div>
                <div className="u-stat-number text-3xl leading-none text-text">{SAMPLE_TOTAL}</div>
                <div className="u-mono mt-1 text-2xs text-text-3">/ 1000</div>
              </div>
            </Ring>
            <div>
              <div className="text-sm font-semibold text-text">Strong</div>
              <div className="u-mono mt-1 text-2xs text-text-3">
                {800 - SAMPLE_TOTAL} points to Exam Ready
              </div>
              <div className="u-mono mt-3 flex items-center gap-1.5 text-2xs text-accent-strong">
                <span className="size-1.5 rounded-full bg-accent" /> 12d streak
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── how the score works ──────────────────────────────────────── */}
      <section className="border-t border-border py-14">
        <span className="u-label">01 — how the score works</span>
        <h2 className="mt-2 max-w-md text-2xl font-bold tracking-[-0.02em] text-text">
          Four real inputs. No fudge factor.
        </h2>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            {PILLARS.map((p) => (
              <div key={p.key}>
                <div className="flex items-baseline justify-between">
                  <span className="u-label">
                    {p.label} <span className="text-text-3/60">· {p.weight}</span>
                  </span>
                  <span className="u-mono text-xs text-text">
                    {p.pts}
                    <span className="text-text-3">/{p.max}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 bg-surface-3">
                  <div className="h-full bg-accent" style={{ width: `${(p.pts / p.max) * 100}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-text-2">{p.note}</p>
              </div>
            ))}
          </div>

          <div className="u-card p-6">
            <span className="u-label">tiers</span>
            <div className="mt-4 space-y-3">
              {TIERS.map((t, i) => (
                <div key={t} className="flex items-center gap-3">
                  <span
                    className={
                      "u-mono w-8 shrink-0 text-xs " +
                      (i <= 3 ? "text-accent-strong" : "text-text-3")
                    }
                  >
                    {String(i * 200).padStart(3, "0")}
                  </span>
                  <div className="h-1.5 flex-1 bg-surface-3">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${((i + 1) / TIERS.length) * 100}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs text-text-2">{t}</span>
                </div>
              ))}
            </div>
            <p className="u-mono mt-5 text-2xs text-text-3">
              computed live from your data, no history stored, no scores
              invented before you've logged anything.
            </p>
          </div>
        </div>
      </section>

      {/* ── the loop ──────────────────────────────────────────────────── */}
      <section className="border-t border-border py-14">
        <span className="u-label">02 — the loop</span>
        <h2 className="mt-2 max-w-md text-2xl font-bold tracking-[-0.02em] text-text">
          Plan it, learn it, practise it, track it.
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <div key={c.id} className="u-card p-4">
              <span className="grid size-9 place-items-center rounded-md border border-border bg-surface-2 text-accent-strong">
                <c.icon size={16} />
              </span>
              <p className="mt-3 text-sm font-semibold text-text">{c.label}</p>
              <p className="mt-1 text-xs text-text-2">{c.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── signature tools ──────────────────────────────────────────── */}
      <section className="border-t border-border py-14">
        <span className="u-label">03 — signature tools</span>
        <h2 className="mt-2 max-w-md text-2xl font-bold tracking-[-0.02em] text-text">
          The 10 tools unique to StudyLedger.
        </h2>
        <p className="mt-2 max-w-lg text-sm text-text-2">
          Everything else is real too, just not the hook. All 25 read and
          write your actual study data, no placeholders.
        </p>
        <div className="mt-8">
          <SignatureShowcase />
        </div>
      </section>

      {/* ── boards ────────────────────────────────────────────────────── */}
      <section className="border-t border-border py-14">
        <span className="u-label">04 — built for your board</span>
        <div className="mt-4 flex flex-wrap gap-2">
          {BOARDS.map((b) => (
            <span
              key={b.value}
              className="u-mono rounded-full border border-border-2 bg-surface-2 px-3 py-1.5 text-xs text-text-2"
            >
              {b.label}
            </span>
          ))}
        </div>
      </section>

      {/* ── final CTA ─────────────────────────────────────────────────── */}
      <section className="border-t border-border py-16 text-center">
        <h2 className="mx-auto max-w-lg text-2xl font-bold tracking-[-0.02em] text-text">
          Stop guessing what to study next.
        </h2>
        <div className="mt-6">
          <Link href="/login">
            <Button size="lg">
              Get started <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="flex items-center justify-between border-t border-border py-8">
        <div className="flex items-center gap-2">
          <span className="u-led" />
          <span className="u-brand text-sm text-text">StudyLedger</span>
        </div>
        <p className="u-mono text-2xs text-text-3">for students preparing for boards and entrance exams</p>
      </footer>
    </main>
  );
}
