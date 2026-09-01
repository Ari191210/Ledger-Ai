// ═══════════════════════════════════════════════════════════════════════════
// THE TEN QUESTIONS — the onboarding script, as data.
//
// `PRODUCT_DECISIONS` §2.6 as rewritten 2026-08-30 (reversal recorded at §7.7):
// ten questions, one per page. This file is the whole script; `app/onboard`
// renders it and owns no question of its own, so the count, the order and the
// wording are auditable in one place and a test can assert them.
//
// ── THE ADMISSION RULE ────────────────────────────────────────────────────
// §2.6: "Every question must earn its place by changing model behaviour."
//
// Concretely, a question ships only if it is one of:
//   · `identity`  — the record cannot function without it (board, subjects)
//   · `dimension` — it writes a `PERSONAL_MODEL_DIMENSIONS` entry, which
//                   `lib/ai-context.ts` then puts in front of every capability
//
// There is no third category. A question that is merely interesting is not a
// question, it is a survey, and it belongs somewhere a student can ignore it.
//
// The nine dimensions are I.2's bounded list in `lib/personal-model.ts`; two
// of them (`question_format_mix`, `working_window`) hold structured values
// rather than an enum, so their options carry an explicit `value` payload.
//
// ── WHY TEN AND NOT ELEVEN ────────────────────────────────────────────────
// Nine dimensions plus board plus subjects is eleven pages, and §2.6 says ten
// questions. Board and subjects are therefore ONE page: they are asked
// together because they are one thought ("what are you studying, and under
// whom"), they are the only two that gate the record, and splitting them
// would spend a page of a student's patience on a single dropdown. Every
// other page carries exactly one question.
//
// ── WHY EXPLICIT ANSWERS OUTRANK INFERRED ONES ────────────────────────────
// Architecture I.6 already guarantees explicit-over-inferred, and M19 built
// the machinery. Until now nothing populated the explicit side, so a student's
// preferences were guessed from behaviour — which meant a brand-new student,
// the one person with no behaviour at all, received the least personalised
// product. These answers are written as `explicit`, and stay authoritative
// until the student changes them in Settings.
// ═══════════════════════════════════════════════════════════════════════════

import { BOARDS } from "./onboarding-constants";
import type { PersonalModelDimension } from "./personal-model";

/** The twelve subjects the retired flow offered, unchanged. Migration `012`
 *  backfills `user_data.interests` into `student_profiles.subjects`, so the
 *  vocabulary has to match what a student picks here or the two disagree. */
export const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "Computer Science", "Psychology", "History", "Geography",
  "Economics", "English Literature", "Accountancy", "Political Science",
] as const;

export type OnboardingOption = {
  /** What the student reads. Never a jargon term from the dimension list. */
  label: string;
  /** One line under the label, in the student's terms, never the model's. */
  hint?: string;
  /** The key stored. For enum dimensions this is the enum member itself. */
  id: string;
  /** Structured dimensions (format mix, working window) carry their payload. */
  value?: unknown;
};

export type OnboardingQuestion = {
  id: string;
  /** `identity` gates the record; `dimension` tunes the model. Nothing else. */
  kind: "identity" | "dimension";
  /** Present iff kind is `dimension`. The bounded-list entry this writes. */
  dimension?: PersonalModelDimension;
  /** Asked in the second person, as a person would ask it. */
  prompt: string;
  /** Why it is being asked, in one sentence. Never omitted: a question a
   *  student cannot see the point of is a question they resent. */
  because: string;
  select: "one" | "many";
  options: readonly OnboardingOption[];
};

/**
 * A page of the flow. Every page holds exactly one question except the first,
 * which holds board and subjects together for the reason given in the header.
 */
export type OnboardingPage = {
  /** Stable id, used for the URL step and for resume. */
  id: string;
  questions: readonly OnboardingQuestion[];
};

/** The questions, by id. Ordering lives in `ONBOARDING_PAGES` below, so a
 *  question is defined once and placed once, and the two cannot disagree. */
const Q = {
  // ── IDENTITY ───────────────────────────────────────────────────────────
  board: {
    id: "board",
    kind: "identity",
    prompt: "Which board are you studying under?",
    because: "It decides which past papers and mark schemes count as evidence.",
    select: "one",
    options: BOARDS.map((b) => ({ id: b, label: b })),
  },
  subjects: {
    id: "subjects",
    kind: "identity",
    prompt: "Which subjects are you keeping a record for?",
    because: "Everything in your ledger is filed under one of these.",
    select: "many",
    options: SUBJECTS.map((s) => ({ id: s, label: s })),
  },

  // ── THE NINE DIMENSIONS ────────────────────────────────────────────────
  explanation_style: {
    id: "explanation_style",
    kind: "dimension",
    dimension: "explanation_style",
    prompt: "When something finally clicks, what usually did it?",
    because: "Explanations you are given will lead with this.",
    select: "one",
    options: [
      { id: "examples-first", label: "A worked example",       hint: "Show me one, then tell me the rule" },
      { id: "theory-first",   label: "The underlying idea",     hint: "Tell me why it is true first" },
      { id: "step-by-step",   label: "A step-by-step method",   hint: "Give me the procedure in order" },
      { id: "bullet-points",  label: "The short version",       hint: "The key points, nothing else" },
    ],
  },
  communication_tone: {
    id: "communication_tone",
    kind: "dimension",
    dimension: "communication_tone",
    prompt: "How should things be said to you?",
    because: "It sets the register of everything you read here.",
    select: "one",
    options: [
      { id: "simple",         label: "Plainly",       hint: "Short sentences, no jargon" },
      { id: "conversational", label: "Conversationally", hint: "Like a person talking to me" },
      { id: "detailed",       label: "Thoroughly",    hint: "I would rather have the full picture" },
      { id: "direct",         label: "Bluntly",       hint: "Skip the softening, tell me straight" },
    ],
  },
  question_format_mix: {
    id: "question_format_mix",
    kind: "dimension",
    dimension: "question_format_mix",
    prompt: "Which kind of question actually tests you?",
    because: "Your practice is weighted toward it. The others still appear.",
    select: "one",
    options: [
      { id: "numeric",    label: "Numerical problems", hint: "Work it out and give a value",
        value: { numeric: 0.5, short_text: 0.2, mcq: 0.2, ordering: 0.05, match: 0.05 } },
      { id: "short_text", label: "Written answers",    hint: "Explain it in my own words",
        value: { short_text: 0.5, mcq: 0.2, numeric: 0.2, ordering: 0.05, match: 0.05 } },
      { id: "mcq",        label: "Multiple choice",    hint: "Spot the right one under time",
        value: { mcq: 0.5, numeric: 0.2, short_text: 0.2, ordering: 0.05, match: 0.05 } },
      { id: "balanced",   label: "A mix",              hint: "No strong preference",
        value: { mcq: 0.25, numeric: 0.25, short_text: 0.25, ordering: 0.125, match: 0.125 } },
    ],
  },
  difficulty_preference: {
    id: "difficulty_preference",
    kind: "dimension",
    dimension: "difficulty_preference",
    prompt: "Where should practice sit?",
    because: "It sets how hard the questions you are given are.",
    select: "one",
    options: [
      { id: "gentle",  label: "Slightly below me", hint: "Build it up. I lose confidence quickly" },
      { id: "matched", label: "About where I am",  hint: "Keep it at my level" },
      { id: "stretch", label: "Above me",          hint: "I would rather struggle than coast" },
    ],
  },
  session_length: {
    id: "session_length",
    kind: "dimension",
    dimension: "session_length",
    prompt: "How long is a session you would actually finish?",
    because: "Work is planned in blocks this size, not in blocks we would prefer.",
    select: "one",
    options: [
      { id: "15", label: "About 15 minutes", hint: "Short and often",        value: 15 },
      { id: "30", label: "About 30 minutes", hint: "A focused stretch",      value: 30 },
      { id: "45", label: "About 45 minutes", hint: "Long enough to go deep", value: 45 },
      { id: "90", label: "An hour or more",  hint: "I settle in",            value: 90 },
    ],
  },
  working_window: {
    id: "working_window",
    kind: "dimension",
    dimension: "working_window",
    prompt: "When do you do your best work?",
    because: "Anything that reaches you is timed for this, in your own clock.",
    select: "one",
    // 24 weights, index = local hour. Deliberately broad: this is a starting
    // shape that real session events sharpen, not a claim about the student.
    options: [
      { id: "morning",   label: "Early morning", hint: "Before school, 5am to 9am",
        value: [0,0,0,0,0,0.6,1,1,0.8,0.3,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0,0,0] },
      { id: "afternoon", label: "Afternoon",     hint: "Straight after school",
        value: [0,0,0,0,0,0,0.1,0.1,0.1,0.2,0.3,0.4,0.6,1,1,0.9,0.6,0.3,0.2,0.1,0.1,0,0,0] },
      { id: "evening",   label: "Evening",       hint: "After dinner, before it gets late",
        value: [0,0,0,0,0,0,0.1,0.1,0.1,0.1,0.1,0.1,0.2,0.3,0.4,0.6,0.9,1,1,0.9,0.6,0.3,0.1,0] },
      { id: "night",     label: "Late at night", hint: "When the house is quiet",
        value: [0.6,0.3,0.1,0,0,0,0,0,0.1,0.1,0.1,0.1,0.1,0.1,0.2,0.2,0.3,0.4,0.6,0.9,1,1,1,0.9] },
    ],
  },
  correction_method: {
    id: "correction_method",
    kind: "dimension",
    dimension: "correction_method",
    prompt: "You got something wrong. What helps most?",
    because: "This is what happens after every mistake you record.",
    select: "one",
    options: [
      { id: "worked-example",   label: "See it done correctly",  hint: "Show me the full worked answer" },
      { id: "first-principles", label: "Understand why I erred", hint: "Take me back to the idea I missed" },
      { id: "contrast-pair",    label: "See both side by side",  hint: "My answer against the right one" },
      { id: "drill",            label: "Try similar ones again", hint: "Give me more until it sticks" },
    ],
  },
  notification_appetite: {
    id: "notification_appetite",
    kind: "dimension",
    dimension: "notification_appetite",
    prompt: "How much should we interrupt you?",
    because: "Nothing here is a streak reminder. You can change this at any time.",
    select: "one",
    options: [
      { id: "standard", label: "When it matters",  hint: "An exam is close, or something is slipping" },
      { id: "minimal",  label: "Rarely",           hint: "Only if it is genuinely important" },
      { id: "off",      label: "Never",            hint: "I will come to it myself" },
    ],
  },
  recommendation_aggressiveness: {
    id: "recommendation_aggressiveness",
    kind: "dimension",
    dimension: "recommendation_aggressiveness",
    prompt: "How firmly should we tell you what to fix next?",
    because: "It sets how much the product decides for you and how much you decide.",
    select: "one",
    options: [
      { id: "high",   label: "Tell me what to do",  hint: "One thing, decided for me" },
      { id: "medium", label: "Suggest, and let me choose", hint: "Give me a short list" },
      { id: "low",    label: "Stay out of my way",  hint: "I will pick. Just keep the record" },
    ],
  },
} as const satisfies Record<string, OnboardingQuestion>;

/**
 * The flow, as pages. Ten pages, which is the count §2.6 states.
 * Page 1 carries the two identity questions; pages 2-10 carry one dimension
 * question each, in the order a student meets their effects: how they are
 * explained to, then how they are tested, then how they are paced, then how
 * much the product intrudes.
 */
export const ONBOARDING_PAGES: readonly OnboardingPage[] = [
  { id: "you",        questions: [Q.board, Q.subjects] },
  { id: "explain",    questions: [Q.explanation_style] },
  { id: "tone",       questions: [Q.communication_tone] },
  { id: "format",     questions: [Q.question_format_mix] },
  { id: "difficulty", questions: [Q.difficulty_preference] },
  { id: "session",    questions: [Q.session_length] },
  { id: "window",     questions: [Q.working_window] },
  { id: "correction", questions: [Q.correction_method] },
  { id: "notify",     questions: [Q.notification_appetite] },
  { id: "authority",  questions: [Q.recommendation_aggressiveness] },
] as const;

/** Ten, and asserted as ten by the test suite. */
export const PAGE_COUNT = ONBOARDING_PAGES.length;

/** Every question, flattened, in page order. */
export const ONBOARDING_QUESTIONS: readonly OnboardingQuestion[] =
  ONBOARDING_PAGES.flatMap((p) => p.questions);

export const QUESTION_COUNT = ONBOARDING_QUESTIONS.length;

/** Answers as collected, keyed by question id. Values are option ids. */
export type OnboardingAnswers = Record<string, string | string[] | undefined>;

/** §2.6: identity questions gate the record; dimensions never do. A student
 *  who answers board and subjects and abandons the rest has a partial profile,
 *  which is a legal state, not an error. */
export function isComplete(answers: OnboardingAnswers): boolean {
  const board = answers.board;
  const subjects = answers.subjects;
  return typeof board === "string" && board.length > 0
    && Array.isArray(subjects) && subjects.length > 0;
}

/** The dimension writes implied by a set of answers, ready for the personal
 *  model. Unanswered questions produce nothing rather than a default: a guess
 *  recorded as an explicit preference is exactly the lie I.6 exists to stop. */
export function dimensionWrites(
  answers: OnboardingAnswers,
): { dimension: PersonalModelDimension; value: unknown }[] {
  const out: { dimension: PersonalModelDimension; value: unknown }[] = [];
  for (const q of ONBOARDING_QUESTIONS) {
    if (q.kind !== "dimension" || !q.dimension) continue;
    const answer = answers[q.id];
    if (typeof answer !== "string") continue;
    const option = q.options.find((o) => o.id === answer);
    if (!option) continue;
    out.push({ dimension: q.dimension, value: "value" in option ? option.value : option.id });
  }
  return out;
}
