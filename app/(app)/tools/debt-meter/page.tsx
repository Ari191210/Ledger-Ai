import Link from "next/link";
import { ArrowLeft, Gauge } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSyllabus } from "@/lib/study/queries";
import { EmptyState } from "@/components/ui/empty-state";

export default async function DebtMeterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const syllabus = await getSyllabus(supabase, user!.id);

  const bySubject = new Map<string, { covered: number; total: number }>();
  for (const t of syllabus) {
    const s = bySubject.get(t.subject) ?? { covered: 0, total: 0 };
    s.total++;
    if (t.covered) s.covered++;
    bySubject.set(t.subject, s);
  }

  const subjects = [...bySubject.entries()]
    .map(([subject, v]) => ({
      subject,
      ...v,
      debt: Math.round(((v.total - v.covered) / v.total) * 100),
    }))
    .sort((a, b) => b.debt - a.debt);

  const totalTopics = syllabus.length;
  const totalCovered = syllabus.filter((t) => t.covered).length;
  const overallDebt = totalTopics > 0 ? Math.round(((totalTopics - totalCovered) / totalTopics) * 100) : 0;

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
        <h1 className="mt-1 text-lg font-bold text-text">Debt Meter</h1>
      </div>

      {totalTopics === 0 ? (
        <EmptyState
          icon={Gauge}
          index="no syllabus logged"
          title="No syllabus to measure against"
          body="Log your syllabus topics from Settings or the Syllabus Tracker and your backlog shows up here, in one honest number."
          hint="log a syllabus topic to begin"
        />
      ) : (
        <div className="space-y-3">
          <section className="u-card p-5 text-center">
            <span className="u-label">overall debt</span>
            <div className="u-stat-number mt-2 text-6xl leading-none text-negative">{overallDebt}%</div>
            <p className="u-mono mt-2 text-2xs text-text-3">
              {totalTopics - totalCovered} of {totalTopics} topics not yet covered
            </p>
          </section>

          <section className="u-card p-4">
            <span className="u-label">by subject</span>
            <div className="mt-3 space-y-3">
              {subjects.map((s) => (
                <div key={s.subject}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text">{s.subject}</span>
                    <span className="u-mono text-text-2">
                      {s.covered}/{s.total} · <span className="text-negative">{s.debt}% debt</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-negative-weak">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${(s.covered / s.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
