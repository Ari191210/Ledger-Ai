// ═══════════════════════════════════════════════════════════════════════════
// The Student object — StudyLedger's unified domain model.
//
// Product Vision §28: every system hangs off one Student. The point is not the
// records themselves but the edges between them:
//
//   Test Score → Weak Topic → Study Plan → Task → Calendar
//   College    → Application → Essay     → Task → Calendar
//   Opportunity → Profile    → Recommendation → Task → Calendar
//   Project    → Portfolio   → College Profile
//
// Every entity that can generate work carries a stable `id`, so a Task can
// point back at whatever produced it (`TaskSource`). That back-pointer is what
// makes the product feel like one system instead of a folder of tools.
//
// Vision §34: no fabricated data. Nothing in this file seeds example colleges,
// deadlines, scores, or opportunities. Absent data stays absent, and the UI
// renders an honest empty state.
// ═══════════════════════════════════════════════════════════════════════════

// ── Shared primitives ──────────────────────────────────────────────────────

/** ISO-8601 calendar date, `YYYY-MM-DD`. Dates are stored date-only, never as
 *  timestamps, so a deadline never shifts across a timezone boundary. */
export type ISODate = string;

/** ISO-8601 instant, `new Date().toISOString()`. For audit fields only. */
export type ISOInstant = string;

export type Grade = 9 | 10 | 11 | 12;

/** Vision §12 — the curriculum shapes what the system recommends. */
export type Curriculum =
  | "CBSE" | "ICSE" | "IB" | "A-Levels" | "AP" | "US-HS" | "Other";

export type Confidence = "low" | "medium" | "high";

/** The nine tracks the journey is scored across (Vision §4). */
export type JourneyArea =
  | "academics"
  | "testing"
  | "extracurriculars"
  | "projects"
  | "competitions"
  | "research"
  | "colleges"
  | "essays"
  | "applications"
  | "portfolio";

export const JOURNEY_AREAS: readonly JourneyArea[] = [
  "academics", "testing", "extracurriculars", "projects", "competitions",
  "research", "colleges", "essays", "applications", "portfolio",
] as const;

export const JOURNEY_AREA_LABEL: Record<JourneyArea, string> = {
  academics:        "Academics",
  testing:          "Testing",
  extracurriculars: "Extracurriculars",
  projects:         "Projects",
  competitions:     "Competitions",
  research:         "Research",
  colleges:         "College research",
  essays:           "Essays",
  applications:     "Applications",
  portfolio:        "Portfolio",
};

// ── Profile ────────────────────────────────────────────────────────────────

export interface StudentProfile {
  name?:         string;
  grade?:        Grade;
  curriculum?:   Curriculum;
  /** Free text. Drives college, competition, project and research matching. */
  intendedMajor?: string;
  careerInterests: string[];
  /** Where the student studies. Used for eligibility, not for ranking. */
  country?:      string;
  region?:       string;
  graduationYear?: number;
  /** Realistic weekly hours available for StudyLedger work. Feeds scheduling. */
  hoursPerWeek?: number;
}

// ── Academics (Vision §10) ─────────────────────────────────────────────────

export interface Course {
  id:        string;
  subject:   string;
  /** e.g. "Higher Level", "AP", "Standard". Curriculum-dependent, free text. */
  level?:    string;
  year?:     number;
  /** Percentage 0–100, as reported by the student. Never inferred. */
  score?:    number;
  credits?:  number;
}

export interface WeakTopic {
  id:        string;
  subject:   string;
  topic:     string;
  /** 0–100 self-reported or diagnostic-derived mastery. */
  mastery?:  number;
  /** Which record established this weakness — a test, a paper, or the student. */
  source:    "self" | "test" | "assignment";
  noticedAt: ISOInstant;
}

export interface Academics {
  courses:     Course[];
  weakTopics:  WeakTopic[];
  /** Student-entered GPA. Not computed — scales differ per curriculum. */
  gpa?:        number;
  gpaScale?:   number;
}

// ── Testing (Vision §11) ───────────────────────────────────────────────────

export type TestKind = "SAT" | "ACT" | "AP" | "IELTS" | "TOEFL" | "Other";

export interface TestSection {
  name:   string;
  score:  number;
  max:    number;
}

export interface TestScore {
  id:        string;
  kind:      TestKind;
  /** A dated attempt: diagnostic, official practice, or the real sitting. */
  attempt:   "diagnostic" | "practice" | "official";
  takenOn:   ISODate;
  total?:    number;
  max?:      number;
  sections:  TestSection[];
  label?:    string;
}

export interface TestPlan {
  id:        string;
  kind:      TestKind;
  targetScore?: number;
  /** The registered or intended sitting. Flows into the calendar. */
  testDate?: ISODate;
}

export interface Testing {
  scores: TestScore[];
  plans:  TestPlan[];
}

// ── Activities, awards, research, competitions (Vision §13) ────────────────

export type ActivityCategory =
  | "leadership" | "sports" | "clubs" | "volunteering" | "research"
  | "entrepreneurship" | "competitions" | "arts" | "technology"
  | "community" | "work";

export interface Activity {
  id:            string;
  name:          string;
  category:      ActivityCategory;
  role?:         string;
  organization?: string;
  startDate?:    ISODate;
  endDate?:      ISODate;
  hoursPerWeek?: number;
  weeksPerYear?: number;
  description?:  string;
  /** The measurable outcome. Its absence is itself a finding (Vision §14). */
  impact?:       string;
  achievements:  string[];
  /** Did the student hold formal responsibility for others? */
  leadership:    boolean;
  links:         string[];
}

export interface Award {
  id:       string;
  title:    string;
  issuer?:  string;
  date?:    ISODate;
  /** Scope is evidence of selectivity; it is recorded, never guessed. */
  level?:   "school" | "regional" | "national" | "international";
  description?: string;
}

export interface ResearchItem {
  id:           string;
  title:        string;
  mentor?:      string;
  institution?: string;
  startDate?:   ISODate;
  endDate?:     ISODate;
  abstract?:    string;
  outcome?:     string;
  links:        string[];
}

export interface CompetitionEntry {
  id:        string;
  name:      string;
  date?:     ISODate;
  result?:   string;
  level?:    "school" | "regional" | "national" | "international";
  notes?:    string;
}

// ── Projects & portfolio (Vision §15, §16, §24) ────────────────────────────

export type ProjectStatus = "idea" | "planning" | "building" | "shipped" | "archived";

export interface Milestone {
  id:      string;
  title:   string;
  dueDate?: ISODate;
  done:    boolean;
}

export interface Project {
  id:          string;
  title:       string;
  status:      ProjectStatus;
  problem?:    string;
  goal?:       string;
  targetUsers?: string;
  skills:      string[];
  techStack:   string[];
  milestones:  Milestone[];
  startDate?:  ISODate;
  targetDate?: ISODate;
  description?: string;
  impact?:     string;
  links:       string[];
  /** Student's choice to surface this on the public portfolio. */
  inPortfolio: boolean;
}

// ── Colleges (Vision §6, §7) ───────────────────────────────────────────────

export type CollegeTier = "reach" | "target" | "likely" | "unsorted";

export type ApplicationRound =
  | "ED" | "ED2" | "EA" | "REA" | "RD" | "rolling" | "unknown";

export interface College {
  id:        string;
  name:      string;
  location?: string;
  country?:  string;
  /** Student-assigned. The system may *suggest* a tier but never overwrites. */
  tier:      CollegeTier;
  intendedMajor?: string;
  round:     ApplicationRound;
  deadline?: ISODate;
  /** Student's own research notes. */
  notes?:    string;
  website?:  string;
  /** Requirements the student has recorded for this school. */
  requiresEssays?:      boolean;
  requiredRecommenders?: number;
  testPolicy?: "required" | "optional" | "blind" | "unknown";
  addedAt:   ISOInstant;
}

// ── Applications (Vision §18, §19) ─────────────────────────────────────────

export interface ChecklistItem {
  id:      string;
  label:   string;
  done:    boolean;
  /** Optional link to the entity that satisfies this item (an essay, a score). */
  refId?:  string;
}

export interface Application {
  id:        string;
  collegeId: string;
  checklist: ChecklistItem[];
  submitted: boolean;
  submittedAt?: ISOInstant;
}

export type RecommenderStatus =
  | "not-requested" | "requested" | "accepted" | "in-progress" | "submitted";

export interface Recommender {
  id:            string;
  name:          string;
  subject?:      string;
  relationship?: string;
  email?:        string;
  requestedOn?:  ISODate;
  deadline?:     ISODate;
  status:        RecommenderStatus;
  materialsProvided: boolean;
  /** Which colleges this letter is for. */
  collegeIds:    string[];
}

// ── Essays (Vision §17) ────────────────────────────────────────────────────

export type EssayKind =
  | "common-app" | "supplemental" | "uc" | "scholarship" | "personal-statement" | "other";

export type EssayStatus =
  | "not-started" | "brainstorming" | "drafting" | "revising" | "final";

export interface EssayDraft {
  id:        string;
  body:      string;
  savedAt:   ISOInstant;
  wordCount: number;
}

export interface Essay {
  id:         string;
  title:      string;
  kind:       EssayKind;
  prompt?:    string;
  /** Which college this essay belongs to, when it is a supplemental. */
  collegeId?: string;
  wordLimit?: number;
  status:     EssayStatus;
  deadline?:  ISODate;
  /** Newest last. Version history is the product (Vision §17). */
  drafts:     EssayDraft[];
}

// ── Opportunities (Vision §8, §9) ──────────────────────────────────────────

export type OpportunityKind =
  | "competition" | "olympiad" | "hackathon" | "research-program"
  | "summer-program" | "scholarship" | "internship" | "fellowship"
  | "conference" | "entrepreneurship" | "volunteer" | "award" | "academic";

export type OpportunityStage =
  | "saved" | "interested" | "applying" | "applied" | "accepted" | "rejected" | "declined";

export interface Opportunity {
  id:           string;
  name:         string;
  kind:         OpportunityKind;
  organization?: string;
  description?: string;
  eligibility?: string;
  deadline?:    ISODate;
  cost?:        string;
  location?:    string;
  format?:      "online" | "in-person" | "hybrid";
  fields:       string[];
  /** Where the student found it. Vision §8 requires a real, checkable source. */
  sourceUrl?:   string;
  applyUrl?:    string;
  stage:        OpportunityStage;
  addedAt:      ISOInstant;
}

// ── Tasks & calendar (Vision §20, §22) ─────────────────────────────────────

/** What produced a task. The back-pointer that makes the system feel joined up. */
export interface TaskSource {
  kind: "college" | "application" | "essay" | "opportunity" | "project"
      | "test" | "course" | "activity" | "recommender" | "manual";
  id:   string;
}

export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id:          string;
  title:       string;
  done:        boolean;
  priority:    TaskPriority;
  dueDate?:    ISODate;
  /** Honest estimate in minutes, shown on the action card (Vision §4). */
  estimateMinutes?: number;
  area?:       JourneyArea;
  source?:     TaskSource;
  notes?:      string;
  createdAt:   ISOInstant;
  completedAt?: ISOInstant;
}

export type CalendarEventKind =
  | "deadline" | "exam" | "test-date" | "milestone" | "session" | "custom";

export interface CalendarEvent {
  id:      string;
  title:   string;
  date:    ISODate;
  kind:    CalendarEventKind;
  source?: TaskSource;
  notes?:  string;
}

// ── Portfolio (Vision §24) ─────────────────────────────────────────────────

export interface Portfolio {
  /** Public handle: studyledger.in/u/<slug>. Empty until the student opts in. */
  slug?:      string;
  published:  boolean;
  headline?:  string;
  about?:     string;
  skills:     string[];
  links:      { label: string; url: string }[];
  resumeUrl?: string;
}

// ── The root object ────────────────────────────────────────────────────────

export interface Student {
  /** Schema version, so stored data can be migrated forward safely. */
  version:        number;
  profile:        StudentProfile;
  academics:      Academics;
  testing:        Testing;
  activities:     Activity[];
  awards:         Award[];
  research:       ResearchItem[];
  competitions:   CompetitionEntry[];
  projects:       Project[];
  colleges:       College[];
  applications:   Application[];
  recommenders:   Recommender[];
  essays:         Essay[];
  opportunities:  Opportunity[];
  tasks:          Task[];
  events:         CalendarEvent[];
  portfolio:      Portfolio;
  createdAt:      ISOInstant;
  updatedAt:      ISOInstant;
}

export const STUDENT_SCHEMA_VERSION = 1;

/** A new student: entirely empty. No seeded colleges, scores, or deadlines —
 *  Vision §34. Every module renders its empty state until the student acts. */
export function emptyStudent(now: ISOInstant = new Date().toISOString()): Student {
  return {
    version:       STUDENT_SCHEMA_VERSION,
    profile:       { careerInterests: [] },
    academics:     { courses: [], weakTopics: [] },
    testing:       { scores: [], plans: [] },
    activities:    [],
    awards:        [],
    research:      [],
    competitions:  [],
    projects:      [],
    colleges:      [],
    applications:  [],
    recommenders:  [],
    essays:        [],
    opportunities: [],
    tasks:         [],
    events:        [],
    portfolio:     { published: false, skills: [], links: [] },
    createdAt:     now,
    updatedAt:     now,
  };
}

/** Is this profile complete enough for recommendations to mean anything?
 *  Used to gate the recommendation engine rather than emit generic advice. */
export function hasMinimumProfile(s: Student): boolean {
  return Boolean(s.profile.grade && s.profile.curriculum);
}
