// Unit tests for the Ledger Score engine (lib/ledger-score.ts) and the
// projection layer (lib/score-projection.ts).
//
// The repo has no test runner dependency, so this file is self-contained:
// it compiles the two pure modules with the project's own TypeScript,
// rewrites the "@/lib/…" alias for plain Node resolution, and runs under
// the built-in node:test runner.
//
//   node --test tests/
//   node tests/score-projection.test.mjs
//
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, ".test-build");

let engine;      // compiled lib/ledger-score
let projection;  // compiled lib/score-projection
let stripeTier;  // compiled lib/stripe-tier
let parentDigest; // compiled lib/parent-digest
let streakLib;   // compiled lib/streak

before(() => {
  execFileSync(
    path.join(root, "node_modules", ".bin", "tsc"),
    ["-p", "tests/tsconfig.json"],
    { cwd: root },
  );
  // tsc doesn't rewrite path aliases — point "@/lib/x" imports at siblings.
  for (const f of fs.readdirSync(outDir).filter(f => f.endsWith(".js"))) {
    const p = path.join(outDir, f);
    fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/@\/lib\/([\w-]+)/g, "./$1.js"));
  }
});

test("setup imports", async () => {
  engine = await import(path.join(outDir, "ledger-score.js"));
  projection = await import(path.join(outDir, "score-projection.js"));
  stripeTier = await import(path.join(outDir, "stripe-tier.js"));
  parentDigest = await import(path.join(outDir, "parent-digest.js"));
  streakLib = await import(path.join(outDir, "streak.js"));
});

const EMPTY_INPUTS = () => ({
  papersLog: [], syllabusSubjects: [], syllabusUploaded: false,
  notesHistory: [], mistakes: [], streak: 0,
});

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

describe("computeScoreFromInputs — engine behavior", () => {
  test("empty inputs: total is 100 (mistake pillar's no-data grace), all else 0", () => {
    const b = engine.computeScoreFromInputs(EMPTY_INPUTS());
    assert.equal(b.pqaScore, 0);
    assert.equal(b.syllabusScore, 0);
    assert.equal(b.mistakeScore, 100);
    assert.equal(b.consistencyScore, 0);
    assert.equal(b.total, 100);
  });

  test("pillar caps: perfect inputs hit 400/250/200/150 and total 1000", () => {
    const b = engine.computeScoreFromInputs({
      papersLog: Array.from({ length: 10 }, () => ({ score: 10, total: 10, subject: "Physics", date: daysAgo(1) })),
      syllabusSubjects: ["Physics"],
      syllabusUploaded: true,
      notesHistory: [{ subject: "Physics" }],
      mistakes: [],
      streak: 30,
    });
    assert.equal(b.pqaScore, 400);
    assert.equal(b.syllabusScore, 250);
    assert.equal(b.mistakeScore, 200);
    assert.equal(b.consistencyScore, 150);
    assert.equal(b.total, 1000);
  });

  test("coverage matching is case/whitespace-insensitive on subject names", () => {
    const b = engine.computeScoreFromInputs({
      ...EMPTY_INPUTS(),
      syllabusSubjects: ["Physics"],
      syllabusUploaded: true,
      notesHistory: [{ subject: "  physics " }],
    });
    assert.equal(b.subjectsCovered, 1);
    assert.equal(b.syllabusScore, 250);
  });

  test("invalid mistake dates are treated as not-recent, never throw", () => {
    const b = engine.computeScoreFromInputs({
      ...EMPTY_INPUTS(),
      papersLog: [{ score: 5, total: 10, subject: "Maths", date: daysAgo(1) }],
      mistakes: [{ date: "not-a-date" }],
    });
    assert.equal(b.recentMistakes, 0);
    assert.equal(b.mistakeScore, 200);
  });

  test("actions: empty state leads with the syllabus unlock (highest gain)", () => {
    const b = engine.computeScoreFromInputs(EMPTY_INPUTS());
    assert.ok(b.actions.length > 0 && b.actions.length <= 3);
    assert.match(b.actions[0], /syllabus/i);
  });
});

describe("projection layer — delta simulation, no parallel formulas", () => {
  test("projectSyllabusImpact from empty state: +50 (upload bonus, nothing covered)", () => {
    const p = projection.projectSyllabusImpact(EMPTY_INPUTS(), ["Physics", "Chemistry"]);
    assert.equal(p.current, 100);
    assert.equal(p.delta, 50);
    assert.equal(p.projected, 150);
    assert.equal(p.pillar, "coverage");
  });

  test("projectCoverageImpact: covering the only syllabus subject is +200", () => {
    const inputs = { ...EMPTY_INPUTS(), syllabusSubjects: ["Physics"], syllabusUploaded: true };
    const p = projection.projectCoverageImpact(inputs, "Physics");
    assert.equal(p.delta, 200);
  });

  test("projectFocusImpact: day 1 of a streak is worth round(7.5) = 8", () => {
    const p = projection.projectFocusImpact(EMPTY_INPUTS(), 1);
    assert.equal(p.delta, 8);
    assert.equal(p.pillar, "consistency");
  });

  test("projectMistakeReductionImpact: resolving 5 recent misses restores 30 pts", () => {
    const inputs = {
      ...EMPTY_INPUTS(),
      papersLog: [{ score: 5, total: 10, subject: "Maths", date: daysAgo(1) }],
      mistakes: Array.from({ length: 5 }, () => ({ date: daysAgo(1) })),
    };
    const p = projection.projectMistakeReductionImpact(inputs, 5);
    assert.equal(p.delta, 30); // 5 recent × 6 pts each
    assert.equal(p.pillar, "mistakes");
  });

  test("projectMistakeReductionImpact: old misses are already priced in — delta 0", () => {
    const inputs = {
      ...EMPTY_INPUTS(),
      papersLog: [{ score: 5, total: 10, subject: "Maths", date: daysAgo(1) }],
      mistakes: Array.from({ length: 5 }, () => ({ date: daysAgo(30) })),
    };
    assert.equal(projection.projectMistakeReductionImpact(inputs, 5).delta, 0);
  });

  test("projectExamPracticeImpact: first paper assumes 70% and moves accuracy pillar", () => {
    const p = projection.projectExamPracticeImpact(EMPTY_INPUTS(), { subject: "Physics", questionCount: 10 });
    // 7/10 correct: round(0.7*350 + 5) = 250; plus first-mistake-grace loss of 0
    assert.equal(p.pillar, "accuracy");
    assert.ok(p.delta > 0, `expected positive delta, got ${p.delta}`);
    assert.equal(p.projected, p.current + p.delta);
  });

  test("projectExamPracticeImpact: repeat papers assume historical accuracy", () => {
    const inputs = {
      ...EMPTY_INPUTS(),
      papersLog: [{ score: 9, total: 10, subject: "Physics", date: daysAgo(2) }],
    };
    const p = projection.projectExamPracticeImpact(inputs, { subject: "Physics", questionCount: 10 });
    // simulated entry adds round(10 * 0.9) = 9 correct — verify against the engine directly
    const manual = engine.computeScoreFromInputs({
      ...inputs,
      papersLog: [{ score: 9, total: 10, subject: "Physics", date: daysAgo(0) }, ...inputs.papersLog],
    }).total - engine.computeScoreFromInputs(inputs).total;
    assert.equal(p.delta, manual);
  });

  test("realizedExamPracticeImpact: delta equals engine diff with head entry removed", () => {
    const inputs = {
      ...EMPTY_INPUTS(),
      papersLog: [
        { score: 8, total: 10, subject: "Physics", date: daysAgo(0) },
        { score: 5, total: 10, subject: "Physics", date: daysAgo(3) },
      ],
    };
    const p = projection.realizedExamPracticeImpact(inputs);
    const withBoth = engine.computeScoreFromInputs(inputs).total;
    const withTail = engine.computeScoreFromInputs({ ...inputs, papersLog: inputs.papersLog.slice(1) }).total;
    assert.equal(p.delta, withBoth - withTail);
    assert.equal(p.current, withBoth);
  });

  test("realizedExamPracticeImpact: empty log is a 0-delta no-op, not a crash", () => {
    const p = projection.realizedExamPracticeImpact(EMPTY_INPUTS());
    assert.equal(p.delta, 0);
  });

  test("temporary score: discriminated kind, engine-derived, consistency always 0", () => {
    const diag = {
      board: "CBSE", grade: "Class 12", subject: "Physics",
      topicConfidence: [
        { topic: "Optics", confidence: "shaky" },
        { topic: "Electrostatics", confidence: "ok" },
        { topic: "Magnetism", confidence: "solid" },
      ],
      weakAreas: ["Numericals"],
    };
    const t = engine.computeTemporaryScore(diag);
    assert.equal(t.kind, "temporary");
    assert.equal(t.consistencyScore, 0); // no history → never self-reported
    assert.ok(t.total > 0 && t.total < 1000);
    // Gap list leads with the known weaknesses (shaky + declared weak areas)
    assert.ok(t.gapTopics.includes("Optics"));
    assert.ok(t.gapTopics.includes("Numericals"));
    assert.ok(t.gapTopics.indexOf("Optics") < t.gapTopics.indexOf("Electrostatics"));
  });

  test("temporary score: real marks override confidence-derived accuracy", () => {
    const base = {
      board: "CBSE", grade: "Class 10", subject: "Maths",
      topicConfidence: [
        { topic: "Algebra", confidence: "shaky" },
        { topic: "Trigonometry", confidence: "shaky" },
        { topic: "Geometry", confidence: "shaky" },
      ],
      weakAreas: [],
    };
    const fromConfidence = engine.computeTemporaryScore(base);
    const fromMarks = engine.computeTemporaryScore({ ...base, recentMarksPercent: 95 });
    assert.ok(fromMarks.pqaScore > fromConfidence.pqaScore,
      `marks 95% should beat all-shaky confidence (${fromMarks.pqaScore} vs ${fromConfidence.pqaScore})`);
  });

  test("temporary score: all-solid beats all-shaky", () => {
    const mk = (confidence) => engine.computeTemporaryScore({
      board: "IB", grade: "Class 11", subject: "Chemistry",
      topicConfidence: ["A", "B", "C", "D"].map(topic => ({ topic, confidence })),
      weakAreas: [],
    });
    assert.ok(mk("solid").total > mk("shaky").total);
  });

  test("temporary vs real: kinds are distinct and real score is untouched", () => {
    const t = engine.computeTemporaryScore({
      board: "CBSE", grade: "Class 9", subject: "Biology",
      topicConfidence: [{ topic: "Cells", confidence: "ok" }, { topic: "Tissues", confidence: "ok" }, { topic: "Genetics", confidence: "ok" }],
      weakAreas: [],
    });
    const r = engine.realLedgerScore(); // no window in node → EMPTY real score
    assert.equal(t.kind, "temporary");
    assert.equal(r.kind, "real");
    assert.equal(r.total, 0); // proving the diagnostic computation left no trace
    assert.notEqual(t.total, r.total);
  });

  test("stripe-tier: price mapping and tier resolution", () => {
    const prices = { proMonthly: "price_pm", proYearly: "price_py", maxMonthly: "price_mm", maxYearly: "price_my" };
    assert.equal(stripeTier.priceIdFor(prices, "pro", "monthly"), "price_pm");
    assert.equal(stripeTier.priceIdFor(prices, "max", "yearly"), "price_my");
    assert.equal(stripeTier.priceIdFor({}, "pro", "monthly"), null);
    assert.equal(stripeTier.tierForPrice(prices, "price_py"), "pro");
    assert.equal(stripeTier.tierForPrice(prices, "price_mm"), "max");
    assert.equal(stripeTier.tierForPrice(prices, "price_unknown"), null);
    // unset env must never match an empty/undefined price id
    assert.equal(stripeTier.tierForPrice({}, ""), null);
  });

  test("stripe-tier: webhook reducer covers the full lifecycle", () => {
    const prices = { proMonthly: "price_pm", proYearly: "price_py", maxMonthly: "price_mm", maxYearly: "price_my" };
    const decide = (type, object) => stripeTier.decideTierAction(prices, { type, data: { object } });

    // checkout completed → set tier from metadata
    const done = decide("checkout.session.completed",
      { metadata: { userId: "u1", tier: "pro" }, customer: "cus_1", subscription: "sub_1" });
    assert.deepEqual(done, { type: "set-tier", userId: "u1", customerId: "cus_1", tier: "pro", subscriptionId: "sub_1", status: "active" });

    // checkout with no tier metadata → ignored, not a crash
    assert.equal(decide("checkout.session.completed", { metadata: {}, customer: "cus_1" }).type, "ignore");

    // plan switch → tier re-derived from the price id
    const switched = decide("customer.subscription.updated",
      { id: "sub_1", customer: "cus_1", status: "active", items: { data: [{ price: { id: "price_my" } }] } });
    assert.equal(switched.type, "set-tier");
    assert.equal(switched.tier, "max");

    // unknown price → ignored (protects against foreign products on the account)
    assert.equal(decide("customer.subscription.updated",
      { id: "sub_1", customer: "cus_1", items: { data: [{ price: { id: "price_other" } }] } }).type, "ignore");

    // cancellation lands as deletion → downgrade to free
    const del = decide("customer.subscription.deleted", { id: "sub_1", customer: "cus_1" });
    assert.equal(del.type, "set-tier");
    assert.equal(del.tier, "free");
    assert.equal(del.status, "canceled");

    // payment failure → status only, tier untouched (dunning owns retries)
    const failed = decide("invoice.payment_failed", { customer: "cus_1" });
    assert.deepEqual(failed, { type: "record-status", customerId: "cus_1", status: "past_due" });

    // forward compatibility
    assert.equal(decide("some.future.event", {}).type, "ignore");
  });

  test("parent-digest: risk flags fire on inactivity and imminent low-readiness exams", () => {
    const breakdown = engine.computeScoreFromInputs({
      ...EMPTY_INPUTS(),
      papersLog: [{ score: 4, total: 10, subject: "Maths", date: daysAgo(10) }],
    });
    assert.ok(breakdown.total < 400, "fixture should be below Developing");

    // Inactivity: streak was established (>=5) but last session is 6 days old
    const flags = parentDigest.computeRiskFlags({
      breakdown,
      streak: 8,
      lastStudied: daysAgo(6),
      exams: [{ name: "Physics Board", date: new Date(Date.now() + 3 * 86400000).toISOString() }],
    });
    assert.equal(flags.inactiveDays, 6);
    assert.equal(flags.examSoon?.name, "Physics Board");
    assert.equal(flags.examSoon?.days, 3);

    // No flags when active and no imminent exam
    const quiet = parentDigest.computeRiskFlags({
      breakdown, streak: 8, lastStudied: daysAgo(0),
      exams: [{ name: "Finals", date: new Date(Date.now() + 60 * 86400000).toISOString() }],
    });
    assert.equal(quiet.inactiveDays, undefined);
    assert.equal(quiet.examSoon, undefined);

    // Short streaks never trigger inactivity (nothing established to lose)
    const newbie = parentDigest.computeRiskFlags({
      breakdown, streak: 2, lastStudied: daysAgo(10), exams: [],
    });
    assert.equal(newbie.inactiveDays, undefined);
  });

  test("parent-digest: exam risk clears once readiness passes the threshold", () => {
    const strong = engine.computeScoreFromInputs({
      papersLog: Array.from({ length: 10 }, () => ({ score: 9, total: 10, subject: "Physics", date: daysAgo(1) })),
      syllabusSubjects: ["Physics"], syllabusUploaded: true,
      notesHistory: [{ subject: "Physics" }], mistakes: [], streak: 20,
    });
    assert.ok(strong.total >= 400);
    const flags = parentDigest.computeRiskFlags({
      breakdown: strong, streak: 20, lastStudied: daysAgo(0),
      exams: [{ name: "Physics Board", date: new Date(Date.now() + 2 * 86400000).toISOString() }],
    });
    assert.equal(flags.examSoon, undefined);
  });

  test("parent-digest: subjects and HTML reflect the mode", () => {
    const breakdown = engine.computeScoreFromInputs(EMPTY_INPUTS());
    const d = {
      studentName: "Aarav", parentCode: "abc123", breakdown,
      streak: 6, lastStudied: daysAgo(6),
      exams: [], marks: [], weakTopics: [],
    };
    const flags = { inactiveDays: 6 };
    assert.match(parentDigest.digestSubject("inactivity", d, flags), /hasn't studied in 6 days/);
    assert.match(parentDigest.digestSubject("digest", d, {}), /weekly study report/);
    const html = parentDigest.buildParentEmailHtml("inactivity", d, flags);
    assert.ok(html.includes("Aarav"), "student name present");
    assert.ok(html.includes("/parent/abc123"), "live report link present");
    assert.ok(html.includes("streak is at risk"), "alert banner present in inactivity mode");
    const digestHtml = parentDigest.buildParentEmailHtml("digest", d, {});
    assert.ok(!digestHtml.includes("streak is at risk"), "no alert banner in plain digest");
  });

  test("streak: yesterday continues, same-day repeat doesn't double-count", () => {
    const today = new Date(2026, 6, 11);
    const yest = new Date(2026, 6, 10).toDateString();
    const r = streakLib.completeSessionStreak({ streak: 4, lastDate: yest, shieldUsedMonth: null }, today);
    assert.equal(r.streak, 5);
    assert.equal(r.counted, true);
    const again = streakLib.completeSessionStreak({ streak: 5, lastDate: today.toDateString(), shieldUsedMonth: null }, today);
    assert.equal(again.streak, 5);
    assert.equal(again.counted, false);
  });

  test("streak: one missed day consumes the monthly shield, streak survives", () => {
    const today = new Date(2026, 6, 11);
    const twoDaysAgo = new Date(2026, 6, 9).toDateString();
    const r = streakLib.resolveStreak({ streak: 9, lastDate: twoDaysAgo, shieldUsedMonth: null }, today);
    assert.equal(r.usedShield, true);
    assert.equal(r.streak, 9);
    assert.equal(r.shieldUsedMonth, "2026-07");
    // A session today then continues normally
    const done = streakLib.completeSessionStreak({ streak: r.streak, lastDate: r.lastDate, shieldUsedMonth: r.shieldUsedMonth }, today);
    assert.equal(done.streak, 10);
  });

  test("streak: shield already used this month → the streak breaks", () => {
    const today = new Date(2026, 6, 11);
    const twoDaysAgo = new Date(2026, 6, 9).toDateString();
    const r = streakLib.resolveStreak({ streak: 9, lastDate: twoDaysAgo, shieldUsedMonth: "2026-07" }, today);
    assert.equal(r.broke, true);
    assert.equal(r.streak, 0);
  });

  test("streak: 2+ missed days break regardless of shield; new month restores shield", () => {
    const today = new Date(2026, 7, 2); // Aug 2
    const fourDaysAgo = new Date(2026, 6, 29).toDateString();
    const r = streakLib.resolveStreak({ streak: 30, lastDate: fourDaysAgo, shieldUsedMonth: "2026-07" }, today);
    assert.equal(r.broke, true);
    assert.equal(r.streak, 0);
    assert.equal(streakLib.shieldAvailable("2026-07", today), true); // July's spend doesn't cover August
  });

  test("streak: garbage lastDate resets safely instead of throwing", () => {
    const r = streakLib.resolveStreak({ streak: 7, lastDate: "not-a-date", shieldUsedMonth: null });
    assert.equal(r.broke, true);
    assert.equal(r.streak, 0);
  });

  test("projections never mutate the caller's inputs", () => {
    const inputs = {
      ...EMPTY_INPUTS(),
      papersLog: [{ score: 5, total: 10, subject: "Maths", date: daysAgo(1) }],
      mistakes: [{ date: daysAgo(1) }],
      syllabusSubjects: ["Maths"],
    };
    const snapshot = JSON.stringify(inputs);
    projection.projectExamPracticeImpact(inputs, { subject: "Maths", questionCount: 10 });
    projection.projectSyllabusImpact(inputs, ["Physics"]);
    projection.projectCoverageImpact(inputs, "Maths");
    projection.projectFocusImpact(inputs, 3);
    projection.projectMistakeReductionImpact(inputs, 1);
    projection.realizedExamPracticeImpact(inputs);
    assert.equal(JSON.stringify(inputs), snapshot);
  });
});
