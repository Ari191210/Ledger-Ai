"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Ring } from "@/components/ui/ring";
import { Knob } from "@/components/ui/knob";
import { Segmented } from "@/components/ui/segmented";
import { StatNumber } from "@/components/ui/stat-number";
import { computeScore, TIER_MARKS, type ScoreBreakdown, type ScoreInputs } from "@/lib/score/compute";
import { LEVERS, leverCap, leverPhrase, project, type Lever } from "@/lib/score/whatif";

/**
 * The score panel, with the dial that answers the only question a student
 * actually asks it: what would move this.
 *
 * The number was already here and the ring already animated to it. What was
 * missing was a reason to touch either. Turning the dial re-runs the real
 * scoring formula on modified inputs and the whole panel answers at once, the
 * arc and the digits and the four pillar bars together, at dial speed rather
 * than at page-load speed. Nothing is invented: the projection is computeScore
 * with a different set of rows, and every dial stops at a real ceiling.
 *
 * At zero the panel reads exactly as the ledger stands. Any other position is
 * marked projected, in the header and on the readout, because a score a student
 * has not earned must never be able to be mistaken for one they have.
 */
export function ScoreCard({
  score,
  inputs,
}: {
  score: ScoreBreakdown;
  inputs: ScoreInputs;
}) {
  // Open on a lever that can actually be turned. Defaulting to topics meant a
  // student with no syllabus listed, or with every topic already covered, found
  // a dead control where the dial was supposed to be.
  const [lever, setLever] = useState<Lever>(
    () => LEVERS.find((l) => leverCap(l, inputs) > 0) ?? "topics",
  );
  const [amount, setAmount] = useState(0);
  // Until the dial is touched the ring keeps its entrance timing, tuned to the
  // count-up beside it. After that it belongs to the hand turning it.
  const [touched, setTouched] = useState(false);

  const cap = leverCap(lever, inputs);
  const n = Math.min(amount, cap);
  const shown = n > 0 ? computeScore(project(inputs, lever, n)) : score;
  const gain = shown.total - score.total;
  const projecting = n > 0;

  function pickLever(next: string) {
    setLever(next as Lever);
    // A "+6" left over from another lever would be answering a question the
    // student stopped asking.
    setAmount(0);
  }

  return (
    <section className="u-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="u-label">
            01 <span className="mx-1 text-text-3/60">·</span> ledger score
          </span>
          <span
            className={cn(
              "u-mono rounded-full border border-accent/40 px-1.5 py-px text-[9px] text-accent-strong",
              "transition-opacity duration-200",
              projecting ? "opacity-100" : "opacity-0",
            )}
            aria-hidden={!projecting}
          >
            projected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="u-led" />
          <Link
            href="/score"
            className="u-tap u-mono flex items-center gap-0.5 text-2xs text-text-3 transition-colors hover:text-text"
          >
            open <ArrowUpRight size={11} />
          </Link>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-6">
        <Ring
          value={shown.total}
          max={shown.max}
          size={132}
          stroke={11}
          color="var(--accent-strong)"
          marks={TIER_MARKS}
          duration={touched ? 190 : 750}
        >
          <div>
            <StatNumber
              value={shown.total}
              duration={touched ? 190 : 750}
              className="text-[2.1rem] leading-none"
            />
            <div
              className={cn(
                "u-mono text-2xs",
                projecting ? "text-accent-strong" : "text-text-3",
              )}
            >
              {projecting ? `+${gain}` : `/${shown.max}`}
            </div>
          </div>
        </Ring>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-text">{shown.tier}</div>
          <div className="u-mono mt-0.5 text-2xs text-text-3">
            {shown.nextTier
              ? `${shown.nextTier.at - shown.total} to ${shown.nextTier.label.toLowerCase()}`
              : "top tier"}
          </div>

          {/* The bars are grey on purpose. Ledger paper spends its one strong
              colour twice: a rule fencing the money column, and the closing
              balance. The ring is the closing figure; these are the workings.
              Under the dial they move too, so you can see which pillar the
              points are actually coming from. */}
          <div className="mt-3 space-y-2">
            {shown.pillars.map((p, i) => (
              <div key={p.key}>
                <div className="flex items-center justify-between">
                  <span className="u-label">{p.label}</span>
                  <span className="u-mono text-2xs text-text-2">
                    {p.pts}<span className="text-text-3">/{p.max}</span>
                  </span>
                </div>
                <div
                  className="mt-1 h-1 bg-surface-3"
                  role="progressbar"
                  aria-label={`${p.label}, ${p.pts} of ${p.max} points`}
                  aria-valuenow={p.pts}
                  aria-valuemin={0}
                  aria-valuemax={p.max}
                >
                  <div
                    className={cn(
                      "h-full transition-[width,background-color] duration-[190ms] ease-spring",
                      // Only the pillar the dial actually moved takes the
                      // colour. Lighting all four would put five accents in one
                      // panel, which is the fault this card was fixed for, and
                      // would hide the one useful fact: which pillar pays.
                      p.pts !== score.pillars[i].pts ? "bg-accent-strong" : "bg-text-3",
                    )}
                    style={{ width: `${(p.pts / p.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="u-label">what if</span>
          <Segmented options={LEVERS} value={lever} onChange={pickLever} size="sm" />
        </div>

        <div className="mt-3 flex items-center gap-5">
          {cap > 0 ? (
            <Knob
              label={`what if: ${lever}`}
              hint={n > 0 ? `+${n}` : "turn"}
              positions={Array.from({ length: cap + 1 }, (_, i) => String(i))}
              value={String(n)}
              onChange={(v) => {
                setTouched(true);
                setAmount(Number(v));
              }}
              size={64}
              sweep={280}
            />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-full border border-dashed border-border-2 text-text-3">
              <span className="u-mono text-[9px]">maxed</span>
            </span>
          )}

          <div className="min-w-0 flex-1">
            {cap === 0 && (
              <p className="u-mono text-2xs text-text-3">
                {lever === "topics"
                  ? inputs.syllabusTotal === 0
                    ? "list your syllabus and this dial has something to turn"
                    : "every topic you listed is covered"
                  : "this pillar is already full"}
              </p>
            )}
            {cap > 0 && n === 0 && (
              <p className="u-mono text-2xs text-text-3">
                turn the dial to see what it would be worth
              </p>
            )}
            {cap > 0 && n > 0 && (
              <>
                <p className="u-mono text-xs text-text">{leverPhrase(lever, n)}</p>
                <p className="u-mono mt-1 text-2xs text-text-3">
                  {score.total} <span className="mx-0.5">to</span>{" "}
                  <span className="text-text">{shown.total}</span>
                  {shown.tier !== score.tier && (
                    <span className="text-accent-strong"> · {shown.tier.toLowerCase()}</span>
                  )}
                </p>
                {gain === 0 && (
                  <p className="u-mono mt-1 text-2xs text-text-3">
                    rounds to nothing on its own, keep turning
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
