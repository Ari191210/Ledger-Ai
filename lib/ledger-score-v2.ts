// ═══════════════════════════════════════════════════════════════════════════
// LEDGER SCORE v2 — the Integrity Sprint engine (Phase 3.5, Week 1)
//
// Shadow-mode only in Week 1: computed alongside v1 by the score-snapshot
// cron, logged for comparison, never written as the close of record and never
// rendered. Cutover happens in Phase B.
//
// Design invariants (tested in scripts/test-score-v2.ts):
//   I1  No input's absence ever scores higher than its honest presence plus
//       recovery — a cleared mistake outranks a never-made one.
//   I2  Inactivity never raises the score. Accuracy uses pure exponential
//       decay with NO window cutoff (shift-invariant: aging alone cannot move
//       it); volume and recovery use trailing windows that only shrink.
//   I3  Recovery ceiling (200) > cleanliness ceiling (120): errors + clearing
//       beats error-free coasting.
//   I4  Server-side caps bound a forged blob: per-day counted questions and
//       per-session minimums apply identically in the nightly snapshot.
//
// Sector → score_history column mapping (unchanged schema):
//   Examination → pqa (0–400)     Coverage → syllabus (0–250)
//   Recovery    → mistakes (0–200) Momentum → consistency (0–150)
// ═══════════════════════════════════════════════════════════════════════════

export type PaperEntryV2 = { score: number; total: number; subject?: string; date: string };
export type MistakeEntryV2 = {
  date: string;
  subject?: string;
  topic?: string;
  category?: string;
  id?: string;
  status?: "open" | "cleared";
  clearedDate?: string;
};
export type CheckEntryV2 = { subject: string; correct: number; total: number; date: string };

export type ScoreInputsV2 = {
  papersLog: PaperEntryV2[];
  syllabusSubjects: string[];
  syllabusUploaded: boolean;
  notesHistory: Array<{ subject?: string }>;
  mistakes: MistakeEntryV2[];
  checks: CheckEntryV2[];
  /** Week 1 shadow: focus streak. Phase B: server-derived active-close streak. */
  activeStreak: number;
};

export type ScoreBreakdownV2 = {
  total: number;
  /** Examination (column: pqa) */
  pqa: number;
  /** Coverage (column: syllabus) */
  syllabus: number;
  /** Recovery (column: mistakes) */
  mistakes: number;
  /** Momentum (column: consistency) */
  consistency: number;
  // Diagnostics for projections, UI, and shadow comparison
  recentAccuracy: number;
  questionsCounted90d: number;
  improvementBonus: number;
  subjectsProven: number;
  subjectsInitiated: number;
  subjectsTotal: number;
  openMistakes: number;
  clearedMistakes30d: number;
  papersCount: number;
  streak: number;
};

const DAY_MS = 86_400_000;

/** Mistake entries created before the recovery system existed have no status.
    They are ARCHIVED (excluded), not open — old users must not start with an
    unclearable backlog from an era when clearing didn't exist. */
export const RECOVERY_EPOCH_MS = Date.parse("2026-07-17T00:00:00Z");

// Anti-gaming caps — applied identically client- and server-side (I4).
export const DAILY_QUESTION_CAP = 60;
export const MIN_SESSION_QUESTIONS = 5;
const VOLUME_FULL_AT = 300;      // 300 counted questions in 90d ≈ full weight
const ACCURACY_HALF_LIFE_DAYS = 21;

// Proof thresholds (Coverage) and clearing thresholds (Recovery)
export const PROOF_SESSION_MIN_Q = 10;
export const PROOF_SESSION_MIN_ACC = 0.6;
export const PROOF_CHECK_MIN_Q = 5;
export const PROOF_CHECK_MIN_ACC = 0.7;

const norm = (s: string | undefined) => (s || "").toLowerCase().trim();
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function sanitizeSessions(papersLog: PaperEntryV2[]): PaperEntryV2[] {
  // Server-grade sanity: finite fields, score within [0, total], parseable date.
  return (Array.isArray(papersLog) ? papersLog : [])
    .filter(p => p && Number.isFinite(p.total) && p.total > 0 && Number.isFinite(p.score) && !Number.isNaN(Date.parse(p.date)))
    .map(p => ({ ...p, score: clamp(Math.round(p.score), 0, Math.round(p.total)), total: Math.round(p.total) }));
}

export function computeScoreFromInputsV2(inputs: ScoreInputsV2, now: Date = new Date()): ScoreBreakdownV2 {
  const nowMs = now.getTime();
  const sessions = sanitizeSessions(inputs.papersLog);
  const checks = (Array.isArray(inputs.checks) ? inputs.checks : [])
    .filter(c => c && c.subject && Number.isFinite(c.total) && c.total > 0 && Number.isFinite(c.correct) && !Number.isNaN(Date.parse(c.date)))
    .map(c => ({ ...c, correct: clamp(Math.round(c.correct), 0, Math.round(c.total)), total: Math.round(c.total) }));

  // ── 1. EXAMINATION (0–400) ────────────────────────────────────────────────
  // Accuracy: exponential decay over ALL sessions (no cutoff — I2).
  let wCorrect = 0, wTotal = 0;
  for (const p of sessions) {
    const ageDays = Math.max(0, (nowMs - Date.parse(p.date)) / DAY_MS);
    const w = Math.pow(0.5, ageDays / ACCURACY_HALF_LIFE_DAYS);
    wCorrect += p.score * w;
    wTotal += p.total * w;
  }
  const recentAccuracy = wTotal > 0 ? wCorrect / wTotal : 0;

  // Volume: trailing 90d, per-day cap, per-session minimum (I4).
  const byDay = new Map<string, number>();
  for (const p of sessions) {
    const ageDays = (nowMs - Date.parse(p.date)) / DAY_MS;
    if (ageDays > 90 || p.total < MIN_SESSION_QUESTIONS) continue;
    const day = p.date.slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + p.total);
  }
  let questionsCounted90d = 0;
  for (const dayTotal of byDay.values()) questionsCounted90d += Math.min(DAILY_QUESTION_CAP, dayTotal);
  const volumeFactor = questionsCounted90d > 0
    ? Math.min(1, Math.log10(1 + questionsCounted90d) / Math.log10(1 + VOLUME_FULL_AT))
    : 0;

  // Improvement velocity: last 15 sessions vs the 15 before (by sequence, not
  // wall-clock, so the bonus is inactivity-invariant — I2).
  const asc = [...sessions].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  let improvementBonus = 0;
  if (asc.length >= 10) {
    const recent = asc.slice(-15);
    const prior = asc.slice(Math.max(0, asc.length - 30), asc.length - 15);
    if (prior.length >= 5) {
      const acc = (xs: PaperEntryV2[]) => {
        const t = xs.reduce((a, p) => a + p.total, 0);
        return t > 0 ? xs.reduce((a, p) => a + p.score, 0) / t : 0;
      };
      improvementBonus = Math.round(clamp((acc(recent) - acc(prior)) * 300, 0, 60));
    }
  }
  const pqa = clamp(Math.round(recentAccuracy * 340 * volumeFactor + improvementBonus), 0, 400);

  // ── 2. COVERAGE (0–250): proof-of-learning ────────────────────────────────
  const provenSet = new Set<string>();
  for (const p of sessions) {
    if (p.total >= PROOF_SESSION_MIN_Q && p.score / p.total >= PROOF_SESSION_MIN_ACC && norm(p.subject)) {
      provenSet.add(norm(p.subject));
    }
  }
  for (const c of checks) {
    if (c.total >= PROOF_CHECK_MIN_Q && c.correct / c.total >= PROOF_CHECK_MIN_ACC) provenSet.add(norm(c.subject));
  }
  const initiatedSet = new Set(
    (Array.isArray(inputs.notesHistory) ? inputs.notesHistory : []).map(n => norm(n.subject)).filter(Boolean),
  );

  const subjectsTotal = inputs.syllabusSubjects.length;
  let syllabus = 0;
  let subjectsProven = 0, subjectsInitiated = 0;
  if (inputs.syllabusUploaded) {
    syllabus += 50;
    if (subjectsTotal > 0) {
      let weight = 0;
      for (const s of inputs.syllabusSubjects) {
        const k = norm(s);
        if (provenSet.has(k)) { weight += 1; subjectsProven += 1; }
        else if (initiatedSet.has(k)) { weight += 0.25; subjectsInitiated += 1; }
      }
      syllabus += Math.round((weight / subjectsTotal) * 200);
    } else {
      // Legacy free-text syllabus: proof-gated fallback.
      const initiatedOnly = [...initiatedSet].filter(k => !provenSet.has(k)).length;
      subjectsProven = provenSet.size;
      subjectsInitiated = initiatedOnly;
      syllabus += Math.min(100, provenSet.size * 40 + initiatedOnly * 10);
    }
  } else {
    subjectsProven = provenSet.size;
    syllabus = Math.min(80, provenSet.size * 20);
  }
  syllabus = clamp(syllabus, 0, 250);

  // ── 3. RECOVERY (0–200): replaces Risk ────────────────────────────────────
  // Open mistakes never expire. Clearing them is the only way up (I1, I3).
  const rawMistakes = Array.isArray(inputs.mistakes) ? inputs.mistakes : [];
  let openMistakes = 0;
  let clearedMistakes30d = 0;
  for (const m of rawMistakes) {
    if (!m || Number.isNaN(Date.parse(m.date))) continue;
    if (m.status === "cleared") {
      const clearedMs = Date.parse(m.clearedDate || m.date);
      if (!Number.isNaN(clearedMs) && nowMs - clearedMs <= 30 * DAY_MS) clearedMistakes30d += 1;
    } else if (m.status === "open" || Date.parse(m.date) >= RECOVERY_EPOCH_MS) {
      openMistakes += 1; // unstatused pre-epoch entries are archived, not open
    }
  }

  let recovery: number;
  if (openMistakes + clearedMistakes30d > 0) {
    const clearRate = clearedMistakes30d / (clearedMistakes30d + openMistakes);
    recovery = Math.round(120 * clearRate + 80 * Math.min(1, clearedMistakes30d / 8));
  } else {
    // Cleanliness path: capped at 120 (I3) and earnable only through real,
    // accurate volume — zero sessions scores zero (the free 100 is dead).
    const cleanliness =
      questionsCounted90d >= 50 && recentAccuracy >= 0.85
        ? 1
        : Math.min(1, questionsCounted90d / 50) * Math.min(1, recentAccuracy / 0.85);
    recovery = Math.min(120, Math.round(120 * cleanliness));
  }
  recovery = clamp(recovery, 0, 200);

  // ── 4. MOMENTUM (0–150) ───────────────────────────────────────────────────
  const streak = Math.max(0, Math.round(inputs.activeStreak) || 0);
  const consistency = Math.min(150, Math.round(streak * 7.5));

  const total = Math.min(1000, pqa + syllabus + recovery + consistency);

  return {
    total, pqa, syllabus, mistakes: recovery, consistency,
    recentAccuracy, questionsCounted90d, improvementBonus,
    subjectsProven, subjectsInitiated, subjectsTotal,
    openMistakes, clearedMistakes30d,
    papersCount: sessions.length, streak,
  };
}

// ── Input readers — mirror v1's client/server split ──────────────────────────

function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  try { return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}

export function readScoreInputsV2(): ScoreInputsV2 | null {
  if (typeof window === "undefined") return null;
  try {
    const syllabusSubjects = safeParse<string[]>(localStorage.getItem("ledger-syllabus-subjects"), []);
    return {
      papersLog: safeParse(localStorage.getItem("ledger-papers-log"), []),
      syllabusSubjects,
      syllabusUploaded: syllabusSubjects.length > 0 || !!localStorage.getItem("ledger-syllabus"),
      notesHistory: safeParse(localStorage.getItem("ledger-notes-history"), []),
      mistakes: safeParse(localStorage.getItem("ledger-mistakes"), []),
      checks: safeParse(localStorage.getItem("ledger-checks"), []),
      activeStreak: parseInt(localStorage.getItem("ledger-focus-streak") ?? "0", 10) || 0,
    };
  } catch { return null; }
}

export function scoreInputsV2FromBlob(blob: Record<string, string> | null): ScoreInputsV2 {
  const parse = <T,>(key: string, fallback: T): T => safeParse(blob?.[key], fallback);
  const syllabusSubjects = parse<string[]>("ledger-syllabus-subjects", []);
  return {
    papersLog: parse("ledger-papers-log", []),
    syllabusSubjects,
    syllabusUploaded: syllabusSubjects.length > 0 || !!blob?.["ledger-syllabus"],
    notesHistory: parse("ledger-notes-history", []),
    mistakes: parse("ledger-mistakes", []),
    checks: parse("ledger-checks", []),
    activeStreak: parseInt(blob?.["ledger-focus-streak"] ?? "0", 10) || 0,
  };
}
