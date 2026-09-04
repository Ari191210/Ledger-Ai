import { createClient } from "@/lib/supabase/server";
import { StatNumber } from "@/components/ui/stat-number";
import { Ring } from "@/components/ui/ring";
import { getDashboardData } from "@/lib/score/inputs";

const PILLAR_NOTE: Record<string, string> = {
  pyq: "PYQ questions attempted and answered correctly, last 30 days.",
  coverage: "Syllabus topics logged as covered, out of all topics logged.",
  mistakes: "Fewer new mistakes in the last 7 days scores higher. Zero mistakes ever logged scores zero — no evidence yet, not a free pass.",
  consistency: "Current study-day streak, out of a 14-day target.",
};

export default async function ScorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { score, streakDays } = await getDashboardData(supabase, user!.id);

  return (
    <div className="mx-auto max-w-2xl">
      <span className="u-label">ledger score</span>
      <h1 className="mt-1 text-lg font-bold text-text">Ledger Score</h1>

      <section className="u-card mt-4 p-6">
        <div className="flex items-center gap-8">
          <Ring value={score.total} max={score.max} size={188} stroke={14} color="var(--accent-strong)">
            <div>
              <StatNumber value={score.total} className="text-4xl leading-none" />
              <div className="u-mono mt-1 text-2xs text-text-3">/ {score.max}</div>
            </div>
          </Ring>

          <div>
            <div className="text-base font-semibold text-text">{score.tier}</div>
            <div className="u-mono mt-1 text-2xs text-text-3">
              {score.nextTier
                ? `${score.nextTier.at - score.total} points to ${score.nextTier.label}`
                : "top tier"}
            </div>
            <div className="u-mono mt-3 flex items-center gap-1.5 text-2xs text-accent-strong">
              <span className="size-1.5 rounded-full bg-accent" /> {streakDays}d streak
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4 border-t border-border pt-6">
          {score.pillars.map((p) => (
            <div key={p.key}>
              <div className="flex items-baseline justify-between">
                <span className="u-label">
                  {p.label} <span className="text-text-3/60">· {p.weight}</span>
                </span>
                <span className="u-mono text-xs text-text">
                  {p.pts}
                  <span className="text-text-3">/{p.max}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 bg-surface-3">
                <div className="h-full bg-accent" style={{ width: `${(p.pts / p.max) * 100}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-text-2">{PILLAR_NOTE[p.key]}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="u-mono mt-4 text-2xs text-text-3">
        computed live from current data — history over time is not stored yet.
      </p>
    </div>
  );
}
