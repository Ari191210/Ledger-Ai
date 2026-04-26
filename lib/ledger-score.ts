export type ScoreBreakdown = {
  total: number;
  pqaScore: number;        // 0–400
  syllabusScore: number;   // 0–250
  mistakeScore: number;    // 0–200
  consistencyScore: number; // 0–150
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

export function computeLedgerScore(): ScoreBreakdown {
  if (typeof window === "undefined") return EMPTY;
  try {

  // --- 1. PYQ Accuracy (0–400) ---
  const papersLog: Array<{ score: number; total: number; subject: string; date: string }> =
    safeGet("ledger-papers-log", []);
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
  const syllabusSubjects: string[] = safeGet("ledger-syllabus-subjects", []);
  const syllabusUploaded = syllabusSubjects.length > 0 || !!localStorage.getItem("ledger-syllabus");
  const notesHistory: Array<{ subject?: string }> = safeGet("ledger-notes-history", []);
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

  // --- 3. Mistake Velocity (0–200) ---
  const mistakes: Array<{ date: string }> = safeGet("ledger-mistakes", []);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentMistakes = mistakes.filter(m => new Date(m.date).getTime() > sevenDaysAgo).length;
  let mistakeScore: number;
  if (papersCount === 0 && mistakes.length === 0) {
    mistakeScore = 100;
  } else {
    mistakeScore = Math.max(0, Math.round(200 - recentMistakes * 6));
  }

  // --- 4. Consistency (0–150) ---
  const streak = parseInt(localStorage.getItem("ledger-focus-streak") ?? "0", 10) || 0;
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
  };
  } catch { return EMPTY; }
}

export function scoreTier(score: number): { label: string; next: string; nextAt: number } {
  if (score >= 800) return { label: "Exam Ready",   next: "Peak",       nextAt: 1000 };
  if (score >= 600) return { label: "Strong",       next: "Exam Ready", nextAt: 800  };
  if (score >= 400) return { label: "Developing",   next: "Strong",     nextAt: 600  };
  if (score >= 200) return { label: "Building",     next: "Developing", nextAt: 400  };
  return               { label: "Beginner",      next: "Building",   nextAt: 200  };
}
