import { createClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/motion/reveal";
import { StatNumber } from "@/components/ui/stat-number";

// Placeholder figures — wired to real inputs in a later phase.
const SCORE = 742;
const SCORE_MAX = 1000;
const TIER = "Developing";
const NEXT_TIER_AT = 800;

const PILLARS = [
  { label: "PYQ accuracy", weight: "40%", pts: 288, max: 400 },
  { label: "Syllabus coverage", weight: "25%", pts: 160, max: 250 },
  { label: "Mistake velocity", weight: "20%", pts: 154, max: 200 },
  { label: "Consistency", weight: "15%", pts: 140, max: 150 },
];

const STATS = [
  { label: "Coverage", value: 64, unit: "%", goal: "100%", trend: "+4%", dir: "up" as const },
  { label: "Mistakes / wk", value: 23, unit: "", goal: "< 15", trend: "-8", dir: "down" as const },
  { label: "PYQ sessions", value: 12, unit: "", goal: "20", trend: "+3", dir: "up" as const },
  { label: "Focus hrs / wk", value: 9, unit: "", goal: "14", trend: "+1.5", dir: "up" as const },
];

const FIX_NEXT = [
  { topic: "Rotational motion — torque sign errors", subject: "Physics", count: 6 },
  { topic: "Mole concept — limiting reagent", subject: "Chemistry", count: 4 },
  { topic: "Definite integrals — substitution limits", subject: "Maths", count: 3 },
  { topic: "Thermodynamics — sign of work done", subject: "Physics", count: 2 },
];

const WEEK = [
  { d: "M", h: 1.5 }, { d: "T", h: 2.2 }, { d: "W", h: 0.8 },
  { d: "T", h: 3.1 }, { d: "F", h: 1.9 }, { d: "S", h: 2.6 }, { d: "S", h: 0.4 },
];
const WEEK_MAX = 3.2;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = user?.email?.split("@")[0] ?? "there";

  return (
    <div className="mx-auto max-w-[1440px]">
      <Reveal>
        <div className="mb-3">
          <h1 className="text-lg font-bold text-text">Hello, {name}</h1>
          <p className="text-xs text-text-3">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-12 gap-3">
        {/* Ledger Score */}
        <Reveal delay={0.04} className="col-span-12 lg:col-span-8">
          <section className="u-card u-card--hover h-full p-4">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-3">
                Ledger Score
              </span>
              <span className="u-badge u-badge--up">&uarr; 18 this week</span>
            </div>

            <div className="mt-2 flex items-end gap-2">
              <StatNumber value={SCORE} className="text-[2.75rem] leading-none" />
              <span className="mb-1.5 text-sm text-text-3">/ {SCORE_MAX}</span>
            </div>
            <p className="mt-0.5 text-xs text-text-2">
              {TIER} &middot; {NEXT_TIER_AT - SCORE} pts to Strong
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {PILLARS.map((p) => (
                <div key={p.label} className="rounded-md bg-surface-2 p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-2">{p.label}</span>
                    <span className="tabular-nums text-text-3">{p.weight}</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="u-stat-number text-lg">{p.pts}</span>
                    <span className="text-xs text-text-3">/ {p.max}</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(p.pts / p.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Fix next */}
        <Reveal delay={0.08} className="col-span-12 lg:col-span-4">
          <section className="u-card u-card--hover h-full p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-3">
              Fix next
            </span>
            <ul className="mt-3 space-y-2.5">
              {FIX_NEXT.map((f) => (
                <li key={f.topic} className="flex gap-2.5">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded bg-accent-weak text-[0.7rem] font-bold tabular-nums text-accent">
                    {f.count}
                  </span>
                  <div className="min-w-0 text-xs">
                    <p className="truncate font-medium text-text">{f.topic}</p>
                    <p className="text-text-3">{f.subject}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>

        {/* Stat row */}
        {STATS.map((s, i) => (
          <Reveal
            key={s.label}
            delay={0.1 + i * 0.03}
            className="col-span-6 lg:col-span-3"
          >
            <div className="u-card u-card--hover h-full p-3.5">
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-text-2">{s.label}</span>
                <span
                  className={`u-badge u-badge--${s.dir === "up" ? "up" : "down"}`}
                >
                  {s.dir === "up" ? "↑" : "↓"} {s.trend}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-0.5">
                <StatNumber value={s.value} className="text-2xl" />
                {s.unit && (
                  <span className="u-stat-number text-base text-text-2">
                    {s.unit}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[0.7rem] text-text-3">Goal {s.goal}</div>
            </div>
          </Reveal>
        ))}

        {/* This week */}
        <Reveal delay={0.22} className="col-span-12 lg:col-span-8">
          <section className="u-card u-card--hover p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-3">
                This week
              </span>
              <span className="text-xs text-text-3">12.5 focus hrs</span>
            </div>
            <div className="mt-3 flex h-24 items-end gap-2">
              {WEEK.map((w, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-sm bg-accent/85"
                      style={{ height: `${(w.h / WEEK_MAX) * 100}%` }}
                    />
                  </div>
                  <span className="text-[0.65rem] text-text-3">{w.d}</span>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Streak */}
        <Reveal delay={0.26} className="col-span-12 lg:col-span-4">
          <section className="u-card u-card--hover flex h-full flex-col justify-center p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-3">
              Streak
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <StatNumber value={14} className="text-[2.25rem] leading-none" />
              <span className="text-sm text-text-3">days</span>
            </div>
            <p className="mt-1 text-xs text-text-2">Longest: 21 days</p>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
