import { createClient } from "@/lib/supabase/server";
import { TIER_MARKS } from "@/lib/score/compute";
import { StatNumber } from "@/components/ui/stat-number";
import { Ring } from "@/components/ui/ring";
import { getDashboardData } from "@/lib/score/inputs";
import { getLedgerTape } from "@/lib/score/tape";
import { ScoreEvidence } from "@/components/score/score-evidence";

const PILLAR_NOTE: Record<string, string> = {
  pyq:
    "PYQ questions attempted and answered correctly, last 30 days. Accuracy counts for more the more questions are behind it, so one lucky question does not read as a perfect record and a long run of real papers is worth what it should be.",
  coverage: "Syllabus topics logged as covered, out of all topics logged.",
  mistakes:
    "The work you put into your mistakes: every review in Spaced Review counts, once per mistake per day, over 30 days. Logging a mistake never costs points.",
  consistency:
    "Days in a row you studied, out of a 14-day target. A day counts with study time, a past paper, or two or more mistakes logged.",
};

export default async function ScorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;
  const [data, tape] = await Promise.all([getDashboardData(supabase, uid), getLedgerTape(supabase, uid)]);
  const { score, streakDays } = data;

  return (
    <div className="mx-auto max-w-2xl">
      <span className="u-label">ledger score</span>
      <h1 className="mt-1 text-lg font-bold text-text">Ledger Score</h1>

      <section className="u-card mt-4 p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <Ring
            value={score.total}
            max={score.max}
            size={188}
            stroke={14}
            color="var(--accent-strong)"
            marks={TIER_MARKS}
          >
            <div>
              <StatNumber value={score.total} className="text-4xl leading-none" />
              <div className="u-mono mt-1 text-2xs text-text-3">/ {score.max}</div>
            </div>
          </Ring>

          <div className="min-w-0 text-center sm:text-left">
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
              <div
                className="mt-1.5 h-1.5 bg-surface-3"
                role="progressbar"
                aria-label={`${p.label}, ${p.pts} of ${p.max} points`}
                aria-valuenow={p.pts}
                aria-valuemin={0}
                aria-valuemax={p.max}
              >
                <div className="h-full bg-text-3" style={{ width: `${(p.pts / p.max) * 100}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-text-2">{PILLAR_NOTE[p.key]}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="u-mono mt-4 text-2xs text-text-3">
        computed live from current data. History over time is not stored yet.
      </p>

      <ScoreEvidence data={data} tape={tape} />
    </div>
  );
}
