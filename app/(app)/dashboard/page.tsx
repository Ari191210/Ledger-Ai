import { ArrowUpRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";
import { StatNumber } from "@/components/ui/stat-number";
import { Ring } from "@/components/ui/ring";
import { FilterPills } from "@/components/ui/filter-pills";

// ─── placeholder data — wired to real inputs later ──────────────────────
const ACTIVITY = [
  { label: "PYQ accuracy", value: "78%", goal: "85%", avg: "71%", color: "var(--accent-strong)", data: [61, 64, 62, 69, 67, 73, 78] },
  { label: "Mistakes fixed", value: "34", goal: "40", avg: "28", color: "var(--feature-2)", data: [19, 24, 22, 27, 30, 31, 34] },
  { label: "Focus time", value: "9h 20m", goal: "14h", avg: "8h", color: "#a78bfa", data: [6, 8, 5, 9, 7, 10, 9] },
];

const FIX = [
  { topic: "Rotational motion", subject: "Physics · torque sign errors", count: 6 },
  { topic: "Mole concept", subject: "Chemistry · limiting reagent", count: 4 },
  { topic: "Definite integrals", subject: "Maths · substitution limits", count: 3 },
  { topic: "Thermodynamics", subject: "Physics · work done sign", count: 2 },
];

const STUDIED = new Set([1, 2, 4, 5, 8, 9, 10, 12, 15, 16, 18, 19, 22, 23]);

// ─── mini sparkline with a peak tag ────────────────────────────────────
function Mini({ data, color, tag }: { data: number[]; color: string; tag: string }) {
  const w = 120;
  const h = 40;
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const x = (i: number) => (i / (data.length - 1)) * w;
  const y = (v: number) => 3 + (1 - (v - lo) / (hi - lo || 1)) * (h - 6);
  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const peak = data.indexOf(hi);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-10 w-full" aria-hidden>
        <path d={line} fill="none" stroke={color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span
        className="absolute -top-1 rounded-full bg-surface-3 px-1.5 py-0.5 text-[0.6rem] font-bold text-text"
        style={{ left: `${(peak / (data.length - 1)) * 100}%`, transform: "translateX(-50%)" }}
      >
        {tag}
      </span>
    </div>
  );
}

function Calendar() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = now.getDate();
  const dim = new Date(y, m + 1, 0).getDate();
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];

  return (
    <section className="rounded-[28px] bg-feature p-5 text-feature-fg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Your study days</span>
        <span className="text-xs text-white/65">
          {now.toLocaleDateString("en-IN", { month: "long" })}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[0.6rem] font-bold uppercase text-white/50">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {cells.map((d, i) => (
          <div key={i} className="grid aspect-square place-items-center">
            {d && (
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full text-xs tabular-nums",
                  d === today
                    ? "bg-accent font-bold text-accent-on"
                    : STUDIED.has(d)
                      ? "bg-feature-ink text-white"
                      : "text-white/40",
                )}
              >
                {d}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4 text-[0.65rem] text-white/65">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent" /> Today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-feature-ink" /> Studied
        </span>
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = user?.email?.split("@")[0] ?? "there";

  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <Reveal>
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-lg font-bold text-text">Hello, {name}</h1>
            <p className="text-xs text-text-3">Ready to fix what&apos;s next?</p>
          </div>
          <span className="text-xs text-text-3">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_356px]">
        {/* left column */}
        <div className="space-y-4">
          {/* study activity */}
          <Reveal delay={0.04}>
            <section className="u-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text">Study activity</span>
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-text-2">
                  This week
                </span>
              </div>
              <div className="mt-6 grid gap-x-6 gap-y-6 sm:grid-cols-3">
                {ACTIVITY.map((a) => (
                  <div key={a.label}>
                    <Mini data={a.data} color={a.color} tag={a.value.replace(/\s.*/, "")} />
                    <div className="mt-3 u-stat-number text-[1.9rem]">{a.value}</div>
                    <div className="mt-0.5 text-xs text-text-2">{a.label}</div>
                    <div className="mt-2 flex gap-5 text-[0.7rem] text-text-3">
                      <span>
                        Goal
                        <br />
                        <span className="font-semibold text-text-2">{a.goal}</span>
                      </span>
                      <span>
                        Avg
                        <br />
                        <span className="font-semibold text-text-2">{a.avg}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>

          {/* score + coverage */}
          <Reveal delay={0.08}>
            <div className="grid gap-4 sm:grid-cols-2">
              <section className="u-card flex items-center gap-4 p-5">
                <div>
                  <span className="text-sm font-semibold text-text">Ledger Score</span>
                  <p className="mt-1 text-xs text-text-2">Developing</p>
                  <p className="mt-0.5 text-xs text-text-3">58 to Strong</p>
                </div>
                <div className="ml-auto">
                  <Ring
                    value={742}
                    max={1000}
                    size={104}
                    stroke={10}
                    color="var(--accent-strong)"
                  >
                    <div>
                      <StatNumber value={742} className="text-xl" />
                      <div className="text-[0.6rem] text-text-3">/ 1000</div>
                    </div>
                  </Ring>
                </div>
              </section>

              <section className="u-card p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text">Syllabus coverage</span>
                  <span className="text-xs font-bold text-accent-strong">64%</span>
                </div>
                <p className="mt-1 text-xs text-text-2">On track for March boards</p>
                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-accent-strong" style={{ width: "64%" }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-text-3">
                  <span>Now 64%</span>
                  <span>Goal 100%</span>
                </div>
              </section>
            </div>
          </Reveal>
        </div>

        {/* right column */}
        <Reveal delay={0.06}>
          <Calendar />
        </Reveal>
      </div>

      {/* fix next — full width */}
      <Reveal delay={0.12}>
        <section className="u-card p-5">
          <div>
            <span className="text-sm font-semibold text-text">Fix next</span>
            <p className="mt-0.5 text-xs text-text-3">
              4 topics flagged from your recent mistakes
            </p>
          </div>
          <div className="mt-4">
            <FilterPills options={["All", "Physics", "Chemistry", "Maths"]} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FIX.map((f, i) => (
              <div
                key={f.topic}
                className={cn(
                  "flex flex-col justify-between rounded-[20px] p-4",
                  i === 0
                    ? "bg-feature text-feature-fg"
                    : "border border-border bg-surface-2",
                )}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-full text-xs font-bold tabular-nums",
                      i === 0
                        ? "bg-white/20 text-white"
                        : "bg-accent-weak text-accent-strong",
                    )}
                  >
                    {f.count}
                  </span>
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-full",
                      i === 0
                        ? "bg-white/15 text-white"
                        : "border border-border bg-surface-3 text-text-2",
                    )}
                  >
                    <ArrowUpRight size={14} />
                  </span>
                </div>
                <div className="mt-8">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      i === 0 ? "text-white" : "text-text",
                    )}
                  >
                    {f.topic}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs",
                      i === 0 ? "text-white/70" : "text-text-3",
                    )}
                  >
                    {f.subject}
                  </p>
                </div>
              </div>
            ))}
            <button className="flex items-center justify-center gap-1.5 rounded-[20px] border border-dashed border-border-2 p-4 text-xs font-semibold text-text-3 hover:border-text-3 hover:text-text">
              <Plus size={14} /> Add task
            </button>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
