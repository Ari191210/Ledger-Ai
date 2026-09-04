// Declarative specs for every AI-kind tool. Each spec describes its input
// form and how to build the prompt from those inputs; app/api/ai/route.ts
// is the one place that actually calls the model, and
// components/tools/ai-tool.tsx is the one client component that renders
// any spec's form and result. Adding a tool here is (usually) enough to
// ship it, no bespoke page needed beyond a ~10-line wrapper.

import { SUBJECTS } from "@/lib/subjects";

export type FieldSpec =
  | { key: string; label: string; type: "text"; placeholder?: string; required?: boolean }
  | { key: string; label: string; type: "textarea"; placeholder?: string; required?: boolean; rows?: number }
  | { key: string; label: string; type: "select"; options: string[]; default?: string }
  | { key: string; label: string; type: "number"; min: number; max: number; default: number };

export type ResultKind = "text" | "list" | "qa" | "score";

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
    resultKind: "text",
    fields: [
      SUBJECT_FIELD,
      { key: "question", label: "your question", type: "textarea", required: true, rows: 4, placeholder: "Ask exactly what you're stuck on." },
    ],
    buildPrompt: (v) => ({
      system: "You are a precise subject tutor answering one specific student doubt. Answer only what was asked, no unrelated background. Be direct and concrete.",
      user: `Subject: ${v.subject}\nQuestion: ${v.question}`,
    }),
  },

  notes: {
    slug: "notes",
    resultKind: "list",
    maxTokens: 3200,
    fields: [
      SUBJECT_FIELD,
      { key: "raw", label: "raw notes", type: "textarea", required: true, rows: 8, placeholder: "Paste your rough notes, lecture text, or textbook excerpt." },
    ],
    buildPrompt: (v) => ({
      system: `Turn a student's raw notes into a structured, exam-ready summary. Organise into clear sections, one idea per section. ${JSON_LIST}`,
      user: `Subject: ${v.subject}\nRaw notes:\n${v.raw}`,
    }),
  },

  tutor: {
    slug: "tutor",
    resultKind: "text",
    fields: [
      SUBJECT_FIELD,
      { key: "concept", label: "concept", type: "text", required: true, placeholder: "e.g. Newton's second law" },
      { key: "stuck", label: "what's confusing (optional)", type: "textarea", rows: 3, placeholder: "Say what specifically isn't clicking, if you know." },
    ],
    buildPrompt: (v) => ({
      system: "Walk the student through one concept conversationally, as a single tutoring turn. End by asking them to apply it to one small case or state it back in their own words, per house style.",
      user: `Subject: ${v.subject}\nConcept: ${v.concept}${v.stuck ? `\nWhat's confusing: ${v.stuck}` : ""}`,
    }),
  },

  formula: {
    slug: "formula",
    resultKind: "list",
    fields: [
      SUBJECT_FIELD,
      { key: "chapter", label: "chapter or topic", type: "text", required: true, placeholder: "e.g. Rotational motion" },
    ],
    buildPrompt: (v) => ({
      system: `Build a formula sheet for one chapter. Each item's title is the formula itself (in plain text, e.g. "v = u + at"), and the body names it and says exactly when to use it. ${JSON_LIST}`,
      user: `Subject: ${v.subject}\nChapter: ${v.chapter}`,
    }),
  },

  "essay-grader": {
    slug: "essay-grader",
    resultKind: "score",
    maxTokens: 3200,
    fields: [
      SUBJECT_FIELD,
      { key: "prompt", label: "essay question (optional)", type: "text", placeholder: "What was the essay answering?" },
      { key: "essay", label: "your essay", type: "textarea", required: true, rows: 10 },
    ],
    buildPrompt: (v) => ({
      system: `Grade a student essay against argument structure, evidence, and clarity. Pick 3 to 4 criteria appropriate to the subject. ${JSON_SCORE}`,
      user: `Subject: ${v.subject}${v.prompt ? `\nQuestion: ${v.prompt}` : ""}\nEssay:\n${v.essay}`,
    }),
  },

  assignment: {
    slug: "assignment",
    resultKind: "list",
    maxTokens: 3400,
    fields: [
      SUBJECT_FIELD,
      { key: "prompt", label: "assignment prompt", type: "textarea", required: true, rows: 4 },
      { key: "words", label: "target length (words)", type: "number", default: 300, min: 100, max: 2000 },
    ],
    buildPrompt: (v) => ({
      system: `Structure and draft an assignment response. Each item is one section of the piece (e.g. introduction, body, conclusion), title as the section name, body as drafted content for that section. Aim for roughly ${v.words} words total across sections. ${JSON_LIST}`,
      user: `Subject: ${v.subject}\nAssignment prompt: ${v.prompt}`,
    }),
  },

  "model-answer": {
    slug: "model-answer",
    resultKind: "list",
    fields: [
      SUBJECT_FIELD,
      { key: "question", label: "question", type: "textarea", required: true, rows: 3 },
      { key: "marks", label: "marks", type: "number", default: 5, min: 1, max: 20 },
    ],
    buildPrompt: (v) => ({
      system: `Write a full-marks model answer to an exam question worth ${v.marks} marks. First item: title "Model answer", body is the answer itself, written the way a top student would write it under exam conditions. Second item: title "Why this earns full marks", body explains which parts of the answer map to which marks. ${JSON_LIST}`,
      user: `Subject: ${v.subject}\nQuestion (${v.marks} marks): ${v.question}`,
    }),
  },

  flashcards: {
    slug: "flashcards",
    resultKind: "qa",
    maxTokens: 3200,
    fields: [
      SUBJECT_FIELD,
      { key: "topic", label: "topic", type: "text", required: true },
      { key: "count", label: "number of cards", type: "number", default: 8, min: 4, max: 20 },
    ],
    buildPrompt: (v) => ({
      system: `Generate exactly ${v.count} flashcards for the given topic. Question is the front of the card, answer is the back (short, precise), explanation adds one sentence of context. ${JSON_QA}`,
      user: `Subject: ${v.subject}\nTopic: ${v.topic}`,
    }),
  },

  "exam-sim": {
    slug: "exam-sim",
    resultKind: "qa",
    maxTokens: 4800,
    fields: [
      SUBJECT_FIELD,
      { key: "topic", label: "topic", type: "text", required: true },
      { key: "count", label: "number of questions", type: "number", default: 8, min: 4, max: 20 },
      { key: "minutes", label: "time limit (minutes)", type: "number", default: 20, min: 5, max: 90 },
    ],
    buildPrompt: (v) => ({
      system: `Write exactly ${v.count} full-length exam-style questions on the given topic, varying in difficulty like a real paper. Question is the exam question, answer is the correct/expected answer, explanation is the mark-earning reasoning. ${JSON_QA}`,
      user: `Subject: ${v.subject}\nTopic: ${v.topic}\nTime limit: ${v.minutes} minutes (for context on question depth)`,
    }),
  },

  practice: {
    slug: "practice",
    resultKind: "qa",
    maxTokens: 3800,
    fields: [
      SUBJECT_FIELD,
      { key: "topic", label: "topic", type: "text", required: true },
      { key: "difficulty", label: "difficulty", type: "select", options: ["easy", "medium", "hard"], default: "medium" },
      { key: "count", label: "number of questions", type: "number", default: 6, min: 3, max: 15 },
    ],
    buildPrompt: (v) => ({
      system: `Generate ${v.count} ${v.difficulty}-difficulty practice questions on the given topic. ${JSON_QA}`,
      user: `Subject: ${v.subject}\nTopic: ${v.topic}\nDifficulty: ${v.difficulty}`,
    }),
  },

  "mark-scheme": {
    slug: "mark-scheme",
    resultKind: "list",
    maxTokens: 3200,
    fields: [
      SUBJECT_FIELD,
      { key: "question", label: "past question", type: "textarea", required: true, rows: 3 },
      { key: "totalMarks", label: "total marks", type: "number", default: 5, min: 1, max: 20 },
    ],
    buildPrompt: (v) => ({
      system: `Break down exactly how marks are awarded on this ${v.totalMarks}-mark question, one item per mark-earning point. Title is a short label (e.g. "1 mark: states the law"), body explains what the answer must contain to earn it. ${JSON_LIST}`,
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
      system: `Build the highest-yield revision list for the last ${v.hours} hours before an exam, using ONLY the student's real open mistakes and uncovered syllabus topics given below. Rank items by yield: recurring mistakes first, then high-debt topics. Do not invent topics not present in the data. If the data is empty, say plainly there's nothing logged to prioritise instead of inventing a plan. ${JSON_LIST}`,
      user: `Scope: ${v.subject}\nHours available: ${v.hours}\n\nStudent's real data:\n${dataContext}`,
    }),
  },

  career: {
    slug: "career",
    resultKind: "list",
    fields: [
      { key: "interests", label: "interests (optional)", type: "textarea", rows: 3, placeholder: "Subjects, hobbies, or activities you enjoy." },
    ],
    buildPrompt: (v) => ({
      system: `Suggest 4 to 6 careers that fit the student's academic stream and stated interests. Title is the career name, body explains the fit and one concrete next step (a subject to lean into, a skill to build). ${JSON_LIST}`,
      user: v.interests ? `Interests: ${v.interests}` : "No specific interests given, infer from academic stream alone.",
    }),
  },
};

export function getPromptSpec(slug: string): PromptSpec | undefined {
  return PROMPTS[slug];
}
