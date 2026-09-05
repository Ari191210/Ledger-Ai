import { validateDob } from "./age";

export const GRADES = [
  { value: "9", label: "Class 9" },
  { value: "10", label: "Class 10" },
  { value: "11", label: "Class 11" },
  { value: "12", label: "Class 12" },
  { value: "dropper", label: "Dropper" },
] as const;

export const BOARDS = [
  { value: "cbse", label: "CBSE" },
  { value: "icse", label: "ICSE / ISC" },
  { value: "ib", label: "IB" },
  { value: "igcse", label: "IGCSE / Cambridge" },
  { value: "state", label: "State board" },
  { value: "nios", label: "NIOS / Home" },
] as const;

export const STREAMS = [
  { value: "pcm", label: "PCM" },
  { value: "pcb", label: "PCB" },
  { value: "pcmb", label: "PCM + Biology" },
  { value: "commerce", label: "Commerce" },
  { value: "humanities", label: "Humanities" },
] as const;

export const EXAMS = [
  { value: "jee", label: "JEE (Main / Advanced)" },
  { value: "neet", label: "NEET" },
  { value: "cuet", label: "CUET" },
  { value: "bitsat", label: "BITSAT" },
  { value: "boards", label: "Board exams" },
  { value: "ca", label: "CA Foundation" },
  { value: "clat", label: "CLAT" },
  { value: "sat", label: "SAT / ACT" },
  { value: "undecided", label: "Not sure yet" },
] as const;

// stream only applies to senior years
export const streamApplies = (grade: string) =>
  grade === "11" || grade === "12" || grade === "dropper";

const VALUES = {
  grade: GRADES.map((o) => o.value),
  board: BOARDS.map((o) => o.value),
  stream: STREAMS.map((o) => o.value),
  target_exam: EXAMS.map((o) => o.value),
} as const;

export type OnboardingInput = {
  grade: string;
  board: string;
  stream: string | null;
  target_exam: string;
  date_of_birth: string;
};

export function validateOnboarding(raw: {
  grade?: string;
  board?: string;
  stream?: string | null;
  target_exam?: string;
  date_of_birth?: string;
}): { ok: true; value: OnboardingInput } | { ok: false; error: string } {
  const grade = raw.grade ?? "";
  const board = raw.board ?? "";
  const target_exam = raw.target_exam ?? "";
  const date_of_birth = raw.date_of_birth ?? "";
  if (!VALUES.grade.includes(grade as never)) return { ok: false, error: "Pick a grade." };
  if (!VALUES.board.includes(board as never)) return { ok: false, error: "Pick a board." };
  if (!VALUES.target_exam.includes(target_exam as never))
    return { ok: false, error: "Pick a target." };

  const dob = validateDob(date_of_birth);
  if (!dob.ok) return { ok: false, error: dob.error };

  let stream: string | null = null;
  if (streamApplies(grade)) {
    stream = raw.stream ?? "";
    if (!VALUES.stream.includes(stream as never))
      return { ok: false, error: "Pick a stream." };
  }
  return { ok: true, value: { grade, board, stream, target_exam, date_of_birth } };
}
