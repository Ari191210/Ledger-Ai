// THE tool registry. One list of tools exists in this repository — this one.
//
// It carries three layers, and they are deliberately different in kind:
//
//   1. NAVIGATION      slug · title · subtitle · cat · keywords · tier · blurb
//                      What a surface needs to render a tool. Unchanged in
//                      shape from before M2 — the dashboard's hand-maintained
//                      `TOOL_CATEGORIES` duplicate was folded into it (M2-2),
//                      which is where `tier` and `blurb` came from.
//
//   2. CLASSIFICATION  status
//                      PRODUCT_DECISIONS §1.2 / §1.5. Enforced in navigation
//                      only: §1.4 — "one file controls what the product looks
//                      like, and no implementation moves." All 46 routes
//                      resolve regardless of status (§2.3).
//
//   3. CAPABILITY      the manifest, STUDYLEDGER_SYSTEM_ARCHITECTURE Part P.2
//                      What a tool can actually do, as data.
//
// `integration_level` and `persistence` are DERIVED from layer 3 and never
// declared (P.3). A tool cannot claim a level it does not implement, which is
// the single rule that stops a 46-tool surface becoming 46 uncontrolled score
// writers (P.3.a).

export type ToolCategory = "PLAN" | "LEARN" | "WRITE" | "PRACTISE" | "FUTURE" | "TRACK"

/** PRODUCT_DECISIONS §1.2. `legacy` is the only class that ever moves on disk. */
export type ToolStatus = "core" | "supporting" | "experimental" | "legacy"

export type ToolTier = "Free" | "Pro" | "Pro+"

// ── Capability vocabulary (Part P.2) ────────────────────────────────────────

/**
 * Academic Event types a tool may emit. The event layer itself is M7; until it
 * exists no tool emits anything, so every manifest below declares `[]`. That is
 * not a placeholder — it is the measured truth, and it is why every derived
 * level is currently 0. Wiring a tool in M7+ raises its level automatically.
 */
export type AcademicEventType =
  | "CONCEPT_VIEWED" | "EXPLANATION_READ"
  | "QUESTION_ATTEMPTED" | "QUESTION_CORRECT" | "QUESTION_INCORRECT"
  | "PAPER_LOGGED" | "SYLLABUS_INGESTED"

export type ConceptEmission   = "none" | "tagged" | "proposed"
export type ConceptResolution = "taxonomy" | "free_text" | "none"

/**
 * `deterministic` means graded against a STORED answer key (F.4.a). A tool that
 * asks a model "was that right?" is `rubric_ai_proposed`, however confident it
 * sounds — P.3.a.
 */
export type GradingMode = "none" | "deterministic" | "rubric_ai_proposed"

export type PersonalModelDimension = "board" | "grade" | "subjects" | "level"

/** Derived, never declared — see `derivePersistence`. */
export type Persistence = "none" | "saved_output" | "academic_record"

export type IntegrationLevel = 0 | 1 | 2 | 3 | 4

export interface ToolCapability {
  subjects:                 "any" | string[]
  emits_events:             AcademicEventType[]
  emits_concepts:           ConceptEmission
  concept_resolution:       ConceptResolution
  joins_sessions:           boolean
  can_grade:                GradingMode
  emits_mistakes:           boolean
  consumes_personalisation: PersonalModelDimension[]
  reports_results:          boolean
  /**
   * Ground truth, measured from `app/tools/<slug>/**`: every localStorage key
   * the tool writes today. `persistence` is derived from this against
   * `SYNCED_KEYS` / `SCORE_INPUT_KEYS`, so it cannot be overstated.
   */
  writes_keys:              string[]
  /** Replaces the 86-member `ToolName` union (P.2.b) as the allowlist source. */
  ai_capabilities:          string[]
}

export interface ToolEntry {
  slug:     string
  title:    string
  subtitle: string
  cat:      ToolCategory
  keywords?: string[]
  status:   ToolStatus
  tier:     ToolTier
  blurb:    string
}

export interface ResolvedTool extends ToolEntry, ToolCapability {
  integration_level: IntegrationLevel
  persistence:       Persistence
}

export const CAT_COLOR: Record<ToolCategory, string> = {
  PLAN:     "var(--sage)",
  LEARN:    "var(--slate)",
  WRITE:    "var(--ochre)",
  PRACTISE: "var(--cinnabar-ink)",
  FUTURE:   "var(--plum)",
  TRACK:    "var(--teal)",
}

export const CAT_ORDER: ToolCategory[] = ["PLAN", "LEARN", "WRITE", "PRACTISE", "FUTURE", "TRACK"]

// ── Persistence reference keys ──────────────────────────────────────────────
// Mirrors of `lib/sync.ts` SYNC_KEYS and the keys `readScoreInputs()` reads in
// `lib/ledger-score.ts`. They are mirrored rather than imported because
// `lib/sync.ts` instantiates the Supabase browser client at module load and the
// registry is imported by server-reachable surfaces. `tests/tools-registry.test.mjs`
// asserts both mirrors against their sources, so drift fails the suite.

export const SYNCED_KEYS: readonly string[] = [
  "ledger-profile", "ledger-onboarding-done", "ledger-focus-streak", "ledger-focus-last",
  "ledger-focus-shield", "ledger-habits-list", "ledger-habits-log", "ledger-weak-topics",
  "ledger-deadlines", "ledger-notes-history", "ledger-plan-v1", "ledger-papers-log",
  "ledger-mistakes", "ledger-syllabus", "ledger-syllabus-subjects", "ledger-formula-history",
  "ledger-career-answers", "ledger-career-output", "ledger-checks", "ledger-last-event",
  "ledger-workspace",
]

export const SCORE_INPUT_KEYS: readonly string[] = [
  "ledger-papers-log", "ledger-syllabus-subjects", "ledger-syllabus",
  "ledger-notes-history", "ledger-mistakes", "ledger-focus-streak",
]

// ── Derivation (P.3) ────────────────────────────────────────────────────────

/**
 * P.4's method, made structural: a tool that writes a key the score consumes is
 * touching the academic record; a tool that writes anything else is producing a
 * saved output; a tool that writes nothing leaves no trace.
 */
export function derivePersistence(c: ToolCapability): Persistence {
  if (c.writes_keys.length === 0) return "none"
  if (c.writes_keys.some(k => SCORE_INPUT_KEYS.includes(k))) return "academic_record"
  return "saved_output"
}

/**
 * P.3, implemented exactly as the table states it. Each level is the previous
 * level plus its own requirement, so a level can never be claimed — only met.
 */
export function deriveIntegrationLevel(c: ToolCapability): IntegrationLevel {
  // L1 — Observed: emits a viewing event carrying a concept reference.
  const observes =
    (c.emits_events.includes("CONCEPT_VIEWED") || c.emits_events.includes("EXPLANATION_READ")) &&
    c.concept_resolution !== "none"
  if (!observes) return 0

  // L2 — Session-participating.
  const inSession = c.joins_sessions && (c.emits_concepts === "tagged" || c.emits_concepts === "proposed")
  if (!inSession) return 1

  // L3 — Evidence-producing. Deterministic grading only (P.3.a).
  const producesEvidence =
    c.can_grade === "deterministic" &&
    c.emits_events.some(e => e.startsWith("QUESTION_")) &&
    c.emits_mistakes
  if (!producesEvidence) return 2

  // L4 — Fully integrated: the loop closes inside the tool.
  const closesLoop = c.consumes_personalisation.length > 0 && c.reports_results
  return closesLoop ? 4 : 3
}

// ── Capability manifests ────────────────────────────────────────────────────
// One entry per tool. Fields omitted fall back to `BASE_CAPABILITY`, so what is
// written here is the delta from "standalone, leaves no trace" — which is the
// honest shape of today's product (P.4: 29 tools at Level 0, a floor).

const BASE_CAPABILITY: ToolCapability = {
  subjects: "any",
  emits_events: [],
  emits_concepts: "none",
  concept_resolution: "none",
  joins_sessions: false,
  can_grade: "none",
  emits_mistakes: false,
  consumes_personalisation: [],
  reports_results: false,
  writes_keys: [],
  ai_capabilities: [],
}

const P_LEVEL: PersonalModelDimension[] = ["level"]
const P_PROFILE: PersonalModelDimension[] = ["board", "grade", "subjects"]

// ── M15-7 — THE MANIFEST IS NOW THE `/api/ai` ALLOWLIST, SO IT MUST BE WHOLE.
//
// EXECUTION_PLAN M15-7: *"Derive `validTools` from the manifest; the
// duplicate-entry defects disappear."* Architecture S.5 names the defects:
// `marks_obituary` appears twice in the hand-written array, and entries exist
// with no `REQUIRED_PARAMS`.
//
// Deriving the allowlist here exposed a THIRD, larger defect, in the opposite
// direction. `ai_capabilities` covered 66 of the route's 86 capabilities —
// exactly the 66 a surface under app/tools (every page.tsx there) actually
// calls. The other 20 are
// real, prompted, HTTP-reachable capabilities with no caller in the product:
// `formula_decoder`, `mark_scheme`, `concept_web`, `analysis_hub`,
// `brain_budget`, `exam_triage`, `focus_lab`, `language_lab`, `memory_toolkit`,
// `recall_studio`, `reference_builder`, `report_writer`, `research_suite`,
// `revision_intel`, `study_command`, `writing_tools`, `examiner_mind`,
// `last_night_brief`, `marks_autopsy`, `redemption_set`.
//
// They are declared below, each on the tool it belongs to, because the manifest
// is the allowlist and an undeclared capability would be a capability DELETED —
// a silent behaviour change M15 is explicitly not permitted to make. Declaring
// them is additive: `ai_capabilities` feeds neither `deriveIntegrationLevel`
// nor `derivePersistence`, so no tool's derived level moves by one point.
//
// That twenty capabilities have no surface is a product question, not a
// registry one. It is recorded here and in the M15 completion note rather than
// answered by quietly removing them.
const CAPABILITIES: Record<string, Partial<ToolCapability>> = {
  // PLAN
  "study-command":       { ai_capabilities: ["coach_briefing", "coach_chat", "study_command"], writes_keys: ["ledger-plan-v1", "ledger-habits-list", "ledger-habits-log", "ledger-deadlines"] },
  "focus-lab":           { ai_capabilities: ["circuit_breaker", "brain_budget", "focus_lab"], writes_keys: ["ledger-debt-subjects", "ledger-focus-streak", "ledger-focus-last", "ledger-focus-shield"] },

  // LEARN
  "learn-lab":           { ai_capabilities: ["doubt", "doubt_cross_eval", "doubt_cross_question", "feynman_eval", "feynman_probe", "notes", "mindmap", "concept_connect", "concept_web", "tutor"], can_grade: "rubric_ai_proposed", consumes_personalisation: P_LEVEL, writes_keys: ["ledger-notes-history", "ledger-checks"] },
  "language-lab":        { ai_capabilities: ["lang_analyzer", "vocab", "language_lab"], consumes_personalisation: P_LEVEL },
  "syllabus":            { ai_capabilities: ["syllabus"], consumes_personalisation: P_PROFILE, writes_keys: ["ledger-syllabus", "ledger-syllabus-subjects", "ledger-profile"] },

  // WRITE
  "writing-tools":       { ai_capabilities: ["essay_blueprint", "essay_grade", "argument", "grammar", "personal_statement", "writing_tools"], can_grade: "rubric_ai_proposed", consumes_personalisation: P_LEVEL },
  "research-suite":      { ai_capabilities: ["research", "assignment", "debate", "presentation", "research_suite"], consumes_personalisation: P_LEVEL },
  "presentation":        { ai_capabilities: ["presentation"] },
  "debate":              { ai_capabilities: ["debate"], consumes_personalisation: P_LEVEL },
  "citation":            {},
  "lab-report":          { ai_capabilities: ["lab_report"] },
  "model-answer":        { ai_capabilities: ["model_answer"], consumes_personalisation: P_LEVEL },
  "reference-builder":   { ai_capabilities: ["mindmap", "formula", "concept_connect", "reference_builder"], consumes_personalisation: P_PROFILE, writes_keys: ["ledger-formula-history"] },
  "report-tools":        { ai_capabilities: ["lab_report", "model_answer", "report_writer"], consumes_personalisation: P_LEVEL },

  // PRACTISE
  "exam-practice":       { ai_capabilities: ["papers_explain", "paper_triage", "paper_dissector", "crunch", "formula", "formula_recall", "formula_decoder", "mark_scheme", "mark_scheme_eval"], can_grade: "rubric_ai_proposed", emits_mistakes: true, consumes_personalisation: P_PROFILE, writes_keys: ["ledger-papers-log", "ledger-mistakes", "ledger-weak-topics", "ledger-formula-history", "paper_triage_plan"] },
  "recall-studio":       { ai_capabilities: ["flashcards", "formula_recall", "recall_studio"], consumes_personalisation: P_PROFILE },
  "exam-planner":        { ai_capabilities: ["predict", "topic_half_life", "revision_intel"], consumes_personalisation: P_PROFILE, writes_keys: ["ledger-spaced-items", "ledger-half-life-history"] },
  "exam-triage":         { ai_capabilities: ["crunch", "cremator", "last_night_triage", "exam_triage", "last_night_brief"], writes_keys: ["last-night-plan"] },
  "practice":            { ai_capabilities: ["practice", "exam_sim"], can_grade: "rubric_ai_proposed", consumes_personalisation: P_PROFILE },
  "post-exam":           { ai_capabilities: ["exam_debrief", "exam_strategy", "redemption_set"], writes_keys: ["ledger-exam-debriefs"] },
  "memory-toolkit":      { ai_capabilities: ["analogy", "memory_palace", "memory_toolkit"] },
  "flashcards":          { ai_capabilities: ["flashcards"], consumes_personalisation: P_LEVEL },
  "exam-sim":            { ai_capabilities: ["exam_sim"], can_grade: "rubric_ai_proposed", consumes_personalisation: P_PROFILE, writes_keys: ["ledger-weak-topics"] },
  "exam-day":            { ai_capabilities: ["exam_sim"], can_grade: "rubric_ai_proposed", consumes_personalisation: P_PROFILE },
  "forgetting-forecast": { writes_keys: ["ledger-forgetting-log"] },
  "calibration":         { ai_capabilities: ["calibration_questions"], can_grade: "rubric_ai_proposed", consumes_personalisation: P_LEVEL },
  "paper-pattern":       { ai_capabilities: ["paper_pattern"], consumes_personalisation: P_PROFILE },
  "paper-autopsy":       { ai_capabilities: ["paper_autopsy", "marks_autopsy"], writes_keys: ["paper_autopsy_history"] },
  "marks-obituary":      { ai_capabilities: ["marks_obituary"] },
  "panic-triage":        { ai_capabilities: ["panic_triage"] },
  "marks-forensics":     { ai_capabilities: ["marks_forensics", "examiner_mind"], writes_keys: ["forensics_sessions"] },
  "paper-trauma":        { ai_capabilities: ["paper_trauma_map"] },

  // FUTURE
  "admissions":          { ai_capabilities: ["admissions", "uni_match", "uni_prep", "career", "subject_picker", "application_plan"], writes_keys: ["ledger-career-answers", "ledger-career-output"] },
  "resume":              {},
  "interview":           { ai_capabilities: ["interview_questions", "interview_eval"], can_grade: "rubric_ai_proposed" },
  "gpa-sim":             {},

  // TRACK
  "grade-tracker":       { ai_capabilities: ["exam_debrief"], writes_keys: ["ledger-exam-debriefs"] },
  "rooms":               {},
  "compare":             { ai_capabilities: ["compare"], consumes_personalisation: P_LEVEL },
  "source":              { ai_capabilities: ["source", "reading"] },
  "case-study":          { ai_capabilities: ["case_study"], consumes_personalisation: P_LEVEL },
  "timeline":            { ai_capabilities: ["timeline"], consumes_personalisation: P_LEVEL },
  "study-guide":         { ai_capabilities: ["study_guide"], consumes_personalisation: P_LEVEL },
  "analysis-hub":        { ai_capabilities: ["compare", "source", "reading", "timeline", "case_study", "analysis_hub"] },
  "silent-topics":       { ai_capabilities: ["silent_topic_audit"], writes_keys: ["ledger-silent-topics-history"] },
  "personalise":         { writes_keys: ["ledger-radius", "ledger-width", "ledger-anim-speed", "ledger-font-sans", "ledger-font-serif", "ledger-font-mono"] },
}

// ── The register ────────────────────────────────────────────────────────────
// `status` is PRODUCT_DECISIONS §1.5, verbatim. §1.5 lists EXPERIMENTAL as 21
// but names 19; `study-command` and `focus-lab` are the two the prose omits and
// are the only tools §1.5 leaves unnamed, so they take the class that makes the
// stated count correct. Recorded as a documentation defect in the M2 report.

export const TOOLS_REGISTRY: ToolEntry[] = [
  // ── PLAN (2) ──────────────────────────────────────────────────────────────
  { slug: "study-command", title: "Study Command",  subtitle: "Planner, habits, coach, deadlines.",  cat: "PLAN",     status: "experimental", tier: "Free", blurb: "Four tools in one: 14-day study planner, daily habit tracker with heatmap, deadline countdown hub, and your personal AI study coach.", keywords: ["planner","schedule","timetable","plan","day","habit","heatmap","streak","daily","routine","deadline","exam","assignment","countdown","due","coach","mentor","guide","strategy","personal"] },
  { slug: "focus-lab",     title: "Focus Lab",      subtitle: "Deep focus. Pomodoro. Break blocks.", cat: "PLAN",     status: "experimental", tier: "Free", blurb: "Pomodoro timer, focus sessions, debt meter, circadian tracker, and circuit breaker to end procrastination.", keywords: ["pomodoro","timer","focus","session","deep","work","circuit","block","procrastination","start","motivation","debt","circadian","brain","budget"] },

  // ── LEARN (3) ────────────────────────────────────────────────────────────
  { slug: "learn-lab",    title: "Learn Lab",       subtitle: "Doubt, Feynman, notes, mindmap.",        cat: "LEARN",    status: "supporting",   tier: "Free", blurb: "Five tools in one: solve doubts with worked solutions, learn via Feynman technique, generate study notes, build mind maps, and find concept connections.", keywords: ["doubt","feynman","notes","mindmap","concept","learn","question","answer","connect","connect","concept-connect"] },
  { slug: "language-lab", title: "Language Lab",    subtitle: "Language analysis + vocab vault.",        cat: "LEARN",    status: "supporting",   tier: "Free", blurb: "Language Analyzer annotates any passage with tone, devices, structure, and commentary. Vocabulary Vault generates word sets with etymology and memory hooks.", keywords: ["language","literary","device","tone","analyse","vocab","word","definition","etymology","lang","analyzer"] },
  { slug: "syllabus",     title: "Syllabus Parser", subtitle: "Upload PDF. Get your year mapped.",       cat: "LEARN",    status: "core",         tier: "Free", blurb: "Extract subjects, chapters, and topics from any syllabus document. Unlocks 250 Ledger Score points instantly.", keywords: ["syllabus","pdf","upload","parse","curriculum"] },

  // ── WRITE (9) ────────────────────────────────────────────────────────────
  { slug: "writing-tools",     title: "Writing Tools",         subtitle: "Essay workshop + writing polish.",         cat: "WRITE",    status: "experimental", tier: "Free", blurb: "Essay Blueprint (plan, argue, grade) and Writing Polish (grammar, style, personal statement) combined in one tab-switched hub.", keywords: ["essay","blueprint","grade","argue","workshop","thesis","grammar","writing","style","personal","statement","polish"] },
  { slug: "research-suite",    title: "Research Suite",        subtitle: "Deep research or plan assignment.",        cat: "WRITE",    status: "experimental", tier: "Pro",  blurb: "Full research briefing with arguments, statistics, and essay angles — or turn a brief into a structured assignment plan.", keywords: ["research","essay","plan","outline","assignment","source"] },
  { slug: "presentation",      title: "Presentation Planner",  subtitle: "Topic → full slide deck.",                cat: "WRITE",    status: "experimental", tier: "Pro",  blurb: "AI builds a complete slide deck with speaker notes calibrated to your audience and subject.", keywords: ["presentation","slides","speaker","notes","deck"] },
  { slug: "debate",            title: "Debate Coach",          subtitle: "Any motion. Arguments both ways.",         cat: "WRITE",    status: "experimental", tier: "Pro",  blurb: "For and against arguments, evidence, rebuttals, and practice questions for any debate motion.", keywords: ["debate","argument","rebuttal","motion","for","against"] },
  { slug: "citation",          title: "Citation Builder",      subtitle: "Cite anything. Any style.",               cat: "WRITE",    status: "experimental", tier: "Free", blurb: "Generate properly formatted citations in Harvard, APA, MLA, Chicago, and more from any source type.", keywords: ["citation","cite","harvard","apa","mla","chicago","reference","bibliography"] },
  { slug: "lab-report",        title: "Lab Report Writer",     subtitle: "Lab data → structured report.",           cat: "WRITE",    status: "experimental", tier: "Free", blurb: "Turn raw experimental data into a structured lab report with aim, method, results, and conclusion.", keywords: ["lab","report","experiment","method","results","conclusion","biology","chemistry","physics"] },
  { slug: "model-answer",      title: "Model Answer Factory",  subtitle: "See what full marks looks like.",          cat: "WRITE",    status: "supporting",   tier: "Free", blurb: "Perfect model answer for any exam question with marking points, structure guide, and examiner commentary.", keywords: ["model","answer","exemplar","marks","question","full"] },
  { slug: "reference-builder", title: "Reference Builder",     subtitle: "Build your source list.",                 cat: "WRITE",    status: "experimental", tier: "Free", blurb: "Collect, organise, and export your reference list in any citation style for any essay or project.", keywords: ["reference","bibliography","source","list","export","citation"] },
  { slug: "report-tools",      title: "Report Tools",          subtitle: "Case studies, business reports, more.",   cat: "WRITE",    status: "experimental", tier: "Free", blurb: "A suite of report writing tools: case study deconstructor, business report builder, and structured academic reports.", keywords: ["report","case","study","business","academic","structure"] },

  // ── PRACTISE (18) ─────────────────────────────────────────────────────────
  { slug: "exam-practice",      title: "Exam Practice Hub",      subtitle: "Papers, triage, crunch, formula.",      cat: "PRACTISE", status: "core",         tier: "Pro",  blurb: "Six tools: Past Papers (47 papers, 900+ questions), Paper Panic Triage, 48h Crunch Plan, Question Decoder, Formula Sheet, and Formula Recall.", keywords: ["past","paper","triage","crunch","formula","recall","mark","scheme","exam","cbse","jee","neet","sat","ib","papers"] },
  { slug: "recall-studio",      title: "Recall Studio",          subtitle: "Flashcards + formula recall.",          cat: "PRACTISE", status: "supporting",   tier: "Free", blurb: "AI generates flashcards from notes or any topic. Formula Recall drills formulas with active recall — beats re-reading by 4×.", keywords: ["recall","flashcard","active","studio","drill","spaced"] },
  { slug: "exam-planner",       title: "Revision Planner",       subtitle: "Spaced revision schedule.",            cat: "PRACTISE", status: "core",         tier: "Free", blurb: "AI builds a revision schedule around your exam dates with Ebbinghaus intervals. Track topic half-life and predict which questions will come up.", keywords: ["revision","planner","spaced","ebbinghaus","schedule","half-life","predict","decay","forgetting","weak","topic","revision-intel"] },
  { slug: "exam-triage",        title: "Exam Triage",            subtitle: "48h crunch + chapter ranking.",         cat: "PRACTISE", status: "supporting",   tier: "Free", blurb: "48-Hour Crunch builds a rescue plan from your topics and time left. Chapter Ranking orders every chapter by how often examiners return to it.", keywords: ["triage","crunch","ranking","revision","priority","urgent","last","night","last-night","skip","chapter","rank"] },
  { slug: "practice",           title: "Practice Suite",         subtitle: "Practice problems or mock exam.",       cat: "PRACTISE", status: "core",         tier: "Free", blurb: "Generate graded practice problems with worked solutions — or sit a full timed mock MCQ exam with flag-for-review and results breakdown.", keywords: ["practice","question","timed","exam","simulator","mcq","mock"] },
  { slug: "post-exam",          title: "Post-Exam Analysis",     subtitle: "Mistake DNA + exam debrief.",           cat: "PRACTISE", status: "core",         tier: "Free", blurb: "Mistake DNA maps your error fingerprint by category and subject. Exam Debrief gives you a personalised AI coaching note after every test.", keywords: ["post","exam","debrief","mistake","dna","error","fingerprint","conceptual","calculation","careless","pattern","review","analyse","strategy"] },
  { slug: "memory-toolkit",     title: "Memory Toolkit",         subtitle: "Analogy + memory palace.",              cat: "PRACTISE", status: "supporting",   tier: "Free", blurb: "Build powerful analogies to explain any concept, or construct a memory palace for recalling sequences, lists, and processes.", keywords: ["memory","palace","analogy","mnemonic","recall","visual","technique"] },
  { slug: "flashcards",         title: "Flashcard Studio",       subtitle: "Active recall, anytime.",               cat: "PRACTISE", status: "supporting",   tier: "Free", blurb: "AI-generated flashcards for any topic or set of notes, with a flip-card interface and spaced repetition tracking.", keywords: ["flashcard","card","flip","active","recall","spaced","repetition"] },
  { slug: "exam-sim",           title: "Exam Simulator",         subtitle: "Full timed mock exam.",                 cat: "PRACTISE", status: "supporting",   tier: "Pro",  blurb: "Sit a complete timed exam with real-style questions, flag-for-review, auto-marking, and a full performance breakdown at the end.", keywords: ["exam","simulator","timed","mock","full","test","cbse","jee","ib","sat"] },
  { slug: "exam-day",           title: "Exam-Day Mode",          subtitle: "Morning of the paper. Just the gaps.",  cat: "PRACTISE", status: "supporting",   tier: "Free", blurb: "The morning of the paper. Reads the mistakes you logged in the last 14 days and sweeps only those — no new material, no full revision.", keywords: ["exam","day","morning","gap","missed","wrong","sweep","final","revision","lock","calm","last","minute"] },
  { slug: "forgetting-forecast",title: "Forgetting Forecast",    subtitle: "See when you'll forget.",               cat: "PRACTISE", status: "supporting",   tier: "Free", blurb: "Ebbinghaus-based decay model shows exactly when each topic will slip below recall threshold — so you revise at the right moment.", keywords: ["forget","forgetting","decay","ebbinghaus","curve","review","interval"] },
  { slug: "calibration",        title: "Confidence Calibrator",  subtitle: "Know what you actually know.",          cat: "PRACTISE", status: "core",         tier: "Free", blurb: "Rate your confidence on each topic, then test it. The gap between confidence and accuracy reveals your exact blind spots.", keywords: ["confidence","calibration","blind","spot","self","assess","overconfidence"] },
  // "dna" merged into post-exam (?tab=dna) and the syllabus-ranking tab into
  // exam-triage — old routes 301 in next.config.mjs; keywords live on the
  // surviving entries.
  //
  // M13-4 — THE MORBID METAPHOR FAMILY IS RETIRED FROM EVERY TITLE, SUBTITLE
  // AND BLURB BELOW. `PRODUCT_PRINCIPLES` §4.1: *"Obituary · autopsy · coroner
  // · cause of death · trauma · cremator · forensics … It is clever, it is
  // memorable, and it is shame delivered as branding … Banned, not softened."*
  // These four entries carried the whole family. The SLUGS are unchanged, for
  // the reason recorded in `next.config.mjs` beside their redirects: a slug is
  // a route path, not copy, and renaming one would break the 301s M13-2 built
  // without removing a single word a student can read. What a student reads is
  // here, and it no longer says any of them.
  { slug: "paper-pattern",      title: "Paper Pattern Analyser", subtitle: "Decode what examiners want.",                       cat: "PRACTISE", status: "core", tier: "Free", blurb: "Analyse past paper patterns to surface which topics, question types, and mark allocations appear most frequently.", keywords: ["paper","pattern","examiner","question","type","frequency","mark","allocation"] },
  { slug: "paper-autopsy",      title: "Paper Breakdown",        subtitle: "Account for every mark you lost.",                 cat: "PRACTISE", status: "core", tier: "Free", blurb: "Upload your answer sheet and get a full breakdown: every error type, every weak subtopic, and a personalised drill plan to fix them before the next paper.", keywords: ["paper","breakdown","answer","mark","lost","error","subtopic","drill","review"] },
  { slug: "marks-obituary",     title: "Marks Accounting",       subtitle: "Where the marks you should have had went.",        cat: "PRACTISE", status: "core", tier: "Free", blurb: "Write 60 words on the marks you should have got. You get back a structured account: what each one was lost to, when in the paper it happened, and a prevention protocol.", keywords: ["marks","accounting","account","lost","prevention","recover","where"] },
  { slug: "panic-triage",       title: "Paper Panic Triage",     subtitle: "2AM before the exam — what to do right now.",      cat: "PRACTISE", status: "supporting", tier: "Free", blurb: "At 11PM the night before a JEE/NEET/Board paper with 6 hours left and 14 chapters half-revised. Get a triage plan: what to do now, what to skim, what to skip.", keywords: ["panic","triage","night","before","crunch","last","minute","rescue","plan"] },
  { slug: "marks-forensics",    title: "Mark Scheme Check",      subtitle: "Paste your answer. Know exactly which line lost you marks.", cat: "PRACTISE", status: "core", tier: "Free", blurb: "After every board exam or test, paste your answer and the mark scheme. Get a line-by-line breakdown of exactly where marks were lost and why.", keywords: ["marks","scheme","answer","line","lost","mark","check","breakdown"] },
  { slug: "paper-trauma",       title: "Repeat Failure Map",     subtitle: "Find the questions that keep catching you — and why you'll see them again.", cat: "PRACTISE", status: "core", tier: "Free", blurb: "Paste your last 3 mock results. Get a map of the exact questions that keep catching you, why they keep appearing, and how to neutralise them before the real paper.", keywords: ["paper","repeat","mock","questions","recurring","pattern","neutralise","results"] },

  // ── FUTURE (4) ───────────────────────────────────────────────────────────
  { slug: "admissions", title: "Admissions Engine", subtitle: "Your real odds. 60 universities.",    cat: "FUTURE",   status: "experimental", tier: "Pro",  blurb: "University matching, subject combination advice, career path quiz, and modelled admission chances for 60 top universities.", keywords: ["admissions","university","odds","probability","college","uni","match","career","subject","path","future","applications","prep"] },
  { slug: "resume",     title: "Resume Builder",    subtitle: "For applications, not LinkedIn.",     cat: "FUTURE",   status: "experimental", tier: "Pro",  blurb: "Internships, summer programs, college applications — one polished document built from your experience and goals.", keywords: ["resume","cv","application","university","college","internship"] },
  { slug: "interview",  title: "Interview Coach",   subtitle: "Practice. Get scored. Improve.",      cat: "FUTURE",   status: "experimental", tier: "Pro",  blurb: "Answer AI interview questions, get scored on each response with a model answer and a specific coaching tip.", keywords: ["interview","practice","score","coach","job"] },
  { slug: "gpa-sim",    title: "GPA Simulator",     subtitle: "Simulate your GPA trajectory.",       cat: "FUTURE",   status: "experimental", tier: "Free", blurb: "Enter your grades and targets — see exactly what you need in each remaining subject to hit your GPA or percentage goal.", keywords: ["gpa","grade","simulate","trajectory","target","percentage","weighted"] },

  // ── TRACK (10) ───────────────────────────────────────────────────────────
  { slug: "grade-tracker",  title: "Grade Tracker",         subtitle: "Marks, score, heatmap, debrief.",   cat: "TRACK",    status: "core",         tier: "Free", blurb: "Weighted grade predictor, Ledger Score™ breakdown, peer performance heatmap, and post-exam debrief — all in one hub.", keywords: ["marks","grade","predict","weighted","cbse","percentage","score","ledger","readiness","index","metric","rating","peer","heatmap","debrief"] },
  { slug: "rooms",          title: "Study Rooms",           subtitle: "Silent accountability.",            cat: "TRACK",    status: "experimental", tier: "Pro+", blurb: "Shared timer and tasks with friends. Code-based rooms, no sign-up needed for guests.", keywords: ["room","study","accountability","partner","timer","streak"] },
  { slug: "compare",        title: "Comparison Chart",      subtitle: "Any concepts, side by side.",       cat: "TRACK",    status: "experimental", tier: "Free", blurb: "Compare 2–4 items across 6–8 criteria. Similarities, differences, and a clear verdict in a clean table.", keywords: ["compare","contrast","concept","topic","side","difference"] },
  { slug: "source",         title: "Source Analyser",       subtitle: "Analyse any source.",               cat: "TRACK",    status: "experimental", tier: "Free", blurb: "Deconstruct any primary or secondary source: origin, purpose, value, limitation, and historical context.", keywords: ["source","primary","secondary","origin","purpose","value","limitation","context"] },
  { slug: "case-study",     title: "Case Study Decoder",    subtitle: "Deconstruct any case study.",       cat: "TRACK",    status: "experimental", tier: "Free", blurb: "Break down any business, science, or humanities case study into structured analysis with key lessons and frameworks.", keywords: ["case","study","business","deconstruct","framework","analysis","lesson"] },
  { slug: "timeline",       title: "Timeline Builder",      subtitle: "Build any historical timeline.",    cat: "TRACK",    status: "experimental", tier: "Free", blurb: "Generate a structured chronological timeline for any topic, event sequence, or historical period.", keywords: ["timeline","chronology","history","event","sequence","period","date"] },
  { slug: "study-guide",    title: "Study Guide Generator", subtitle: "One topic. One clean guide.",       cat: "TRACK",    status: "experimental", tier: "Free", blurb: "Turn any topic, chapter, or set of notes into a structured study guide with key points, definitions, and practice questions.", keywords: ["study","guide","generate","topic","notes","key","points","definitions","questions"] },
  { slug: "analysis-hub",   title: "Analysis Hub",          subtitle: "Analyse anything deeply.",          cat: "TRACK",    status: "experimental", tier: "Free", blurb: "Deep analytical breakdown of any text, data, event, or concept — structured and ready for academic use.", keywords: ["analysis","analyse","deep","text","data","event","concept","academic","breakdown"] },
  { slug: "silent-topics",  title: "Silent Topic Finder",   subtitle: "Find what you've been avoiding.",   cat: "TRACK",    status: "core",         tier: "Free", blurb: "Paste 14 days of study notes. AI maps your full syllabus, colours avoided chapters in cinnabar, and builds a 3-day reentry plan for the one you've been dodging longest.", keywords: ["silent","topic","avoid","map","syllabus","dodging","reentry","cinnabar","gap"] },
  { slug: "personalise",    title: "Personalise",           subtitle: "Your study profile.",               cat: "TRACK",    status: "supporting",   tier: "Free", blurb: "Set your grade level, board, subjects, and learning preferences so every tool is tailored specifically to you.", keywords: ["personalise","profile","grade","board","subject","preference","tailor","settings"] },
]

// ── Resolution ──────────────────────────────────────────────────────────────

function capabilityFor(slug: string): ToolCapability {
  return { ...BASE_CAPABILITY, ...(CAPABILITIES[slug] ?? {}) }
}

/** Every tool, with its capability manifest and both derived fields attached. */
export const RESOLVED_TOOLS: ResolvedTool[] = TOOLS_REGISTRY.map(entry => {
  const capability = capabilityFor(entry.slug)
  return {
    ...entry,
    ...capability,
    integration_level: deriveIntegrationLevel(capability),
    persistence:       derivePersistence(capability),
  }
})

/**
 * M15-7 — EVERY AI CAPABILITY THE PRODUCT DECLARES, DERIVED.
 *
 * `app/api/ai/route.ts` used to carry an 87-entry hand-written `validTools`
 * array beside an 86-arm switch. Two lists, maintained by hand, in one file:
 * `marks_obituary` was in it twice, and nothing could have told anyone.
 *
 * This is the one list now. It is the union of every tool's `ai_capabilities`,
 * sorted and de-duplicated by construction — a duplicate entry is not a defect
 * that gets caught, it is unrepresentable, and the allowlist cannot drift from
 * the manifest because it IS the manifest.
 *
 * `lib/ai-capabilities/registry.ts` refuses to load if the set of capabilities
 * that have prompts is not exactly this set, so the third way to drift — a
 * capability declared here with nothing behind it, or a prompt nobody may
 * reach — is closed too.
 */
export const AI_CAPABILITIES: readonly string[] = Object.freeze(
  [...new Set(RESOLVED_TOOLS.flatMap(t => t.ai_capabilities))].sort(),
)

const AI_CAPABILITY_SET: ReadonlySet<string> = new Set(AI_CAPABILITIES)

/** The allowlist check itself, so no caller re-implements it with `includes`. */
export function isAiCapability(name: unknown): name is string {
  return typeof name === "string" && AI_CAPABILITY_SET.has(name)
}

const BY_SLUG = new Map(RESOLVED_TOOLS.map(t => [t.slug, t]))

export function toolBySlug(slug: string): ResolvedTool | undefined {
  return BY_SLUG.get(slug)
}

// ── Navigation filter (PRODUCT_DECISIONS §1.4, §2.3) ────────────────────────
//
// This is the whole mechanism: navigation renders `NAV_TOOLS`; every other tool
// stays routable by direct URL and nothing moves on disk. Reversing a
// classification is a one-word edit to `status` above.
//
// §1.2 — CORE is Visible, SUPPORTING is "Hidden in V1", EXPERIMENTAL and LEGACY
// are Removed from navigation. Flip `SHOW_SUPPORTING` when V1 ends.

export const SHOW_SUPPORTING = false

export const CORE_TOOLS: ResolvedTool[] = RESOLVED_TOOLS.filter(t => t.status === "core")

export const NAV_TOOLS: ResolvedTool[] = RESOLVED_TOOLS.filter(
  t => t.status === "core" || (SHOW_SUPPORTING && t.status === "supporting"),
)

/** Navigation surfaces group by this; unnavigated categories drop out. */
export const NAV_CATEGORIES: Array<{ label: ToolCategory; color: string; tools: ResolvedTool[] }> =
  CAT_ORDER
    .map(label => ({ label, color: CAT_COLOR[label], tools: NAV_TOOLS.filter(t => t.cat === label) }))
    .filter(c => c.tools.length > 0)
