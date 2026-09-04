import Link from "next/link";
import { ArrowLeft, Grid3x3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";

type TopicStat = { subject: string; topic: string; student_count: number; mistake_count: number };

export default async function PeerHeatmapPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("topic_struggle_stats");
  const stats = (error ? [] : (data as TopicStat[] | null) ?? []);
  const max = Math.max(1, ...stats.map((s) => s.student_count));

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/tools" className="u-mono inline-flex items-center gap-1.5 text-2xs text-text-3 hover:text-text">
        <ArrowLeft size={12} /> tools
      </Link>
      <div className="mt-4 mb-3">
        <span className="u-label">track</span>
        <h1 className="mt-1 text-lg font-bold text-text">Peer Heatmap</h1>
        <p className="u-mono mt-1 text-2xs text-text-3">
          anonymised · a topic only shows once 3 or more students have logged a mistake in it
        </p>
      </div>

      {stats.length === 0 ? (
        <EmptyState
          icon={Grid3x3}
          index={error ? "not available yet" : "not enough students yet"}
          title={error ? "Peer data isn't set up yet" : "Not enough students logged in this yet"}
          body={
            error
              ? "This needs a database migration (topic_struggle_stats) that hasn't been applied yet."
              : "Peer Heatmap only ever shows a topic once at least 3 students have logged a mistake in it, so no one's individual struggle is ever exposed. As more students use StudyLedger, this fills in on its own."
          }
        />
      ) : (
        <section className="u-card p-4">
          <span className="u-label">most struggled with</span>
          <div className="mt-3 space-y-3">
            {stats.map((s) => (
              <div key={`${s.subject}-${s.topic}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text">
                    {s.topic} <span className="u-label">{s.subject}</span>
                  </span>
                  <span className="u-mono text-text-2">{s.student_count} students</span>
                </div>
                <div className="mt-1.5 h-1.5 bg-surface-3">
                  <div
                    className="h-full bg-accent transition-[width]"
                    style={{ width: `${(s.student_count / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
