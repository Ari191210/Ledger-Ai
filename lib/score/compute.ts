// Pure scoring math — no Supabase, no I/O. Weights match the pre-rebuild
// engine: PYQ accuracy 40% / syllabus coverage 25% / mistake velocity 20% /
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

export function computeScore(inputs: ScoreInputs): ScoreBreakdown {
  const pyqAccuracy = inputs.pyqTotal > 0 ? inputs.pyqCorrect / inputs.pyqTotal : 0;
  const pyqPts = Math.round(pyqAccuracy * 400);

  const coverage =
    inputs.syllabusTotal > 0 ? inputs.syllabusCovered / inputs.syllabusTotal : 0;
  const coveragePts = Math.round(coverage * 250);

  // no evidence yet -> 0, not a free pass. Otherwise fewer recent mistakes
  // (relative to a 30-in-a-week ceiling) scores higher.
  const mistakePts =
    inputs.mistakesEverLogged === 0
      ? 0
      : Math.round(Math.max(0, 1 - inputs.mistakesRecent7d / 30) * 200);

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
