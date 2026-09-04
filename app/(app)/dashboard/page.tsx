import { createClient } from "@/lib/supabase/server";

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
  { label: "Syllabus coverage", value: "64", unit: "%", goal: "100%", avg: "58%", trend: "+4%", dir: "up" as const },
  { label: "Mistakes this week", value: "23", unit: "", goal: "< 15", avg: "31", trend: "-8", dir: "down" as const },
  { label: "PYQ sessions", value: "12", unit: "", goal: "20", avg: "9", trend: "+3", dir: "up" as const },
];

const FIX_NEXT = [
  { topic: "Rotational motion — torque sign errors", subject: "Physics", count: 6 },
  { topic: "Mole concept — limiting reagent", subject: "Chemistry", count: 4 },
  { topic: "Definite integrals — substitution limits", subject: "Maths", count: 3 },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = user?.email?.split("@")[0] ?? "there";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text">
          Hello, {name}
        </h1>
        <p className="text-sm text-text-2">Here is what to fix next.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Ledger Score — hero */}
        <section className="u-card p-6 lg:col-span-2">
          <div className="flex items-start justify-between">
            <span className="text-sm font-semibold text-text-2">Ledger Score</span>
            <span className="u-badge u-badge--up">↑ 18 this week</span>
          </div>

          <div className="mt-3 flex items-end gap-2">
            <span className="u-stat-number text-4xl">{SCORE}</span>
            <span className="mb-1 text-sm text-text-3">/ {SCORE_MAX}</span>
          </div>
          <p className="mt-1 text-sm text-text-2">
            {TIER} — {NEXT_TIER_AT - SCORE} points to Strong
          </p>

          <div className="mt-5 space-y-2.5">
            {PILLARS.map((p) => (
              <div key={p.label}>
                <div className="flex justify-between text-xs text-text-2">
                  <span>
                    {p.label}{" "}
                    <span className="text-text-3">· {p.weight}</span>
                  </span>
                  <span className="font-medium tabular-nums text-text">
                    {p.pts}
                    <span className="text-text-3"> / {p.max}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(p.pts / p.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What to fix next */}
        <section className="u-card p-6">
          <span className="text-sm font-semibold text-text-2">Fix next</span>
          <ul className="mt-4 space-y-4">
            {FIX_NEXT.map((f) => (
              <li key={f.topic} className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-accent-weak text-xs font-bold tabular-nums text-accent">
                  {f.count}
                </span>
                <div className="text-sm">
                  <p className="font-medium text-text">{f.topic}</p>
                  <p className="text-xs text-text-3">{f.subject}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.label} className="u-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-text-2">{s.label}</span>
              <span className={`u-badge u-badge--${s.dir === "up" ? "up" : "down"}`}>
                {s.dir === "up" ? "↑" : "↓"} {s.trend}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="u-stat-number text-2xl">{s.value}</span>
              {s.unit && (
                <span className="u-stat-number text-lg text-text-2">{s.unit}</span>
              )}
            </div>
            <div className="mt-3 flex gap-5 text-xs text-text-3">
              <span>Goal&nbsp;&nbsp;{s.goal}</span>
              <span>Avg&nbsp;&nbsp;{s.avg}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
