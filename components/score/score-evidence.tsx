import Link from "next/link";
import { Sunrise, Dna } from "lucide-react";
import { HourDial } from "@/components/dashboard/hour-dial";
import { SyllabusCard } from "@/components/dashboard/syllabus-card";
import { StudyDaysCalendar } from "@/components/dashboard/study-days-calendar";
import { FocusChart } from "@/components/dashboard/focus-chart";
import { Reveal } from "@/components/motion/reveal";
import type { DashboardData } from "@/lib/score/inputs";
import type { getLedgerTape } from "@/lib/score/tape";
import { todayPartsIST, daysInMonthIST, firstWeekdayIST } from "@/lib/date";

/**
 * The evidence behind the Ledger Score: the record of what was actually done.
 *
 * These sections used to sit on the dashboard, which made it twelve cards long
 * and buried the two questions a student opens it to answer: am I ready, and
 * what do I do next. None of them answers either. They answer "why is my score
 * what it is", which is exactly the question the score page exists for, so they
 * live here now, under the number they explain.
 */

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

export function ScoreEvidence({
  data,
  tape,
  topPattern,
}: {
  data: DashboardData;
  tape: Awaited<ReturnType<typeof getLedgerTape>>;
  topPattern: { subject: string; topic: string; count: number } | null;
}) {
  const { activity, focusHistory, studiedDays, dayDetails, coveragePct, syllabusLogged, syllabusCard, hourAccuracy } =
    data;
  const focusHistoryTotal = focusHistory.reduce((s, d) => s + d.minutes, 0);
  const focusHistoryAvg = Math.round(focusHistoryTotal / focusHistory.length);

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
    <div className="space-y-4">
      <div className="pt-4">
        <span className="u-label">the evidence</span>
        <p className="mt-1 text-xs text-text-2">Everything the number above is built from.</p>
      </div>

      <Reveal delay={0.04}>
        <section className="u-card p-4">
          <div className="flex items-center justify-between">
            <Label index="01">study activity</Label>
            <span className="u-mono text-2xs text-text-3">last 7 days</span>
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

      <Reveal delay={0.06}>
        <StudyDaysCalendar
          index="02"
          cells={calendarCells}
          today={today}
          monthLabel={monthLabel}
          studiedDays={studiedDays}
          dayDetails={dayDetails}
        />
      </Reveal>

      <Reveal delay={0.08}>
        <section className="u-card p-4">
          <div className="flex items-center justify-between">
            <Label index="03">focus history</Label>
            <span className="u-mono text-2xs text-text-3">
              {Math.round(focusHistoryTotal / 60)}h total · {focusHistoryAvg}m avg/day · 30d
            </span>
          </div>
          <div className="mt-10">
            <FocusChart data={focusHistory} />
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.1}>
        <section className="u-card p-4">
          <Label index="04">syllabus coverage</Label>
          {syllabusLogged ? (
            <SyllabusCard card={syllabusCard} coveragePct={coveragePct} />
          ) : (
            <p className="u-mono mt-3 text-2xs text-text-3">no syllabus logged yet</p>
          )}
        </section>
      </Reveal>

      <Reveal delay={0.12}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/tools/circadian" className="u-card u-card--hover p-4">
            <div className="flex items-center gap-2">
              <Sunrise size={13} className="text-text-3" />
              <Label index="05">best hours</Label>
            </div>
            <HourDial hours={hourAccuracy} />
          </Link>

          <Link href="/tools/mistake-dna" className="u-card u-card--hover p-4">
            <div className="flex items-center gap-2">
              <Dna size={13} className="text-text-3" />
              <Label index="06">mistake dna</Label>
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

      <Reveal delay={0.14}>
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
                <p className="u-mono py-3 text-2xs text-text-3">nothing logged in the last 14 days</p>
              )}
              {tape.map((e) => (
                <div key={e.id} className="u-mono flex items-center gap-3 py-2 text-2xs">
                  <span className="w-12 shrink-0 text-text-3">
                    {new Date(e.at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })}
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
