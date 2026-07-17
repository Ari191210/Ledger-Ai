// Invariant tests for lib/ledger-score-v2.ts — run with: npx tsx scripts/test-score-v2.ts
// Exit code 0 = all pass. No test framework on purpose (repo has none).

import {
  computeScoreFromInputsV2,
  type ScoreInputsV2,
  type PaperEntryV2,
  type MistakeEntryV2,
} from "../lib/ledger-score-v2";
import { corroborateActiveDay } from "../lib/active-close";

const NOW = new Date("2026-08-01T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures += 1; console.error(`  FAIL  ${name}  ${detail}`); }
}

function base(over: Partial<ScoreInputsV2> = {}): ScoreInputsV2 {
  return {
    papersLog: [], syllabusSubjects: [], syllabusUploaded: false,
    notesHistory: [], mistakes: [], checks: [], activeStreak: 0, ...over,
  };
}

const goodSessions: PaperEntryV2[] = Array.from({ length: 12 }, (_, i) => ({
  score: 8, total: 10, subject: "Physics", date: daysAgo(2 + i * 3),
}));

// ── I1 + I3: cleared mistakes outrank never-made mistakes ────────────────────
{
  console.log("I1/I3 — recovery beats cleanliness");
  const cleared: MistakeEntryV2[] = Array.from({ length: 8 }, (_, i) => ({
    date: daysAgo(20), topic: `T${i}`, status: "cleared", clearedDate: daysAgo(5),
  }));
  const withRecovery = computeScoreFromInputsV2(base({ papersLog: goodSessions, mistakes: cleared }), NOW);
  const noMistakes = computeScoreFromInputsV2(base({ papersLog: goodSessions }), NOW);
  check("cleared-8 recovery > mistake-free cleanliness", withRecovery.mistakes > noMistakes.mistakes,
    `${withRecovery.mistakes} vs ${noMistakes.mistakes}`);
  check("cleanliness capped at 120", noMistakes.mistakes <= 120, String(noMistakes.mistakes));
  check("full recovery reaches 200", withRecovery.mistakes === 200, String(withRecovery.mistakes));
}

// ── I2: inactivity never raises the score ────────────────────────────────────
{
  console.log("I2 — inactivity cannot pay");
  const open: MistakeEntryV2[] = [
    { date: daysAgo(3), topic: "Optics", status: "open" },
    { date: daysAgo(4), topic: "Waves", status: "open" },
  ];
  const inputs = base({
    papersLog: goodSessions,
    mistakes: [...open, { date: daysAgo(10), topic: "Kinematics", status: "cleared", clearedDate: daysAgo(9) }],
    syllabusSubjects: ["Physics", "Chemistry", "Maths"],
    syllabusUploaded: true,
    notesHistory: [{ subject: "Chemistry" }],
    activeStreak: 4,
  });
  const now = computeScoreFromInputsV2(inputs, NOW);
  const later = computeScoreFromInputsV2(inputs, new Date(NOW.getTime() + 7 * 86_400_000));
  const muchLater = computeScoreFromInputsV2(inputs, new Date(NOW.getTime() + 40 * 86_400_000));
  check("total(t+7d, no events) <= total(t)", later.total <= now.total, `${later.total} vs ${now.total}`);
  check("total(t+40d, no events) <= total(t+7d)", muchLater.total <= later.total, `${muchLater.total} vs ${later.total}`);
  check("recovery never rises with time", later.mistakes <= now.mistakes && muchLater.mistakes <= later.mistakes,
    `${now.mistakes} -> ${later.mistakes} -> ${muchLater.mistakes}`);
  check("open mistakes never expire", muchLater.openMistakes === now.openMistakes,
    `${muchLater.openMistakes} vs ${now.openMistakes}`);
}

// ── I2b: clearing a mistake never lowers the score ───────────────────────────
{
  console.log("I2b — clearing is monotone");
  const before = base({ papersLog: goodSessions, mistakes: [{ date: daysAgo(3), topic: "Optics", status: "open" }] });
  const after = base({ papersLog: goodSessions, mistakes: [{ date: daysAgo(3), topic: "Optics", status: "cleared", clearedDate: daysAgo(1) }] });
  const b = computeScoreFromInputsV2(before, NOW);
  const a = computeScoreFromInputsV2(after, NOW);
  check("score(cleared) > score(open)", a.total > b.total, `${a.total} vs ${b.total}`);
}

// ── I4: caps bound a forged blob ─────────────────────────────────────────────
{
  console.log("I4 — forgery is bounded");
  const forged: PaperEntryV2[] = Array.from({ length: 500 }, () => ({
    score: 10, total: 10, subject: "Physics", date: daysAgo(0),
  }));
  const r = computeScoreFromInputsV2(base({ papersLog: forged }), NOW);
  check("one day of grinding counts <= 60 questions", r.questionsCounted90d <= 60, String(r.questionsCounted90d));
  const overflow = computeScoreFromInputsV2(
    base({ papersLog: [{ score: 999, total: 10, subject: "P", date: daysAgo(1) }] }), NOW);
  check("score > total is clamped", overflow.recentAccuracy <= 1, String(overflow.recentAccuracy));
}

// ── Coverage: proof beats generation ─────────────────────────────────────────
{
  console.log("Coverage — proof-of-learning");
  const syl = { syllabusSubjects: ["Physics", "Chemistry"], syllabusUploaded: true };
  const generated = computeScoreFromInputsV2(base({ ...syl, notesHistory: [{ subject: "Physics" }] }), NOW);
  const proven = computeScoreFromInputsV2(base({ ...syl, checks: [{ subject: "Physics", correct: 4, total: 5, date: daysAgo(1) }] }), NOW);
  const provenBySession = computeScoreFromInputsV2(base({ ...syl, papersLog: [{ score: 8, total: 12, subject: "Physics", date: daysAgo(1) }] }), NOW);
  check("notes-only = initiated weight (0.25)", generated.syllabus === 50 + Math.round(200 * 0.25 / 2), String(generated.syllabus));
  check("passed check = proven weight (1.0)", proven.syllabus === 50 + Math.round(200 * 1 / 2), String(proven.syllabus));
  check("real session proves subject too", provenBySession.syllabus === proven.syllabus, String(provenBySession.syllabus));
  const failedCheck = computeScoreFromInputsV2(base({ ...syl, checks: [{ subject: "Physics", correct: 2, total: 5, date: daysAgo(1) }] }), NOW);
  check("failed check proves nothing", failedCheck.syllabus === 50, String(failedCheck.syllabus));
}

// ── Zero-data honesty ────────────────────────────────────────────────────────
{
  console.log("Zero data — the free points are dead");
  const empty = computeScoreFromInputsV2(base(), NOW);
  check("empty inputs score 0 (was 100 in v1)", empty.total === 0, String(empty.total));
}

// ── Recovery epoch: legacy mistakes are archived, not open ───────────────────
{
  console.log("Migration fairness — pre-epoch mistakes archived");
  const legacy: MistakeEntryV2[] = [{ date: "2026-05-01T10:00:00Z", topic: "Old" }]; // no status, pre-epoch
  const r = computeScoreFromInputsV2(base({ papersLog: goodSessions, mistakes: legacy }), NOW);
  check("legacy unstatused mistake is not open", r.openMistakes === 0, String(r.openMistakes));
}

// ── Active close corroboration ───────────────────────────────────────────────
{
  console.log("Active close — stamp requires evidence");
  const day = "2026-08-01";
  const stamped = { "ledger-last-event": JSON.stringify({ date: day, type: "practice_session" }) };
  check("bare stamp without evidence = passive", corroborateActiveDay(stamped, day) === false);
  const withEvidence = {
    ...stamped,
    "ledger-papers-log": JSON.stringify([{ date: `${day}T10:00:00Z`, total: 10, score: 7, subject: "P" }]),
  };
  check("stamp + matching session = active", corroborateActiveDay(withEvidence, day) === true);
  check("wrong day = passive", corroborateActiveDay(withEvidence, "2026-08-02") === false);
}

console.log(failures === 0 ? "\nALL INVARIANTS PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
