// ═══════════════════════════════════════════════════════════════════════════
// Student actions — every mutation the product performs.
//
// Modules never hand-edit the Student. They call these, so the cross-entity
// invariants of Vision §28 hold in one place:
//
//   • Adding a college creates its Application shell and its deadline event.
//   • Removing a college removes the application, its essays' links, its
//     tasks and its events — no orphan can survive a delete.
//   • Anything with a deadline mirrors into the calendar automatically.
//
// Each function is a pure `Student -> Student`, so they compose and are
// trivially testable without React or a browser.
// ═══════════════════════════════════════════════════════════════════════════

import { newId } from "./store";
import type {
  Activity, Application, Award, CalendarEvent, ChecklistItem, College,
  CompetitionEntry, Course, Essay, EssayDraft, Milestone, Opportunity,
  Project, Recommender, ResearchItem, Student, Task, TaskSource, TestPlan,
  TestScore, WeakTopic, ISODate,
} from "./types";

const now = () => new Date().toISOString();

// ── Calendar mirroring ─────────────────────────────────────────────────────

/** The calendar is derived, never hand-maintained: any dated record projects
 *  exactly one event, keyed by its source. Re-running this is idempotent. */
function syncEvent(
  s: Student,
  source: TaskSource,
  event: { title: string; date?: ISODate; kind: CalendarEvent["kind"] } | null,
): Student {
  const others = s.events.filter(
    e => !(e.source && e.source.kind === source.kind && e.source.id === source.id),
  );
  if (!event || !event.date) return { ...s, events: others };
  return {
    ...s,
    events: [
      ...others,
      { id: newId("evt"), title: event.title, date: event.date, kind: event.kind, source },
    ],
  };
}

/** Remove every task the system generated from a given record. Manual tasks
 *  the student wrote themselves are never touched. */
function dropTasksFor(s: Student, kind: TaskSource["kind"], id: string): Student {
  return { ...s, tasks: s.tasks.filter(t => !(t.source?.kind === kind && t.source.id === id)) };
}

// ── Profile ────────────────────────────────────────────────────────────────

export function updateProfile(s: Student, patch: Partial<Student["profile"]>): Student {
  return { ...s, profile: { ...s.profile, ...patch } };
}

export function updatePortfolio(s: Student, patch: Partial<Student["portfolio"]>): Student {
  return { ...s, portfolio: { ...s.portfolio, ...patch } };
}

// ── Academics ──────────────────────────────────────────────────────────────

export function addCourse(s: Student, c: Omit<Course, "id">): Student {
  return { ...s, academics: { ...s.academics, courses: [...s.academics.courses, { ...c, id: newId("crs") }] } };
}

export function updateCourse(s: Student, id: string, patch: Partial<Course>): Student {
  return {
    ...s,
    academics: {
      ...s.academics,
      courses: s.academics.courses.map(c => (c.id === id ? { ...c, ...patch } : c)),
    },
  };
}

export function removeCourse(s: Student, id: string): Student {
  return { ...s, academics: { ...s.academics, courses: s.academics.courses.filter(c => c.id !== id) } };
}

export function addWeakTopic(s: Student, w: Omit<WeakTopic, "id" | "noticedAt">): Student {
  const exists = s.academics.weakTopics.some(
    t => t.subject.toLowerCase() === w.subject.toLowerCase()
      && t.topic.toLowerCase() === w.topic.toLowerCase(),
  );
  if (exists) return s;
  return {
    ...s,
    academics: {
      ...s.academics,
      weakTopics: [...s.academics.weakTopics, { ...w, id: newId("wt"), noticedAt: now() }],
    },
  };
}

export function removeWeakTopic(s: Student, id: string): Student {
  const cleared = dropTasksFor(s, "course", id);
  return {
    ...cleared,
    academics: { ...cleared.academics, weakTopics: cleared.academics.weakTopics.filter(t => t.id !== id) },
  };
}

// ── Testing ────────────────────────────────────────────────────────────────

export function addTestScore(s: Student, t: Omit<TestScore, "id">): Student {
  return { ...s, testing: { ...s.testing, scores: [...s.testing.scores, { ...t, id: newId("ts") }] } };
}

export function removeTestScore(s: Student, id: string): Student {
  return { ...s, testing: { ...s.testing, scores: s.testing.scores.filter(t => t.id !== id) } };
}

export function addTestPlan(s: Student, p: Omit<TestPlan, "id">): Student {
  const plan: TestPlan = { ...p, id: newId("tp") };
  const withPlan = { ...s, testing: { ...s.testing, plans: [...s.testing.plans, plan] } };
  return syncEvent(withPlan, { kind: "test", id: plan.id }, {
    title: `${plan.kind} test date`, date: plan.testDate, kind: "test-date",
  });
}

export function updateTestPlan(s: Student, id: string, patch: Partial<TestPlan>): Student {
  const plans = s.testing.plans.map(p => (p.id === id ? { ...p, ...patch } : p));
  const plan = plans.find(p => p.id === id);
  const withPlans = { ...s, testing: { ...s.testing, plans } };
  return plan
    ? syncEvent(withPlans, { kind: "test", id }, {
        title: `${plan.kind} test date`, date: plan.testDate, kind: "test-date",
      })
    : withPlans;
}

export function removeTestPlan(s: Student, id: string): Student {
  const cleared = syncEvent(dropTasksFor(s, "test", id), { kind: "test", id }, null);
  return { ...cleared, testing: { ...cleared.testing, plans: cleared.testing.plans.filter(p => p.id !== id) } };
}

// ── Activities, awards, research, competitions ─────────────────────────────

export function addActivity(s: Student, a: Omit<Activity, "id" | "achievements" | "links"> & Partial<Pick<Activity, "achievements" | "links">>): Student {
  return {
    ...s,
    activities: [...s.activities, { achievements: [], links: [], ...a, id: newId("act") }],
  };
}

export function updateActivity(s: Student, id: string, patch: Partial<Activity>): Student {
  return { ...s, activities: s.activities.map(a => (a.id === id ? { ...a, ...patch } : a)) };
}

export function removeActivity(s: Student, id: string): Student {
  return { ...s, activities: s.activities.filter(a => a.id !== id) };
}

export function addAward(s: Student, a: Omit<Award, "id">): Student {
  return { ...s, awards: [...s.awards, { ...a, id: newId("awd") }] };
}

export function removeAward(s: Student, id: string): Student {
  return { ...s, awards: s.awards.filter(a => a.id !== id) };
}

export function addResearch(s: Student, r: Omit<ResearchItem, "id" | "links"> & Partial<Pick<ResearchItem, "links">>): Student {
  return { ...s, research: [...s.research, { links: [], ...r, id: newId("res") }] };
}

export function removeResearch(s: Student, id: string): Student {
  return { ...s, research: s.research.filter(r => r.id !== id) };
}

export function addCompetition(s: Student, c: Omit<CompetitionEntry, "id">): Student {
  return { ...s, competitions: [...s.competitions, { ...c, id: newId("cmp") }] };
}

export function removeCompetition(s: Student, id: string): Student {
  return { ...s, competitions: s.competitions.filter(c => c.id !== id) };
}

// ── Projects ───────────────────────────────────────────────────────────────

export function addProject(
  s: Student,
  p: Omit<Project, "id" | "skills" | "techStack" | "milestones" | "links" | "inPortfolio">
    & Partial<Pick<Project, "skills" | "techStack" | "milestones" | "links" | "inPortfolio">>,
): Student {
  const project: Project = {
    skills: [], techStack: [], milestones: [], links: [], inPortfolio: false,
    ...p, id: newId("prj"),
  };
  const withProject = { ...s, projects: [...s.projects, project] };
  return syncEvent(withProject, { kind: "project", id: project.id }, {
    title: `${project.title} — target date`, date: project.targetDate, kind: "milestone",
  });
}

export function updateProject(s: Student, id: string, patch: Partial<Project>): Student {
  const projects = s.projects.map(p => (p.id === id ? { ...p, ...patch } : p));
  const project = projects.find(p => p.id === id);
  const withProjects = { ...s, projects };
  return project
    ? syncEvent(withProjects, { kind: "project", id }, {
        title: `${project.title} — target date`, date: project.targetDate, kind: "milestone",
      })
    : withProjects;
}

export function removeProject(s: Student, id: string): Student {
  const cleared = syncEvent(dropTasksFor(s, "project", id), { kind: "project", id }, null);
  return { ...cleared, projects: cleared.projects.filter(p => p.id !== id) };
}

export function addMilestone(s: Student, projectId: string, m: Omit<Milestone, "id">): Student {
  return {
    ...s,
    projects: s.projects.map(p =>
      p.id === projectId ? { ...p, milestones: [...p.milestones, { ...m, id: newId("ms") }] } : p),
  };
}

export function toggleMilestone(s: Student, projectId: string, milestoneId: string): Student {
  return {
    ...s,
    projects: s.projects.map(p =>
      p.id === projectId
        ? { ...p, milestones: p.milestones.map(m => (m.id === milestoneId ? { ...m, done: !m.done } : m)) }
        : p),
  };
}

// ── Colleges & applications ────────────────────────────────────────────────

/** The standard application checklist. These are the items common to nearly
 *  every application; per-college requirements are added by the student. */
function defaultChecklist(): ChecklistItem[] {
  return [
    "Personal information", "Academic records", "Activities list", "Main essay",
    "Supplemental essays", "Recommendations", "Transcript", "Test scores",
    "Application fee", "Submit",
  ].map(label => ({ id: newId("chk"), label, done: false }));
}

/** Adding a college is the clearest instance of Vision §28: one action creates
 *  the college, its application workspace, and its calendar deadline. */
export function addCollege(s: Student, c: Omit<College, "id" | "addedAt">): Student {
  const college: College = { ...c, id: newId("col"), addedAt: now() };
  const application: Application = {
    id: newId("app"), collegeId: college.id, checklist: defaultChecklist(), submitted: false,
  };
  const withCollege: Student = {
    ...s,
    colleges: [...s.colleges, college],
    applications: [...s.applications, application],
  };
  return syncEvent(withCollege, { kind: "college", id: college.id }, {
    title: `${college.name} — application deadline`, date: college.deadline, kind: "deadline",
  });
}

export function updateCollege(s: Student, id: string, patch: Partial<College>): Student {
  const colleges = s.colleges.map(c => (c.id === id ? { ...c, ...patch } : c));
  const college = colleges.find(c => c.id === id);
  const withColleges = { ...s, colleges };
  return college
    ? syncEvent(withColleges, { kind: "college", id }, {
        title: `${college.name} — application deadline`, date: college.deadline, kind: "deadline",
      })
    : withColleges;
}

/** Deleting a college must not leave an orphaned application, essay link,
 *  recommender assignment, task or event behind. */
export function removeCollege(s: Student, id: string): Student {
  const app = s.applications.find(a => a.collegeId === id);
  let next = syncEvent(dropTasksFor(s, "college", id), { kind: "college", id }, null);
  if (app) next = syncEvent(dropTasksFor(next, "application", app.id), { kind: "application", id: app.id }, null);
  return {
    ...next,
    colleges:     next.colleges.filter(c => c.id !== id),
    applications: next.applications.filter(a => a.collegeId !== id),
    // Essays keep their text but lose the dead college reference.
    essays:       next.essays.map(e => (e.collegeId === id ? { ...e, collegeId: undefined } : e)),
    recommenders: next.recommenders.map(r => ({ ...r, collegeIds: r.collegeIds.filter(cid => cid !== id) })),
  };
}

export function toggleChecklistItem(s: Student, applicationId: string, itemId: string): Student {
  return {
    ...s,
    applications: s.applications.map(a =>
      a.id === applicationId
        ? { ...a, checklist: a.checklist.map(i => (i.id === itemId ? { ...i, done: !i.done } : i)) }
        : a),
  };
}

export function addChecklistItem(s: Student, applicationId: string, label: string): Student {
  return {
    ...s,
    applications: s.applications.map(a =>
      a.id === applicationId
        ? { ...a, checklist: [...a.checklist, { id: newId("chk"), label, done: false }] }
        : a),
  };
}

export function setApplicationSubmitted(s: Student, applicationId: string, submitted: boolean): Student {
  return {
    ...s,
    applications: s.applications.map(a =>
      a.id === applicationId
        ? { ...a, submitted, submittedAt: submitted ? now() : undefined }
        : a),
  };
}

// ── Recommenders ───────────────────────────────────────────────────────────

export function addRecommender(
  s: Student,
  r: Omit<Recommender, "id" | "collegeIds" | "materialsProvided">
    & Partial<Pick<Recommender, "collegeIds" | "materialsProvided">>,
): Student {
  const rec: Recommender = { collegeIds: [], materialsProvided: false, ...r, id: newId("rec") };
  const withRec = { ...s, recommenders: [...s.recommenders, rec] };
  return syncEvent(withRec, { kind: "recommender", id: rec.id }, {
    title: `Recommendation due — ${rec.name}`, date: rec.deadline, kind: "deadline",
  });
}

export function updateRecommender(s: Student, id: string, patch: Partial<Recommender>): Student {
  const recommenders = s.recommenders.map(r => (r.id === id ? { ...r, ...patch } : r));
  const rec = recommenders.find(r => r.id === id);
  const withRecs = { ...s, recommenders };
  return rec
    ? syncEvent(withRecs, { kind: "recommender", id }, {
        title: `Recommendation due — ${rec.name}`, date: rec.deadline, kind: "deadline",
      })
    : withRecs;
}

export function removeRecommender(s: Student, id: string): Student {
  const cleared = syncEvent(dropTasksFor(s, "recommender", id), { kind: "recommender", id }, null);
  return { ...cleared, recommenders: cleared.recommenders.filter(r => r.id !== id) };
}

// ── Essays ─────────────────────────────────────────────────────────────────

export function addEssay(s: Student, e: Omit<Essay, "id" | "drafts"> & Partial<Pick<Essay, "drafts">>): Student {
  const essay: Essay = { drafts: [], ...e, id: newId("esy") };
  const withEssay = { ...s, essays: [...s.essays, essay] };
  return syncEvent(withEssay, { kind: "essay", id: essay.id }, {
    title: `${essay.title} — due`, date: essay.deadline, kind: "deadline",
  });
}

export function updateEssay(s: Student, id: string, patch: Partial<Essay>): Student {
  const essays = s.essays.map(e => (e.id === id ? { ...e, ...patch } : e));
  const essay = essays.find(e => e.id === id);
  const withEssays = { ...s, essays };
  return essay
    ? syncEvent(withEssays, { kind: "essay", id }, {
        title: `${essay.title} — due`, date: essay.deadline, kind: "deadline",
      })
    : withEssays;
}

/** Save a new draft version. History is append-only — Vision §17 treats
 *  version history as a feature, so a save never overwrites the prior draft. */
export function saveEssayDraft(s: Student, essayId: string, body: string): Student {
  const draft: EssayDraft = {
    id: newId("drf"),
    body,
    savedAt: now(),
    wordCount: countWords(body),
  };
  return {
    ...s,
    essays: s.essays.map(e =>
      e.id === essayId
        ? {
            ...e,
            drafts: [...e.drafts, draft],
            status: e.status === "not-started" ? "drafting" : e.status,
          }
        : e),
  };
}

export function removeEssay(s: Student, id: string): Student {
  const cleared = syncEvent(dropTasksFor(s, "essay", id), { kind: "essay", id }, null);
  return { ...cleared, essays: cleared.essays.filter(e => e.id !== id) };
}

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** The newest draft, or undefined when the essay has never been written to. */
export function latestDraft(e: Essay): EssayDraft | undefined {
  return e.drafts.length ? e.drafts[e.drafts.length - 1] : undefined;
}

// ── Opportunities ──────────────────────────────────────────────────────────

export function addOpportunity(
  s: Student,
  o: Omit<Opportunity, "id" | "addedAt" | "fields"> & Partial<Pick<Opportunity, "fields">>,
): Student {
  const opp: Opportunity = { fields: [], ...o, id: newId("opp"), addedAt: now() };
  const withOpp = { ...s, opportunities: [...s.opportunities, opp] };
  return syncEvent(withOpp, { kind: "opportunity", id: opp.id }, {
    title: `${opp.name} — deadline`, date: opp.deadline, kind: "deadline",
  });
}

export function updateOpportunity(s: Student, id: string, patch: Partial<Opportunity>): Student {
  const opportunities = s.opportunities.map(o => (o.id === id ? { ...o, ...patch } : o));
  const opp = opportunities.find(o => o.id === id);
  const withOpps = { ...s, opportunities };
  return opp
    ? syncEvent(withOpps, { kind: "opportunity", id }, {
        title: `${opp.name} — deadline`, date: opp.deadline, kind: "deadline",
      })
    : withOpps;
}

export function removeOpportunity(s: Student, id: string): Student {
  const cleared = syncEvent(dropTasksFor(s, "opportunity", id), { kind: "opportunity", id }, null);
  return { ...cleared, opportunities: cleared.opportunities.filter(o => o.id !== id) };
}

// ── Tasks ──────────────────────────────────────────────────────────────────

export function addTask(
  s: Student,
  t: Omit<Task, "id" | "done" | "createdAt"> & Partial<Pick<Task, "done">>,
): Student {
  return { ...s, tasks: [...s.tasks, { done: false, ...t, id: newId("tsk"), createdAt: now() }] };
}

export function toggleTask(s: Student, id: string): Student {
  return {
    ...s,
    tasks: s.tasks.map(t =>
      t.id === id
        ? { ...t, done: !t.done, completedAt: !t.done ? now() : undefined }
        : t),
  };
}

export function updateTask(s: Student, id: string, patch: Partial<Task>): Student {
  return { ...s, tasks: s.tasks.map(t => (t.id === id ? { ...t, ...patch } : t)) };
}

export function removeTask(s: Student, id: string): Student {
  return { ...s, tasks: s.tasks.filter(t => t.id !== id) };
}

// ── Calendar ───────────────────────────────────────────────────────────────

/** Only for events the student types in directly. Derived events arrive via
 *  syncEvent and are owned by their source record. */
export function addCustomEvent(s: Student, e: Omit<CalendarEvent, "id" | "source">): Student {
  return { ...s, events: [...s.events, { ...e, id: newId("evt") }] };
}

export function removeEvent(s: Student, id: string): Student {
  // Derived events cannot be deleted directly; clear the source's date instead.
  const target = s.events.find(e => e.id === id);
  if (target?.source) return s;
  return { ...s, events: s.events.filter(e => e.id !== id) };
}
