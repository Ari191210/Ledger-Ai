// ═══════════════════════════════════════════════════════════════════════════
// The Next Best Action engine — Vision §22, the heart of the product.
//
// Rules this engine obeys:
//
//  1. Every action is *derived from a record the student entered*. There are no
//     generic tips. If StudyLedger has nothing to go on, it returns nothing and
//     the UI asks for the missing input instead (Vision §34, Constitution §3).
//
//  2. Every action carries its own `reason`, quoting the record that produced
//     it. "Why am I being told this?" must always be answerable on the card.
//
//  3. The list is *prioritised, not exhaustive* (Vision §5). Urgency and
//     importance combine into one score and the queue is cut short, because a
//     list of forty things is the overwhelm the product exists to remove.
//
//  4. Deadlines dominate. An unbreakable date outranks any amount of
//     open-ended profile improvement.
// ═══════════════════════════════════════════════════════════════════════════

import type { JourneyArea, Student, TaskSource } from "./types";
import {
  applicationProgress, bestScore, daysUntil, listBalance, sectionTrends,
  today, weakestSection,
} from "./derive";

export interface Action {
  id:       string;
  title:    string;
  /** Why this is being recommended, citing the student's own data. */
  reason:   string;
  /** Higher sorts first. Composed of urgency and importance. */
  weight:   number;
  estimateMinutes?: number;
  dueDate?: string;
  area:     JourneyArea;
  source?:  TaskSource;
  /** Where the student goes to act on it. */
  href:     string;
  cta:      string;
}

// Weight bands. Deadline-driven work is scored above improvement work so an
// approaching date always rises to the top of the queue.
const W_OVERDUE   = 1000;
const W_DEADLINE  = 600;
const W_BLOCKING  = 400;
const W_IMPROVE   = 200;
const W_SETUP     = 100;

/** Urgency curve: sharper as the date closes. A deadline 3 days out must
 *  outrank one 40 days out by a wide margin, not a linear nudge. */
function urgency(days: number): number {
  if (days < 0)   return 400;
  if (days <= 3)  return 300;
  if (days <= 7)  return 220;
  if (days <= 14) return 150;
  if (days <= 30) return 90;
  if (days <= 60) return 40;
  return 10;
}

export function nextBestActions(s: Student, limit = 6): Action[] {
  const out: Action[] = [];
  const t = today();

  // ── 1. Tasks the student already committed to ────────────────────────────
  for (const task of s.tasks.filter(x => !x.done)) {
    const days = task.dueDate ? daysUntil(task.dueDate, t) : NaN;
    const dated = !Number.isNaN(days);
    const prioBonus = task.priority === "high" ? 120 : task.priority === "medium" ? 60 : 0;
    out.push({
      id: `task:${task.id}`,
      title: task.title,
      reason: task.dueDate
        ? (days < 0 ? "This task is past its due date." : `You set this task to be done by ${task.dueDate}.`)
        : "You added this task.",
      weight: (dated && days < 0 ? W_OVERDUE : dated ? W_DEADLINE : W_BLOCKING)
              + (dated ? urgency(days) : 0) + prioBonus,
      estimateMinutes: task.estimateMinutes,
      dueDate: task.dueDate,
      area: task.area ?? "academics",
      source: task.source,
      href: "/tasks",
      cta: "Open",
    });
  }

  // ── 2. Applications with a deadline in view ──────────────────────────────
  for (const app of s.applications.filter(a => !a.submitted)) {
    const college = s.colleges.find(c => c.id === app.collegeId);
    if (!college?.deadline) continue;
    const days = daysUntil(college.deadline, t);
    if (Number.isNaN(days) || days > 120) continue;

    const pending = app.checklist.filter(i => !i.done);
    if (pending.length === 0) {
      out.push({
        id: `submit:${app.id}`,
        title: `Submit your ${college.name} application`,
        reason: `Every checklist item is complete and the deadline is ${college.deadline}.`,
        weight: (days < 0 ? W_OVERDUE : W_DEADLINE) + urgency(days) + 150,
        dueDate: college.deadline,
        area: "applications",
        source: { kind: "application", id: app.id },
        href: `/applications/${app.id}`,
        cta: "Review",
      });
      continue;
    }
    out.push({
      id: `app:${app.id}`,
      title: `${pending[0].label} — ${college.name}`,
      reason: `${pending.length} of ${app.checklist.length} items remain and the deadline is ${college.deadline}.`,
      weight: (days < 0 ? W_OVERDUE : W_DEADLINE) + urgency(days)
              + (applicationProgress(app) > 50 ? 40 : 0),
      dueDate: college.deadline,
      area: "applications",
      source: { kind: "application", id: app.id },
      href: `/applications/${app.id}`,
      cta: "Continue",
    });
  }

  // ── 3. Essays that are not finished ──────────────────────────────────────
  for (const essay of s.essays.filter(e => e.status !== "final")) {
    const days = essay.deadline ? daysUntil(essay.deadline, t) : NaN;
    const dated = !Number.isNaN(days);
    if (dated && days > 120) continue;
    const words = essay.drafts[essay.drafts.length - 1]?.wordCount ?? 0;
    out.push({
      id: `essay:${essay.id}`,
      title: words === 0 ? `Start "${essay.title}"` : `Continue "${essay.title}"`,
      reason: essay.deadline
        ? `${words === 0 ? "Not started" : `${words} words drafted`}, due ${essay.deadline}.`
        : `${words === 0 ? "Not started yet." : `${words} words drafted so far.`}`,
      weight: (dated && days < 0 ? W_OVERDUE : dated ? W_DEADLINE : W_IMPROVE)
              + (dated ? urgency(days) : 0),
      estimateMinutes: words === 0 ? 45 : 60,
      dueDate: essay.deadline,
      area: "essays",
      source: { kind: "essay", id: essay.id },
      href: `/essays/${essay.id}`,
      cta: words === 0 ? "Start" : "Continue",
    });
  }

  // ── 4. Recommendation letters not yet requested ──────────────────────────
  for (const rec of s.recommenders.filter(r => r.status === "not-requested")) {
    const days = rec.deadline ? daysUntil(rec.deadline, t) : NaN;
    out.push({
      id: `rec:${rec.id}`,
      title: `Ask ${rec.name} for a recommendation`,
      reason: rec.deadline
        ? `Not yet requested, and the letter is due ${rec.deadline}.`
        : "You listed this recommender but have not asked them yet.",
      weight: W_BLOCKING + (Number.isNaN(days) ? 60 : urgency(days) + 100),
      estimateMinutes: 20,
      dueDate: rec.deadline,
      area: "applications",
      source: { kind: "recommender", id: rec.id },
      href: "/applications/recommenders",
      cta: "Open",
    });
  }

  // ── 5. Opportunities the student saved but has not acted on ──────────────
  for (const opp of s.opportunities.filter(o => o.stage === "saved" || o.stage === "interested" || o.stage === "applying")) {
    if (!opp.deadline) continue;
    const days = daysUntil(opp.deadline, t);
    if (Number.isNaN(days) || days < 0 || days > 60) continue;
    out.push({
      id: `opp:${opp.id}`,
      title: `Apply — ${opp.name}`,
      reason: `You saved this and it closes ${opp.deadline}.`,
      weight: W_DEADLINE + urgency(days),
      dueDate: opp.deadline,
      area: "competitions",
      source: { kind: "opportunity", id: opp.id },
      href: "/opportunities",
      cta: "Open",
    });
  }

  // ── 6. Testing — driven by the student's own score history ───────────────
  for (const plan of s.testing.plans) {
    const weak = weakestSection(s.testing.scores, plan.kind);
    const best = bestScore(s.testing.scores, plan.kind);
    const days = plan.testDate ? daysUntil(plan.testDate, t) : NaN;
    const dated = !Number.isNaN(days) && days >= 0;

    if (!best) {
      // A planned test with no result: the diagnostic is the blocking step.
      out.push({
        id: `diag:${plan.id}`,
        title: `Take a ${plan.kind} diagnostic`,
        reason: plan.testDate
          ? `You have a ${plan.kind} planned for ${plan.testDate} but no score recorded yet.`
          : `You are planning to take the ${plan.kind} but have recorded no score yet.`,
        weight: W_BLOCKING + (dated ? urgency(days) : 40),
        estimateMinutes: 60,
        dueDate: plan.testDate,
        area: "testing",
        source: { kind: "test", id: plan.id },
        href: "/testing",
        cta: "Record",
      });
      continue;
    }

    if (weak) {
      const trends = sectionTrends(s.testing.scores, plan.kind);
      const trend = trends.find(x => x.name === weak.name);
      // The example from Vision §35, generated from real recorded attempts.
      const reason = trend && trend.attempts >= 2
        ? `Across ${trend.attempts} attempts, ${weak.name} is your lowest section at ${weak.pct}% (${trend.delta >= 0 ? "+" : ""}${trend.delta} since your first).`
        : `${weak.name} is your lowest section on your most recent ${plan.kind} at ${weak.pct}%.`;
      out.push({
        id: `weak:${plan.id}`,
        title: `${plan.kind} ${weak.name} practice`,
        reason,
        weight: W_IMPROVE + (dated ? urgency(days) : 0) + (100 - weak.pct),
        estimateMinutes: 35,
        dueDate: plan.testDate,
        area: "testing",
        source: { kind: "test", id: plan.id },
        href: "/testing",
        cta: "Start",
      });
    }
  }

  // ── 7. Weak topics the student recorded ──────────────────────────────────
  for (const w of s.academics.weakTopics.slice(0, 3)) {
    out.push({
      id: `topic:${w.id}`,
      title: `Revise ${w.topic}`,
      reason: w.source === "test"
        ? `Flagged as weak in ${w.subject} from a recorded test result.`
        : `You marked ${w.topic} as a weak area in ${w.subject}.`,
      weight: W_IMPROVE + (typeof w.mastery === "number" ? (100 - w.mastery) / 2 : 20),
      estimateMinutes: 40,
      area: "academics",
      source: { kind: "course", id: w.id },
      href: "/academics",
      cta: "Open",
    });
  }

  // ── 8. Projects that have stalled ────────────────────────────────────────
  for (const p of s.projects.filter(x => x.status === "building" || x.status === "planning")) {
    const nextMs = p.milestones.find(m => !m.done);
    const days = nextMs?.dueDate ? daysUntil(nextMs.dueDate, t) : NaN;
    if (!nextMs) {
      out.push({
        id: `prjms:${p.id}`,
        title: `Set the next milestone for ${p.title}`,
        reason: p.milestones.length === 0
          ? "This project has no milestones, so it has no next step."
          : "Every milestone on this project is complete, but it is not marked shipped.",
        weight: W_IMPROVE,
        estimateMinutes: 15,
        area: "projects",
        source: { kind: "project", id: p.id },
        href: `/projects/${p.id}`,
        cta: "Open",
      });
      continue;
    }
    out.push({
      id: `prj:${p.id}`,
      title: `${nextMs.title} — ${p.title}`,
      reason: nextMs.dueDate
        ? `Next milestone on this project, due ${nextMs.dueDate}.`
        : "The next unfinished milestone on this project.",
      weight: (Number.isNaN(days) ? W_IMPROVE : W_DEADLINE + urgency(days)),
      estimateMinutes: 60,
      dueDate: nextMs.dueDate,
      area: "projects",
      source: { kind: "project", id: p.id },
      href: `/projects/${p.id}`,
      cta: "Continue",
    });
  }

  // ── 9. Documenting impact — the §14 finding, only when real ──────────────
  const undocumented = [
    ...s.activities.filter(a => !a.impact?.trim()),
    ...s.projects.filter(p => p.status === "shipped" && !p.impact?.trim()),
  ];
  if (undocumented.length > 0) {
    const first = undocumented[0];
    out.push({
      id: `impact:${first.id}`,
      title: `Document the impact of ${"name" in first ? first.name : first.title}`,
      reason: undocumented.length === 1
        ? "This is recorded but has no measurable outcome written down."
        : `${undocumented.length} of your activities and projects have no measurable outcome recorded.`,
      weight: W_IMPROVE - 20,
      estimateMinutes: 20,
      area: "extracurriculars",
      href: "activities" in first || "category" in first ? "/activities" : "/projects",
      cta: "Add",
    });
  }

  // ── 10. College list shape ───────────────────────────────────────────────
  const balance = listBalance(s.colleges);
  if (balance.warning) {
    out.push({
      id: "balance",
      title: "Rebalance your college list",
      reason: balance.warning,
      weight: W_IMPROVE - 10,
      estimateMinutes: 30,
      area: "colleges",
      href: "/colleges",
      cta: "Review",
    });
  }
  const unsorted = s.colleges.filter(c => c.tier === "unsorted");
  if (unsorted.length > 0) {
    out.push({
      id: "unsorted",
      title: `Categorise ${unsorted.length} saved college${unsorted.length === 1 ? "" : "s"}`,
      reason: `${unsorted.map(c => c.name).slice(0, 3).join(", ")}${unsorted.length > 3 ? "…" : ""} ${unsorted.length === 1 ? "has" : "have"} no reach/target/likely category.`,
      weight: W_SETUP + 40,
      estimateMinutes: 10,
      area: "colleges",
      href: "/colleges",
      cta: "Sort",
    });
  }

  return out.sort((a, b) => b.weight - a.weight).slice(0, limit);
}

// ── Setup prompts ──────────────────────────────────────────────────────────

/** When there is genuinely nothing to recommend, the product must say what it
 *  needs rather than inventing advice. These are requests for input, and are
 *  presented as such — never dressed up as intelligence. */
export interface SetupPrompt {
  title:  string;
  detail: string;
  href:   string;
  cta:    string;
}

export function setupPrompts(s: Student): SetupPrompt[] {
  const prompts: SetupPrompt[] = [];
  if (!s.profile.grade || !s.profile.curriculum) {
    prompts.push({
      title: "Complete your profile",
      detail: "Your grade and curriculum determine what StudyLedger can recommend.",
      href: "/profile", cta: "Set up",
    });
  }
  if (!s.profile.intendedMajor) {
    prompts.push({
      title: "Add your intended major",
      detail: "It drives college fit, competition and project matching.",
      href: "/profile", cta: "Add",
    });
  }
  if (s.colleges.length === 0) {
    prompts.push({
      title: "Add a college you're considering",
      detail: "Each college opens an application workspace and puts its deadline on your calendar.",
      href: "/colleges", cta: "Add",
    });
  }
  if (s.testing.plans.length === 0) {
    prompts.push({
      title: "Record a test you're planning",
      detail: "Score history is what turns testing into a study plan.",
      href: "/testing", cta: "Add",
    });
  }
  if (s.activities.length === 0) {
    prompts.push({
      title: "Add your activities",
      detail: "Your extracurricular record feeds profile strength and essay material.",
      href: "/activities", cta: "Add",
    });
  }
  return prompts;
}
