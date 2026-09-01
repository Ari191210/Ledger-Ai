// ═══════════════════════════════════════════════════════════════════════════
// M15-5 — MODEL SELECTION FROM CONFIGURATION, PER CAPABILITY.
//
// EXECUTION_PLAN M15-5: *"Model selection from configuration, per capability."*
// Architecture Q.4: *"Model identity moves out of a hardcoded string into
// configuration so a migration is not a code edit in 2,726 lines."*
//
// Before this pass the model was the literal `"claude-sonnet-4-6"` at
// `app/api/ai/route.ts:2681`, inside the single `messages.create` call, and the
// output ceiling came from a 24-name `LARGE_TOOLS` array declared beside it.
// Neither was reachable without editing the route.
//
// Three levels, most specific first:
//
//   1 · `CAPABILITY_MODELS[name]`      a capability that must run on a
//                                     particular model says so here
//   2 · `AI_MODEL_DEFAULT` (env)       a fleet-wide upgrade with no code edit
//   3 · `DEFAULT_MODEL`                what ships
//
// WHAT IS DELIBERATELY NOT HERE: the moderation classifier's model. That is
// part of the security spine M15-2 fenced as **KEEP**, it is pinned by
// `tests/ai-personalisation.test.mjs` as a literal inside `runAIModeration`,
// and moving it would make a safety-critical model swappable by an environment
// variable. Changing a safety posture is a decision; this pass is not the one
// making it.
//
// Pure. No I/O, no clock — `process.env` is read once at module load, and the
// resolvers are total functions of their argument.
// ═══════════════════════════════════════════════════════════════════════════

/** What has shipped since M0 and what every capability still resolves to
 *  unless something above overrides it. */
export const DEFAULT_MODEL = "claude-sonnet-4-6";

/** Output ceilings. Both values are the pre-restructure route's, unchanged:
 *  6000 for the 24 capabilities that were on `LARGE_TOOLS`, 2048 for the rest. */
export const DEFAULT_MAX_TOKENS = 2048;
export const LARGE_MAX_TOKENS = 6000;

/**
 * The 24 capabilities that produced long output before this pass, verbatim from
 * the route's `LARGE_TOOLS` array. Kept as one list rather than scattered so a
 * reader can still see the set at a glance; `registry.ts` reads it once, at
 * module load, and every capability then carries its own `maxTokens`.
 */
export const LARGE_OUTPUT_CAPABILITIES: ReadonlySet<string> = new Set([
  "syllabus", "formula", "formula_decoder", "admissions", "research", "exam_sim",
  "presentation", "debate", "coach_briefing", "essay_blueprint", "concept_web",
  "lab_report", "uni_match", "lang_analyzer", "career", "tutor", "mindmap",
  "mark_scheme_eval", "subject_picker", "paper_dissector", "topic_half_life",
  "paper_pattern", "feynman_eval", "calibration_questions",
]);

/**
 * Per-capability overrides.
 *
 * Empty on purpose: M15-5 is *"selection from configuration"*, not "different
 * models now". Every capability resolves to the same model it resolved to
 * before this pass, which is what makes the restructure a no-op from the
 * outside. A capability that later needs a different model is one line here and
 * no change to any dispatch code — which is the whole point.
 */
export const CAPABILITY_MODELS: Readonly<Record<string, string>> = Object.freeze({});

/** A fleet-wide override, for a model migration that must not be a code edit. */
const ENV_DEFAULT = (process.env.AI_MODEL_DEFAULT ?? "").trim();

/** The model a capability runs on. Total: an unknown name resolves to the
 *  default rather than to `undefined`, because the caller has already checked
 *  the name against the allowlist and a second failure mode here would be a
 *  second place to get it wrong. */
export function modelFor(capability: string): string {
  return CAPABILITY_MODELS[capability] || ENV_DEFAULT || DEFAULT_MODEL;
}

/** The output ceiling a capability gets. */
export function maxTokensFor(capability: string): number {
  return LARGE_OUTPUT_CAPABILITIES.has(capability) ? LARGE_MAX_TOKENS : DEFAULT_MAX_TOKENS;
}

/** Every distinct model the current configuration can select. Used by the
 *  tests to assert that no capability resolves to an empty or accidental
 *  identifier. */
export function configuredModels(capabilities: readonly string[]): string[] {
  return [...new Set(capabilities.map(modelFor))].sort();
}
