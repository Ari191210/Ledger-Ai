import Link from "next/link";
import { ScoreCard } from "@/components/dashboard/score-card";
import { ArrowRight, ArrowUpRight, Plus, Megaphone, RotateCcw, Sunrise, Dna } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/motion/reveal";
import { SoundButtonLink } from "@/components/ui/button-link-sound";
import { QuickLog } from "@/components/dashboard/quick-log";
import { DashboardTour } from "@/components/dashboard/dashboard-tour";
import { StudyDaysCalendar } from "@/components/dashboard/study-days-calendar";
import { SyllabusCard } from "@/components/dashboard/syllabus-card";
import { HourDial } from "@/components/dashboard/hour-dial";
import { MiniTrend } from "@/components/dashboard/mini-trend";
import { tourMode } from "@/lib/tour-mode";
import { getDashboardData } from "@/lib/score/inputs";
import { isoDateIST, isoDaysAgoIST, dayKeyIST, todayPartsIST, daysInMonthIST, firstWeekdayIST } from "@/lib/date";
import { getMistakes, getPyqAttempts, getActivityRange } from "@/lib/study/queries";
import { getDeadlines } from "@/lib/study/deadlines";
import { buildWeeklyBriefing, type WeekWindow } from "@/lib/coach";

function Label({ index, children }: { index: string; children: string }) {
  return (
    <span className="u-label">
      {index} <span className="mx-1 text-text-3/60">·</span> {children}
    </span>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tour?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = user?.email?.split("@")[0] ?? "there";
  const uid = user!.id;

  // The walkthrough shows itself once, then never again unless asked for by
  // name. tour_seen_at is a column rather than localStorage so a student who
  // signs up on a phone and opens the dashboard on a laptop is not taught the
  // same page twice.
  const [{ tour }, { data: tourProfile }] = await Promise.all([
    searchParams,
    supabase.from("profiles").select("tour_seen_at").eq("id", uid).maybeSingle(),
  ]);
  const {
    score,
    scoreInputs,
    fixNext,
    streakDays,
    studiedDays,
    dayDetails,
    activity,
    coveragePct,
    syllabusLogged,
    syllabusCard,
    hourAccuracy,
  } = await getDashboardData(supabase, uid);

  const todayIso = isoDateIST();

  const [pyqAll, mistakesAll, activityRange, deadlinesAll] = await Promise.all([
    getPyqAttempts(supabase, uid),
    getMistakes(supabase, uid),
    getActivityRange(supabase, uid, isoDaysAgoIST(13), todayIso),
    getDeadlines(supabase, uid),
  ]);

  const tourOpen = tourMode({
    requested: tour === "1",
    seen: !!tourProfile?.tour_seen_at,
    hasLogged: pyqAll.length > 0 || mistakesAll.length > 0 || activityRange.length > 0,
  });

  // ── coach: this week vs last, from a real 14-day activity window ──────
  function coachWindow(fromDay: string, toDay: string): WeekWindow {
    const minutes = activityRange.filter((a) => a.day >= fromDay && a.day <= toDay).reduce((s, a) => s + a.minutes, 0);
    const pyqInWindow = pyqAll.filter((p) => {
      const d = dayKeyIST(p.taken_at);
      return d >= fromDay && d <= toDay;
    });
    const mistakesLogged = mistakesAll.filter((m) => {
      const d = dayKeyIST(m.created_at);
      return d >= fromDay && d <= toDay;
    }).length;
    const mistakesResolved = mistakesAll.filter((m) => {
      if (!m.resolved_at) return false;
      const d = dayKeyIST(m.resolved_at);
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

  // ── deadlines: soonest 3, real days-remaining ──────────────────────
  const upcomingDeadlines = deadlinesAll.slice(0, 3).map((d) => ({
    ...d,
    daysLeft: Math.round(
      (new Date(`${d.due_date}T00:00:00Z`).getTime() - new Date(`${todayIso}T00:00:00Z`).getTime()) / 86_400_000,
    ),
  }));


  // ── spaced review due count ─────────────────────────────────────────
  const dueCount = mistakesAll.filter(
    (m) => !m.resolved_at && new Date(m.next_review_at) <= new Date(),
  ).length;

  // ── this month, for the study days grid ─────────────────────────────
  const { year, month, day: today } = todayPartsIST();
  const calendarCells: (number | null)[] = [
    ...Array<null>(firstWeekdayIST(year, month)).fill(null),
    ...Array.from({ length: daysInMonthIST(year, month) }, (_, i) => i + 1),
  ];
  const monthLabel = new Date(Date.UTC(year, month - 1, 1))
    .toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" })
    .toLowerCase();

  // ── the topic logged wrong most often ───────────────────────────────
  const byTopic = new Map<string, { subject: string; topic: string; count: number }>();
  for (const m of mistakesAll) {
    const key = `${m.subject}::${m.topic}`;
    const cur = byTopic.get(key) ?? { subject: m.subject, topic: m.topic, count: 0 };
    cur.count++;
    byTopic.set(key, cur);
  }
  // Three, not one: the card sits beside the hour dial and one line left it
  // mostly empty, and a single topic reads as a verdict when the honest shape
  // of the data is a short ranking.
  const topPatterns = [...byTopic.values()].sort((a, b) => b.count - a.count).slice(0, 3);

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
            {/* The way back into the walkthrough after it has been dismissed.
                Without it, skipping the tour on the first visit means never
                being able to see it again. */}
            <Link
              href="/dashboard?tour=1"
              className="u-tap u-mono text-2xs text-text-3 transition-colors hover:text-text"
            >
              tour
            </Link>
            <QuickLog defaultTab="focus">
              <button
                data-tour="log"
                className="u-mono flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-2xs font-bold text-accent-on hover:bg-accent-hover"
              >
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
            data-tour="coach"
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

      {/* Two columns, not two stacks. The page went twelve full-width cards
          long once and the answer to "am I ready" ended up above a scroll of
          history; cutting the history instead hid the record that makes the
          number believable. So the record stays, and the density carries it:
          the score and its own evidence on the left, what is coming and what is
          due in the rail beside it, and only the long-form history (focus over
          30 days, the 14-day tape) still lives on the Score page. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          {/* ── ledger score: am I ready ─────────────────── */}
          <Reveal delay={0.04}>
            <ScoreCard score={score} inputs={scoreInputs} />
          </Reveal>

          {/* ── study activity ───────────────────────────── */}
          <Reveal delay={0.06}>
            <section className="u-card p-4" data-tour="activity">
              <div className="flex items-center justify-between">
                <Label index="02">study activity</Label>
                {/* A static label, not a control. This was a Segmented with no
                    value and no handler: it moved its pill, announced the new
                    tab as selected, and filtered nothing. The tiles below
                    really are the last 7 days. */}
                <span className="u-mono text-2xs text-text-3">last 7 days</span>
              </div>
              <div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-3">
                {activity.map((a) => (
                  <div key={a.key}>
                    <MiniTrend data={a.data} />
                    <div className="mt-2 u-stat-number text-[1.6rem]">{a.value}</div>
                    <div className="u-label mt-0.5">{a.label}</div>
                    <div className="mt-2 u-mono text-2xs text-text-3">{a.sub}</div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        </div>

        {/* ── right rail: the record, what is coming, what is due ───── */}
        <div className="flex flex-col gap-4">
          <Reveal delay={0.05}>
            <StudyDaysCalendar
              index="03"
              cells={calendarCells}
              today={today}
              monthLabel={monthLabel}
              studiedDays={studiedDays}
              dayDetails={dayDetails}
            />
          </Reveal>

          <Reveal delay={0.06}>
            <section className="u-card p-4" data-tour="deadlines">
              <div className="flex items-center justify-between">
                <Label index="04">deadlines</Label>
                <SoundButtonLink href="/tools/deadlines" size="sm" className="h-7 px-2.5 text-2xs">
                  <Plus size={12} /> add
                </SoundButtonLink>
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

          <Reveal delay={0.08}>
            <Link href="/tools/spaced-review" data-tour="spaced-review" className="u-card u-card--hover block p-4">
              <div className="flex items-center gap-2">
                <RotateCcw size={13} className="text-text-3" />
                <Label index="05">spaced review</Label>
              </div>
              <p className="mt-2 text-sm font-bold text-text">{dueCount} due</p>
              <p className="u-mono mt-0.5 text-2xs text-text-3">review queue, oldest first</p>
            </Link>
          </Reveal>
        </div>
      </div>

      {/* ── fix next ────────────────────────────────────── */}
      <Reveal delay={0.14}>
        <section className="u-card p-4" data-tour="fix-next">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label index="06">fix next</Label>
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

      {/* ── coverage strip ──────────────────────────────── */}
      <Reveal delay={0.16}>
        <section className="u-card p-4" data-tour="coverage">
          <Label index="07">syllabus coverage</Label>
          {syllabusLogged ? (
            <SyllabusCard card={syllabusCard} coveragePct={coveragePct} />
          ) : (
            <p className="u-mono mt-3 text-2xs text-text-3">no syllabus logged yet</p>
          )}
        </section>
      </Reveal>

      {/* ── two readings that point at a tool ───────────── */}
      <Reveal delay={0.18}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/tools/circadian" data-tour="best-hours" className="u-card u-card--hover p-4">
            <div className="flex items-center gap-2">
              <Sunrise size={13} className="text-text-3" />
              <Label index="08">best hours</Label>
            </div>
            <HourDial hours={hourAccuracy} />
          </Link>

          <Link href="/tools/mistake-dna" data-tour="mistake-dna" className="u-card u-card--hover p-4">
            <div className="flex items-center gap-2">
              <Dna size={13} className="text-text-3" />
              <Label index="09">mistake dna</Label>
            </div>
            {topPatterns.length === 0 ? (
              <p className="u-mono mt-2 text-2xs text-text-3">no mistakes logged yet</p>
            ) : (
              <div className="mt-3 divide-y divide-dashed divide-border">
                {topPatterns.map((p) => (
                  <div key={`${p.subject}-${p.topic}`} className="flex items-baseline gap-3 py-2 first:pt-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-text">{p.topic}</p>
                      <p className="u-label mt-0.5">{p.subject}</p>
                    </div>
                    <span className="u-mono shrink-0 text-2xs text-text-3">{p.count} logged</span>
                  </div>
                ))}
              </div>
            )}
          </Link>
        </div>
      </Reveal>

      {/* The two long records are the ones you read once a week, not daily, so
          they stay on the Score page rather than adding two more rows here. */}
      <Reveal delay={0.2}>
        <Link
          href="/score"
          data-tour="evidence"
          className="u-tap u-mono inline-flex items-center gap-1.5 text-2xs text-text-3 transition-colors hover:text-text"
        >
          focus history and the ledger tape, on the score page <ArrowRight size={12} />
        </Link>
      </Reveal>

      {/* Mounted last so every anchor above it exists by the time the tour
          measures them. Renders nothing at all unless it is running. */}
      <DashboardTour
        autoStart={tourOpen.autoStart}
        mandatory={tourOpen.mandatory}
        firstResult={
          pyqAll.length === 0
            ? { inputs: scoreInputs, before: score.total, todayStudied: studiedDays.has(Number(todayIso.slice(8, 10))) }
            : null
        }
      />
    </div>
  );
}
