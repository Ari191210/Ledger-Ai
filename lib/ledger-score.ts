export type ScoreBreakdown = {
  total: number;
  pqaScore: number;        // 0–400
  syllabusScore: number;   // 0–250
  mistakeScore: number;    // 0–200  — see MISTAKE PILLAR below
  consistencyScore: number; // 0–150

  // The three components of the mistake pillar, exposed so the score is
  // explainable rather than a single opaque figure (PRODUCT_DECISIONS §4.11).
  // Optional so existing consumers that build a ScoreBreakdown literal keep
  // compiling.
  // TODO(M9): make these required once the Console surfaces are rebuilt.
  resolutionScore?: number;      // 0–120
  evidenceScore?: number;        // 0–50
  acknowledgementScore?: number; // 0–30
  resolvedCount?: number;
  evidenceCount?: number;
  pqaAccuracy: number;     // 0–1
  papersCount: number;
  syllabusUploaded: boolean;
  subjectsCovered: number;
  subjectsTotal: number;
  recentMistakes: number;
  streak: number;
  actions: string[];
  subjectAccuracy: Array<{ subject: string; accuracy: number; sessions: number }>;
};

const EMPTY: ScoreBreakdown = {
  total: 0, pqaScore: 0, syllabusScore: 0, mistakeScore: 0, consistencyScore: 0,
  pqaAccuracy: 0, papersCount: 0, syllabusUploaded: false,
  subjectsCovered: 0, subjectsTotal: 0, recentMistakes: 0, streak: 0,
  actions: [], subjectAccuracy: [],
};

function safeGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

// Everything the score needs, decoupled from localStorage so the server can
// compute it from the synced user_data.blob (see lib/sync.ts SYNC_KEYS).
export type ScoreInputs = {
  papersLog: Array<{ score: number; total: number; subject: string; date: string }>;
  syllabusSubjects: string[];
  syllabusUploaded: boolean;
  notesHistory: Array<{ subject?: string }>;
  /**
   * A recorded mistake. `date` is all that legacy localStorage rows carry;
   * the richer fields arrive with the server-owned record (M1-7). A row with
   * no `status` is treated as `open` — never as resolved, never as absent.
   */
  mistakes: Array<{
    date: string;
    /** Pattern identity. Used to deduplicate — see MISTAKE PILLAR. */
    id?: string;
    /** Lifecycle status (PRODUCT_DECISIONS §4.8). */
    status?: string;
    /** The evidence this was captured from. Deduplicated by this. */
    evidenceId?: string;
  }>;
  streak: number;
};

// Single source of truth for reading score inputs off this device.
// The projection layer (lib/score-projection.ts) reuses this so simulated
// deltas are computed from exactly the same data the real score uses.
export function readScoreInputs(): ScoreInputs | null {
  if (typeof window === "undefined") return null;
  try {
    const syllabusSubjects: string[] = safeGet("ledger-syllabus-subjects", []);
    return {
      papersLog:        safeGet("ledger-papers-log", []),
      syllabusSubjects,
      syllabusUploaded: syllabusSubjects.length > 0 || !!localStorage.getItem("ledger-syllabus"),
      notesHistory:     safeGet("ledger-notes-history", []),
      mistakes:         safeGet("ledger-mistakes", []),
      streak:           parseInt(localStorage.getItem("ledger-focus-streak") ?? "0", 10) || 0,
    };
  } catch { return null; }
}

export function computeLedgerScore(): ScoreBreakdown {
  const inputs = readScoreInputs();
  if (!inputs) return EMPTY;
  return computeScoreFromInputs(inputs);
}

// Server-side twin of readScoreInputs: the synced user_data.blob stores raw
// localStorage strings (lib/sync.ts), so any server surface (parent report,
// parent digest, cron risk alerts) derives ScoreInputs from it through this
// one mapping instead of re-implementing it.
export function scoreInputsFromBlob(blob: Record<string, string> | null): ScoreInputs {
  const parse = <T,>(key: string, fallback: T): T => {
    try {
      const v = blob?.[key];
      return v ? (JSON.parse(v) as T) : fallback;
    } catch { return fallback; }
  };
  const syllabusSubjects = parse<string[]>("ledger-syllabus-subjects", []);
  return {
    papersLog:        parse("ledger-papers-log", []),
    syllabusSubjects,
    syllabusUploaded: syllabusSubjects.length > 0 || !!blob?.["ledger-syllabus"],
    notesHistory:     parse("ledger-notes-history", []),
    mistakes:         parse("ledger-mistakes", []),
    streak:           parseInt(blob?.["ledger-focus-streak"] ?? "0", 10) || 0,
  };
}

export function computeScoreFromInputs(inputs: ScoreInputs): ScoreBreakdown {
  try {

  const { papersLog, syllabusSubjects, syllabusUploaded, notesHistory, mistakes, streak } = inputs;

  // --- 1. PYQ Accuracy (0–400) ---
  const papersCount = papersLog.length;
  let totalCorrect = 0, totalAnswered = 0;
  papersLog.forEach(p => { totalCorrect += p.score; totalAnswered += p.total; });
  const pqaAccuracy = totalAnswered > 0 ? totalCorrect / totalAnswered : 0;
  const sessionBonus = Math.min(50, papersCount * 5);
  const pqaScore = papersCount > 0 ? Math.min(400, Math.round(pqaAccuracy * 350 + sessionBonus)) : 0;

  // Per-subject accuracy
  const subjectMap: Record<string, { correct: number; total: number; sessions: number }> = {};
  papersLog.forEach(p => {
    if (!subjectMap[p.subject]) subjectMap[p.subject] = { correct: 0, total: 0, sessions: 0 };
    subjectMap[p.subject].correct  += p.score;
    subjectMap[p.subject].total    += p.total;
    subjectMap[p.subject].sessions += 1;
  });
  const subjectAccuracy = Object.entries(subjectMap)
    .map(([subject, d]) => ({ subject, accuracy: d.correct / d.total, sessions: d.sessions }))
    .sort((a, b) => a.accuracy - b.accuracy);

  // --- 2. Syllabus Coverage (0–250) ---
  const coveredSet = new Set(
    notesHistory.map(n => (n.subject || "").toLowerCase().trim()).filter(Boolean)
  );
  const subjectsTotal = syllabusSubjects.length;
  const subjectsCovered = subjectsTotal > 0
    ? syllabusSubjects.filter(s => coveredSet.has(s.toLowerCase().trim())).length
    : coveredSet.size;

  let syllabusScore = 0;
  if (syllabusUploaded) {
    syllabusScore += 50;
    if (subjectsTotal > 0) {
      syllabusScore += Math.round((subjectsCovered / subjectsTotal) * 200);
    } else {
      syllabusScore += Math.min(100, coveredSet.size * 20);
    }
  } else {
    syllabusScore = Math.min(80, coveredSet.size * 20);
  }
  syllabusScore = Math.min(250, syllabusScore);

  // ════════════════════════════════════════════════════════════════════════
  // 3. MISTAKE PILLAR (0–200) — PRODUCT_DECISIONS §4.11
  //
  // THE INVARIANT: recording evidence must NEVER reduce a student's score.
  // PRODUCT_PRINCIPLES §3.3 — the entire company depends on students logging
  // honestly, so a scoreboard that penalises logging punishes exactly the
  // behaviour we exist to create, and rewards hiding evidence.
  //
  // The previous model was `200 - recentMistakes * 6`: it paid a student six
  // points for every mistake they did not write down.
  //
  // Every component below is a COUNT with a ceiling, never a proportion.
  // That is what makes the invariant structural: a new unresolved occurrence
  // enters no denominator, so it cannot move any term downward. Capture can
  // only ever add. Resolution adds four times faster.
  //
  //   resolution     0–120  20 per resolved pattern
  //   evidence       0–50    5 per DISTINCT piece of evidence
  //   acknowledgement 0–30   5 per pattern faced rather than avoided
  //
  // TODO(§4.11): the ratified text describes resolution as a "proportion of
  // patterns proven resolved". A proportion cannot satisfy the invariant — its
  // denominator grows with capture, so logging a new mistake would lower the
  // score. Implemented as a count; §4.11's wording needs amending to match.
  // ════════════════════════════════════════════════════════════════════════
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentMistakes = mistakes.filter(m => new Date(m.date).getTime() > sevenDaysAgo).length;

  // Deduplicate by pattern id. Recording the same mistake twice is one
  // mistake — repetition must never manufacture score.
  const seenIds = new Set<string>();
  const uniqueMistakes = mistakes.filter(m => {
    if (!m.id) return true;              // legacy rows have no identity
    if (seenIds.has(m.id)) return false;
    seenIds.add(m.id);
    return true;
  });

  // Evidence QUALITY: distinct evidence only. Ten occurrences extracted from
  // one photographed paper are one piece of evidence, so re-logging the same
  // paper earns nothing.
  const evidenceCount = new Set(
    uniqueMistakes.map(m => m.evidenceId).filter((e): e is string => typeof e === "string" && e.length > 0)
  ).size;

  // Only the system can set 'resolved' (PRINCIPLES §3.1), so this cannot be
  // self-awarded.
  const resolvedCount = uniqueMistakes.filter(m => m.status === "resolved").length;

  // Faced rather than avoided. An 'open' pattern has not been looked at;
  // 'dormant' means it was left alone. Neither counts.
  const FACED = ["acknowledged", "practising", "resolved", "recurred"];
  const facedCount = uniqueMistakes.filter(m => typeof m.status === "string" && FACED.includes(m.status)).length;

  const resolutionScore     = Math.min(120, resolvedCount  * 20);
  const evidenceScore       = Math.min(50,  evidenceCount  * 5);
  const acknowledgementScore = Math.min(30, facedCount     * 5);

  const mistakeScore = resolutionScore + evidenceScore + acknowledgementScore;

  // --- 4. Consistency (0–150) ---
  const consistencyScore = Math.min(150, Math.round(streak * 7.5));

  const total = Math.min(1000, pqaScore + syllabusScore + mistakeScore + consistencyScore);

  // --- Actions ---
  type Action = { text: string; gain: number };
  const candidates: Action[] = [];

  if (papersCount === 0) {
    candidates.push({ text: "Do your first Past Papers session — PYQ accuracy is 40% of your score", gain: 80 });
  } else if (pqaAccuracy < 0.7) {
    candidates.push({ text: "Drill your weakest past-paper topic to push accuracy above 70%", gain: 40 });
  } else if (papersCount < 5) {
    candidates.push({ text: "More Past Papers sessions strengthen your accuracy signal", gain: 20 });
  }

  if (!syllabusUploaded) {
    candidates.push({ text: "Upload your syllabus — this alone unlocks up to 250 score points", gain: 200 });
  } else if (subjectsTotal > 0 && subjectsCovered < subjectsTotal) {
    const missing = syllabusSubjects.filter(s => !coveredSet.has(s.toLowerCase().trim()));
    candidates.push({ text: `Generate Notes for "${missing[0] || "an uncovered subject"}" to raise syllabus coverage`, gain: 30 });
  }

  if (recentMistakes > 5) {
    candidates.push({ text: "Open Mistake DNA — you have recurring errors to resolve this week", gain: 25 });
  }

  if (streak === 0) {
    candidates.push({ text: "Start a Focus session today to open your streak", gain: 15 });
  } else if (streak < 7) {
    candidates.push({ text: `Protect your ${streak}-day streak — complete a Focus session today`, gain: 10 });
  }

  const actions = candidates
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3)
    .map(a => a.text);

  return {
    total, pqaScore, syllabusScore, mistakeScore, consistencyScore,
    pqaAccuracy, papersCount, syllabusUploaded, subjectsCovered, subjectsTotal,
    recentMistakes, streak, actions, subjectAccuracy,
    resolutionScore, evidenceScore, acknowledgementScore,
    resolvedCount, evidenceCount,
  };
  } catch { return EMPTY; }
}

// ── Temporary (cold-start) score ─────────────────────────────────────────────
//
// A student opening Exam-Day Mode with zero history gets a Temporary Ledger
// Score from a 5-minute self-report diagnostic. It is computed by feeding a
// SYNTHETIC ScoreInputs through the same computeScoreFromInputs engine — no
// separate formula — and it is NEVER written to localStorage or Supabase, so
// it cannot pollute the real score. The discriminated `kind` field keeps the
// two from ever being mixed at the type level.

export type RealLedgerScore = ScoreBreakdown & { kind: "real" };

export type TemporaryLedgerScore = {
  kind: "temporary";
  total: number;
  pqaScore: number;
  syllabusScore: number;
  mistakeScore: number;
  consistencyScore: number;
  /** Topics to drill right now, weakest first. */
  gapTopics: string[];
  actions: string[];
};

export type LedgerScoreValue = RealLedgerScore | TemporaryLedgerScore;

export function realLedgerScore(): RealLedgerScore {
  return { ...computeLedgerScore(), kind: "real" };
}

export type Confidence = "shaky" | "ok" | "solid";

export type DiagnosticInputs = {
  board: string;
  grade: string;
  /** The subject being sat today. */
  subject: string;
  /** Self-rated confidence per topic in that subject. */
  topicConfidence: Array<{ topic: string; confidence: Confidence }>;
  /** Most recent marks in this subject, as a percentage. Optional. */
  recentMarksPercent?: number;
  /** Free-form weak areas the student already knows about. */
  weakAreas: string[];
};

export function computeTemporaryScore(diag: DiagnosticInputs): TemporaryLedgerScore {
  const topics = diag.topicConfidence;
  const rated = topics.length;

  // Accuracy evidence: real marks if given, else confidence self-report
  // (shaky 30% / ok 60% / solid 90%) — expressed as ONE synthetic 20-mark
  // paper so the engine's session bonus stays at first-session level.
  const confidenceAccuracy = rated > 0
    ? topics.reduce((a, t) => a + ({ shaky: 0.3, ok: 0.6, solid: 0.9 } as const)[t.confidence], 0) / rated
    : 0.5;
  const accuracy = diag.recentMarksPercent != null
    ? Math.min(1, Math.max(0, diag.recentMarksPercent / 100))
    : confidenceAccuracy;

  // Known weaknesses count as this week's open mistakes.
  const shakyTopics = topics.filter(t => t.confidence === "shaky").map(t => t.topic);
  const weakSet = [...new Set([...shakyTopics, ...diag.weakAreas.filter(Boolean)])];
  const now = new Date().toISOString();

  const synthetic: ScoreInputs = {
    papersLog: [{ score: Math.round(accuracy * 20), total: 20, subject: diag.subject, date: now }],
    syllabusSubjects: [diag.subject],
    syllabusUploaded: true, // the diagnostic itself declares the syllabus subject
    // Coverage credit only when the majority of the subject's topics are solid
    notesHistory: rated > 0 && topics.filter(t => t.confidence === "solid").length * 2 >= rated
      ? [{ subject: diag.subject }] : [],
    mistakes: weakSet.map(() => ({ date: now })),
    streak: 0, // no history — consistency cannot be self-reported
  };

  const b = computeScoreFromInputs(synthetic);
  const okTopics = topics.filter(t => t.confidence === "ok").map(t => t.topic);

  return {
    kind: "temporary",
    total: b.total,
    pqaScore: b.pqaScore,
    syllabusScore: b.syllabusScore,
    mistakeScore: b.mistakeScore,
    consistencyScore: b.consistencyScore,
    gapTopics: [...weakSet, ...okTopics.filter(t => !weakSet.includes(t))].slice(0, 6),
    actions: [
      weakSet.length > 0
        ? `Sweep your ${weakSet.length} weakest topic${weakSet.length === 1 ? "" : "s"} before the paper`
        : "Do a quick sweep to confirm your strong topics hold under exam pressure",
      "After today: log a real past paper — your real Ledger Score starts there",
    ],
  };
}

export function scoreTier(score: number): { label: string; next: string; nextAt: number } {
  if (score >= 800) return { label: "Exam Ready",   next: "Peak",       nextAt: 1000 };
  if (score >= 600) return { label: "Strong",       next: "Exam Ready", nextAt: 800  };
  if (score >= 400) return { label: "Developing",   next: "Strong",     nextAt: 600  };
  if (score >= 200) return { label: "Building",     next: "Developing", nextAt: 400  };
  return               { label: "Beginner",      next: "Building",   nextAt: 200  };
}
