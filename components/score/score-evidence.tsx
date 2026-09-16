import Link from "next/link";
import { FocusChart } from "@/components/dashboard/focus-chart";
import { Reveal } from "@/components/motion/reveal";
import type { DashboardData } from "@/lib/score/inputs";
import type { getLedgerTape } from "@/lib/score/tape";

/**
 * The long record behind the Ledger Score.
 *
 * Only two things live here: thirty days of focus and fourteen days of entries.
 * Both are read about once a week, and both are tall. Everything you check
 * daily, the activity tiles, the study days grid, coverage, best hours and
 * mistake DNA, is on the dashboard where the day starts. Nothing is in both
 * places, so the two pages can never disagree about what happened.
 */

function Label({ index, children }: { index: string; children: string }) {
  return (
    <span className="u-label">
      {index} <span className="mx-1 text-text-3/60">·</span> {children}
    </span>
  );
}

export function ScoreEvidence({
  data,
  tape,
}: {
  data: DashboardData;
  tape: Awaited<ReturnType<typeof getLedgerTape>>;
}) {
  const { focusHistory } = data;
  const focusHistoryTotal = focusHistory.reduce((s, d) => s + d.minutes, 0);
  const focusHistoryAvg = Math.round(focusHistoryTotal / focusHistory.length);

  return (
    <div className="space-y-4">
      <div className="pt-4">
        <span className="u-label">the evidence</span>
        <p className="mt-1 text-xs text-text-2">
          The long record. The day-to-day figures are on your{" "}
          <Link href="/dashboard" className="text-accent-strong hover:underline">
            dashboard
          </Link>
          .
        </p>
      </div>

      <Reveal delay={0.04}>
        <section className="u-card p-4">
          <div className="flex items-center justify-between">
            <Label index="01">focus history</Label>
            <span className="u-mono text-2xs text-text-3">
              {Math.round(focusHistoryTotal / 60)}h total · {focusHistoryAvg}m avg/day · 30d
            </span>
          </div>
          <div className="mt-10">
            <FocusChart data={focusHistory} />
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.06}>
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
            <Label index="02">ledger tape</Label>
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
