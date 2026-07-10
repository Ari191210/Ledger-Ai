"use client";
import { memo } from "react";
import Link from "next/link";
import type { ScorePillar } from "@/lib/score-projection";

export type ScoreImpactStripProps = {
  currentScore: number;
  projectedScore?: number;
  scoreDelta?: number;
  affectedPillar: ScorePillar;
  nextAction?: string;
  /** "will move" (projection) vs "moved" (realized, e.g. results screens) */
  realized?: boolean;
};

const PILLAR_LABEL: Record<ScorePillar, string> = {
  accuracy:    "PYQ Accuracy · 40%",
  coverage:    "Syllabus Coverage · 25%",
  mistakes:    "Mistake Velocity · 20%",
  consistency: "Consistency · 15%",
};

// Purely presentational — all numbers arrive as props so the strip never
// recomputes the score itself (parents own the single computation), and
// memo() keeps it out of parent re-renders driven by unrelated state.
const ScoreImpactStrip = memo(function ScoreImpactStrip({
  currentScore, projectedScore, scoreDelta, affectedPillar, nextAction, realized = false,
}: ScoreImpactStripProps) {
  const hasDelta = typeof scoreDelta === "number" && scoreDelta !== 0;
  const projected = projectedScore ?? (typeof scoreDelta === "number" ? currentScore + scoreDelta : undefined);

  return (
    <div
      role="status"
      aria-label="Ledger Score impact"
      style={{
        border: "1px solid var(--rule)",
        borderLeft: "3px solid var(--cinnabar-ink)",
        background: "var(--paper-2)",
        padding: "12px 16px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "10px 22px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          Ledger Score
        </span>
        <span className="mono" style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>
          {currentScore}
        </span>
      </div>

      {hasDelta && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="mono" style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: scoreDelta! > 0 ? "var(--sage)" : "var(--cinnabar-ink)" }}>
            {scoreDelta! > 0 ? `+${scoreDelta}` : scoreDelta}
          </span>
          {!realized && projected !== undefined && (
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>
              → {projected} projected
            </span>
          )}
          {realized && (
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-2)" }}>
              from this session
            </span>
          )}
        </div>
      )}

      <span className="mono" style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", border: "1px solid var(--rule)", padding: "2px 8px" }}>
        {PILLAR_LABEL[affectedPillar]}
      </span>

      {nextAction && (
        <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-2)", flexBasis: "100%" }}>
          {nextAction}
        </span>
      )}

      <Link href="/tools/grade-tracker" className="mono" style={{ fontSize: 9, color: "var(--ink-3)", marginLeft: "auto", textDecoration: "none" }}>
        Full breakdown →
      </Link>
    </div>
  );
});

export default ScoreImpactStrip;
