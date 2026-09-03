// ═══════════════════════════════════════════════════════════════════════════
// THE PRE-CUTOVER ENGINE. M14-2 HAS DELETED ITS STREAK TERM.
//
// This is the engine the M0–M13 surfaces still call. The REBUILD lives in
// `lib/score-engine.ts` (four dimensions, `insufficient evidence` as a state,
// a baseline period) fed by `lib/score-inputs.ts` (the event-derived input
// builder). Wiring the consumers across to it is M14-6 — *"cut over via the
// existing shadow-mode cron; stop discarding the candidate result"* — which is
// deliberately a separate task, because O.4.3 requires *"an explicit
// restatement, never a silent recompute."*
//
// WHAT M14-2 DID TO THIS FILE, AND WHAT IT DID NOT DO
//
// `PRODUCT_DECISIONS` §9.3, ratified 2026-08-10, classifies the consecutive-day
// term **REMOVE FROM SCORING** and says the implementation test out loud:
//
//   > **This is a rebuild, not a rename.** … Renaming the existing streak
//   > variable to `continuity` is explicitly **not** an implementation of this
//   > decision.
//
// So the term at the old `:218` — `Math.min(150, Math.round(streak * 7.5))` —
// is GONE. It is not renamed, not moved, not reduced in weight and not guarded
// behind a flag. `consistencyScore` remains on the breakdown at a constant 0
// and is NOT summed into `total`, because five surfaces this milestone may not
// touch read the field by name and would fail to compile without it. Those
// surfaces are M14-6's, and until then the field carries `consistencyState:
// "retired"` so the zero is at least labelled rather than passing for a
// measurement.
//
// `ScoreInputs.streak` is likewise retained and is NO LONGER READ BY THE
// FORMULA. `lib/console/vitality.ts`, `lib/console/next-move.ts` and
// `lib/score-projection.ts` still read the raw figure off the inputs for their
// own non-score purposes; removing the field would edit three files this
// milestone's scope excludes. The scoring engine's use of it is what §9.3
// bans, and that use is what has been removed.
//
// **Continuity is not computed here.** It has entirely different inputs —
// verified sessions and assessment participation — and it lives in
// `lib/score-continuity.ts`, which reads neither `ledger-focus-streak` nor any
// per-day index. That file's header is the argument.
// ═══════════════════════════════════════════════════════════════════════════

export type ScoreBreakdown = {
  total: number;
  pqaScore: number;        // 0–400
  syllabusScore: number;   // 0–250
  mistakeScore: number;    // 0–200  — see MISTAKE PILLAR below
  /**
   * RETIRED (M14-2, §9.3). Always 0, never summed into `total`, never a
   * measurement. `consistencyState` says so in the data; read that, not this.
   */
  consistencyScore: number;
  /** M14-2. `retired` — the dimension no longer exists in this engine. */
  consistencyState?: "retired";

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
  total: 0, pqaScore: 0, syllabusScore: 0, mistakeScore: 0,
  consistencyScore: 0, consistencyState: "retired",
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
  /**
   * DEPRECATED AS A SCORING INPUT (M14-2, §9.3). The formula below does not
   * read it, and no dimension anywhere is derived from it. It is still
   * populated because three non-score surfaces read the raw figure off this
   * struct and live in files this milestone's scope excludes; M14-6 removes
   * both the field and its readers.
   */
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

  // `streak` is deliberately NOT destructured. M14-2 deleted the term that read
  // it; leaving the binding in place would be the rename §9.3 refuses.
  const { papersLog, syllabusSubjects, syllabusUploaded, notesHistory, mistakes } = inputs;

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

  // ════════════════════════════════════════════════════════════════════════
  // 4. THE CONSECUTIVE-DAY TERM — DELETED (M14-2, §9.3, S.2, J.2.a)
  //
  // What stood here was `Math.min(150, Math.round(streak * 7.5))`. It is not
  // here any more, under this name or any other, and `total` no longer has a
  // fourth addend. `PRODUCT_PRINCIPLES` §4.2 bans streaks permanently and §9.3
  // removed the dependency *"you studied X days in a row, therefore your
  // academic state is better"* from the model rather than relocating it inside
  // it.
  //
  // The dimension that REPLACES it is Continuity, and it is not here either —
  // it is computed in `lib/score-continuity.ts` from verified sessions and
  // assessment participation, over inputs this legacy engine has no access to.
  // That is the whole content of *"a rebuild, not a rename."*
  // ════════════════════════════════════════════════════════════════════════
  const consistencyScore = 0;

  const total = Math.min(1000, pqaScore + syllabusScore + mistakeScore);

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

  // The two streak-framed actions that stood here are DELETED with the term
  // (M14-2). A recommendation may state an expected benefit only if the
  // mechanism that delivers it exists and is reachable (B.11); with the term
  // gone, *"protect your N-day streak"* promised points nothing could pay, and
  // §4.2 bans the framing regardless of the arithmetic.

  const actions = candidates
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3)
    .map(a => a.text);

  return {
    total, pqaScore, syllabusScore, mistakeScore,
    consistencyScore, consistencyState: "retired",
    pqaAccuracy, papersCount, syllabusUploaded, subjectsCovered, subjectsTotal,
    recentMistakes, streak: inputs.streak, actions, subjectAccuracy,
    resolutionScore, evidenceScore, acknowledgementScore,
    resolvedCount, evidenceCount,
  };
  } catch { return EMPTY; }
}

// ═══════════════════════════════════════════════════════════════════════════
// M14-7 — THE COLD-START PATH. IT IS A GAP FINDER NOW, AND IT IS NOT A SCORE.
//
// EXECUTION_PLAN M14-7: *"Carry `gapTopics` as a diagnostic; **stop calling a
// self-report a score.** ADAPT. Done when: J.4."*
//
// J.4, *"CURRENT FACT — the cold-start path that must not survive"*:
//
//   > `computeTemporaryScore` builds a **synthetic `ScoreInputs`** from
//   > self-rated confidence (`shaky 0.3 / ok 0.6 / solid 0.9`), including a
//   > fabricated 20-mark paper, and runs it through the real engine. It is
//   > carefully typed to prevent mixing (`kind: "temporary" | "real"`) and is
//   > never persisted — that discipline is real and commendable. **But it is a
//   > score derived from self-report**, and self-reported competence is the
//   > fluency illusion the product exists to replace. The baseline model
//   > replaces it. **ADAPT: keep the diagnostic as a *gap finder* — its
//   > `gapTopics` output is genuinely useful — and stop calling its output a
//   > score.**
//
//
// WHAT WAS DELETED, AND WHY THE TYPE DISCIPLINE WAS NOT ENOUGH
//
// The old path was type-safe and still wrong. `kind: "temporary"` stopped a
// self-reported figure from being MIXED with a real one; it did nothing to stop
// it from being DISPLAYED as one, and `app/tools/exam-day/page.tsx` rendered it
// at 44px over " / 1000" under the heading *"Temporary Ledger Score"* with four
// dimension bars. A student cannot see a discriminated union. They see a score.
//
// So the numbers are gone, not relabelled:
//
//   · the fabricated 20-mark paper                    DELETED
//   · the `shaky 0.3 / ok 0.6 / solid 0.9` mapping    DELETED
//   · the synthetic `ScoreInputs`                     DELETED
//   · the `computeScoreFromInputs` call               DELETED
//   · `total` / `pqaScore` / `syllabusScore` /
//     `mistakeScore` / `consistencyScore` on the
//     returned object                                 DELETED — THE TYPE HAS
//                                                     NO NUMBER TO RENDER
//
// The type is the guarantee, exactly as `LedgerScore.total: number | null` is
// in `lib/score-engine.ts`: a surface cannot show a self-reported score because
// the value it is handed does not contain one. `assertNotAScore` below is the
// same claim as a runtime assertion, so a test can state it without reading a
// type.
//
// WHAT SURVIVES. `gapTopics` — *"genuinely useful"* per J.4, and unchanged in
// its ordering: declared weaknesses first, then the merely-shaky. It is a list
// of topics the student themselves named, which is an honest thing for a
// self-report to produce. `source: "self_report"` and `verified: false` ride
// along on the value so a surface has to acknowledge what it is rendering.
// ═══════════════════════════════════════════════════════════════════════════

export type RealLedgerScore = ScoreBreakdown & { kind: "real" };

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
  /**
   * Most recent marks in this subject, as a percentage. Optional, and
   * **deliberately not converted into anything.** It used to be the accuracy
   * input to a fabricated paper; it is retained on the input type because the
   * student is asked for it and discarding an answer they gave would be rude,
   * but a remembered mark is a self-report too and M14-7 pays no number for one.
   */
  recentMarksPercent?: number;
  /** Free-form weak areas the student already knows about. */
  weakAreas: string[];
};

/**
 * The output of the five-minute cold-start questionnaire.
 *
 * **There is no `total` here, and there is no dimension here.** J.4: *"stop
 * calling its output a score."* Every field is either a topic the student
 * named or a count of topics the student named.
 */
export type ColdStartDiagnostic = {
  /** Not `"temporary"` — a temporary score is still a score. */
  kind: "diagnostic";
  /** Where this came from. The one word J.4's whole objection is about. */
  source: "self_report";
  /** Never true for this type. Present so a surface must render the caveat. */
  verified: false;
  /** Topics to drill right now, weakest first. J.4's *"genuinely useful"* half. */
  gapTopics: string[];
  /** How many topics the student rated — what the list above is drawn from. */
  topicsRated: number;
  /** How many they rated `shaky`, plus the weak areas they typed. */
  weaknessesNamed: number;
  /** The subject the questionnaire was about. */
  subject: string;
  actions: string[];
};

/**
 * The five-minute questionnaire, as a gap finder.
 *
 * No engine call, no synthetic inputs, no arithmetic on a confidence rating.
 * The only transformation is an ordering: what the student called weak comes
 * before what they called shaky-but-not-weak, because that is the order they
 * should sweep in and it is a restatement of their own answers rather than a
 * measurement of them.
 */
export function computeColdStartDiagnostic(diag: DiagnosticInputs): ColdStartDiagnostic {
  const topics = diag.topicConfidence;

  const shakyTopics = topics.filter(t => t.confidence === "shaky").map(t => t.topic);
  const weakSet = [...new Set([...shakyTopics, ...diag.weakAreas.filter(Boolean)])];
  const okTopics = topics.filter(t => t.confidence === "ok").map(t => t.topic);

  return {
    kind: "diagnostic",
    source: "self_report",
    verified: false,
    gapTopics: [...weakSet, ...okTopics.filter(t => !weakSet.includes(t))].slice(0, 6),
    topicsRated: topics.length,
    weaknessesNamed: weakSet.length,
    subject: diag.subject,
    actions: [
      weakSet.length > 0
        ? `Sweep your ${weakSet.length} weakest topic${weakSet.length === 1 ? "" : "s"} before the paper`
        : "Do a quick sweep to confirm your strong topics hold under exam pressure",
      // The old copy promised *"your real Ledger Score starts there"*. It now
      // says what J.4's baseline model actually does, because a score does not
      // start from one paper (V.6.1, V.6.2).
      "This is your own read of your topics — not a score. A Ledger Score needs assessed work behind it.",
    ],
  };
}

/**
 * M14-7's done-when, as a runtime assertion.
 *
 * *"Stop calling a self-report a score"* is a claim about an ABSENCE, and there
 * is no unit test for an absence — only a check that comes back empty. This is
 * that check, exported so `tests/` can state the guarantee over a real returned
 * value rather than over the type declaration alone.
 */
export const SCORE_FIELD_NAMES = Object.freeze([
  "total", "pqaScore", "syllabusScore", "mistakeScore", "consistencyScore",
  "score", "ledgerScore", "points", "tier",
] as const);

export function selfReportedScoreFields(value: object): string[] {
  return SCORE_FIELD_NAMES.filter(k => k in value);
}

export function scoreTier(score: number): { label: string; next: string; nextAt: number } {
  if (score >= 800) return { label: "Exam Ready",   next: "Peak",       nextAt: 1000 };
  if (score >= 600) return { label: "Strong",       next: "Exam Ready", nextAt: 800  };
  if (score >= 400) return { label: "Developing",   next: "Strong",     nextAt: 600  };
  if (score >= 200) return { label: "Building",     next: "Developing", nextAt: 400  };
  return               { label: "Beginner",      next: "Building",   nextAt: 200  };
}
