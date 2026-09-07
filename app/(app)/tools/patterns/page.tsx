import Link from "next/link";
import { ArrowLeft, AlarmClock, Target, RotateCcw, LogOut, Clock, EyeOff, GitBranch, TrendingDown, Ghost, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadSignals } from "@/lib/signals/load";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Patterns" };

const hour12 = (h: number) => {
  const suffix = h < 12 ? "am" : "pm";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${suffix}`;
};

function Signal({
  icon: Icon,
  label,
  headline,
  children,
}: {
  icon: typeof Target;
  label: string;
  headline: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="u-card p-5">
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-accent-strong" />
        <span className="u-label">{label}</span>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-text">{headline}</p>
      {children}
    </section>
  );
}

export default async function PatternsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const s = await loadSignals(supabase, user!.id);

  return (
    <div className="w-full">
      <Link
        href="/tools"
        className="u-mono inline-flex items-center gap-1.5 text-2xs text-text-3 hover:text-text"
      >
        <ArrowLeft size={12} /> tools
      </Link>

      <div className="mt-4 mb-4">
        <span className="u-label">track</span>
        <h1 className="mt-1 text-lg font-bold text-text">Patterns</h1>
        <p className="mt-1 max-w-[52ch] text-sm text-text-2">
          Things only your own ledger can tell you. Each one appears when there is
          enough logged to say it honestly, and stays hidden until then.
        </p>
      </div>

      {s.empty ? (
        <EmptyState
          icon={Activity}
          index="00"
          title="Nothing to report yet"
          body="These patterns need a few weeks of logged papers, mistakes and focus sessions before any of them can say something true."
          hint="Each one appears on its own once there is enough to say it honestly."
        />
      ) : (
        <div className="space-y-3">
          {/* 1. exam-hour mismatch */}
          {s.examMismatch && (
            <Signal
              icon={AlarmClock}
              label="exam hour mismatch"
              headline={`You score highest in the ${s.examMismatch.bestWindowLabel} (${s.examMismatch.bestWindowRange}). ${s.examMismatch.examTitle} starts at ${hour12(s.examMismatch.examHour)}, in the ${s.examMismatch.examWindowLabel}.`}
            >
              <p className="u-mono mt-2 text-2xs text-text-3">
                {s.examMismatch.attemptsInExamWindow === 0
                  ? `you have never once logged a paper at that hour · ${s.examMismatch.daysAway} days away`
                  : `only ${s.examMismatch.attemptsInExamWindow} of your logged papers were at that hour · ${s.examMismatch.daysAway} days away`}
              </p>
            </Signal>
          )}

          {/* 2. calibration */}
          {s.calibration.length > 0 && (
            <Signal
              icon={Target}
              label="confidence calibration"
              headline={`In ${s.calibration[0].subject} you predict ${s.calibration[0].predictedPct}% and score ${s.calibration[0].actualPct}%. You are ${s.calibration[0].verdict}.`}
            >
              <div className="mt-3 divide-y divide-dashed divide-border">
                {s.calibration.map((c) => (
                  <div key={c.subject} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-xs text-text-2">{c.subject}</span>
                    <span className="u-mono text-2xs text-text-3">
                      predicted {c.predictedPct}% · actual {c.actualPct}% ·{" "}
                      <span className={c.verdict === "well calibrated" ? "text-accent-strong" : "text-text"}>
                        {c.gap > 0 ? `+${c.gap}` : c.gap}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </Signal>
          )}

          {/* 3. mistake half-life */}
          {s.halfLife.length > 0 && (
            <Signal
              icon={RotateCcw}
              label="mistake half life"
              headline={`You re-break ${s.halfLife[0].topic} about every ${s.halfLife[0].days} days.`}
            >
              <div className="mt-3 divide-y divide-dashed divide-border">
                {s.halfLife.slice(0, 5).map((h) => (
                  <div key={`${h.subject}-${h.topic}`} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-text-2">
                      {h.topic} <span className="text-text-3">{h.subject}</span>
                    </span>
                    <span className="u-mono shrink-0 text-2xs text-text-3">
                      every {h.days}d · {h.breaks}x
                    </span>
                  </div>
                ))}
              </div>
            </Signal>
          )}

          {/* 4. abandonment fingerprint */}
          {s.abandonment.length > 0 && (
            <Signal
              icon={LogOut}
              label="abandonment fingerprint"
              headline={
                s.abandonment[0].quitAtMinute !== null
                  ? `You quit ${s.abandonment[0].subject} sessions at minute ${s.abandonment[0].quitAtMinute} on average.`
                  : `You finish every ${s.abandonment[0].subject} session you start.`
              }
            >
              <div className="mt-3 divide-y divide-dashed divide-border">
                {s.abandonment.map((a) => (
                  <div key={a.subject} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-xs text-text-2">{a.subject}</span>
                    <span className="u-mono text-2xs text-text-3">
                      {a.finished}/{a.started} finished
                      {a.quitAtMinute !== null && ` · quits at ${a.quitAtMinute}m`}
                    </span>
                  </div>
                ))}
              </div>
            </Signal>
          )}

          {/* 5. the honest hour */}
          {s.honest && (
            <Signal
              icon={Clock}
              label="the honest hour"
              headline={`You started ${s.honest.started} sessions this week and finished ${s.honest.finished}. Your real study time is ${Math.floor(s.honest.realMinutes / 60)}h ${s.honest.realMinutes % 60}m, not ${Math.floor(s.honest.claimedMinutes / 60)}h ${s.honest.claimedMinutes % 60}m.`}
            />
          )}

          {/* 6. silent syllabus */}
          {s.silent.length > 0 && (
            <Signal
              icon={EyeOff}
              label="silent syllabus"
              headline={`You have never once tested yourself on ${s.silent.reduce((n, x) => n + x.topics.length, 0)} topics you listed.`}
            >
              <div className="mt-3 divide-y divide-dashed divide-border">
                {s.silent.slice(0, 4).map((x) => (
                  <div key={x.subject} className="py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-text-2">{x.subject}</span>
                      <span className="u-mono text-2xs text-text-3">{x.topics.length} untouched</span>
                    </div>
                    <p className="u-mono mt-1 text-2xs text-text-3">
                      {x.topics.slice(0, 4).join(", ")}
                      {x.topics.length > 4 && ` and ${x.topics.length - 4} more`}
                    </p>
                  </div>
                ))}
              </div>
            </Signal>
          )}

          {/* 7. topic contagion */}
          {s.contagion.length > 0 && (
            <Signal
              icon={GitBranch}
              label="topic contagion"
              headline={`When ${s.contagion[0].a} goes wrong, ${s.contagion[0].b} usually follows within ${s.contagion[0].withinDays} ${s.contagion[0].withinDays === 1 ? "day" : "days"}.`}
            >
              <div className="mt-3 divide-y divide-dashed divide-border">
                {s.contagion.slice(0, 4).map((c) => (
                  <div key={`${c.a}-${c.b}`} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-text-2">
                      {c.a} + {c.b}
                    </span>
                    <span className="u-mono shrink-0 text-2xs text-text-3">{c.times}x</span>
                  </div>
                ))}
              </div>
            </Signal>
          )}

          {/* 8. the cost of yesterday */}
          {s.streakCost && (
            <Signal
              icon={TrendingDown}
              label="the cost of a missed day"
              headline={`Breaking your streak cost you ${s.streakCost.points} points. You would be on a ${s.streakCost.wouldHaveBeen}-day streak instead of ${s.streakCost.currentStreak}.`}
            />
          )}

          {/* 9. ghost mode */}
          {s.ghosts.length > 0 && (
            <Signal
              icon={Ghost}
              label="against your past self"
              headline={
                s.ghosts[0].delta < 0
                  ? `You have got worse at ${s.ghosts[0].topic}: ${s.ghosts[0].past}% before, ${s.ghosts[0].latest}% now.`
                  : `You have improved at ${s.ghosts[0].topic}: ${s.ghosts[0].past}% before, ${s.ghosts[0].latest}% now.`
              }
            >
              <div className="mt-3 divide-y divide-dashed divide-border">
                {s.ghosts.slice(0, 5).map((g) => (
                  <div key={`${g.subject}-${g.topic}`} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-text-2">{g.topic}</span>
                    <span className="u-mono shrink-0 text-2xs text-text-3">
                      {g.past}% → {g.latest}%{" "}
                      <span className={g.delta < 0 ? "text-negative" : "text-accent-strong"}>
                        {g.delta > 0 ? `+${g.delta}` : g.delta}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </Signal>
          )}
        </div>
      )}
    </div>
  );
}
