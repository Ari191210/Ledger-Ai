// Declarative specs for every AI-kind tool. Each spec describes its input
// form and how to build the prompt from those inputs; app/api/ai/route.ts
// is the one place that actually calls the model, and
// components/tools/ai-tool.tsx is the one client component that renders
// any spec's form and result. Adding a tool here is (usually) enough to
// ship it, no bespoke page needed beyond a ~10-line wrapper.

import { SUBJECTS } from "@/lib/subjects";
import { sceneInstruction } from "@/lib/scenes/registry";

export type FieldSpec =
  | { key: string; label: string; type: "text"; placeholder?: string; required?: boolean }
  | { key: string; label: string; type: "textarea"; placeholder?: string; required?: boolean; rows?: number }
  | { key: string; label: string; type: "select"; options: string[]; default?: string }
  | { key: string; label: string; type: "number"; min: number; max: number; default: number };

export type ResultKind = "text" | "list" | "qa" | "score" | "explain";

export type ToolValues = Record<string, string | number>;

export type PromptSpec = {
  slug: string;
  fields: FieldSpec[];
  resultKind: ResultKind;
  maxTokens?: number;
  /** true if the route should fetch this student's real data and pass it as `dataContext`. */
  usesStudentData?: boolean;
  buildPrompt: (values: ToolValues, dataContext?: string) => { system: string; user: string };
};

const SUBJECT_FIELD: FieldSpec = { key: "subject", label: "subject", type: "select", options: SUBJECTS };

const JSON_LIST = `Respond with a JSON object: { "items": [ { "title": string, "body": string } ] }. 4 to 8 items, each title short (under 8 words), each body 2 to 4 sentences.`;
const JSON_QA = `Respond with a JSON object: { "items": [ { "question": string, "answer": string, "explanation": string } ] }.`;
const JSON_SCORE = `Respond with a JSON object: { "overall": number, "max": number, "summary": string, "criteria": [ { "label": string, "score": number, "max": number, "feedback": string } ] }.`;

export const PROMPTS: Record<string, PromptSpec> = {
  doubt: {
    slug: "doubt",
    resultKind: "explain",
    usesStudentData: true,
    fields: [
      SUBJECT_FIELD,
      { key: "topic", label: "topic", type: "text", placeholder: "e.g. Mole concept", required: true },
      { key: "question", label: "your question", type: "textarea", required: true, rows: 4, placeholder: "Ask exactly what you're stuck on." },
    ],
    buildPrompt: (v) => ({
      system: `You are a precise subject tutor answering one specific student doubt. Answer only what was asked, no unrelated background. Be direct and concrete.

If this doubt touches a topic the student has already logged mistakes in, say so once, briefly, and address the underlying confusion rather than only the surface question. That is the point of answering this student rather than a stranger.

Respond with a JSON object: { "text": string, "scene"?: object }. "text" is the answer itself, in plain prose, the same answer you would have written without a diagram. Never refer to the diagram as if the student can already see it, and never let the diagram carry part of the explanation.

${sceneInstruction()}`,
      user: `Subject: ${v.subject}\nTopic: ${v.topic}\nQuestion: ${v.question}`,
    }),
  },

  notes: {
    slug: "notes",
    resultKind: "list",
    usesStudentData: true,
    maxTokens: 3200,
    fields: [
      SUBJECT_FIELD,
      { key: "raw", label: "raw notes", type: "textarea", required: true, rows: 8, placeholder: "Paste your rough notes, lecture text, or textbook excerpt." },
    ],
    buildPrompt: (v) => ({
      system: `Turn a student's raw notes into a structured, exam-ready summary. Organise into clear sections, one idea per section. ${JSON_LIST}

Where a section touches a topic the student has open mistakes in, go a level deeper on that section rather than treating every section as equally understood.`,
      user: `Subject: ${v.subject}\nRaw notes:\n${v.raw}`,
    }),
  },

  formula: {
    slug: "formula",
    resultKind: "list",
    usesStudentData: true,
    fields: [
      SUBJECT_FIELD,
      { key: "chapter", label: "chapter or topic", type: "text", required: true, placeholder: "e.g. Rotational motion" },
    ],
    buildPrompt: (v) => ({
      system: `Build a formula sheet for one chapter. Each item's title is the formula itself (in plain text, e.g. "v = u + at"), and the body names it and says exactly when to use it. ${JSON_LIST}

Put formulas belonging to the student's open mistake topics first, and mark them as the ones they keep losing marks on.`,
      user: `Subject: ${v.subject}\nChapter: ${v.chapter}`,
    }),
  },

  "essay-grader": {
    slug: "essay-grader",
    resultKind: "score",
    usesStudentData: true,
    maxTokens: 3200,
    fields: [
      SUBJECT_FIELD,
      { key: "prompt", label: "essay question (optional)", type: "text", placeholder: "What was the essay answering?" },
      { key: "essay", label: "your essay", type: "textarea", required: true, rows: 10 },
    ],
    buildPrompt: (v) => ({
      system: `Grade a student essay against argument structure, evidence, and clarity. Pick 3 to 4 criteria appropriate to the subject. ${JSON_SCORE}

If the student's measured accuracy is low, be concrete about the single biggest fix rather than listing everything at once.`,
      user: `Subject: ${v.subject}${v.prompt ? `\nQuestion: ${v.prompt}` : ""}\nEssay:\n${v.essay}`,
    }),
  },

  "model-answer": {
    slug: "model-answer",
    resultKind: "list",
    usesStudentData: true,
    fields: [
      SUBJECT_FIELD,
      { key: "question", label: "question", type: "textarea", required: true, rows: 3 },
      { key: "marks", label: "marks", type: "number", default: 5, min: 1, max: 20 },
    ],
    buildPrompt: (v) => ({
      system: `Write a full-marks model answer to an exam question worth ${v.marks} marks. First item: title "Model answer", body is the answer itself, written the way a top student would write it under exam conditions. Second item: title "Why this earns full marks", body explains which parts of the answer map to which marks. ${JSON_LIST}

If the question touches a topic they keep getting wrong, make the step they usually miss explicit.`,
      user: `Subject: ${v.subject}\nQuestion (${v.marks} marks): ${v.question}`,
    }),
  },

  flashcards: {
    slug: "flashcards",
    resultKind: "qa",
    usesStudentData: true,
    maxTokens: 3200,
    fields: [
      SUBJECT_FIELD,
      { key: "topic", label: "topic", type: "text", required: true },
      { key: "count", label: "number of cards", type: "number", default: 8, min: 4, max: 20 },
    ],
    buildPrompt: (v) => ({
      system: `Generate exactly ${v.count} flashcards for the given topic. Question is the front of the card, answer is the back (short, precise), explanation adds one sentence of context. ${JSON_QA}

Weight the cards toward the student's open mistake topics. A card on something they already have right is wasted.`,
      user: `Subject: ${v.subject}\nTopic: ${v.topic}`,
    }),
  },

  "exam-sim": {
    slug: "exam-sim",
    resultKind: "qa",
    usesStudentData: true,
    maxTokens: 4800,
    fields: [
      SUBJECT_FIELD,
      { key: "topic", label: "topic", type: "text", required: true },
      { key: "count", label: "number of questions", type: "number", default: 8, min: 4, max: 20 },
      { key: "minutes", label: "time limit (minutes)", type: "number", default: 20, min: 5, max: 90 },
    ],
    buildPrompt: (v) => ({
      system: `Write exactly ${v.count} full-length exam-style questions on the given topic, varying in difficulty like a real paper. Question is the exam question, answer is the correct/expected answer, explanation is the mark-earning reasoning. ${JSON_QA}

Weight the paper toward the student's open mistake topics and uncovered syllabus, because that is what a real exam would expose.`,
      user: `Subject: ${v.subject}\nTopic: ${v.topic}\nTime limit: ${v.minutes} minutes (for context on question depth)`,
    }),
  },

  practice: {
    slug: "practice",
    resultKind: "qa",
    usesStudentData: true,
    maxTokens: 3800,
    fields: [
      SUBJECT_FIELD,
      { key: "topic", label: "topic", type: "text", required: true },
      { key: "difficulty", label: "difficulty", type: "select", options: ["easy", "medium", "hard"], default: "medium" },
      { key: "count", label: "number of questions", type: "number", default: 6, min: 3, max: 15 },
    ],
    buildPrompt: (v) => ({
      system: `Generate ${v.count} ${v.difficulty}-difficulty practice questions on the given topic. ${JSON_QA}

Weight questions toward the student's open mistake topics, and pitch difficulty at their measured accuracy rather than a generic level.`,
      user: `Subject: ${v.subject}\nTopic: ${v.topic}\nDifficulty: ${v.difficulty}`,
    }),
  },

  "mark-scheme": {
    slug: "mark-scheme",
    resultKind: "list",
    usesStudentData: true,
    maxTokens: 3400,
    fields: [
      SUBJECT_FIELD,
      { key: "question", label: "past question", type: "textarea", required: true, rows: 3 },
      { key: "totalMarks", label: "total marks", type: "number", default: 5, min: 1, max: 20 },
    ],
    buildPrompt: (v) => ({
      system: `Break down exactly how marks are awarded on this ${v.totalMarks}-mark question. Produce exactly one item per mark-earning point, up to ${v.totalMarks} items total, do not bundle multiple marks into one item. Title is a short label (e.g. "1 mark: states the law"), body explains what the answer must contain to earn it. Respond with a JSON object: { "items": [ { "title": string, "body": string } ] }.

If the question touches a topic they keep losing marks on, say which step tends to cost them.`,
      user: `Subject: ${v.subject}\nQuestion (${v.totalMarks} marks): ${v.question}`,
    }),
  },

  crunch: {
    slug: "crunch",
    resultKind: "list",
    maxTokens: 3400,
    usesStudentData: true,
    fields: [
      { key: "subject", label: "subject", type: "select", options: ["All subjects", ...SUBJECTS] },
      { key: "hours", label: "hours available", type: "number", default: 6, min: 1, max: 48 },
    ],
    buildPrompt: (v, dataContext) => ({
      system: `Build the highest-yield revision list for the last ${v.hours} hours before an exam, using ONLY the student's real open mistakes and uncovered syllabus topics given below. Rank items by yield: recurring mistakes first, then high-debt topics. One item per distinct topic, do not bundle several topics into a single catch-all item, use up to 12 items if the data has that many distinct topics. Do not invent topics not present in the data. If the data is empty, say plainly there's nothing logged to prioritise instead of inventing a plan. Respond with a JSON object: { "items": [ { "title": string, "body": string } ] }.`,
      user: `Scope: ${v.subject}\nHours available: ${v.hours}\n\nStudent's real data:\n${dataContext}`,
    }),
  },
};

export function getPromptSpec(slug: string): PromptSpec | undefined {
  return PROMPTS[slug];
}
