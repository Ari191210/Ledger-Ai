import Link from "next/link";
import { ThemeLab } from "./theme-lab";
import { Button } from "@/components/ui/button";

function Swatch({ name, varName }: { name: string; varName: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-8 rounded-md border border-border"
        style={{ background: `var(${varName})` }}
      />
      <div className="text-2xs">
        <div className="font-semibold text-text">{name}</div>
        <div className="u-mono text-text-3">{varName}</div>
      </div>
    </div>
  );
}

export default function DesignPreview() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="u-led" />
            <span className="u-brand text-lg text-text">StudyLedger</span>
          </div>
          <Link href="/login">
            <Button variant="secondary" size="sm">
              Sign in
            </Button>
          </Link>
        </div>
        <span className="u-label mt-10 block">the thesis</span>
        <h1 className="mt-3 max-w-[18ch] text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] text-text">
          Know where you stand.{" "}
          <span className="text-accent-strong">Know what to fix next.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm text-text-2">
          Design-system preview. Screen-native Braun: one lime accent used with
          discipline, instrument-readout numerals, dot-grid grille, flat device
          panels.
        </p>
      </header>

      <section className="mb-16">
        <span className="u-label">01 — numerals</span>
        <div className="mt-4 space-y-2">
          <p className="u-stat-number text-4xl">742</p>
          <p className="u-stat-number text-2xl">1,234,567</p>
          <p className="u-mono text-sm text-text-2">
            goal 85% · avg 71% · +18 / wk
          </p>
        </div>
      </section>

      <section className="mb-16">
        <span className="u-label">02 — palette</span>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Swatch name="Background" varName="--bg" />
          <Swatch name="Surface" varName="--surface" />
          <Swatch name="Surface 2" varName="--surface-2" />
          <Swatch name="Text" varName="--text" />
          <Swatch name="Text 2" varName="--text-2" />
          <Swatch name="Border" varName="--border" />
          <Swatch name="Accent — lime" varName="--accent" />
          <Swatch name="Accent strong" varName="--accent-strong" />
          <Swatch name="Positive" varName="--positive" />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </section>

      <section className="u-card u-grille p-6">
        <span className="u-label">03 — device panel</span>
        <p className="mt-2 text-sm text-text-2">
          Flat, crisp 1px border, a light edge on top, optional grille texture.
        </p>
      </section>

      <ThemeLab />
    </main>
  );
}
