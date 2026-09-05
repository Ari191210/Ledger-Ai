import Link from "next/link";
import { ArrowLeft, Sunrise } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPyqAttempts, getMistakes } from "@/lib/study/queries";
import { hourIST } from "@/lib/date";
import { computeCircadianRows } from "@/lib/circadian";
import { EmptyState } from "@/components/ui/empty-state";

export default async function CircadianPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [pyq, mistakes] = await Promise.all([
    getPyqAttempts(supabase, user!.id),
    getMistakes(supabase, user!.id),
  ]);

  const { rows, best, totalVolume } = computeCircadianRows(
    pyq.map((a) => ({ correct: a.correct, total: a.total, hour: hourIST(a.taken_at) })),
    mistakes.map((m) => hourIST(m.created_at)),
  );
  const maxVolume = Math.max(1, ...rows.map((r) => r.volume));

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
        <h1 className="mt-1 text-lg font-bold text-text">Circadian</h1>
      </div>

      {totalVolume === 0 || !best ? (
        <EmptyState
          icon={Sunrise}
          index="no data yet"
          title="No pattern yet"
          body="Log PYQ attempts and mistakes at different times of day and this fills in with the window where you actually perform best."
          hint="log a PYQ attempt to begin"
        />
      ) : (
        <div className="space-y-3">
          <section className="u-card p-5 text-center">
            <span className="u-label">your peak window</span>
            <div className="mt-2 text-3xl font-bold text-text">{best.label}</div>
            <p className="u-mono mt-1 text-2xs text-text-3">{best.range} IST</p>
            <p className="u-mono mt-3 text-2xs text-text-3">
              {best.accuracy !== null
                ? `${best.accuracy}% pyq accuracy in this window`
                : "highest logged volume — not enough pyq data for accuracy yet"}
            </p>
          </section>

          <section className="u-card p-4">
            <span className="u-label">by time of day</span>
            <div className="mt-3 space-y-3">
              {rows.map((r) => (
                <div key={r.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={r.id === best.id ? "font-semibold text-accent-strong" : "text-text"}>
                      {r.label} · <span className="u-mono text-text-3">{r.range}</span>
                    </span>
                    <span className="u-mono text-text-2">
                      {r.accuracy !== null ? `${r.accuracy}% acc · ` : ""}
                      {r.volume} logged
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-surface-3">
                    <div
                      className="h-full transition-[width]"
                      style={{
                        width: `${(r.volume / maxVolume) * 100}%`,
                        background: r.id === best.id ? "var(--accent)" : "var(--accent-2)",
                        opacity: r.id === best.id ? 1 : 0.55,
                      }}
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
