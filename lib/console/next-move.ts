import type { ScoreInputs } from "@/lib/ledger-score";
import {
  projectSyllabusImpact,
  projectCoverageImpact,
  projectFocusImpact,
} from "@/lib/score-projection";

// ═══════════════════════════════════════════════════════════════════════════
// THE ONE MOVE (CONSOLE.md §7 — the Direction beat).
//
// NOW shows exactly one action. Not a ranked list with the others greyed out —
// one. A student at 11pm with an exam tomorrow cannot afford to choose.
//
// A gain figure is shown ONLY where the mechanism that pays it exists and is
// reachable. Where a figure is shown it comes from the real projection engine
// (lib/score-projection.ts), which simulates the move against the same inputs
// the live score uses — nothing is estimated, rounded up, or invented.
//
// The mistake move deliberately carries NO figure. Its projection assumed a
// mistake could reach `status: "resolved"`, and no production action produces
// that state, so any number here would be a promise the system cannot pay
// (PRODUCT_PRINCIPLES Law 7). It states the real benefit in words instead. The
// figure returns when the evidence pipeline makes resolution real (M14) — not
// before, and never by patching the formula.
//
// Ordering is by what unblocks the most, not by what scores the most:
//   1. No syllabus  → nothing else can be measured against anything
//   2. Nothing covered → coverage is the largest single pillar
//   3. Recent mistakes → unresolved errors suppress the score every day
//   4. Streak cold → consistency compounds and is the cheapest to restart
//   5. Otherwise    → practice, the thing that actually moves accuracy
// ═══════════════════════════════════════════════════════════════════════════

export type NextMove = {
  /** Verb-first. What the student does, not what the system computed. */
  headline: string;
  /** Real projected gain in points. Null when the move has no payable delta. */
  gain: number | null;
  /** Plain-language benefit, shown when `gain` is null. */
  note?: string;
  /** Which pillar this moves. Used for the quiet provenance line. */
  pillar: string;
  /** Where the action goes. */
  href: string;
  /** The control's label. */
  cta: string;
};

export function deriveNextMove(inputs: ScoreInputs): NextMove {
  // 1 ── No syllabus. Everything downstream measures against it.
  if (!inputs.syllabusUploaded || inputs.syllabusSubjects.length === 0) {
    const p = projectSyllabusImpact(inputs, ["Physics", "Chemistry", "Mathematics"]);
    return {
      headline: "Map your syllabus",
      gain: p.delta > 0 ? p.delta : null,
      pillar: "Coverage",
      href: "/tools/syllabus",
      cta: "Upload it",
    };
  }

  // 2 ── Syllabus exists but nothing is proven against it.
  const covered = new Set(
    inputs.notesHistory.map((n) => n.subject).filter((s): s is string => !!s),
  );
  const uncovered = inputs.syllabusSubjects.filter((s) => !covered.has(s));
  if (uncovered.length > 0) {
    const subject = uncovered[0];
    const p = projectCoverageImpact(inputs, subject);
    if (p.delta > 0) {
      return {
        headline: `Cover ${subject}`,
        gain: p.delta,
        pillar: "Coverage",
        href: "/tools/learn-lab",
        cta: "Start",
      };
    }
  }

  // 3 ── Unresolved recent mistakes suppress the score every day they sit.
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = inputs.mistakes.filter((m) => {
    const t = new Date(m.date).getTime();
    return Number.isFinite(t) && t >= weekAgo;
  }).length;
  if (recent > 0) {
    return {
      headline: recent === 1 ? "Review your open mistake" : `Review ${recent} open mistakes`,
      gain: null,
      note: "This improves your mistake record. It does not move your score yet.",
      pillar: "Recovery",
      href: "/tools/post-exam",
      cta: "Review them",
    };
  }

  // 4 ── Streak cold. Cheapest pillar to restart, and it compounds.
  if (inputs.streak === 0) {
    const p = projectFocusImpact(inputs, 1);
    return {
      headline: "Start today's session",
      gain: p.delta > 0 ? p.delta : null,
      pillar: "Momentum",
      href: "/tools/focus-lab",
      cta: "Begin",
    };
  }

  // 5 ── Everything is running. Practice is what moves accuracy.
  return {
    headline: "Sit a past paper",
    gain: null,
    pillar: "Examination",
    href: "/tools/exam-practice",
    cta: "Open papers",
  };
}

/** Days until the soonest future exam, with its subject. Null when none. */
export function nextExam(
  exams: Array<{ name: string; subject: string; date: string }> | undefined,
): { days: number; subject: string; name: string } | null {
  if (!exams?.length) return null;
  const now = Date.now();
  const upcoming = exams
    .map((e) => ({ ...e, t: new Date(e.date).getTime() }))
    .filter((e) => Number.isFinite(e.t) && e.t > now)
    .sort((a, b) => a.t - b.t);
  if (upcoming.length === 0) return null;
  const first = upcoming[0];
  return {
    days: Math.ceil((first.t - now) / 86_400_000),
    subject: first.subject || first.name,
    name: first.name,
  };
}
