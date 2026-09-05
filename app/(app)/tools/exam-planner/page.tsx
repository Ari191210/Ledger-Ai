import Link from "next/link";
import { ArrowLeft, Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSyllabus, getMistakes } from "@/lib/study/queries";
import { getDeadlines } from "@/lib/study/deadlines";
import { isoDateIST } from "@/lib/date";
import { buildExamPlan } from "@/lib/examPlan";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export default async function ExamPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string }>;
}) {
  const { exam: examId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const today = isoDateIST();

  const [deadlines, syllabus, mistakes] = await Promise.all([
    getDeadlines(supabase, user!.id),
    getSyllabus(supabase, user!.id),
    getMistakes(supabase, user!.id, { onlyOpen: true }),
  ]);

  const exams = deadlines
    .filter((d) => d.kind === "exam")
    .sort((a, b) => (a.due_date < b.due_date ? -1 : 1));

  const upcoming = exams.filter((e) => e.due_date >= today);
  const selected =
    exams.find((e) => e.id === examId) ?? upcoming[0] ?? exams[exams.length - 1];

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
        <h1 className="mt-1 text-lg font-bold text-text">Exam Planner</h1>
      </div>

      {!selected ? (
        <EmptyState
          icon={Flag}
          index="no exam set"
          title="No exam to count down to"
          body="Add a deadline with kind “exam” in Deadlines and Exam Planner reverse-plans the runway to it: coverage pace, revision window, and what's still open."
          hint="add an exam deadline to begin"
        />
      ) : (
        <ExamPlanBody
          exams={exams}
          selected={selected}
          today={today}
          syllabus={syllabus}
          mistakes={mistakes}
        />
      )}
    </div>
  );
}

function ExamPlanBody({
  exams,
  selected,
  today,
  syllabus,
  mistakes,
}: {
  exams: Awaited<ReturnType<typeof getDeadlines>>;
  selected: Awaited<ReturnType<typeof getDeadlines>>[number];
  today: string;
  syllabus: Awaited<ReturnType<typeof getSyllabus>>;
  mistakes: Awaited<ReturnType<typeof getMistakes>>;
}) {
  const scopedTopics = selected.subject
    ? syllabus.filter((t) => t.subject === selected.subject)
    : syllabus;
  const scopedMistakes = selected.subject
    ? mistakes.filter((m) => m.subject === selected.subject)
    : mistakes;

  const plan = buildExamPlan(today, selected.due_date, scopedTopics);

  const topicCounts = new Map<string, number>();
  for (const m of scopedMistakes) {
    const key = `${m.subject} · ${m.topic}`;
    topicCounts.set(key, (topicCounts.get(key) ?? 0) + 1);
  }
  const topOffenders = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-3">
      {exams.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {exams.map((e) => (
            <Link
              key={e.id}
              href={`/tools/exam-planner?exam=${e.id}`}
              className={cn(
                "u-mono rounded-full border px-2.5 py-1 text-2xs",
                e.id === selected.id
                  ? "border-accent bg-accent-weak text-accent-strong"
                  : "border-border-2 text-text-3 hover:text-text",
              )}
            >
              {e.title}
            </Link>
          ))}
        </div>
      )}

      <section className="u-card p-5 text-center">
        <span className="u-label">{selected.title}</span>
        <div className="u-stat-number mt-2 text-6xl leading-none text-text">
          {plan.daysLeft}
        </div>
        <p className="u-mono mt-2 text-2xs text-text-3">
          days left · {selected.due_date}
          {selected.subject && <span> · {selected.subject.toLowerCase()}</span>}
        </p>
      </section>

      <section className="u-card p-4">
        <span className="u-label">reverse plan</span>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border-2 bg-surface-2 p-3">
            <p className="u-label">coverage window</p>
            <p className="u-stat-number mt-1 text-2xl text-text">{plan.coverageDays}d</p>
          </div>
          <div className="rounded-md border border-border-2 bg-surface-2 p-3">
            <p className="u-label">revision window</p>
            <p className="u-stat-number mt-1 text-2xl text-text">{plan.revisionDays}d</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-text-2">
            {plan.uncoveredCount} of {plan.totalTopics} topics uncovered
          </span>
          <span
            className={cn(
              "u-mono font-semibold",
              plan.onTrack ? "text-accent-strong" : "text-negative",
            )}
          >
            {plan.topicsPerDay}/day needed
          </span>
        </div>
        <p className="u-mono mt-2 text-2xs text-text-3">
          {plan.totalTopics === 0
            ? "no syllabus logged for this scope yet, add topics in Syllabus Tracker"
            : plan.onTrack
              ? "that pace is manageable, stay on it"
              : "that's a steep pace, so start today or the revision window shrinks"}
        </p>
      </section>

      <section className="u-card p-4">
        <span className="u-label">clear before the exam · {scopedMistakes.length} open</span>
        {topOffenders.length === 0 ? (
          <p className="u-mono mt-3 text-2xs text-text-3">
            no open mistakes logged in this scope, clean slate
          </p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {topOffenders.map(([key, count]) => {
              const [subject, topic] = key.split(" · ");
              return (
                <div key={key} className="flex items-center gap-3 py-2.5">
                  <span className="u-stat-number w-6 shrink-0 text-sm text-negative">
                    {String(count).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text">{topic}</p>
                    <p className="u-label mt-0.5">{subject}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
