// Shared grade/board/stream constants. Single source of truth for the
// onboarding flow (app/onboard) and the Exam-Day cold-start diagnostic
// (app/tools/exam-day) — keep option lists in sync by importing, not copying.
export const GRADES = ["Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "First Year (College)", "Second Year+ (College)"];
export const BOARDS = ["CBSE", "ICSE", "IB (International Baccalaureate)", "IGCSE / Cambridge", "State Board", "Home School / Other"];
export const STREAMS = ["Science — PCM (Physics, Chemistry, Maths)", "Science — PCB (Physics, Chemistry, Biology)", "Commerce", "Arts / Humanities", "Not applicable yet"];
