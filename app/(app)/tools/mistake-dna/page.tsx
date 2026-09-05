import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMistakes } from "@/lib/study/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { Dna } from "lucide-react";

const TONES = [1, 0.75, 0.55, 0.4, 0.28];

export default async function MistakeDnaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const mistakes = await getMistakes(supabase, user!.id);

  const bySubject = new Map<string, { total: number; open: number }>();
  const byTopic = new Map<string, { subject: string; topic: string; total: number; open: number }>();

  for (const m of mistakes) {
    const s = bySubject.get(m.subject) ?? { total: 0, open: 0 };
    s.total++;
    if (!m.resolved_at) s.open++;
    bySubject.set(m.subject, s);

    const key = `${m.subject}::${m.topic}`;
    const t = byTopic.get(key) ?? { subject: m.subject, topic: m.topic, total: 0, open: 0 };
    t.total++;
    if (!m.resolved_at) t.open++;
    byTopic.set(key, t);
  }

  const subjects = [...bySubject.entries()]
    .map(([subject, v]) => ({ subject, ...v }))
    .sort((a, b) => b.total - a.total);
  const topics = [...byTopic.values()].sort((a, b) => b.total - a.total).slice(0, 10);
  const total = mistakes.length;

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/tools"
        className="u-mono inline-flex items-center gap-1.5 text-2xs text-text-3 hover:text-text"
      >
        <ArrowLeft size={12} /> tools
      </Link>

      <div className="mt-4 mb-3">
        <span className="u-label">practise</span>
        <h1 className="mt-1 text-lg font-bold text-text">Mistake DNA</h1>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={Dna}
          index="no data yet"
          title="Nothing to analyse"
          body="Log a mistake from any tool and its pattern shows up here: which subjects and topics you keep getting wrong."
          hint="log a mistake to begin"
        />
      ) : (
        <div className="space-y-3">
          <section className="u-card p-4">
            <span className="u-label">composition · {total} logged</span>
            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
              {subjects.map((s, i) => (
                <div
                  key={s.subject}
                  style={{
                    width: `${(s.total / total) * 100}%`,
                    background: "var(--accent)",
                    opacity: TONES[i % TONES.length],
                  }}
                />
              ))}
            </div>
            <div className="mt-3 space-y-2">
              {subjects.map((s) => (
                <div key={s.subject} className="flex items-center justify-between text-xs">
                  <span className="text-text">{s.subject}</span>
                  <span className="u-mono text-text-3">
                    <span className="text-text-2">{s.total}</span> logged · {s.open} open
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="u-card p-4">
            <span className="u-label">recurring topics</span>
            <div className="mt-3 divide-y divide-border">
              {topics.map((t) => (
                <div key={`${t.subject}-${t.topic}`} className="flex items-center gap-3 py-2.5">
                  <span className="u-stat-number w-7 shrink-0 text-sm text-accent-strong">
                    {String(t.total).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text">{t.topic}</p>
                    <p className="u-label mt-0.5">{t.subject}</p>
                  </div>
                  {t.open > 0 && (
                    <span className="u-mono shrink-0 text-2xs text-negative">{t.open} open</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
