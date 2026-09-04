// Adapted from docs/legacy/ai-route.ts (buildProfileContext). The legacy
// version personalised against fields this rebuild doesn't collect
// (interests, aiProfile learning/communication style) — dropped. Board,
// stream, and target-exam calibration is kept: it's the actual product
// differentiator, every AI tool gets it for free.

import type { SupabaseClient } from "@supabase/supabase-js";

export type StudentProfile = {
  grade: string | null;
  board: string | null;
  stream: string | null;
  target_exam: string | null;
};

export async function getStudentProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<StudentProfile> {
  const { data } = await supabase
    .from("profiles")
    .select("grade, board, stream, target_exam")
    .eq("id", userId)
    .maybeSingle();
  return {
    grade: data?.grade ?? null,
    board: data?.board ?? null,
    stream: data?.stream ?? null,
    target_exam: data?.target_exam ?? null,
  };
}

const BOARD_NOTES: Record<string, string> = {
  CBSE: "Use NCERT terminology, chapter references, and examples throughout. Apply step-marking style: show every step clearly, as CBSE awards marks per step.",
  ICSE: "ICSE rewards thorough, well-reasoned answers. Use precise scientific or literary language. Structure answers with clear headings and make reasoning explicit, not just results.",
  IB: "Apply IB command terms naturally (analyse, evaluate, discuss, compare). IB rewards critical thinking over rote recall, so push the student to question assumptions.",
  IGCSE: "IGCSE mark schemes reward specific key phrases. Mirror that language. Keep answers focused and concise, and ground abstract concepts in tangible examples.",
  "State Board": "Match explanation depth to school-level State Board expectations. Prioritise textbook definitions and standard derivations over advanced extensions.",
  "Home School": "Adapt freely, there is no rigid syllabus constraint. Prioritise genuine understanding over exam-format drilling.",
};

function streamNote(stream: string | null): string {
  if (!stream) return "Adapt to the student's subjects.";
  if (stream.includes("PCM")) return "PCM student: use mathematical rigour, derive formulas step by step, and connect Physics, Chemistry, and Maths where they overlap.";
  if (stream.includes("PCB")) return "PCB student: describe diagrams in words, use biological nomenclature correctly, and link molecular mechanisms to organ-level effects.";
  if (stream.includes("Commerce")) return "Commerce student: connect theory to real business or financial examples, and show calculations wherever relevant.";
  if (stream.includes("Arts") || stream.includes("Humanities")) return "Arts and Humanities student: emphasise essay structure, argument construction, and textual evidence.";
  return "Adapt to the student's subjects.";
}

function examNote(exam: string | null): string {
  if (!exam) return "No specific exam target, focus on solid conceptual understanding.";
  if (exam.includes("JEE")) return "JEE target: teach the conceptual why before the how, and flag topics that tend to appear as multi-step JEE problems.";
  if (exam.includes("NEET")) return "NEET target: NCERT is the primary source. Frame around NCERT diagrams and direct MCQ recall.";
  if (exam.includes("CUET")) return "CUET target: breadth and speed matter, keep explanations efficient.";
  if (exam.includes("CA")) return "CA Foundation target: precision in accounting and law language is critical, use standard format for entries and reports.";
  if (exam.includes("SAT") || exam.includes("ACT")) return "SAT/ACT target: frame concepts in multiple-choice test strategy terms.";
  return `${exam} target: calibrate depth and style to what that exam tests.`;
}

/** System-prompt block personalising an AI tool call to this student. */
export function buildProfileContext(profile: StudentProfile): string {
  const { grade, board, stream, target_exam: targetExam } = profile;
  if (!grade && !board) return HOUSE_STYLE;

  const boardKey = Object.keys(BOARD_NOTES).find((k) => board?.includes(k));
  const boardNote = boardKey ? BOARD_NOTES[boardKey] : "Calibrate to the student's board style.";

  let ctx = "\n--- STUDENT CONTEXT ---";
  ctx += `\nProfile: ${[grade, board ? `${board} board` : "", stream, targetExam ? `targeting ${targetExam}` : ""].filter(Boolean).join(" · ")}`;
  ctx += `\n\nPERSONALISATION INSTRUCTIONS, apply silently, without meta-commentary:
1. GRADE LEVEL: Write at ${grade ?? "school"} level. Match vocabulary, abstraction, and pace accordingly.
2. BOARD: ${boardNote}
3. STREAM: ${streamNote(stream)}
4. EXAM: ${examNote(targetExam)}
5. Never say "as a ${grade ?? ""} student" or "since you study ${board ?? "your board"}", just write at their level naturally.`;
  ctx += HOUSE_STYLE;
  ctx += "\n--- END STUDENT CONTEXT ---\n";
  return ctx;
}

const HOUSE_STYLE = `

HOUSE STYLE, these are not preferences and are never overridden:
A. Never use an em-dash or en-dash in prose. Use a full stop, a comma, or a colon instead.
B. Never end on your own judgement that the explanation is finished. No closers like "hope that helps" or "you've got it now".
C. Where the format allows it, invite the student to check their own understanding rather than asserting they now have it.
D. Never fabricate a figure, a mark, or any part of the student's history. If you don't have it, say so plainly.
E. Do not use markdown symbols (no asterisks, no hash headers, no bullet dashes). Write plain sentences and numbered lists ("1.", "2.") only where a list is asked for.`;
