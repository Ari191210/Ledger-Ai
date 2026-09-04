import { ArrowUpRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";
import { StatNumber } from "@/components/ui/stat-number";
import { Segmented } from "@/components/ui/segmented";
import { getDashboardData } from "@/lib/score/inputs";

function Label({ index, children }: { index: string; children: string }) {
  return (
    <span className="u-label">
      {index} <span className="mx-1 text-text-3/60">—</span> {children}
    </span>
  );
}

function Mini({ data }: { data: number[] }) {
  const w = 120;
  const h = 34;
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const x = (i: number) => (i / (data.length - 1)) * w;
  const y = (v: number) => 3 + (1 - (v - lo) / (hi - lo || 1)) * (h - 6);
  const line = data
    .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-text-2"
      />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r={2.2} className="fill-accent-strong" />
    </svg>
  );
}

function Calendar({ studiedDays }: { studiedDays: Set<number> }) {
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
    <section className="u-card u-grille relative flex h-full flex-col p-4">
      <div className="flex items-center justify-between">
        <Label index="03">study days</Label>
        <span className="u-mono text-2xs text-text-3">
          {now.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }).toLowerCase()}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-2xs text-text-3">
        {["m", "t", "w", "t", "f", "s", "s"].map((d, i) => (
          <span key={i} className="u-mono">{d}</span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {cells.map((d, i) => (
          <div key={i} className="grid aspect-square place-items-center">
            {d && (
              <span
                className={cn(
                  "u-mono grid size-7 place-items-center rounded-full text-2xs tabular-nums",
                  d === today
                    ? "bg-accent font-bold text-accent-on"
                    : studiedDays.has(d)
                      ? "bg-surface-3 text-text"
                      : "text-text-3",
                )}
              >
                {d}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-4 pt-4 text-2xs text-text-3">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-accent" /> today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-surface-3" /> studied
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
  const { score, activity, studiedDays, coveragePct, syllabusLogged, fixNext } =
    await getDashboardData(supabase, user!.id);

  return (
    <div className="mx-auto max-w-[1240px] space-y-4">
      <Reveal>
        <div className="flex items-baseline justify-between">
          <h1 className="text-base font-bold text-text">Hello, {name}</h1>
          <span className="u-mono text-2xs text-text-3">
            {new Date()
              .toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })
              .toLowerCase()}
          </span>
        </div>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {/* ── ledger score ─────────────────────────────── */}
          <Reveal delay={0.04}>
            <section className="u-card p-4">
              <div className="flex items-center justify-between">
                <Label index="01">ledger score</Label>
                <span className="u-led" />
              </div>

              <div className="mt-3 flex items-end gap-4">
                <StatNumber value={score.total} className="text-[4rem] leading-none" />
                <div className="mb-2 space-y-0.5">
                  <div className="text-xs text-text-2">{score.tier.toLowerCase()}</div>
                  <div className="u-mono text-2xs text-text-3">
                    {score.nextTier
                      ? `${score.nextTier.at - score.total} to ${score.nextTier.label.toLowerCase()}`
                      : "top tier"}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                {score.pillars.map((p) => (
                  <div key={p.key} className="flex-1">
                    <div className="u-label">{p.label}</div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="u-stat-number text-sm">{p.pts}</span>
                      <span className="u-mono text-2xs text-text-3">/{p.max}</span>
                    </div>
                    <div className="mt-1.5 h-1 bg-surface-3">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${(p.pts / p.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>

          {/* ── study activity ───────────────────────────── */}
          <Reveal delay={0.08}>
            <section className="u-card p-4">
              <div className="flex items-center justify-between">
                <Label index="02">study activity</Label>
                <Segmented options={["7d", "30d", "term"]} size="sm" />
              </div>
              <div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-3">
                {activity.map((a) => (
                  <div key={a.key}>
                    <Mini data={a.data} />
                    <div className="mt-2 u-stat-number text-[1.6rem]">{a.value}</div>
                    <div className="u-label mt-0.5">{a.label}</div>
                    <div className="mt-2 u-mono text-2xs text-text-3">{a.sub}</div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        </div>

        {/* ── study days (right rail) ────────────────────── */}
        <Reveal delay={0.06}>
          <Calendar studiedDays={studiedDays} />
        </Reveal>
      </div>

      {/* ── coverage strip ──────────────────────────────── */}
      <Reveal delay={0.1}>
        <section className="u-card flex items-center gap-5 p-4">
          <Label index="04">syllabus coverage</Label>
          <div className="flex flex-1 items-center gap-3">
            <div className="h-1 flex-1 bg-surface-3">
              <div className="h-full bg-accent" style={{ width: `${coveragePct}%` }} />
            </div>
            <span className="u-stat-number text-sm">{coveragePct}%</span>
          </div>
          <span className="u-mono text-2xs text-text-3">
            {syllabusLogged ? "target 100%" : "no syllabus logged yet"}
          </span>
        </section>
      </Reveal>

      {/* ── fix next ────────────────────────────────────── */}
      <Reveal delay={0.14}>
        <section className="u-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label index="05">fix next</Label>
            <Segmented options={["all", "phy", "chem", "maths"]} size="sm" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {fixNext.length === 0 && (
              <p className="u-mono col-span-full py-2 text-2xs text-text-3">
                no open mistakes logged — nothing flagged yet
              </p>
            )}
            {fixNext.map((f) => (
              <div
                key={`${f.subject}-${f.topic}`}
                className="flex flex-col justify-between rounded-[13px] border border-border bg-surface-2 p-3"
              >
                <div className="flex items-start justify-between">
                  <span className="u-stat-number text-sm text-accent-strong">
                    {String(f.count).padStart(2, "0")}
                  </span>
                  <ArrowUpRight size={13} className="text-text-3" />
                </div>
                <div className="mt-6">
                  <p className="text-xs font-semibold text-text">{f.topic}</p>
                  <p className="u-label mt-0.5">{f.subject}</p>
                </div>
              </div>
            ))}
            <button className="flex items-center justify-center gap-1.5 rounded-[13px] border border-dashed border-border-2 p-3 u-label hover:text-text">
              <Plus size={13} /> add
            </button>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
