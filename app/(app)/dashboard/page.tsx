import Link from "next/link";
import { ArrowUpRight, Plus, Megaphone, Sunrise, RotateCcw, Dna } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/motion/reveal";
import { StatNumber } from "@/components/ui/stat-number";
import { Segmented } from "@/components/ui/segmented";
import { Ring } from "@/components/ui/ring";
import { Button } from "@/components/ui/button";
import { StudyDaysCalendar } from "@/components/dashboard/study-days-calendar";
import { FocusChart } from "@/components/dashboard/focus-chart";
import { QuickLog } from "@/components/dashboard/quick-log";
import { DashboardHabits } from "@/components/dashboard/dashboard-habits";
import { getDashboardData } from "@/lib/score/inputs";
import { getLedgerTape } from "@/lib/score/tape";
import { todayPartsIST, daysInMonthIST, firstWeekdayIST, isoDateIST, isoDaysAgoIST, hourIST } from "@/lib/date";
import { getMistakes, getPyqAttempts, getActivityRange } from "@/lib/study/queries";
import { getHabits, getHabitLogs } from "@/lib/study/habits";
import { getDeadlines } from "@/lib/study/deadlines";
import { buildWeeklyBriefing, type WeekWindow } from "@/lib/coach";
import { computeCircadianRows } from "@/lib/circadian";

function Label({ index, children }: { index: string; children: string }) {
  return (
    <span className="u-label">
      {index} <span className="mx-1 text-text-3/60">·</span> {children}
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
  const uid = user!.id;
  const {
    score,
    activity,
    focusHistory,
    studiedDays,
    dayDetails,
    coveragePct,
    syllabusLogged,
    fixNext,
    streakDays,
  } = await getDashboardData(supabase, uid);
  const focusHistoryTotal = focusHistory.reduce((s, d) => s + d.minutes, 0);
  const focusHistoryAvg = Math.round(focusHistoryTotal / focusHistory.length);

  const todayIso = isoDateIST();

  const [tape, pyqAll, mistakesAll, activityRange, habits, habitLogsToday, deadlinesAll] = await Promise.all([
    getLedgerTape(supabase, uid),
    getPyqAttempts(supabase, uid),
    getMistakes(supabase, uid),
    getActivityRange(supabase, uid, isoDaysAgoIST(13), todayIso),
    getHabits(supabase, uid),
    getHabitLogs(supabase, uid, todayIso),
    getDeadlines(supabase, uid),
  ]);

  // ── coach: this week vs last, from a real 14-day activity window ──────
  function coachWindow(fromDay: string, toDay: string): WeekWindow {
    const minutes = activityRange.filter((a) => a.day >= fromDay && a.day <= toDay).reduce((s, a) => s + a.minutes, 0);
    const pyqInWindow = pyqAll.filter((p) => {
      const d = p.taken_at.slice(0, 10);
      return d >= fromDay && d <= toDay;
    });
    const mistakesLogged = mistakesAll.filter((m) => {
      const d = m.created_at.slice(0, 10);
      return d >= fromDay && d <= toDay;
    }).length;
    const mistakesResolved = mistakesAll.filter((m) => {
      if (!m.resolved_at) return false;
      const d = m.resolved_at.slice(0, 10);
      return d >= fromDay && d <= toDay;
    }).length;
    return {
      minutes,
      pyqCorrect: pyqInWindow.reduce((s, p) => s + p.correct, 0),
      pyqTotal: pyqInWindow.reduce((s, p) => s + p.total, 0),
      mistakesLogged,
      mistakesResolved,
    };
  }
  const coachHasData = activityRange.length > 0 || pyqAll.length > 0 || mistakesAll.length > 0;
  const briefing = coachHasData
    ? buildWeeklyBriefing(
        coachWindow(isoDaysAgoIST(6), todayIso),
        coachWindow(isoDaysAgoIST(13), isoDaysAgoIST(7)),
        streakDays,
      )
    : null;

  // ── habits today ────────────────────────────────────────────────────
  const doneTodaySet = new Set(habitLogsToday.map((l) => l.habit_id));
  const dashboardHabits = habits.map((h) => ({ id: h.id, name: h.name, doneToday: doneTodaySet.has(h.id) }));

  // ── deadlines: soonest 3, real days-remaining ──────────────────────
  const upcomingDeadlines = deadlinesAll.slice(0, 3).map((d) => ({
    ...d,
    daysLeft: Math.round(
      (new Date(`${d.due_date}T00:00:00Z`).getTime() - new Date(`${todayIso}T00:00:00Z`).getTime()) / 86_400_000,
    ),
  }));

  // ── circadian best window (all-time, matches the Circadian tool) ──
  const { best: bestWindow } = computeCircadianRows(
    pyqAll.map((a) => ({ correct: a.correct, total: a.total, hour: hourIST(a.taken_at) })),
    mistakesAll.map((m) => hourIST(m.created_at)),
  );

  // ── spaced review due count + mistake dna top pattern ──────────────
  const dueCount = mistakesAll.filter(
    (m) => !m.resolved_at && new Date(m.next_review_at) <= new Date(),
  ).length;

  const byTopic = new Map<string, { subject: string; topic: string; count: number }>();
  for (const m of mistakesAll) {
    const key = `${m.subject}::${m.topic}`;
    const cur = byTopic.get(key) ?? { subject: m.subject, topic: m.topic, count: 0 };
    cur.count++;
    byTopic.set(key, cur);
  }
  const topPattern = [...byTopic.values()].sort((a, b) => b.count - a.count)[0] ?? null;

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

      {/* ── coach briefing ───────────────────────────────── */}
      {briefing && (
        <Reveal delay={0.02}>
          <Link
            href="/tools/coach"
            className="u-card u-card--hover flex flex-wrap items-center gap-4 p-4"
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-accent-weak text-accent-strong">
              <Megaphone size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="u-label block">coach · this week vs last</span>
              <p className="mt-0.5 text-sm font-semibold text-text">{briefing.headline}</p>
            </div>
            <div className="ml-auto flex items-center gap-4">
              {briefing.deltas.slice(0, 2).map((d) => (
                <div key={d.label} className="text-right">
                  <div
                    className={
                      d.direction === "up"
                        ? "u-mono text-sm font-bold text-accent-strong"
                        : d.direction === "down"
                          ? "u-mono text-sm font-bold text-negative"
                          : "u-mono text-sm font-bold text-text-2"
                    }
                  >
                    {d.thisWeek}
                  </div>
                  <div className="u-label mt-0.5">{d.label}</div>
                </div>
              ))}
            </div>
          </Link>
        </Reveal>
      )}

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

      {/* ── habits today + deadlines ─────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Reveal delay={0.09}>
          <section className="u-card p-4">
            <div className="flex items-center justify-between">
              <Label index="04">habits today</Label>
              <span className="u-mono text-2xs text-text-3">
                {dashboardHabits.filter((h) => h.doneToday).length} of {dashboardHabits.length}
              </span>
            </div>
            <div className="mt-3">
              {dashboardHabits.length === 0 ? (
                <p className="u-mono py-2 text-2xs text-text-3">
                  no habits yet.{" "}
                  <Link href="/tools/habits" className="text-accent-strong hover:underline">
                    add one
                  </Link>
                </p>
              ) : (
                <DashboardHabits habits={dashboardHabits} today={todayIso} />
              )}
            </div>
          </section>
        </Reveal>

        <Reveal delay={0.1}>
          <section className="u-card p-4">
            <div className="flex items-center justify-between">
              <Label index="05">deadlines</Label>
              <Link href="/tools/deadlines">
                <Button size="sm" className="h-7 px-2.5 text-2xs">
                  <Plus size={12} /> add
                </Button>
              </Link>
            </div>
            <div className="mt-3 divide-y divide-dashed divide-border">
              {upcomingDeadlines.length === 0 && (
                <p className="u-mono py-2 text-2xs text-text-3">nothing coming up, nice</p>
              )}
              {upcomingDeadlines.map((d) => (
                <div key={d.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="grid size-9 shrink-0 place-items-center rounded-md border border-border-2 bg-surface-2">
                    <div className="text-center leading-none">
                      <div className="u-stat-number text-sm">{d.daysLeft}</div>
                      <div className="u-mono text-[8px] text-text-3">d</div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-text">{d.title}</p>
                    <p className="u-label mt-0.5">{d.subject ?? d.kind}</p>
                  </div>
                  <span className="u-mono shrink-0 rounded-full border border-border-2 px-2 py-0.5 text-[10px] text-text-2">
                    {d.kind}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      </div>

      {/* ── focus history ────────────────────────────────── */}
      <Reveal delay={0.1}>
        <section className="u-card p-4">
          <div className="flex items-center justify-between">
            <Label index="06">focus history</Label>
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
          <Label index="07">syllabus coverage</Label>
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
            <Label index="08">fix next</Label>
            <Segmented options={["all", "phy", "chem", "maths"]} size="sm" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {fixNext.length === 0 && (
              <p className="u-mono col-span-full py-2 text-2xs text-text-3">
                no open mistakes logged, nothing flagged yet
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

      {/* ── insights strip: circadian / spaced review / mistake dna ─ */}
      <Reveal delay={0.16}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/tools/circadian" className="u-card u-card--hover p-4">
            <div className="flex items-center gap-2">
              <Sunrise size={13} className="text-text-3" />
              <Label index="09">best hours</Label>
            </div>
            {bestWindow ? (
              <>
                <p className="mt-2 text-sm font-bold text-text">{bestWindow.label}</p>
                <p className="u-mono mt-0.5 text-2xs text-text-3">
                  {bestWindow.range}
                  {bestWindow.accuracy !== null ? ` · ${bestWindow.accuracy}% accuracy` : " · not enough data"}
                </p>
              </>
            ) : (
              <p className="u-mono mt-2 text-2xs text-text-3">no pattern yet</p>
            )}
          </Link>

          <Link href="/tools/spaced-review" className="u-card u-card--hover p-4">
            <div className="flex items-center gap-2">
              <RotateCcw size={13} className="text-text-3" />
              <Label index="10">spaced review</Label>
            </div>
            <p className="mt-2 text-sm font-bold text-text">{dueCount} due</p>
            <p className="u-mono mt-0.5 text-2xs text-text-3">review queue, oldest first</p>
          </Link>

          <Link href="/tools/mistake-dna" className="u-card u-card--hover p-4">
            <div className="flex items-center gap-2">
              <Dna size={13} className="text-text-3" />
              <Label index="11">mistake dna</Label>
            </div>
            {topPattern ? (
              <>
                <p className="mt-2 truncate text-sm font-bold text-text">{topPattern.topic}</p>
                <p className="u-mono mt-0.5 text-2xs text-text-3">
                  {topPattern.subject} · {topPattern.count} logged
                </p>
              </>
            ) : (
              <p className="u-mono mt-2 text-2xs text-text-3">no mistakes logged yet</p>
            )}
          </Link>
        </div>
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
            <Label index="12">ledger tape</Label>
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
