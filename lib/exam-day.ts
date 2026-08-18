// ═══════════════════════════════════════════════════════════════════════════
// EXAM-DAY — the STATE, extracted from the route (M3-2).
//
// `PRODUCT_DECISIONS` §2.4: "Exam-day is a *state* of Home, not a place."
// §2.2: Home "becomes Exam-Day mode when a paper is tomorrow".
//
// Everything below used to live as module-private functions inside
// `app/tools/exam-day/page.tsx`, which meant the only way to see exam-day
// content was to navigate to a URL. It is extracted here — EXTRACTED, not
// moved and not deleted: `/tools/exam-day` still imports these and still
// resolves in full (§1.4 deletion gate, §2.3 all 46 routes resolve). Home now
// imports the same functions and expresses the same content as an in-page
// state when proximity fires.
//
// Pure except for the two readers that touch localStorage, which are the same
// readers the route used and are guarded for SSR.
// ═══════════════════════════════════════════════════════════════════════════

export type Mistake = { date: string; subject: string; topic: string; category: string };
export type Gap = { topic: string; count: number; topCategory: string | null };

/** Mistake look-back for the gap list. Unchanged from the route. */
export const WINDOW_DAYS = 14;

// ── PROXIMITY ──────────────────────────────────────────────────────────────
// Two bands, and both are *presence* signals — a dated paper that exists.
// Neither is an absence signal, so this can never become the shame channel
// the architecture's M.5.4 forbids.

/** `PRODUCT_DECISIONS` §2.2 — "when a paper is tomorrow". Today counts. */
export const EXAM_DAY_PROXIMITY_DAYS = 1;

/**
 * The wider "a paper is close" band. Mirrors `EXAM_RISK_WINDOW_DAYS` in
 * `lib/parent-digest.ts` deliberately rather than importing it — that module
 * carries the parent email HTML, and Home is a client surface. The mirror is
 * asserted against its source in `tests/home-shell.test.mjs`, so drift fails
 * the suite (the same convention M2-1 used for the registry's key mirrors).
 */
export const EXAM_NEAR_DAYS = 7;

export type ExamSource = "record" | "plan";

export type UpcomingExam = {
  name: string;
  subject: string;
  /** Whole days from now. 0 is today. Never negative. */
  days: number;
  source: ExamSource;
};

export type ExamProximity = "none" | "near" | "exam-day";

const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

/**
 * Dated papers the student holds in the *record* (`user_data.exams`), the
 * source `/console` already read. Typed structurally so this module never
 * pulls the Supabase client into a bundle that does not need it.
 */
export function recordExams(
  exams: Array<{ name: string; subject?: string; date: string }> | undefined,
): UpcomingExam[] {
  if (!exams?.length) return [];
  return exams
    .map((e) => ({
      name: e.name,
      subject: e.subject || e.name,
      days: daysUntil(e.date),
      source: "record" as const,
    }))
    .filter((e) => Number.isFinite(e.days) && e.days >= 0)
    .sort((a, b) => a.days - b.days);
}

/**
 * Dated papers in the local plan (`ledger-plan-v1`). This is the source
 * `/tools/exam-day` reads, and it is kept so Home's state fires for exactly
 * the students the route fires for today.
 */
export function plannedExams(): UpcomingExam[] {
  if (typeof window === "undefined") return [];
  try {
    const plan = JSON.parse(localStorage.getItem("ledger-plan-v1") || "{}");
    if (!plan.subjects?.length) return [];
    return (plan.subjects as Array<{ name: string; exam: string }>)
      .map((s) => ({
        name: s.name,
        subject: s.name,
        days: daysUntil(s.exam),
        source: "plan" as const,
      }))
      .filter((s) => Number.isFinite(s.days) && s.days >= 0)
      .sort((a, b) => a.days - b.days);
  } catch {
    return [];
  }
}

/** The soonest dated paper across both sources. Null when none exists. */
export function soonestExam(
  exams?: Array<{ name: string; subject?: string; date: string }>,
): UpcomingExam | null {
  const all = [...recordExams(exams), ...plannedExams()].sort((a, b) => a.days - b.days);
  return all[0] ?? null;
}

/** The band a paper falls in. Drives Home's state — nothing else does. */
export function examProximity(exam: UpcomingExam | null): ExamProximity {
  if (!exam) return "none";
  if (exam.days <= EXAM_DAY_PROXIMITY_DAYS) return "exam-day";
  if (exam.days <= EXAM_NEAR_DAYS) return "near";
  return "none";
}

// ── THE ROUTE'S OWN LOGIC, VERBATIM ────────────────────────────────────────
// Behaviour below is unchanged from `app/tools/exam-day/page.tsx`; only its
// address changed.

/** The soonest planned paper, including today's. Used by the route. */
export function getTodayExam(): { name: string; days: number } | null {
  const first = plannedExams()[0];
  return first ? { name: first.name, days: first.days } : null;
}

// Gaps = what you got wrong in the last 14 days, grouped by topic.
// Prefers mistakes matching the day's subject; falls back to all recent,
// then to the all-time weak-topics ledger.
export function getGaps(subjectHint?: string): {
  gaps: Gap[];
  misses: number;
  source: "recent" | "all-time";
} {
  if (typeof window === "undefined") return { gaps: [], misses: 0, source: "recent" };
  try {
    const all: Mistake[] = JSON.parse(localStorage.getItem("ledger-mistakes") || "[]");
    const cutoff = Date.now() - WINDOW_DAYS * 86400000;
    const recent = all.filter((m) => new Date(m.date).getTime() >= cutoff);
    let pool = recent;
    if (subjectHint) {
      const hint = subjectHint.toLowerCase();
      const matched = recent.filter((m) => {
        const subj = (m.subject || "").toLowerCase();
        return subj !== "" && (subj.includes(hint) || hint.includes(subj));
      });
      if (matched.length > 0) pool = matched;
    }
    if (pool.length > 0) {
      const byTopic: Record<string, { count: number; cats: Record<string, number> }> = {};
      pool.forEach((m) => {
        const t = m.topic || m.subject || "General";
        byTopic[t] = byTopic[t] || { count: 0, cats: {} };
        byTopic[t].count += 1;
        if (m.category) byTopic[t].cats[m.category] = (byTopic[t].cats[m.category] || 0) + 1;
      });
      const gaps = Object.entries(byTopic)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 6)
        .map(([topic, v]) => ({
          topic,
          count: v.count,
          topCategory: Object.entries(v.cats).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null,
        }));
      return { gaps, misses: pool.length, source: "recent" };
    }
    const wt: Record<string, number> = JSON.parse(
      localStorage.getItem("ledger-weak-topics") || "{}",
    );
    const gaps = Object.entries(wt)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([topic, count]) => ({ topic, count, topCategory: null }));
    return { gaps, misses: gaps.reduce((a, g) => a + g.count, 0), source: "all-time" };
  } catch {
    return { gaps: [], misses: 0, source: "recent" };
  }
}

export function mostMissedSubject(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const all: Mistake[] = JSON.parse(localStorage.getItem("ledger-mistakes") || "[]");
    const cutoff = Date.now() - WINDOW_DAYS * 86400000;
    const counts: Record<string, number> = {};
    all
      .filter((m) => new Date(m.date).getTime() >= cutoff)
      .forEach((m) => {
        if (m.subject) counts[m.subject] = (counts[m.subject] || 0) + 1;
      });
    return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  } catch {
    return null;
  }
}
