// Pure scoring math, no Supabase, no I/O. Weights match the pre-rebuild
// engine: PYQ accuracy 40% / syllabus coverage 25% / mistake work 20% /
// consistency 15%, total out of 1000.

export type ScoreInputs = {
  /** PYQ questions attempted in the scoring window. */
  pyqTotal: number;
  pyqCorrect: number;
  /** All syllabus topics logged, and how many are marked covered. */
  syllabusTotal: number;
  syllabusCovered: number;
  /** Whether any mistake has ever been logged (gates the pillar). */
  mistakesEverLogged: number;
  /** Mistakes created in the last 7 days. */
  mistakesRecent7d: number;
  /** Reviews of mistakes in the last 30 days, one per mistake per day: what the mistakes pillar scores. */
  mistakeReviews30d: number;
  /** Current consecutive-day study streak. */
  streakDays: number;
};

export type ScorePillar = {
  key: "pyq" | "coverage" | "mistakes" | "consistency";
  label: string;
  weight: string;
  pts: number;
  max: number;
};

export type ScoreBreakdown = {
  total: number;
  max: number;
  tier: string;
  nextTier: { label: string; at: number } | null;
  pillars: ScorePillar[];
};

const MAX_SCORE = 1000;

/** The tier boundaries, exported so the score ring can print them on its face.
 *  An instrument that shows a value without its scale invites the reader to
 *  invent one: aircraft dials paint the redline on the dial, visible even when
 *  the needle rests at zero. */
export const TIER_MARKS = [200, 400, 600, 800] as const;

const TIERS = [
  { label: "Beginner", at: 0 },
  { label: "Building", at: 200 },
  { label: "Developing", at: 400 },
  { label: "Strong", at: 600 },
  { label: "Exam Ready", at: 800 },
] as const;

function tierFor(total: number) {
  let current: (typeof TIERS)[number] = TIERS[0];
  for (const t of TIERS) if (total >= t.at) current = t;
  const next = TIERS[TIERS.indexOf(current) + 1] ?? null;
  return { tier: current.label, nextTier: next ? { label: next.label, at: next.at } : null };
}

/** Reviews in 30 days for the full 200. */
export const REVIEWS_FOR_FULL = 20;

export function computeScore(inputs: ScoreInputs): ScoreBreakdown {
  const pyqAccuracy = inputs.pyqTotal > 0 ? inputs.pyqCorrect / inputs.pyqTotal : 0;
  const pyqPts = Math.round(pyqAccuracy * 400);

  const coverage =
    inputs.syllabusTotal > 0 ? inputs.syllabusCovered / inputs.syllabusTotal : 0;
  const coveragePts = Math.round(coverage * 250);

  // Scores working through mistakes, not avoiding them (2026-09-16, founder
  // approved). It used to score fewer new mistakes in 7 days, gated on having
  // logged any: one mistake ever logged jumped the pillar from 0 to 193, every
  // honest log after that cost points, and a student who logged once and then
  // stopped sat at 200 of 200 forever.
  //
  // Reviews rather than resolutions, because resolving takes five remembered
  // reviews spaced out to about 55 days, and a new student would score nothing
  // here for two months. A review counts once per mistake per day, so the
  // ceiling is the work the schedule actually offers.
  const mistakePts = Math.round(Math.min(1, inputs.mistakeReviews30d / REVIEWS_FOR_FULL) * 200);

  const consistencyPts = Math.round(Math.min(1, inputs.streakDays / 14) * 150);

  const pillars: ScorePillar[] = [
    { key: "pyq", label: "pyq", weight: "40%", pts: pyqPts, max: 400 },
    { key: "coverage", label: "coverage", weight: "25%", pts: coveragePts, max: 250 },
    { key: "mistakes", label: "mistakes", weight: "20%", pts: mistakePts, max: 200 },
    { key: "consistency", label: "consistency", weight: "15%", pts: consistencyPts, max: 150 },
  ];

  const total = pillars.reduce((s, p) => s + p.pts, 0);
  const { tier, nextTier } = tierFor(total);

  return { total, max: MAX_SCORE, tier, nextTier, pillars };
}
