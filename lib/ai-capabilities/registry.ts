// ═══════════════════════════════════════════════════════════════════════════
// M15-3 / M15-7 — THE CAPABILITY REGISTRY, DRIVEN BY THE MANIFEST.
//
// EXECUTION_PLAN M15-3: *"Break the 86-arm switch into per-capability modules
// driven by the manifest."*
// EXECUTION_PLAN M15-7: *"Derive `validTools` from the manifest; the
// duplicate-entry defects disappear."*
//
// `app/api/ai/route.ts` no longer knows the name of a single capability. It
// asks this module two questions — *is this a capability?* and *give me the
// capability* — and everything else it does is the security spine, which is
// identical for all 86 and was never the switch's business.
//
//
// THE THREE LISTS THAT USED TO EXIST, AND THE ONE THAT DOES
//
// Before this pass the route carried an 86-member `ToolName` union, an 86-arm
// `switch`, and an 87-entry hand-written `validTools` array — three lists of
// the same thing, in one file, kept in step by hand. `marks_obituary` was in
// the third one twice.
//
// Now `lib/tools-registry.ts` (M2's manifest) declares `ai_capabilities` per
// tool, `AI_CAPABILITIES` is their de-duplicated union, and the assertion at
// the bottom of this file refuses to let the module load unless the set of
// prompts is EXACTLY that union. Drift is not caught late; it is a startup
// failure, in development, in CI, and in the build — `npx next build` imports
// this module through the route.
//
//
// WHAT A CAPABILITY CARRIES, AND WHAT IT DELIBERATELY DOES NOT
//
// Carries: its prompt (M15-3), its output contract (M15-4), its model and
// output ceiling (M15-5), its prompt version (M15-6).
//
// Does NOT carry: required params, tier, or anything else the security spine
// reads. Those stay in the route, untouched and still fenced by
// `tests/ai-personalisation.test.mjs` — M15-2's verdict on the spine is
// **KEEP**, and moving a check is a change to it. The registry is what the
// route dispatches TO once the spine has said yes.
//
// Pure. No Anthropic client, no Supabase client, no `next/*`.
// ═══════════════════════════════════════════════════════════════════════════

import { AI_CAPABILITIES } from "../tools-registry";
import { maxTokensFor, modelFor } from "./model-config";
import { PROMPTS } from "./prompts";
import type { CapabilityModule, OutputContract } from "./types";

/**
 * The prompt-contract version, one value for all 86.
 *
 * Deliberately global at "1" rather than 86 separate strings that all say "1":
 * M15-3 moved every prompt WITHOUT changing a character of it, so no
 * capability's contract has changed and none may claim otherwise. The next
 * edit to any single prompt makes that capability's version its own — the type
 * is per-capability precisely so that can happen without touching the other 85.
 */
export const DEFAULT_PROMPT_VERSION = "1";

export const CAPABILITY_PROMPT_VERSIONS: Readonly<Record<string, string>> = Object.freeze({});

export function promptVersionFor(capability: string): string {
  return CAPABILITY_PROMPT_VERSIONS[capability] ?? DEFAULT_PROMPT_VERSION;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE OUTPUT CONTRACTS (M15-4)
//
// Each row is the top-level shape that capability's own prompt prints after
// *"respond with exactly this JSON shape"* — extracted from the prompt text
// mechanically, not written by hand, so the shape the model is asked for and
// the shape the server enforces are the same thing.
//
// `keys: null` is not a gap. It means that capability's prompt does not fix one
// top-level shape, so there is no key list to check and inventing one would
// reject correct answers. Those outputs are still required to parse as a single
// JSON object; nothing is salvaged for them either.
// ═══════════════════════════════════════════════════════════════════════════

export const OUTPUT_CONTRACTS: Readonly<Record<string, OutputContract>> = Object.freeze({
  notes: { keys: { explanation: "string", summary: "array", flashcards: "array", quiz: "array" } },
  doubt: { keys: { solution: "string", principle: "string", practice: "array", sim: "object" } },
  career: { keys: { streams: "array", colleges: "array", exams: "array", roadmap: "array" } },
  assignment: { keys: { title: "string", outline: "array", arguments: "array", research: "array" } },
  crunch: { keys: { verdict: "string", skip: "array", priority: "array", schedule: "array", advice: "string" } },
  tutor: { keys: { title: "string", concept: "string", keyPoints: "array", examples: "array", commonMistakes: "array", practice: "array" } },
  syllabus: { keys: { grade: "string", board: "string", academicYear: "string", subjects: "array", exams: "array", notes: "string" } },
  formula: { keys: { subject: "string", chapter: "string", board: "string", sections: "array", keyConcepts: "array", units: "array", examTips: "array" } },
  formula_decoder: { keys: { formula: "string", name: "string", subject: "string", derivation: "array", variables: "array", conditions: "array", relatedFormulas: "array", applications: "array", practiceQuestions: "array", examTip: "string" } },
  admissions: { keys: { strategy: "string", gaps: "array", essayAngles: "array", timeline: "array" } },
  flashcards: { keys: { topic: "string", cards: "array" } },
  essay_grade: { keys: { overall: "string", band: "string", totalScore: "number", maxScore: "number", criteria: "array", strengths: "array", improvements: "array", summary: "string" } },
  personal_statement: { keys: { score: "number", hook: "string", structure: "array", paragraphNotes: "array", tone: "string", suggestions: "array", rewrite: "string" } },
  interview_questions: { keys: { questions: "array" } },
  interview_eval: { keys: { score: "number", strengths: "array", gaps: "array", betterAnswer: "string", tip: "string" } },
  mindmap: { keys: { center: "string", branches: "array" } },
  presentation: { keys: { title: "string", slides: "array", advice: "string" } },
  debate: { keys: { motion: "string", for: "array", against: "array", keyTerms: "array", practiceQs: "array" } },
  exam_sim: { keys: { title: "string", timeMinutes: "number", questions: "array" } },
  vocab: { keys: { theme: "string", words: "array" } },
  research: { keys: { title: "string", summary: "string", sections: "array", keyArguments: "array", counterArguments: "array", statistics: "array", furtherReading: "array", essayAngles: "array" } },
  coach_briefing: { keys: { greeting: "string", priorities: "array", insight: "string", focus: "string", warning: "string" } },
  coach_chat: { keys: { reply: "string" } },
  mark_scheme: { keys: { question: "string", totalMarks: "number", markScheme: "array", hint: "string" } },
  mark_scheme_eval: { keys: { marksEarned: "number", totalMarks: "number", breakdown: "array", missing: "array", improved: "string" } },
  subject_picker: { keys: { intro: "string", combos: "array", avoid: "array", tip: "string" } },
  essay_blueprint: { keys: { title: "string", thesis: "string", totalWords: "number", sections: "array", dos: "array", donts: "array", keyTerms: "array" } },
  concept_web: { keys: { center: "string", description: "string", branches: "array", summary: "string" } },
  paper_dissector: { keys: { commandWord: "string", commandDefinition: "string", totalMarks: "number", timeAdvice: "string", parts: "array", keyContent: "array", structure: "array", examinersTip: "string", commonMistakes: "array" } },
  lang_analyzer: { keys: { type: "string", tone: "array", structure: "array", language: "array", themes: "array", audience: "string", purpose: "string", grade9Points: "array", exampleAnswer: "string" } },
  lab_report: { keys: { title: "string", ibCriteria: "string", sections: "array", safetyNotes: "array", evaluationCriteria: "array" } },
  uni_match: { keys: { summary: "string", unis: "array", gaps: "array", advice: "string" } },
  compare: { keys: { title: "string", items: "array", rows: "array", similarities: "array", differences: "array", verdict: "string" } },
  source: { keys: { origin: "object", purpose: "string", content: "string", value: "object", limitation: "object", bias: "array", utility: "string", examTip: "string" } },
  practice: { keys: { topic: "string", difficulty: "string", problems: "array" } },
  predict: { keys: { topic: "string", level: "string", questions: "array", hotTopics: "array", commandWords: "array", examTip: "string" } },
  memory_palace: { keys: { topic: "string", palaceName: "string", stations: "array", reviewTip: "string" } },
  analogy: { keys: { concept: "string", analogies: "array", keyInsight: "string", examTip: "string" } },
  case_study: { keys: { title: "string", summary: "string", situation: "string", problem: "string", stakeholders: "array", analysis: "array", recommendations: "array", conclusion: "string", examTip: "string" } },
  timeline: { keys: { title: "string", period: "string", events: "array", themes: "array", examTip: "string" } },
  reading: { keys: { title: "string", summary: "string", tone: "string", themes: "array", devices: "array", questions: "array", vocabHighlights: "array", examTip: "string" } },
  grammar: { keys: { overallScore: "number", band: "string", issues: "array", strengths: "array", rewrite: "string", academicPhrases: "array", examTip: "string" } },
  study_guide: { keys: { topic: "string", overview: "string", sections: "array", mustKnow: "array", commonMistakes: "array", quickReview: "array", examTip: "string" } },
  exam_strategy: { keys: { subject: "string", duration: "number", sections: "array", timeManagement: "string", nerveControl: "array", lastMinuteTips: "array", examDayChecklist: "array", examTip: "string" } },
  concept_connect: { keys: { conceptA: "string", conceptB: "string", links: "array", deepInsight: "string", crossSubjectValue: "string", examAngles: "array", examTip: "string" } },
  model_answer: { keys: { question: "string", marks: "number", modelAnswer: "string", markingPoints: "array", keywordsRequired: "array", whatMakesItGood: "array", structureGuide: "string", examTip: "string" } },
  papers_explain: { keys: { explanation: "string", keyConcept: "string", examTip: "string" } },
  redemption_set: { keys: { questions: "array" } },
  argument: { keys: { thesis: "string", intro: "string", points: "array", counter: "object", conclusion: "string", keyPhrases: "array", examTip: "string" } },
  cremator: { keys: { ranked_topics: "array", skip_list: "array", hidden_gem: "object", time_budget_summary: "object", examiner_pattern_note: "string" } },
  formula_recall: { keys: { formulas: "array" } },
  exam_debrief: { keys: { immediate_focus: "string", pattern_note: "string", sleep_impact: "string", next_session: "string", mindset_note: "string" } },
  circuit_breaker: { keys: { micro_task: "string", why_it_works: "string", follow_up_nudge: "string" } },
  topic_half_life: { keys: { decay_table: "array", critical_chapters: "array", revive_sequence: "array" } },
  analysis_hub: { keys: { title: "string", summary: "string", keyFindings: "array", patterns: "array", anomalies: "array", implications: "string", recommendations: "array", dataQuality: "string" } },
  application_plan: { keys: { institution: "string", course: "string", deadline: "string", overview: "string", requirements: "array", tasks: "array", essayPrompts: "array", strengthsToHighlight: "array", weaknessesToAddress: "array", timeline: "array" } },
  brain_budget: { keys: { verdict: "string", schedule: "array", loadDistribution: "string", breaks: "array", warnings: "array", energyTip: "string" } },
  exam_triage: { keys: { exam: "string", hoursLeft: "number", verdict: "string", tiers: "object", hiddenGem: "string" } },
  focus_lab: { keys: { sessionTitle: "string", duration: "string", goal: "string", phases: "array", environment: "array", focusTechnique: "string", milestones: "array", exitCriteria: "string", recoveryNote: "string" } },
  language_lab: { keys: { language: "string", focus: "string", level: "string", lesson: "string", vocabulary: "array", grammar: "object", exercises: "array", culturalNote: "string", practiceDialogue: "array" } },
  memory_toolkit: { keys: { topic: "string", techniques: "array", topRecommendation: "string", reviewSchedule: "array", examTip: "string" } },
  recall_studio: { keys: { topic: "string", totalQuestions: "number", questions: "array", sessionFlow: "string", spacedRep: "string", selfAssessment: "string" } },
  reference_builder: { keys: { style: "string", references: "array", formattingNotes: "array", generalTip: "string" } },
  report_writer: { keys: { title: "string", type: "string", executiveSummary: "string", sections: "array", conclusions: "string", recommendations: "array", formatNotes: "string" } },
  research_suite: { keys: { question: "string", literatureReview: "object", argumentMap: "array", methodology: "string", furtherReading: "array" } },
  revision_intel: { keys: { exam: "string", daysLeft: "number", strategy: "string", dailyPlan: "array", spacedIntervals: "array", warningTopics: "array", dailyHabits: "array" } },
  study_command: { keys: { greeting: "string", statusSummary: "string", todaysPlan: "array", quickWins: "array", watchOut: "string", motivationNote: "string" } },
  uni_prep: { keys: { institution: "string", course: "string", applicationCycle: "string", profileAssessment: "string", requirements: "array", roadmap: "array", strengthenAreas: "array", essayTopics: "array", redFlags: "array", advice: "string" } },
  writing_tools: { keys: { operation: "string", result: "string", changes: "array", qualityNote: "string", alternativeVersion: "string" } },
  paper_triage: { keys: { skip: "array", quick_revision: "array", deep_focus: "array", schedule: "array", sleep_verdict: "string" } },
  doubt_cross_question: { keys: { questions: "array" } },
  doubt_cross_eval: { keys: { results: "array", overallScore: "number", overallMax: "number", summary: "string", nextStep: "string" } },
  calibration_questions: { keys: { questions: "array" } },
  feynman_probe: { keys: { gaps: "array", questions: "array", explanationQuality: "string" } },
  feynman_eval: { keys: { knowledgeMap: "object", score: "number", outOf: "number", answers: "array", summary: "string", recommendation: "string" } },
  paper_pattern: { keys: { subject: "string", board: "string", analysis: "array", hotTopics: "array", examinerObsessions: "array", predictedQuestions: "array", hiddenGems: "array", tips: "array" } },
  last_night_triage: { keys: { exam_context: "string", skip_list: "array", sessions: "array", formula_sheet: "array", opening_line: "string" } },
  paper_autopsy: { keys: { error_types: "array", subtopic_map: "array", top_priority: "string", repeat_mistakes: "array", practice_prompts: "array", verdict: "string" } },
  silent_topic_audit: { keys: { chapters: "array", reckoning_note: "string", reentry_plan: "string" } },
  examiner_mind: { keys: { question_decoded: "string", inferred_mark_scheme: "array", score: "object", mark_leak_summary: "string", rewrite_suggestions: "array", examiner_verdict: "string" } },
  last_night_brief: { keys: { anchor_concepts: "array", formula_checkpoints: "array", known_gaps: "array", paper_personality: "string", sleep_protocol: "string" } },
  marks_autopsy: { keys: { fingerprint: "string", breakdown: "array", highest_roi_fix: "string", drill_prescriptions: "array", score_projection: "string", one_line_verdict: "string" } },
  panic_triage: { keys: { exam: "string", total_hours: "number", skip_list: "array", plan: "array", closing_note: "string" } },
  marks_forensics: { keys: { mark_scheme_points: "array", total_available: "string", total_awarded: "string", diagnosis: "string", one_thing_to_drill: "string" } },
  paper_trauma_map: { keys: { trauma_signature: "string", severity: "string", evidence_clusters: "array", ghost_questions: "array", patch_protocol: "array", one_line_verdict: "string" } },
  marks_obituary: { keys: { questions: "array", aggregate: "object" } },
});

// ═══════════════════════════════════════════════════════════════════════════
// ASSEMBLY
// ═══════════════════════════════════════════════════════════════════════════

function assemble(): Readonly<Record<string, CapabilityModule>> {
  const out: Record<string, CapabilityModule> = {};
  for (const name of AI_CAPABILITIES) {
    const prompt = PROMPTS[name];
    if (!prompt) continue; // reported by the drift check below
    out[name] = Object.freeze({
      name,
      promptVersion: promptVersionFor(name),
      model: modelFor(name),
      maxTokens: maxTokensFor(name),
      output: OUTPUT_CONTRACTS[name] ?? { keys: null },
      prompt,
    });
  }
  return Object.freeze(out);
}

export const CAPABILITIES: Readonly<Record<string, CapabilityModule>> = assemble();

/**
 * The allowlist, derived. This is what replaced `validTools`.
 *
 * It is the manifest's union filtered to what actually has a prompt — and the
 * assertion below guarantees that filter removes nothing, so the two are the
 * same set and the filter is a belt on a belt. What it buys is that a
 * misconfigured deployment refuses capabilities rather than dispatching to
 * `undefined`.
 */
export const CAPABILITY_NAMES: readonly string[] = Object.freeze(Object.keys(CAPABILITIES));

export function isCapability(name: unknown): name is string {
  return typeof name === "string" && Object.prototype.hasOwnProperty.call(CAPABILITIES, name);
}

export function capabilityFor(name: string): CapabilityModule | null {
  return isCapability(name) ? CAPABILITIES[name] : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE DRIFT CHECK — a startup failure, not a warning
//
// A capability declared in the manifest with no prompt would 400 in production
// for a tool that ships in the navigation. A prompt with no manifest entry
// would be unreachable code that looks live. Both are silent; both used to be
// possible; neither survives module load now.
// ═══════════════════════════════════════════════════════════════════════════

export function manifestDrift(): { missingPrompt: string[]; unreachablePrompt: string[] } {
  const declared = new Set(AI_CAPABILITIES);
  const prompted = new Set(Object.keys(PROMPTS));
  return {
    missingPrompt: [...declared].filter(n => !prompted.has(n)).sort(),
    unreachablePrompt: [...prompted].filter(n => !declared.has(n)).sort(),
  };
}

{
  const { missingPrompt, unreachablePrompt } = manifestDrift();
  if (missingPrompt.length > 0 || unreachablePrompt.length > 0) {
    throw new Error(
      "AI capability manifest drift — lib/tools-registry.ts and lib/ai-capabilities/prompts " +
      "disagree. Declared with no prompt: [" + missingPrompt.join(", ") + "]. " +
      "Prompted but undeclared, therefore unreachable: [" + unreachablePrompt.join(", ") + "].",
    );
  }
}
