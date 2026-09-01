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
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, ".test-build");

let engine;      // compiled lib/ledger-score
let projection;  // compiled lib/score-projection
let stripeTier;  // compiled lib/stripe-tier
let parentDigest; // compiled lib/parent-digest
let streakLib;   // compiled lib/streak
let notif;       // compiled lib/notifications
let cronAuth;    // compiled lib/cron-auth
let market;      // compiled lib/score-market

before(() => {
  // Invoke the compiler via node + typescript's real entry point rather than
  // the node_modules/.bin/tsc shim — the shim is tsc.cmd on Windows and bare
  // tsc on POSIX, and execFileSync can't resolve the extensionless name on
  // Windows (ENOENT). This path is stable across platforms.
  execFileSync(
    process.execPath,
    [path.join(root, "node_modules", "typescript", "bin", "tsc"), "-p", "tests/tsconfig.json"],
    { cwd: root },
  );
  // tsc doesn't rewrite path aliases — point "@/lib/x" imports at siblings.
  for (const f of fs.readdirSync(outDir).filter(f => f.endsWith(".js"))) {
    const p = path.join(outDir, f);
    fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/@\/lib\/([\w-]+)/g, "./$1.js"));
  }
});

// Dynamic import() needs a file:// URL, not a raw path — a Windows path like
// C:\...\x.js is otherwise read as an (unsupported) URL scheme.
const load = (name) => import(pathToFileURL(path.join(outDir, name)).href);

test("setup imports", async () => {
  engine = await load("ledger-score.js");
  projection = await load("score-projection.js");
  stripeTier = await load("stripe-tier.js");
  parentDigest = await load("parent-digest.js");
  streakLib = await load("streak.js");
  notif = await load("notifications.js");
  cronAuth = await load("cron-auth.js");
  market = await load("score-market.js");
});

const EMPTY_INPUTS = () => ({
  papersLog: [], syllabusSubjects: [], syllabusUploaded: false,
  notesHistory: [], mistakes: [], streak: 0,
});

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

describe("computeScoreFromInputs — engine behavior", () => {
  // §4.11 — the no-data grace of 100 was REMOVED. It had to be: a free 100
  // for having recorded nothing meant logging your first mistake cost you 100
  // points, which is precisely the inversion this pillar exists to undo.
  test("empty inputs: every pillar is 0, including mistakes", () => {
    const b = engine.computeScoreFromInputs(EMPTY_INPUTS());
    assert.equal(b.pqaScore, 0);
    assert.equal(b.syllabusScore, 0);
    assert.equal(b.mistakeScore, 0);
    assert.equal(b.consistencyScore, 0);
    assert.equal(b.total, 0);
  });

  test("pillar caps: perfect inputs hit 400/250/200 and total 850 — the streak pays nothing (M14-2)", () => {
    // The mistake pillar now maxes on RESOLVED work backed by DISTINCT
    // evidence — 6 resolutions (120) + 10 evidence (50) + 6 faced (30).
    const resolved = Array.from({ length: 10 }, (_, i) => ({
      date: daysAgo(30), id: `p${i}`, status: "resolved", evidenceId: `e${i}`,
    }));
    const b = engine.computeScoreFromInputs({
      papersLog: Array.from({ length: 10 }, () => ({ score: 10, total: 10, subject: "Physics", date: daysAgo(1) })),
      syllabusSubjects: ["Physics"],
      syllabusUploaded: true,
      notesHistory: [{ subject: "Physics" }],
      mistakes: resolved,
      streak: 30,
    });
    assert.equal(b.pqaScore, 400);
    assert.equal(b.syllabusScore, 250);
    assert.equal(b.mistakeScore, 200);
    // M14-2 / PRODUCT_DECISIONS §9.3: the consecutive-day term is DELETED, not
    // renamed. A 30-day streak buys nothing, and `total` has lost its fourth
    // addend — the pre-cutover ceiling is 850, and `consistencyState` labels the
    // zero as retired rather than letting it pass for a measurement (J.3.a).
    assert.equal(b.consistencyScore, 0);
    assert.equal(b.consistencyState, "retired");
    assert.equal(b.total, 850);
  });

  test("M14-2: raising the streak moves no pillar and no total", () => {
    const base = { ...EMPTY_INPUTS(), papersLog: [{ score: 7, total: 10, subject: "Physics", date: daysAgo(1) }] };
    const cold = engine.computeScoreFromInputs({ ...base, streak: 0 });
    const hot = engine.computeScoreFromInputs({ ...base, streak: 45 });
    assert.equal(hot.total, cold.total);
    assert.equal(hot.consistencyScore, cold.consistencyScore);
    assert.equal(hot.pqaScore, cold.pqaScore);
    assert.equal(hot.syllabusScore, cold.syllabusScore);
    assert.equal(hot.mistakeScore, cold.mistakeScore);
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
    // recentMistakes no longer drives the pillar at all (§4.11) — an unresolved
    // mistake with no evidence contributes nothing, and subtracts nothing.
    assert.equal(b.mistakeScore, 0);
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
    assert.equal(p.current, 0); // was 100 under the removed no-data grace (§4.11)
    assert.equal(p.delta, 50);
    assert.equal(p.projected, 50);
    assert.equal(p.pillar, "coverage");
  });

  test("projectCoverageImpact: covering the only syllabus subject is +200", () => {
    const inputs = { ...EMPTY_INPUTS(), syllabusSubjects: ["Physics"], syllabusUploaded: true };
    const p = projection.projectCoverageImpact(inputs, "Physics");
    assert.equal(p.delta, 200);
  });

  test("projectFocusImpact: a projected streak day is worth ZERO points (M14-2)", () => {
    // The projection layer runs the REAL engine over a mutated copy of the
    // inputs, so a projection of 0 is proof the engine has no term to move.
    // The function itself survives only because three non-score surfaces still
    // import it; M14-6 removes both it and them. A recommendation may not
    // promise points a mechanism cannot pay (B.11).
    for (const days of [1, 7, 30]) {
      const p = projection.projectFocusImpact(EMPTY_INPUTS(), days);
      assert.equal(p.delta, 0, `${days} streak day(s) still paid score`);
      assert.equal(p.pillar, "consistency");
    }
  });

  test("projectMistakeReductionImpact: resolving 5 mistakes GAINS points", () => {
    const inputs = {
      ...EMPTY_INPUTS(),
      papersLog: [{ score: 5, total: 10, subject: "Maths", date: daysAgo(1) }],
      mistakes: Array.from({ length: 5 }, (_, i) => ({ date: daysAgo(1), id: `p${i}` })),
    };
    const p = projection.projectMistakeReductionImpact(inputs, 5);
    // 5 resolved × 20 = 100, plus 5 faced × 5 = 25. Resolution is now a GAIN,
    // where the old model merely stopped a penalty.
    assert.equal(p.delta, 125);
    assert.equal(p.pillar, "mistakes");
  });

  test("projectMistakeReductionImpact: age is irrelevant — resolution is not time-windowed", () => {
    const old = {
      ...EMPTY_INPUTS(),
      papersLog: [{ score: 5, total: 10, subject: "Maths", date: daysAgo(1) }],
      mistakes: Array.from({ length: 5 }, (_, i) => ({ date: daysAgo(30), id: `p${i}` })),
    };
    // Under the old penalty model this was 0, because only the trailing 7 days
    // counted. Proving an old gap shut is worth exactly as much as a new one.
    assert.equal(projection.projectMistakeReductionImpact(old, 5).delta, 125);
  });

  test("projectMistakeReductionImpact: already-resolved mistakes project no further gain", () => {
    const done = {
      ...EMPTY_INPUTS(),
      mistakes: Array.from({ length: 5 }, (_, i) => ({ date: daysAgo(1), id: `p${i}`, status: "resolved" })),
    };
    assert.equal(projection.projectMistakeReductionImpact(done, 5).delta, 0);
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

  // ═══════════════════════════════════════════════════════════════════════
  // M14-7 — THE COLD-START PATH IS A GAP FINDER, AND IT IS NOT A SCORE.
  //
  // These tests used to assert the opposite. They read
  // `t.total > 0 && t.total < 1000`, `t.consistencyScore === 0`, and
  // `fromMarks.pqaScore > fromConfidence.pqaScore` — i.e. they asserted that a
  // self-report produced a score and that the score responded to the
  // self-report. J.4 classifies exactly that as *"the cold-start path that must
  // not survive"*, so the assertions are REWRITTEN rather than deleted: what
  // they now assert is the absence of every number they used to check, which is
  // the honest regression test for M14-7.
  // ═══════════════════════════════════════════════════════════════════════

  const DIAG = {
    board: "CBSE", grade: "Class 12", subject: "Physics",
    topicConfidence: [
      { topic: "Optics", confidence: "shaky" },
      { topic: "Electrostatics", confidence: "ok" },
      { topic: "Magnetism", confidence: "solid" },
    ],
    weakAreas: ["Numericals"],
  };

  test("M14-7: the diagnostic keeps gapTopics, weakest first", () => {
    const d = engine.computeColdStartDiagnostic(DIAG);
    assert.equal(d.kind, "diagnostic");
    assert.equal(d.source, "self_report");
    assert.equal(d.verified, false);
    assert.ok(d.gapTopics.includes("Optics"));
    assert.ok(d.gapTopics.includes("Numericals"));
    assert.ok(d.gapTopics.indexOf("Optics") < d.gapTopics.indexOf("Electrostatics"));
    assert.equal(d.topicsRated, 3);
    assert.equal(d.weaknessesNamed, 2);
    assert.equal(d.subject, "Physics");
  });

  test("M14-7: it returns NO score field, under any name", () => {
    const d = engine.computeColdStartDiagnostic(DIAG);
    assert.deepEqual(engine.selfReportedScoreFields(d), [],
      "a self-report produced something a surface could render as a score");
    // Belt and braces: every number on it is one of the two declared counts,
    // so there is nothing a surface could mistake for a figure out of 1000.
    for (const [k, v] of Object.entries(d)) {
      if (typeof v !== "number") continue;
      assert.ok(k === "topicsRated" || k === "weaknessesNamed",
        `${k} is an undeclared number on a self-report`);
      assert.ok(v <= 8, `${k} = ${v} is too large to be a count of topics`);
    }
  });

  test("M14-7: self-reported marks are not converted into anything", () => {
    const base = {
      board: "CBSE", grade: "Class 10", subject: "Maths",
      topicConfidence: ["Algebra", "Trigonometry", "Geometry"].map(topic => ({ topic, confidence: "shaky" })),
      weakAreas: [],
    };
    const withoutMarks = engine.computeColdStartDiagnostic(base);
    const withMarks = engine.computeColdStartDiagnostic({ ...base, recentMarksPercent: 95 });
    // A remembered mark is a self-report too. It moves no output.
    assert.deepEqual(withMarks, withoutMarks);
  });

  test("M14-7: confidence ratings produce no arithmetic at all", () => {
    const mk = (confidence) => engine.computeColdStartDiagnostic({
      board: "IB", grade: "Class 11", subject: "Chemistry",
      topicConfidence: ["A", "B", "C", "D"].map(topic => ({ topic, confidence })),
      weakAreas: [],
    });
    const solid = mk("solid");
    const shaky = mk("shaky");
    // All-shaky names four weaknesses; all-solid names none. That is a
    // restatement of the student's own answers, and it is the ONLY difference:
    // neither carries a figure one could be "better" than the other on.
    assert.equal(shaky.weaknessesNamed, 4);
    assert.equal(solid.weaknessesNamed, 0);
    assert.deepEqual(engine.selfReportedScoreFields(solid), []);
    assert.deepEqual(engine.selfReportedScoreFields(shaky), []);
    // All-solid produces no gaps to sweep, and says so rather than ranking them.
    assert.deepEqual(solid.gapTopics, []);
  });

  test("M14-7: the temporary-score API is gone, not renamed", () => {
    assert.equal(engine.computeTemporaryScore, undefined);
    const src = fs.readFileSync(path.join(root, "lib", "ledger-score.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    assert.ok(!src.includes("TemporaryLedgerScore"), "the temporary-score type survived");
    assert.ok(!src.includes("computeTemporaryScore"), "the temporary-score function survived");
    // The fabricated evidence J.4 objected to, by name.
    assert.doesNotMatch(src, /shaky:\s*0\.3/, "the confidence-to-accuracy mapping survived");
    assert.doesNotMatch(src, /total:\s*20/, "the fabricated 20-mark paper survived");
  });

  test("M14-7: the real score is untouched and still discriminated", () => {
    const r = engine.realLedgerScore(); // no window in node -> EMPTY real score
    assert.equal(r.kind, "real");
    assert.equal(r.total, 0);
    assert.equal(engine.computeColdStartDiagnostic(DIAG).kind, "diagnostic");
  });

  test("M14-7: no shipped surface renders the self-report as a score", () => {
    for (const rel of ["app/tools/exam-day/page.tsx", "components/exam-day-diagnostic.tsx"]) {
      const src = fs.readFileSync(path.join(root, rel), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      assert.ok(!src.includes("TemporaryLedgerScore"), `${rel} still types a temporary score`);
      assert.ok(!src.includes("Temporary Ledger Score"), `${rel} still LABELS a self-report a score`);
      assert.doesNotMatch(src, /\/ 1000/, `${rel} still renders a self-report out of 1000`);
      assert.doesNotMatch(src, /tempScore/, `${rel} still holds a temporary score`);
    }
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

  // M17 REBUILT lib/parent-digest.ts's public interface onto ParentProjection
  // (architecture N.5/N.6) — `breakdown`/`exams`/`marks`/`parentCode` no
  // longer exist as top-level fields; everything is nested under
  // `d.projection`, exactly what `/api/parent/report` returns, and a category
  // absent from the projection is absent from the email, not zeroed. Full
  // coverage of that rebuilt surface lives in `tests/parent-space.test.mjs`
  // (V.8.1–V.8.8); these four keep guarding the M0-3/M0-4 properties they
  // were written for, translated onto the new shape.
  const toBreakdown = b => ({ captured_on: "2026-08-18", total: b.total, pqa: b.pqaScore, syllabus: b.syllabusScore, mistakes: b.mistakeScore, consistency: b.consistencyScore, confidence: null });
  const toExams = list => list.map(e => ({ name: e.name, subject: "Physics", date: e.date, board: "CBSE" }));

  // M0-4. Absence is not an academic finding. A student who has not opened the
  // product for weeks produces no parent-facing risk flag at all; the only
  // surviving flag is evidence-based (a dated exam is imminent AND measured
  // readiness is below the threshold).
  test("parent-digest: absence alone produces no risk flag", () => {
    const breakdown = engine.computeScoreFromInputs({
      ...EMPTY_INPUTS(),
      papersLog: [{ score: 4, total: 10, subject: "Maths", date: daysAgo(10) }],
    });
    assert.ok(breakdown.total < 400, "fixture should be below Developing");

    // Long absence, established habit, no exam anywhere near — nothing fires.
    const absent = parentDigest.computeRiskFlags({
      studentName: "A",
      projection: { system: {}, dimensionBreakdown: toBreakdown(breakdown), upcomingExams: [] },
    });
    assert.deepEqual(absent, {}, "days away from the product may not escalate");

    // Neither category shared at all — still nothing fires, and there is no
    // field for a caller to reintroduce an inactivity flag through.
    const noCategories = parentDigest.computeRiskFlags({ studentName: "A", projection: { system: {} } });
    assert.deepEqual(noCategories, {}, "no flag derivable without both categories shared");

    // The inactivity escalation constants are gone, not merely unused.
    assert.equal(parentDigest.INACTIVITY_THRESHOLD_DAYS, undefined);
    assert.equal(parentDigest.INACTIVITY_COOLDOWN_DAYS, undefined);
  });

  // The legitimate, evidence-based signal M0-4 explicitly keeps.
  test("parent-digest: imminent exam below readiness still flags", () => {
    const breakdown = engine.computeScoreFromInputs({
      ...EMPTY_INPUTS(),
      papersLog: [{ score: 4, total: 10, subject: "Maths", date: daysAgo(10) }],
    });
    const flags = parentDigest.computeRiskFlags({
      studentName: "A",
      projection: {
        system: {},
        dimensionBreakdown: toBreakdown(breakdown),
        upcomingExams: toExams([{ name: "Physics Board", date: new Date(Date.now() + 3 * 86400000).toISOString() }]),
      },
    });
    assert.equal(flags.examSoon?.name, "Physics Board");
    assert.equal(flags.examSoon?.days, 3);

    // Distant exam is not imminent.
    const far = parentDigest.computeRiskFlags({
      studentName: "A",
      projection: {
        system: {},
        dimensionBreakdown: toBreakdown(breakdown),
        upcomingExams: toExams([{ name: "Finals", date: new Date(Date.now() + 60 * 86400000).toISOString() }]),
      },
    });
    assert.equal(far.examSoon, undefined);
  });

  test("parent-digest: exam risk clears once readiness passes the threshold", () => {
    const strong = engine.computeScoreFromInputs({
      papersLog: Array.from({ length: 10 }, () => ({ score: 9, total: 10, subject: "Physics", date: daysAgo(1) })),
      syllabusSubjects: ["Physics"], syllabusUploaded: true,
      notesHistory: [{ subject: "Physics" }], mistakes: [], streak: 20,
    });
    assert.ok(strong.total >= 400);
    const flags = parentDigest.computeRiskFlags({
      studentName: "A",
      projection: {
        system: {},
        dimensionBreakdown: toBreakdown(strong),
        upcomingExams: toExams([{ name: "Physics Board", date: new Date(Date.now() + 2 * 86400000).toISOString() }]),
      },
    });
    assert.equal(flags.examSoon, undefined);
  });

  // M0-3. No parent email references consecutive days, in any mode.
  test("parent-digest: no email counts consecutive days or shames absence", () => {
    const breakdown = engine.computeScoreFromInputs(EMPTY_INPUTS());
    const d = {
      studentName: "Aarav",
      projection: {
        system: { policyVersion: 1 },
        dimensionBreakdown: toBreakdown(breakdown),
        upcomingExams: [],
      },
    };
    const examFlags = {
      examSoon: { name: "Physics Board", days: 2, score: breakdown.total },
    };

    for (const [mode, flags] of [["digest", {}], ["exam-risk", examFlags]]) {
      const html = parentDigest.buildParentEmailHtml(mode, d, flags);
      const subject = parentDigest.digestSubject(mode, d, flags);
      for (const text of [html, subject]) {
        assert.ok(!/streak/i.test(text), `${mode}: streak referenced`);
        assert.ok(!/at risk/i.test(text), `${mode}: "at risk" shame framing present`);
        assert.ok(!/hasn't studied|has not studied|hasn't completed/i.test(text),
          `${mode}: absence framed as a failure`);
        assert.ok(!/consecutive|day streak|days in a row/i.test(text),
          `${mode}: consecutive-day count present`);
      }
    }

    // The inactivity mode itself no longer exists — an unknown mode falls
    // through to the plain weekly report, which carries no banner.
    const fallback = parentDigest.buildParentEmailHtml("inactivity", d, {});
    assert.ok(!/background:#b83c1a;color:#faf6ee/.test(fallback), "alert banner rendered");
    assert.match(parentDigest.digestSubject("inactivity", d, {}), /weekly study report/);

    // What the digest contains: the student name, the score breakdown, the
    // sign-in link (no bare code any more — M17-1), and the privacy note.
    // No exam section renders here because `upcomingExams` is an empty array,
    // and no "Current Marks" table exists at all — not a Shared category.
    const plain = parentDigest.buildParentEmailHtml("digest", d, {});
    assert.ok(plain.includes("Aarav"), "student name present");
    assert.ok(plain.includes("POLICY v1"), "policy_version not stamped (V.8.5)");
    assert.ok(plain.includes("studyledger.in/parent"), "sign-in link present");
    assert.ok(!plain.includes("/parent/abc123"), "bare parentCode link still present — M17-1 requires it gone");
    assert.ok(plain.includes("Ledger Score breakdown"), "score breakdown present");
    assert.ok(!/current marks/i.test(plain), "Current Marks rendered — not a Shared category (architecture N.4)");
    assert.ok(plain.includes("progress, not failures"), "privacy note present");
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

  test("notifications: quiet hours and chronotype windows gate delivery", () => {
    assert.equal(notif.inQuietHours(23), true);
    assert.equal(notif.inQuietHours(7), true);
    assert.equal(notif.inQuietHours(9), false);
    assert.equal(notif.inDeliveryWindow("Morning lark", 9), true);
    assert.equal(notif.inDeliveryWindow("Morning lark", 18), false);
    assert.equal(notif.inDeliveryWindow(undefined, 18), true);
    assert.equal(notif.inDeliveryWindow(undefined, 9), false);
    assert.equal(notif.inDeliveryWindow(undefined, 23), false); // quiet beats window
  });

  const notifBase = () => ({
    breakdown: engine.computeScoreFromInputs(EMPTY_INPUTS()),
    exams: [], chronotype: undefined, state: {},
  });
  const at = (h, dayOffset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, 0, 0, 0);
    return d;
  };
  const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); };

  // M0-6 regression fence. The engine used to send "Your N-day streak ends
  // tonight" when an established streak would lapse unshielded. That send is
  // deleted and nothing replaces it (`PRODUCT_PRINCIPLES` §4.2). These
  // assertions fail if it — or any equivalent loss-framed nudge — returns.
  test("notifications: a lapsing streak produces NO notification, ever", () => {
    const now = at(18);
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toDateString();
    const shieldSpent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // The exact state that used to fire: long streak, studied yesterday,
    // nothing today, no shield left. Extra streak fields are passed
    // deliberately — even if something re-adds them to the input type, no
    // send may be derived from them.
    const r = notif.decideNotifications({
      ...notifBase(), streak: 6, lastDate: yesterday, shieldUsedMonth: shieldSpent, now,
    });
    assert.equal(r.send.length, 0, "a lapsing streak must produce no notification");
  });

  test("notifications: no candidate is ever streak-framed, in any state", () => {
    const now = at(18);
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toDateString();
    const shieldSpent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const strong = engine.computeScoreFromInputs({
      papersLog: Array.from({ length: 10 }, () => ({ score: 9, total: 10, subject: "P", date: daysAgo(1) })),
      syllabusSubjects: ["P"], syllabusUploaded: true, notesHistory: [{ subject: "P" }],
      mistakes: Array.from({ length: 8 }, (_, i) => ({ date: daysAgo(1), id: `p${i}` })),
      streak: 20,
    });

    const states = [
      { ...notifBase(), now },
      { ...notifBase(), streak: 30, lastDate: yesterday, shieldUsedMonth: shieldSpent, now },
      { ...notifBase(), breakdown: strong, now },
      { ...notifBase(), breakdown: strong, exams: [{ name: "Physics", date: inDays(1) }], now: at(9) },
      { ...notifBase(), breakdown: strong, exams: [{ name: "Physics", date: inDays(0) }], now: at(9) },
      { ...notifBase(), breakdown: strong, exams: [{ name: "Physics", date: inDays(7) }], now },
    ];

    for (const input of states) {
      for (const c of notif.decideNotifications(input).send) {
        const text = `${c.key} ${c.type} ${c.title} ${c.body}`;
        assert.ok(!/streak|chain|days? in a row|consecutive|don'?t break|keep it alive/i.test(text),
          `streak-framed notification emitted: ${text}`);
      }
    }
  });

  test("notifications: exam countdown fires at T-milestones with dedup keys", () => {
    // One date value, reused. The dedup key embeds the exam's date string, and
    // `inDays()` is millisecond-precision — calling it twice produced two
    // different keys whenever the two calls landed in different milliseconds,
    // which made the dedup assertion below fail at random.
    const t7 = inDays(7);
    const r = notif.decideNotifications({ ...notifBase(), exams: [{ name: "Physics Board", date: t7 }], now: at(18) });
    assert.equal(r.send.length, 1);
    assert.equal(r.send[0].type, "exam");
    assert.match(r.send[0].key, /T-7$/);

    // Same milestone never sends twice
    const again = notif.decideNotifications({ ...notifBase(), exams: [{ name: "Physics Board", date: t7 }], state: r.nextState, now: at(19) });
    assert.equal(again.send.length, 0);

    // T-5 is not a milestone
    const t5 = notif.decideNotifications({ ...notifBase(), exams: [{ name: "Physics Board", date: inDays(5) }], now: at(18) });
    assert.equal(t5.send.length, 0);
  });

  test("notifications: exam-day and T-1 use the morning window and bypass the daily cap", () => {
    const state = { lastHighPriorityDay: `${at(9).getFullYear()}-${String(at(9).getMonth() + 1).padStart(2, "0")}-${String(at(9).getDate()).padStart(2, "0")}` };
    const r = notif.decideNotifications({ ...notifBase(), exams: [{ name: "Maths", date: inDays(0) }], state, now: at(9) });
    assert.equal(r.send.length, 1, "exam today must bypass the high-priority daily cap");
    assert.equal(r.send[0].url, "/tools/exam-day");
    // …but not in the evening (morning-of window is 8-10)
    const evening = notif.decideNotifications({ ...notifBase(), exams: [{ name: "Maths", date: inDays(0) }], now: at(18) });
    assert.equal(evening.send.length, 0);
  });

  test("notifications: milestone fires once per boundary, never for small gains", () => {
    const strong = engine.computeScoreFromInputs({
      papersLog: Array.from({ length: 10 }, () => ({ score: 9, total: 10, subject: "P", date: daysAgo(1) })),
      syllabusSubjects: ["P"], syllabusUploaded: true, notesHistory: [{ subject: "P" }],
      // A genuinely strong student now has RESOLVED work behind them, not an
      // empty mistake log (§4.11) — an empty log earns nothing.
      mistakes: Array.from({ length: 8 }, (_, i) => ({
        date: daysAgo(30), id: `p${i}`, status: "resolved", evidenceId: `e${i}`,
      })),
      streak: 20,
    });
    const r = notif.decideNotifications({ ...notifBase(), breakdown: strong, now: at(18) });
    assert.equal(r.send.length, 1);
    assert.equal(r.send[0].type, "milestone");
    assert.equal(r.nextState.lastMilestone, 800);
    // Re-run with updated state: no repeat
    const again = notif.decideNotifications({ ...notifBase(), breakdown: strong, state: r.nextState, now: at(18) });
    assert.equal(again.send.length, 0);
  });

  test("notifications: at most one send per run, exams outrank everything", () => {
    const risky = engine.computeScoreFromInputs({
      ...EMPTY_INPUTS(),
      papersLog: [{ score: 3, total: 10, subject: "P", date: daysAgo(1) }],
      mistakes: Array.from({ length: 8 }, () => ({ date: daysAgo(1) })),
    });
    const r = notif.decideNotifications({
      ...notifBase(), breakdown: risky,
      exams: [{ name: "Chem", date: inDays(3) }],
      now: at(18),
    });
    assert.equal(r.send.length, 1, "one per run");
    assert.equal(r.send[0].type, "exam", "exam outranks risk");
  });

  test("notifications: sent-key ledger is pruned to a bounded size", () => {
    const state = { sent: Object.fromEntries(Array.from({ length: 150 }, (_, i) => [`old:${i}`, new Date(2020, 0, 1 + (i % 28)).toISOString()])) };
    const r = notif.decideNotifications({ ...notifBase(), exams: [{ name: "X", date: inDays(14) }], state, now: at(18) });
    assert.ok(Object.keys(r.nextState.sent).length <= notif.MAX_SENT_KEYS);
  });

  test("cron-auth: fails closed and only accepts the exact bearer secret", () => {
    const reqWith = (authValue) => ({
      headers: { get: (k) => (k.toLowerCase() === "authorization" ? authValue : null) },
    });
    const saved = process.env.CRON_SECRET;
    try {
      // Fail closed: no secret set → nobody is authorized, including the
      // notorious "Bearer undefined" that the old inline check accepted.
      delete process.env.CRON_SECRET;
      assert.equal(cronAuth.isInternalCaller(reqWith("Bearer undefined")), false);
      assert.equal(cronAuth.isInternalCaller(reqWith("Bearer ")), false);
      assert.equal(cronAuth.isInternalCaller(reqWith(null)), false);

      process.env.CRON_SECRET = "";
      assert.equal(cronAuth.isInternalCaller(reqWith("Bearer ")), false, "empty secret still fails closed");

      // With a real secret: exact match only.
      process.env.CRON_SECRET = "s3cr3t-value";
      assert.equal(cronAuth.isInternalCaller(reqWith("Bearer s3cr3t-value")), true);
      assert.equal(cronAuth.isInternalCaller(reqWith("Bearer wrong")), false);
      assert.equal(cronAuth.isInternalCaller(reqWith("s3cr3t-value")), false, "must include Bearer prefix");
      assert.equal(cronAuth.isInternalCaller(reqWith(null)), false);
      assert.equal(cronAuth.isInternalCaller(reqWith("Bearer s3cr3t-value ")), false, "no trailing slack");
    } finally {
      if (saved === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = saved;
    }
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

// ─────────────────────────────────────────────────────────────────────────────
// lib/score-market.ts — the Ledger Score as a tracked instrument.
//
// This module writes the words a student reads on the front page. If it claims
// a rise that did not happen, or invents a trend from a single data point, the
// product is lying to them. These tests exist to make that impossible.
// ─────────────────────────────────────────────────────────────────────────────

// Build a snapshot N days before "today", so the series is always relative.
const day = (daysAgo, total, over = {}) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    captured_on: d.toISOString().slice(0, 10),
    total,
    pqa: over.pqa ?? 0,
    syllabus: over.syllabus ?? 0,
    mistakes: over.mistakes ?? 0,
    consistency: over.consistency ?? 0,
    streak: over.streak ?? 0,
    papers_count: over.papers_count ?? 0,
    recent_mistakes: over.recent_mistakes ?? 0,
  };
};

describe("score-market: movement", () => {
  test("computes delta, percent and direction", () => {
    const m = market.movement(800, 842);
    assert.equal(m.delta, 42);
    assert.equal(m.direction, "up");
    assert.ok(Math.abs(m.pct - 5.25) < 0.001);
  });

  test("a fall is reported as down with a negative delta", () => {
    const m = market.movement(842, 800);
    assert.equal(m.delta, -42);
    assert.equal(m.direction, "down");
    assert.ok(m.pct < 0);
  });

  test("no change is flat, never a rounding artefact", () => {
    const m = market.movement(500, 500);
    assert.equal(m.delta, 0);
    assert.equal(m.direction, "flat");
    assert.equal(m.pct, 0);
  });

  test("a rise from zero does NOT produce Infinity percent", () => {
    // 0 -> 40 is a 40-point gain, not an infinite one. The UI leads with points.
    const m = market.movement(0, 40);
    assert.equal(m.delta, 40);
    assert.equal(m.pct, 0);
    assert.ok(Number.isFinite(m.pct));
  });
});

describe("score-market: report", () => {
  test("an empty series is newly listed, not an error and not a zero", () => {
    const r = market.buildMarketReport([]);
    assert.equal(r.isNewlyListed, true);
    assert.equal(r.current, null);
    assert.equal(r.daily, null);
    assert.equal(r.weekly, null);
    assert.equal(r.sessions, 0);
    assert.deepEqual(r.series, []);
  });

  test("a SINGLE close is newly listed — one data point is not a trend", () => {
    const r = market.buildMarketReport([day(0, 620)]);
    assert.equal(r.isNewlyListed, true);
    assert.equal(r.sessions, 1);
    assert.equal(r.current.total, 620);
    assert.equal(r.daily, null, "there is no previous close to compare against");
    assert.equal(r.weekly, null);
  });

  test("orders a shuffled series and reports the newest as current", () => {
    const r = market.buildMarketReport([day(3, 700), day(0, 842), day(7, 650)]);
    assert.equal(r.current.total, 842);
    assert.equal(r.isNewlyListed, false);
    // sparkline runs oldest -> newest
    assert.deepEqual(r.series.map(p => p.value), [650, 700, 842]);
  });

  test("daily and weekly movement are measured against the right closes", () => {
    const r = market.buildMarketReport([day(0, 842), day(1, 830), day(7, 800)]);
    assert.equal(r.daily.delta, 12);   // vs previous close
    assert.equal(r.weekly.delta, 42);  // vs 7 days ago
  });

  test("all-time high and low are tracked, and a new high is flagged", () => {
    const r = market.buildMarketReport([day(0, 900), day(5, 700), day(10, 400)]);
    assert.equal(r.allTimeHigh.value, 900);
    assert.equal(r.allTimeLow.value, 400);
    assert.equal(r.atAllTimeHigh, true);
  });

  test("sitting below the peak is NOT reported as an all-time high", () => {
    const r = market.buildMarketReport([day(0, 800), day(5, 900)]);
    assert.equal(r.allTimeHigh.value, 900);
    assert.equal(r.atAllTimeHigh, false);
  });

  test("counts consecutive advancing sessions", () => {
    // Closes oldest -> newest: 900, 830, 840, 850.
    // Transitions:            900->830 DOWN, 830->840 UP, 840->850 UP.
    // So the current advance is TWO sessions long, not three — the number of
    // up-MOVES, not the number of closes involved in them. Getting this wrong
    // would have the front page claim a longer run than actually happened.
    const r = market.buildMarketReport([day(0, 850), day(1, 840), day(2, 830), day(3, 900)]);
    assert.equal(r.streakSessions.direction, "up");
    assert.equal(r.streakSessions.count, 2);
  });

  test("a run is broken by a single down session", () => {
    const r = market.buildMarketReport([day(0, 900), day(1, 880), day(2, 890)]);
    assert.equal(r.streakSessions.direction, "up"); // 880 -> 900
    assert.equal(r.streakSessions.count, 1);        // 890 -> 880 was a fall
  });

  test("sector moves are ranked by the size of the move, largest first", () => {
    const now  = day(0, 842, { pqa: 350, syllabus: 200, mistakes: 180, consistency: 112 });
    const week = day(7, 800, { pqa: 300, syllabus: 198, mistakes: 190, consistency: 112 });
    const r = market.buildMarketReport([now, week]);
    assert.equal(r.sectorMoves[0].key, "pqa");           // +50, the biggest mover
    assert.equal(r.sectorMoves[0].move.delta, 50);
    assert.equal(r.sectorMoves.at(-1).key, "consistency"); // unchanged, ranked last
    assert.equal(r.sectorMoves.at(-1).move.delta, 0);
  });
});

describe("score-market: commentary must never lie", () => {
  test("with no data it says so rather than printing a zero", () => {
    const c = market.writeCommentary(market.buildMarketReport([]));
    assert.equal(c.verdict, "UNLISTED");
    assert.match(c.headline, /AWAITING FIRST CLOSE/);
    assert.doesNotMatch(c.standfirst, /\bclimb|rise|fell|gain|loss\b/i);
  });

  test("a single close claims NO trend — this is the core honesty guarantee", () => {
    const c = market.writeCommentary(market.buildMarketReport([day(0, 620)]));
    assert.equal(c.verdict, "NEWLY LISTED");
    assert.match(c.headline, /OPENS AT 620/);
    // It must not describe movement it cannot possibly know about.
    assert.doesNotMatch(c.standfirst, /\bclimbs?|rose|rises?|surge|slide|advance of\b/i);
  });

  test("a real rise is reported as a rise, with the true figure", () => {
    const c = market.writeCommentary(market.buildMarketReport([
      day(0, 842, { pqa: 350 }), day(7, 800, { pqa: 308 }),
    ]));
    assert.equal(c.verdict, "ADVANCING");
    assert.match(c.headline, /842/);
    assert.match(c.standfirst, /42 points/);
  });

  test("a fall is reported as a fall — no spin", () => {
    const c = market.writeCommentary(market.buildMarketReport([
      day(0, 700, { pqa: 250 }), day(7, 800, { pqa: 350 }),
    ]));
    assert.equal(c.verdict, "RETREATING");
    assert.match(c.headline, /EASES TO 700|SLIDES TO 700/);
    assert.match(c.standfirst, /100 points/);
    assert.match(c.standfirst, /given up/);
  });

  test("a flat week says unchanged and does not manufacture a story", () => {
    const c = market.writeCommentary(market.buildMarketReport([day(0, 700), day(7, 700)]));
    assert.equal(c.verdict, "UNCHANGED");
    assert.match(c.headline, /HOLDS AT 700/);
    assert.match(c.standfirst, /unchanged/i);
  });

  test("a large move earns stronger language than a small one", () => {
    const small = market.writeCommentary(market.buildMarketReport([day(0, 810), day(7, 800)]));
    const large = market.writeCommentary(market.buildMarketReport([day(0, 950), day(7, 700)]));
    assert.match(small.headline, /CLIMBS TO/);
    assert.match(large.headline, /SURGES TO/);
  });

  test("names the sector actually responsible for the move", () => {
    const c = market.writeCommentary(market.buildMarketReport([
      day(0, 842, { pqa: 300, syllabus: 250 }),
      day(7, 800, { pqa: 300, syllabus: 208 }),
    ]));
    // Coverage moved (+42); Examination did not. It must credit Coverage.
    assert.match(c.standfirst, /Coverage/);
    assert.doesNotMatch(c.standfirst, /Examination leads/);
  });
});

describe("score-market: edition metadata", () => {
  test("edition number increments once per day and is never zero or negative", () => {
    const a = market.editionNumber(new Date("2026-01-01T12:00:00Z"));
    const b = market.editionNumber(new Date("2026-01-02T12:00:00Z"));
    assert.equal(a, 1);
    assert.equal(b, 2);
    // A clock before the first edition must not produce a nonsense issue number.
    assert.ok(market.editionNumber(new Date("2020-01-01T00:00:00Z")) >= 1);
  });

  test("dateline reads like a newspaper, not an ISO string", () => {
    const d = market.dateline(new Date("2026-07-13T09:00:00Z"));
    assert.match(d, /Monday/);
    assert.match(d, /July/);
    assert.match(d, /2026/);
    assert.doesNotMatch(d, /\d{4}-\d{2}-\d{2}/);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// §4.11 — THE MISTAKE PILLAR INVARIANT
//
// "Recording evidence must never reduce a student's Ledger Score."
// PRODUCT_PRINCIPLES §3.3 — the company depends on honest logging, so a
// scoreboard that penalises logging rewards hiding evidence instead.
// ══════════════════════════════════════════════════════════════════════════
describe("§4.11 mistake pillar — capture is never punished", () => {
  const base = () => ({
    papersLog: [{ score: 7, total: 10, subject: "Physics", date: daysAgo(2) }],
    syllabusSubjects: ["Physics"], syllabusUploaded: true,
    notesHistory: [{ subject: "Physics" }], mistakes: [], streak: 5,
  });
  const open = (n) => Array.from({ length: n }, (_, i) => ({
    date: daysAgo(1), id: `p${i}`, evidenceId: `e${i}`,
  }));

  test("INVARIANT: recording one mistake never lowers the total", () => {
    const before = engine.computeScoreFromInputs(base()).total;
    const after = engine.computeScoreFromInputs({ ...base(), mistakes: open(1) }).total;
    assert.ok(after >= before, `capture dropped the score: ${before} → ${after}`);
  });

  test("INVARIANT: ten unresolved mistakes never score below zero recorded", () => {
    const none = engine.computeScoreFromInputs(base()).total;
    const ten = engine.computeScoreFromInputs({ ...base(), mistakes: open(10) }).total;
    assert.ok(ten >= none, `honest logging was punished: ${none} → ${ten}`);
  });

  test("INVARIANT: the pillar is monotonic across 0…20 captures", () => {
    let previous = -1;
    for (let n = 0; n <= 20; n += 1) {
      const b = engine.computeScoreFromInputs({ ...base(), mistakes: open(n) });
      assert.ok(b.mistakeScore >= previous, `pillar fell at n=${n}`);
      previous = b.mistakeScore;
    }
  });

  test("capture alone earns points — evidence volume", () => {
    const b = engine.computeScoreFromInputs({ ...base(), mistakes: open(3) });
    assert.equal(b.evidenceScore, 15);
    assert.equal(b.resolutionScore, 0);
    assert.ok(b.mistakeScore > 0, "recording evidence is rewarded");
  });

  test("resolution outweighs capture — 20 per resolution vs 5 per evidence", () => {
    const captured = engine.computeScoreFromInputs({ ...base(), mistakes: open(1) });
    const resolved = engine.computeScoreFromInputs({
      ...base(),
      mistakes: [{ date: daysAgo(1), id: "p0", evidenceId: "e0", status: "resolved" }],
    });
    const captureGain = captured.mistakeScore;
    const resolutionGain = resolved.mistakeScore - captureGain;
    assert.ok(resolutionGain > captureGain,
      `resolution (${resolutionGain}) must beat capture (${captureGain})`);
  });

  test("resolving strictly increases the score", () => {
    const a = engine.computeScoreFromInputs({ ...base(), mistakes: open(4) }).total;
    const b = engine.computeScoreFromInputs({
      ...base(), mistakes: open(4).map(m => ({ ...m, status: "resolved" })),
    }).total;
    assert.ok(b > a, `resolution must pay: ${a} → ${b}`);
  });

  // ── Anti-gaming ──────────────────────────────────────────────────────────

  test("GAMING: re-recording the same mistake earns nothing", () => {
    const once = engine.computeScoreFromInputs({ ...base(), mistakes: open(1) });
    const tenTimes = engine.computeScoreFromInputs({
      ...base(),
      mistakes: Array.from({ length: 10 }, () => ({ date: daysAgo(1), id: "p0", evidenceId: "e0" })),
    });
    assert.equal(tenTimes.mistakeScore, once.mistakeScore, "duplicate ids must collapse");
  });

  test("GAMING: duplicate evidence has no benefit", () => {
    const distinct = engine.computeScoreFromInputs({
      ...base(),
      mistakes: [
        { date: daysAgo(1), id: "a", evidenceId: "e1" },
        { date: daysAgo(1), id: "b", evidenceId: "e2" },
      ],
    });
    const shared = engine.computeScoreFromInputs({
      ...base(),
      mistakes: [
        { date: daysAgo(1), id: "a", evidenceId: "e1" },
        { date: daysAgo(1), id: "b", evidenceId: "e1" },
      ],
    });
    assert.equal(shared.evidenceScore, 5, "one paper is one piece of evidence");
    assert.equal(distinct.evidenceScore, 10);
    assert.ok(shared.mistakeScore < distinct.mistakeScore);
  });

  test("GAMING: mistakes with no evidence earn no evidence points", () => {
    const b = engine.computeScoreFromInputs({
      ...base(),
      mistakes: Array.from({ length: 20 }, (_, i) => ({ date: daysAgo(1), id: `p${i}` })),
    });
    assert.equal(b.evidenceScore, 0, "an unevidenced claim is not evidence");
  });

  test("GAMING: the pillar is capped at 200 however much is thrown at it", () => {
    const b = engine.computeScoreFromInputs({
      ...base(),
      mistakes: Array.from({ length: 50 }, (_, i) => ({
        date: daysAgo(1), id: `p${i}`, status: "resolved", evidenceId: `e${i}`,
      })),
    });
    assert.equal(b.resolutionScore, 120);
    assert.equal(b.evidenceScore, 50);
    assert.equal(b.acknowledgementScore, 30);
    assert.equal(b.mistakeScore, 200);
  });

  // ── Acknowledgement: avoidance is never rewarded ─────────────────────────

  test("an open pattern earns no acknowledgement — avoidance is not rewarded", () => {
    assert.equal(engine.computeScoreFromInputs({ ...base(), mistakes: open(6) }).acknowledgementScore, 0);
  });

  test("facing a pattern earns acknowledgement", () => {
    const b = engine.computeScoreFromInputs({
      ...base(), mistakes: open(6).map(m => ({ ...m, status: "acknowledged" })),
    });
    assert.equal(b.acknowledgementScore, 30);
  });

  test("a dormant pattern is not 'faced' — it was left alone", () => {
    const b = engine.computeScoreFromInputs({
      ...base(), mistakes: open(6).map(m => ({ ...m, status: "dormant" })),
    });
    assert.equal(b.acknowledgementScore, 0);
  });

  // ── Empty and legacy data ────────────────────────────────────────────────

  test("empty history: every component is 0, nothing throws", () => {
    const b = engine.computeScoreFromInputs(EMPTY_INPUTS());
    assert.equal(b.mistakeScore, 0);
    assert.equal(b.resolutionScore, 0);
    assert.equal(b.evidenceScore, 0);
    assert.equal(b.acknowledgementScore, 0);
  });

  test("legacy rows with only a date are treated as open, never as resolved", () => {
    const b = engine.computeScoreFromInputs({
      ...base(), mistakes: Array.from({ length: 5 }, () => ({ date: daysAgo(1) })),
    });
    assert.equal(b.resolutionScore, 0, "a legacy row is never counted as proven fixed");
    assert.equal(b.acknowledgementScore, 0);
    assert.equal(b.evidenceScore, 0);
  });

  test("explainable: the three components sum to the pillar", () => {
    const b = engine.computeScoreFromInputs({
      ...base(),
      mistakes: [
        { date: daysAgo(1), id: "a", evidenceId: "e1", status: "resolved" },
        { date: daysAgo(1), id: "b", evidenceId: "e2", status: "practising" },
        { date: daysAgo(1), id: "c", evidenceId: "e3" },
      ],
    });
    assert.equal(b.resolutionScore + b.evidenceScore + b.acknowledgementScore, b.mistakeScore);
    assert.equal(b.resolutionScore, 20);
    assert.equal(b.evidenceScore, 15);
    assert.equal(b.acknowledgementScore, 10);
    assert.equal(b.mistakeScore, 45);
  });

  test("other pillars are untouched by mistake data", () => {
    const without = engine.computeScoreFromInputs(base());
    const with10 = engine.computeScoreFromInputs({ ...base(), mistakes: open(10) });
    assert.equal(with10.pqaScore, without.pqaScore);
    assert.equal(with10.syllabusScore, without.syllabusScore);
    assert.equal(with10.consistencyScore, without.consistencyScore);
  });
});
