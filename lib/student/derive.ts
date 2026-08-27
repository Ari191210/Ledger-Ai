// ═══════════════════════════════════════════════════════════════════════════
// Derivations — every number the product displays.
//
// Governing rule (Constitution §3, Vision §34): nothing here invents a figure.
// A metric is either computed from records the student actually entered, or it
// reports itself as unavailable. That is why almost every function returns a
// `basis`/`available` field rather than defaulting to zero: "0%" and "no data"
// look identical to a user but mean opposite things, and the entire premise is
// that the figures can be trusted.
//
// Every score also carries its inputs so the UI can always answer "why?".
// ═══════════════════════════════════════════════════════════════════════════

import type {
  Application, College, Essay, JourneyArea, Student, TestKind, TestScore,
} from "./types";
import { JOURNEY_AREAS, JOURNEY_AREA_LABEL } from "./types";

// ── Dates ──────────────────────────────────────────────────────────────────

/** Today as a local-timezone `YYYY-MM-DD`. Never use toISOString() for this:
 *  it converts to UTC and shows the wrong day either side of midnight. */
export function today(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Whole days from today until `date`. Negative means overdue. */
export function daysUntil(date: string, from: string = today()): number {
  const a = Date.parse(`${from}T00:00:00`);
  const b = Date.parse(`${date}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  return Math.round((b - a) / 86_400_000);
}

export function formatDeadline(date: string): string {
  const d = daysUntil(date);
  if (Number.isNaN(d)) return date;
  if (d < 0)  return `${Math.abs(d)} ${Math.abs(d) === 1 ? "day" : "days"} overdue`;
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  return `${d} days`;
}

// ── Completion primitives ──────────────────────────────────────────────────

/** A track's progress, plus whether there was anything to measure at all. */
export interface AreaProgress {
  area:      JourneyArea;
  label:     string;
  /** 0–100. Meaningless unless `available` is true. */
  percent:   number;
  available: boolean;
  /** Plain-language statement of what the percent is computed from. */
  basis:     string;
}

function ratio(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

// ── Per-area progress ──────────────────────────────────────────────────────

export function applicationProgress(app: Application): number {
  return ratio(app.checklist.filter(i => i.done).length, app.checklist.length);
}

function academicsProgress(s: Student): AreaProgress {
  const courses = s.academics.courses.length;
  const withScores = s.academics.courses.filter(c => typeof c.score === "number").length;
  return {
    area: "academics", label: JOURNEY_AREA_LABEL.academics,
    available: courses > 0,
    percent: ratio(withScores, courses),
    basis: courses === 0
      ? "No courses recorded"
      : `${withScores} of ${courses} courses have a recorded result`,
  };
}

function testingProgress(s: Student): AreaProgress {
  const plans = s.testing.plans;
  if (plans.length === 0) {
    return {
      area: "testing", label: JOURNEY_AREA_LABEL.testing,
      available: false, percent: 0, basis: "No test planned",
    };
  }
  // Progress against target: how far the best score has travelled toward goal.
  const scored = plans.map(p => {
    const best = bestScore(s.testing.scores, p.kind);
    if (!best?.total || !p.targetScore) return null;
    return Math.min(100, Math.round((best.total / p.targetScore) * 100));
  }).filter((n): n is number => n !== null);

  if (scored.length === 0) {
    return {
      area: "testing", label: JOURNEY_AREA_LABEL.testing,
      available: false, percent: 0,
      basis: "Test planned, but no target score and result to compare",
    };
  }
  return {
    area: "testing", label: JOURNEY_AREA_LABEL.testing,
    available: true,
    percent: Math.round(scored.reduce((a, b) => a + b, 0) / scored.length),
    basis: `Best result against target across ${scored.length} test${scored.length === 1 ? "" : "s"}`,
  };
}

function countingProgress(
  area: JourneyArea, count: number, target: number,
  noun: string,
  /* English plurals are not "+s". Left implicit, "activity" became
     "2 activitys" on the home page, which reads as a broken product on the
     first screen a student sees. Irregular nouns pass their plural in. */
  plural: string = `${noun}s`,
): AreaProgress {
  return {
    area, label: JOURNEY_AREA_LABEL[area],
    available: count > 0,
    percent: Math.min(100, ratio(count, target)),
    basis: count === 0
      ? `No ${noun} recorded`
      : `${count} ${count === 1 ? noun : plural} recorded`,
  };
}

function collegesProgress(s: Student): AreaProgress {
  const n = s.colleges.length;
  const sorted = s.colleges.filter(c => c.tier !== "unsorted").length;
  return {
    area: "colleges", label: JOURNEY_AREA_LABEL.colleges,
    available: n > 0,
    percent: ratio(sorted, n),
    basis: n === 0
      ? "No colleges saved"
      : `${sorted} of ${n} saved colleges categorised`,
  };
}

function essaysProgress(s: Student): AreaProgress {
  const n = s.essays.length;
  const done = s.essays.filter(e => e.status === "final").length;
  return {
    area: "essays", label: JOURNEY_AREA_LABEL.essays,
    available: n > 0,
    percent: ratio(done, n),
    basis: n === 0 ? "No essays started" : `${done} of ${n} essays final`,
  };
}

function applicationsProgress(s: Student): AreaProgress {
  const apps = s.applications;
  if (apps.length === 0) {
    return {
      area: "applications", label: JOURNEY_AREA_LABEL.applications,
      available: false, percent: 0, basis: "No applications open",
    };
  }
  const avg = Math.round(apps.reduce((sum, a) => sum + applicationProgress(a), 0) / apps.length);
  return {
    area: "applications", label: JOURNEY_AREA_LABEL.applications,
    available: true, percent: avg,
    basis: `Mean checklist completion across ${apps.length} application${apps.length === 1 ? "" : "s"}`,
  };
}

function portfolioProgress(s: Student): AreaProgress {
  const p = s.portfolio;
  const fields = [
    Boolean(p.headline), Boolean(p.about), p.skills.length > 0,
    s.projects.some(x => x.inPortfolio), p.links.length > 0,
  ];
  const done = fields.filter(Boolean).length;
  return {
    area: "portfolio", label: JOURNEY_AREA_LABEL.portfolio,
    available: done > 0,
    percent: ratio(done, fields.length),
    basis: done === 0 ? "Portfolio empty" : `${done} of ${fields.length} portfolio sections complete`,
  };
}

/** Targets below are *reference points for a progress bar*, not claims about
 *  what a student needs. They are deliberately modest and are always shown
 *  alongside the raw count so the count, not the percentage, is the message. */
export function journeyAreas(s: Student): AreaProgress[] {
  return [
    academicsProgress(s),
    testingProgress(s),
    countingProgress("extracurriculars", s.activities.length, 5, "activity", "activities"),
    countingProgress("projects", s.projects.filter(p => p.status === "shipped").length, 2, "shipped project"),
    countingProgress("competitions", s.competitions.length, 3, "competition"),
    countingProgress("research", s.research.length, 1, "research item", "research items"),
    collegesProgress(s),
    essaysProgress(s),
    applicationsProgress(s),
    portfolioProgress(s),
  ];
}

// ── Overall journey figure (Vision §4) ─────────────────────────────────────

export interface JourneyStatus {
  /** Mean of the areas that have data. Undefined when nothing is tracked. */
  percent?:  number;
  available: boolean;
  tracked:   number;
  total:     number;
}

/** The headline "your journey is X% on track".
 *
 *  Averaged over *tracked* areas only. Averaging over all ten would mean a
 *  student who has genuinely finished everything they started still reads
 *  "30% on track" — a fabricated discouragement. Untracked areas surface
 *  instead as recommendations, which is the honest way to say "this is
 *  missing". */
export function journeyStatus(s: Student): JourneyStatus {
  const areas = journeyAreas(s);
  const tracked = areas.filter(a => a.available);
  if (tracked.length === 0) {
    return { available: false, tracked: 0, total: areas.length };
  }
  return {
    available: true,
    percent: Math.round(tracked.reduce((sum, a) => sum + a.percent, 0) / tracked.length),
    tracked: tracked.length,
    total: areas.length,
  };
}

// ── Test helpers ───────────────────────────────────────────────────────────

export function bestScore(scores: TestScore[], kind: TestKind): TestScore | undefined {
  return scores
    .filter(t => t.kind === kind && typeof t.total === "number")
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))[0];
}

export function scoresByDate(scores: TestScore[], kind: TestKind): TestScore[] {
  return scores.filter(t => t.kind === kind).sort((a, b) => a.takenOn.localeCompare(b.takenOn));
}

/** Section-level trend across attempts. Reports movement only where at least
 *  two dated attempts exist — a single score has no trend, and inventing one
 *  is exactly the fabrication §3 prohibits. */
export interface SectionTrend {
  name:      string;
  first:     number;
  latest:    number;
  delta:     number;
  attempts:  number;
}

export function sectionTrends(scores: TestScore[], kind: TestKind): SectionTrend[] {
  const ordered = scoresByDate(scores, kind);
  if (ordered.length < 2) return [];
  const names = new Set<string>();
  ordered.forEach(t => t.sections.forEach(x => names.add(x.name)));

  return [...names].map(name => {
    const points = ordered
      .map(t => t.sections.find(x => x.name === name)?.score)
      .filter((n): n is number => typeof n === "number");
    if (points.length < 2) return null;
    const first = points[0];
    const latest = points[points.length - 1];
    return { name, first, latest, delta: latest - first, attempts: points.length };
  }).filter((x): x is SectionTrend => x !== null);
}

/** The weakest section of the most recent attempt, by percentage of max. */
export function weakestSection(scores: TestScore[], kind: TestKind): { name: string; pct: number } | null {
  const ordered = scoresByDate(scores, kind);
  const latest = ordered[ordered.length - 1];
  if (!latest || latest.sections.length === 0) return null;
  const ranked = latest.sections
    .filter(x => x.max > 0)
    .map(x => ({ name: x.name, pct: Math.round((x.score / x.max) * 100) }))
    .sort((a, b) => a.pct - b.pct);
  return ranked[0] ?? null;
}

// ── Profile strength (Vision §14) ──────────────────────────────────────────

export interface ProfileDimension {
  key:       "academic" | "testing" | "leadership" | "technical" | "impact" | "research";
  label:     string;
  /** 0–10, or undefined when there is no evidence to score. */
  score?:    number;
  available: boolean;
  /** What the score is based on — always shown next to the number. */
  basis:     string;
}

/** Profile strength is an *evidence count*, not a prediction.
 *
 *  Vision §14 is explicit that the purpose is not to pretend an AI can
 *  guarantee admission. So each dimension scores how much documented evidence
 *  exists, and says so. A dimension with no evidence returns undefined rather
 *  than 0 — "no evidence recorded" is a different statement from "weak". */
export function profileStrength(s: Student): ProfileDimension[] {
  const dims: ProfileDimension[] = [];

  // Academic — from recorded course results.
  const scored = s.academics.courses.filter(c => typeof c.score === "number");
  const meanScore = scored.length
    ? scored.reduce((a, c) => a + (c.score ?? 0), 0) / scored.length
    : null;
  dims.push({
    key: "academic", label: "Academic",
    available: meanScore !== null,
    score: meanScore !== null ? round1(meanScore / 10) : undefined,
    basis: meanScore !== null
      ? `Mean of ${scored.length} recorded course result${scored.length === 1 ? "" : "s"}`
      : "No course results recorded",
  });

  // Testing — best result against the student's own target.
  const plansWithBoth = s.testing.plans
    .map(p => {
      const best = bestScore(s.testing.scores, p.kind);
      return best?.total && p.targetScore ? best.total / p.targetScore : null;
    })
    .filter((n): n is number => n !== null);
  dims.push({
    key: "testing", label: "Testing",
    available: plansWithBoth.length > 0,
    score: plansWithBoth.length
      ? round1(Math.min(10, (plansWithBoth.reduce((a, b) => a + b, 0) / plansWithBoth.length) * 10))
      : undefined,
    basis: plansWithBoth.length
      ? "Best result measured against your target score"
      : "No target score and result to compare",
  });

  // Leadership — activities where the student held formal responsibility.
  const leadCount = s.activities.filter(a => a.leadership).length;
  dims.push({
    key: "leadership", label: "Leadership",
    available: s.activities.length > 0,
    score: s.activities.length ? round1(Math.min(10, leadCount * 3.5)) : undefined,
    basis: s.activities.length
      ? `${leadCount} of ${s.activities.length} activities record a leadership role`
      : "No activities recorded",
  });

  // Technical — shipped projects and recorded skills.
  const shipped = s.projects.filter(p => p.status === "shipped").length;
  const skills = new Set(s.projects.flatMap(p => p.skills)).size;
  dims.push({
    key: "technical", label: "Technical",
    available: s.projects.length > 0,
    score: s.projects.length ? round1(Math.min(10, shipped * 3 + Math.min(4, skills * 0.5))) : undefined,
    basis: s.projects.length
      ? `${shipped} shipped project${shipped === 1 ? "" : "s"}, ${skills} distinct skill${skills === 1 ? "" : "s"}`
      : "No projects recorded",
  });

  // Impact — the share of work with a stated, measurable outcome.
  const impactable = [...s.activities, ...s.projects];
  const withImpact = [
    ...s.activities.filter(a => a.impact?.trim()),
    ...s.projects.filter(p => p.impact?.trim()),
  ].length;
  dims.push({
    key: "impact", label: "Impact",
    available: impactable.length > 0,
    score: impactable.length ? round1((withImpact / impactable.length) * 10) : undefined,
    basis: impactable.length
      ? `${withImpact} of ${impactable.length} activities and projects state a measurable outcome`
      : "No activities or projects recorded",
  });

  // Research — recorded research items and their outcomes.
  const withOutcome = s.research.filter(r => r.outcome?.trim()).length;
  dims.push({
    key: "research", label: "Research",
    available: s.research.length > 0,
    score: s.research.length
      ? round1(Math.min(10, s.research.length * 4 + withOutcome * 2))
      : undefined,
    basis: s.research.length
      ? `${s.research.length} research item${s.research.length === 1 ? "" : "s"}, ${withOutcome} with a stated outcome`
      : "No research recorded",
  });

  return dims;
}

export function overallProfileStrength(s: Student): { score?: number; available: boolean; measured: number } {
  const dims = profileStrength(s).filter(d => d.available && typeof d.score === "number");
  if (dims.length === 0) return { available: false, measured: 0 };
  return {
    available: true,
    measured: dims.length,
    score: round1(dims.reduce((a, d) => a + (d.score ?? 0), 0) / dims.length),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── College list balance (Vision §7) ───────────────────────────────────────

export interface ListBalance {
  reach:  number;
  target: number;
  likely: number;
  unsorted: number;
  total:  number;
  /** Advice, only when the list is big enough for the shape to be meaningful. */
  warning?: string;
}

export function listBalance(colleges: College[]): ListBalance {
  const count = (t: College["tier"]) => colleges.filter(c => c.tier === t).length;
  const b: ListBalance = {
    reach: count("reach"), target: count("target"),
    likely: count("likely"), unsorted: count("unsorted"),
    total: colleges.length,
  };
  // Below four schools the distribution says nothing; commenting on it would
  // be manufactured counselling.
  const sorted = b.reach + b.target + b.likely;
  if (sorted < 4) return b;

  if (b.likely === 0) {
    b.warning = "Your list has no likely schools. Most balanced lists include at least two.";
  } else if (b.reach > b.target + b.likely) {
    b.warning = "Your list is reach-heavy. Consider adding target and likely schools.";
  } else if (b.target === 0) {
    b.warning = "Your list has no target schools.";
  }
  return b;
}

// ── Fit score (Vision §6) ──────────────────────────────────────────────────

export interface FitFactor {
  label:     string;
  /** 0–100 for this factor, or undefined when the inputs are missing. */
  score?:    number;
  available: boolean;
  reason:    string;
}

export interface FitScore {
  /** Undefined unless at least two factors could be computed. */
  percent?:  number;
  available: boolean;
  factors:   FitFactor[];
  /** Why the score is unavailable, when it is. */
  missing:   string[];
}

/** A *fit* score, explicitly not an admissions-chance score.
 *
 *  It compares the student's stated preferences against what they recorded
 *  about the college. It never consults acceptance rates or any external
 *  ranking, because StudyLedger holds no verified college dataset — inventing
 *  one would violate Vision §34. Every factor states its own reasoning, and
 *  the score is withheld entirely when too little is known. */
export function fitScore(s: Student, college: College): FitScore {
  const factors: FitFactor[] = [];
  const missing: string[] = [];

  // Major alignment.
  const studentMajor = s.profile.intendedMajor?.trim().toLowerCase();
  const collegeMajor = college.intendedMajor?.trim().toLowerCase();
  if (studentMajor && collegeMajor) {
    const match = collegeMajor.includes(studentMajor) || studentMajor.includes(collegeMajor);
    factors.push({
      label: "Major fit", available: true, score: match ? 100 : 40,
      reason: match
        ? `You intend to study ${s.profile.intendedMajor}, and that is the course you recorded here.`
        : `You intend to study ${s.profile.intendedMajor}, but recorded ${college.intendedMajor} for this school.`,
    });
  } else {
    factors.push({
      label: "Major fit", available: false,
      reason: !studentMajor
        ? "Add your intended major to your profile."
        : "Record which course you would apply to here.",
    });
    missing.push(!studentMajor ? "your intended major" : `the course you'd apply to at ${college.name}`);
  }

  // Test policy against what the student actually has.
  const hasScores = s.testing.scores.some(t => t.attempt === "official" && typeof t.total === "number");
  if (college.testPolicy && college.testPolicy !== "unknown") {
    const ok = college.testPolicy !== "required" || hasScores;
    factors.push({
      label: "Test profile", available: true, score: ok ? 100 : 30,
      reason: college.testPolicy === "required"
        ? (hasScores ? "Tests are required here, and you have an official score recorded."
                     : "Tests are required here, and you have no official score recorded yet.")
        : `This school is test-${college.testPolicy}.`,
    });
  } else {
    factors.push({
      label: "Test profile", available: false,
      reason: "Record this school's testing policy.",
    });
    missing.push(`${college.name}'s testing policy`);
  }

  // Geography against stated preference.
  if (s.profile.country && college.country) {
    const same = s.profile.country.trim().toLowerCase() === college.country.trim().toLowerCase();
    factors.push({
      label: "Geographic fit", available: true, score: same ? 100 : 60,
      reason: same ? "This school is in your home country." : `This school is in ${college.country}.`,
    });
  } else {
    factors.push({
      label: "Geographic fit", available: false,
      reason: "Add your country and this school's location.",
    });
  }

  // Application readiness — real, and entirely from the student's own records.
  const app = s.applications.find(a => a.collegeId === college.id);
  if (app) {
    const pct = applicationProgress(app);
    factors.push({
      label: "Application readiness", available: true, score: pct,
      reason: `${app.checklist.filter(i => i.done).length} of ${app.checklist.length} checklist items complete.`,
    });
  } else {
    factors.push({ label: "Application readiness", available: false, reason: "No application workspace yet." });
  }

  const scored = factors.filter(f => f.available && typeof f.score === "number");
  // One factor is not a fit assessment; publishing it as a headline percentage
  // would dress a single data point as an evaluation.
  if (scored.length < 2) {
    return { available: false, factors, missing };
  }
  return {
    available: true,
    percent: Math.round(scored.reduce((a, f) => a + (f.score ?? 0), 0) / scored.length),
    factors,
    missing,
  };
}

// ── Upcoming work ──────────────────────────────────────────────────────────

export interface UpcomingItem {
  id:      string;
  title:   string;
  date:    string;
  days:    number;
  kind:    string;
}

export function upcoming(s: Student, withinDays = 60, limit = 8): UpcomingItem[] {
  const t = today();
  return s.events
    .filter(e => e.date)
    .map(e => ({ id: e.id, title: e.title, date: e.date, days: daysUntil(e.date, t), kind: e.kind }))
    .filter(e => !Number.isNaN(e.days) && e.days >= 0 && e.days <= withinDays)
    .sort((a, b) => a.days - b.days)
    .slice(0, limit);
}

export function overdue(s: Student): UpcomingItem[] {
  const t = today();
  return s.events
    .filter(e => e.date)
    .map(e => ({ id: e.id, title: e.title, date: e.date, days: daysUntil(e.date, t), kind: e.kind }))
    .filter(e => !Number.isNaN(e.days) && e.days < 0)
    .sort((a, b) => a.days - b.days);
}

// ── Essay + application rollups ────────────────────────────────────────────

export function essayWordCount(e: Essay): number {
  const d = e.drafts[e.drafts.length - 1];
  return d ? d.wordCount : 0;
}

export function collegeName(s: Student, id?: string): string | undefined {
  return id ? s.colleges.find(c => c.id === id)?.name : undefined;
}

export { JOURNEY_AREAS, JOURNEY_AREA_LABEL };
