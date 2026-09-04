import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/motion/reveal";
import { StatNumber } from "@/components/ui/stat-number";
import { Segmented } from "@/components/ui/segmented";
import { Ring } from "@/components/ui/ring";
import { StudyDaysCalendar } from "@/components/dashboard/study-days-calendar";
import { FocusChart } from "@/components/dashboard/focus-chart";
import { QuickLog } from "@/components/dashboard/quick-log";
import { getDashboardData } from "@/lib/score/inputs";
import { getLedgerTape } from "@/lib/score/tape";
import { todayPartsIST, daysInMonthIST, firstWeekdayIST } from "@/lib/date";

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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = user?.email?.split("@")[0] ?? "there";
  const { score, activity, focusHistory, studiedDays, dayDetails, coveragePct, syllabusLogged, fixNext } =
    await getDashboardData(supabase, user!.id);
  const focusHistoryTotal = focusHistory.reduce((s, d) => s + d.minutes, 0);
  const focusHistoryAvg = Math.round(focusHistoryTotal / focusHistory.length);
  const tape = await getLedgerTape(supabase, user!.id);

  const { year, month, day: today } = todayPartsIST();
  const dim = daysInMonthIST(year, month);
  const firstDow = firstWeekdayIST(year, month);
  const calendarCells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];
  const monthLabel = new Date(Date.UTC(year, month - 1, 1))
    .toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" })
    .toLowerCase();

  return (
    <div className="mx-auto max-w-[1240px] space-y-4">
      <Reveal>
        <div className="flex items-baseline justify-between">
          <h1 className="text-base font-bold text-text">Hello, {name}</h1>
          <div className="flex items-center gap-3">
            <span className="u-mono text-2xs text-text-3">
              {new Date()
                .toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  timeZone: "Asia/Kolkata",
                })
                .toLowerCase()}
            </span>
            <QuickLog defaultTab="focus">
              <button className="u-mono flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-2xs font-bold text-accent-on hover:bg-accent-hover">
                <Plus size={12} /> log
              </button>
            </QuickLog>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {/* ── ledger score ─────────────────────────────── */}
          <Reveal delay={0.04}>
            <Link href="/score" className="u-card u-card--hover block p-5">
              <div className="flex items-center justify-between">
                <Label index="01">ledger score</Label>
                <span className="u-led" />
              </div>

              <div className="mt-4 flex items-center gap-6">
                <Ring value={score.total} max={score.max} size={132} stroke={11} color="var(--accent-strong)">
                  <div>
                    <StatNumber value={score.total} className="text-[2.1rem] leading-none" />
                    <div className="u-mono text-2xs text-text-3">/{score.max}</div>
                  </div>
                </Ring>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-text">{score.tier}</div>
                  <div className="u-mono mt-0.5 text-2xs text-text-3">
                    {score.nextTier
                      ? `${score.nextTier.at - score.total} to ${score.nextTier.label.toLowerCase()}`
                      : "top tier"}
                  </div>

                  <div className="mt-3 space-y-2">
                    {score.pillars.map((p) => (
                      <div key={p.key}>
                        <div className="flex items-center justify-between">
                          <span className="u-label">{p.label}</span>
                          <span className="u-mono text-2xs text-text-2">
                            {p.pts}<span className="text-text-3">/{p.max}</span>
                          </span>
                        </div>
                        <div className="mt-1 h-1 bg-surface-3">
                          <div
                            className="h-full bg-accent"
                            style={{ width: `${(p.pts / p.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
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
          <StudyDaysCalendar
            cells={calendarCells}
            today={today}
            monthLabel={monthLabel}
            studiedDays={studiedDays}
            dayDetails={dayDetails}
          />
        </Reveal>
      </div>

      {/* ── focus history ────────────────────────────────── */}
      <Reveal delay={0.1}>
        <section className="u-card p-4">
          <div className="flex items-center justify-between">
            <Label index="04">focus history</Label>
            <span className="u-mono text-2xs text-text-3">
              {Math.round(focusHistoryTotal / 60)}h total · {focusHistoryAvg}m avg/day · 30d
            </span>
          </div>
          <div className="mt-10">
            <FocusChart data={focusHistory} />
          </div>
        </section>
      </Reveal>

      {/* ── coverage strip ──────────────────────────────── */}
      <Reveal delay={0.11}>
        <section className="u-card flex items-center gap-5 p-4">
          <Label index="05">syllabus coverage</Label>
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
            <Label index="06">fix next</Label>
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
            <QuickLog defaultTab="mistake">
              <button className="flex w-full items-center justify-center gap-1.5 rounded-[13px] border border-dashed border-border-2 p-3 u-label hover:text-text">
                <Plus size={13} /> add
              </button>
            </QuickLog>
          </div>
        </section>
      </Reveal>

      {/* ── ledger tape ───────────────────────────────────── */}
      <Reveal delay={0.18}>
        <section className="u-card relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-2"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--bg) 50%, transparent 50%), linear-gradient(45deg, var(--bg) 50%, transparent 50%)",
              backgroundSize: "10px 10px",
              backgroundRepeat: "repeat-x",
              backgroundPosition: "top",
            }}
          />
          <div className="p-4 pt-5">
            <Label index="07">ledger tape</Label>
            <div className="mt-3 divide-y divide-dashed divide-border">
              {tape.length === 0 && (
                <p className="u-mono py-3 text-2xs text-text-3">
                  nothing logged in the last 14 days
                </p>
              )}
              {tape.map((e) => (
                <div key={e.id} className="u-mono flex items-center gap-3 py-2 text-2xs">
                  <span className="w-12 shrink-0 text-text-3">
                    {new Date(e.at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                  <span className="w-28 shrink-0 text-text-2">{e.label}</span>
                  <span className="flex-1 truncate text-text-3">{e.meta}</span>
                  {e.delta && <span className="shrink-0 text-accent-strong">{e.delta}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
