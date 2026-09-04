import Link from "next/link";
import { ThemeLab } from "./theme-lab";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Ledger Score", value: "742", unit: "", goal: "800", avg: "690", trend: "+18", dir: "up" as const },
  { label: "Syllabus coverage", value: "64", unit: "%", goal: "100%", avg: "58%", trend: "+4%", dir: "up" as const },
  { label: "Mistakes this week", value: "23", unit: "", goal: "< 15", avg: "31", trend: "-8", dir: "down" as const },
];

function Swatch({ name, varName }: { name: string; varName: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-9 rounded-md border border-border"
        style={{ background: `var(${varName})` }}
      />
      <div className="text-xs">
        <div className="font-semibold text-text">{name}</div>
        <div className="text-text-3">{varName}</div>
      </div>
    </div>
  );
}

export default function DesignPreview() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-14">
        <div className="flex items-center justify-between">
          <div className="u-brand text-2xl text-accent-strong">StudyLedger</div>
          <Link
            href="/login"
            className="rounded-md border border-border-2 bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-2"
          >
            Sign in
          </Link>
        </div>
        <h1 className="u-display mt-6 text-4xl text-text">
          Know where you stand. Know what to fix next.
        </h1>
        <p className="mt-4 max-w-xl text-base text-text-2">
          Design system preview. Near-black ground, a lime accent, one
          electric-blue feature panel, oversized tabular numerals as the hero.
        </p>
      </header>

      {/* stat cards — the reference pattern */}
      <section className="mb-16 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="u-card p-6">
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-text-2">{s.label}</span>
              <span className={`u-badge u-badge--${s.dir === "up" ? "up" : "down"}`}>
                {s.dir === "up" ? "↑" : "↓"} {s.trend}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="u-stat-number text-4xl">{s.value}</span>
              {s.unit && (
                <span className="u-stat-number text-2xl text-text-2">{s.unit}</span>
              )}
            </div>
            <div className="mt-4 flex gap-6 text-xs text-text-3">
              <span>Goal&nbsp;&nbsp;{s.goal}</span>
              <span>Average&nbsp;&nbsp;{s.avg}</span>
            </div>
          </div>
        ))}
      </section>

      {/* type scale */}
      <section className="mb-16">
        <h2 className="mb-6 text-lg font-bold text-text">Type</h2>
        <div className="space-y-3">
          <p className="u-display text-4xl text-text">Poiret One display · 64</p>
          <p className="u-display text-2xl text-text">Poiret One display · 34</p>
          <p className="text-xl font-bold text-text">Urbanist bold · 26</p>
          <p className="text-base text-text">
            Urbanist regular · 16 — the workhorse for body copy, UI labels,
            tables, and forms across the entire product.
          </p>
          <p className="text-sm text-text-2">Urbanist · 14 · secondary text</p>
          <p className="u-stat-number text-4xl">1,234,567 · tabular numerals</p>
        </div>
      </section>

      {/* palette */}
      <section>
        <h2 className="mb-6 text-lg font-bold text-text">Palette</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Swatch name="Background" varName="--bg" />
          <Swatch name="Surface" varName="--surface" />
          <Swatch name="Surface 2" varName="--surface-2" />
          <Swatch name="Text" varName="--text" />
          <Swatch name="Text 2" varName="--text-2" />
          <Swatch name="Border" varName="--border" />
          <Swatch name="Accent — lime" varName="--accent" />
          <Swatch name="Accent weak" varName="--accent-weak" />
          <Swatch name="Feature — electric blue" varName="--feature" />
          <Swatch name="Positive" varName="--positive" />
          <Swatch name="Negative" varName="--negative" />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <span className="u-badge u-badge--up">&uarr; 12.5%</span>
          <span className="u-badge u-badge--down">&darr; 4.3%</span>
          <span className="u-badge u-badge--flat">&mdash; 0.0%</span>
        </div>
      </section>

      <ThemeLab />
    </main>
  );
}
