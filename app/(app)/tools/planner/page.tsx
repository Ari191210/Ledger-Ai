import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSyllabus } from "@/lib/study/queries";
import { getDeadlines } from "@/lib/study/deadlines";
import { isoDateIST } from "@/lib/date";
import { rankSubjects, buildTodaysPlan } from "@/lib/planner";
import { EmptyState } from "@/components/ui/empty-state";

export default async function PlannerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const today = isoDateIST();
  const [deadlines, syllabus] = await Promise.all([
    getDeadlines(supabase, user!.id),
    getSyllabus(supabase, user!.id),
  ]);

  const priorities = rankSubjects(deadlines, syllabus, today);
  const plan = buildTodaysPlan(priorities, syllabus);

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/tools"
        className="u-mono inline-flex items-center gap-1.5 text-2xs text-text-3 hover:text-text"
      >
        <ArrowLeft size={12} /> tools
      </Link>

      <div className="mt-4 mb-3">
        <span className="u-label">plan</span>
        <h1 className="mt-1 text-lg font-bold text-text">Planner</h1>
      </div>

      {priorities.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          index="no data yet"
          title="Nothing to plan against"
          body="Add a deadline or log your syllabus topics and Planner reverse-plans your week from what's actually due and uncovered."
          hint="add a deadline to begin"
        />
      ) : (
        <div className="space-y-3">
          <section className="u-card p-4">
            <span className="u-label">today's plan</span>
            <div className="mt-2 divide-y divide-border">
              {plan.map((b, i) => (
                <div key={`${b.subject}-${b.topic}`} className="flex items-center gap-3 py-2.5">
                  <span className="u-stat-number w-6 shrink-0 text-sm text-accent-strong">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text">{b.topic}</p>
                    <p className="u-label mt-0.5">{b.subject}</p>
                  </div>
                  <span className="u-mono shrink-0 text-2xs text-text-3">{b.reason}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="u-card p-4">
            <span className="u-label">this week's allocation</span>
            <div className="mt-3 space-y-3">
              {priorities.map((p) => (
                <div key={p.subject}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text">{p.subject}</span>
                    <span className="u-mono text-text-2">{p.allocationPct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-surface-3">
                    <div
                      className="h-full bg-accent transition-[width]"
                      style={{ width: `${p.allocationPct}%` }}
                    />
                  </div>
                  <p className="u-mono mt-1 text-2xs text-text-3">
                    {p.daysUntilDeadline !== null
                      ? `${p.nearestDeadlineTitle} in ${p.daysUntilDeadline}d · `
                      : ""}
                    {p.debtPct}% debt
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
