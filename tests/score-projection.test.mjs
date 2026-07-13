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
    streak: 0, lastDate: null, shieldUsedMonth: null,
    exams: [], chronotype: undefined, state: {},
  });
  const at = (h, dayOffset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, 0, 0, 0);
    return d;
  };
  const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); };

  test("notifications: streak reminder only when it breaks tonight, unshielded", () => {
    const now = at(18);
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toDateString();
    const shieldSpent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Shield spent → reminder fires
    const r1 = notif.decideNotifications({ ...notifBase(), streak: 6, lastDate: yesterday, shieldUsedMonth: shieldSpent, now });
    assert.equal(r1.send.length, 1);
    assert.equal(r1.send[0].type, "streak");

    // Shield still available → the miss is covered, no nudge
    const r2 = notif.decideNotifications({ ...notifBase(), streak: 6, lastDate: yesterday, shieldUsedMonth: null, now });
    assert.equal(r2.send.filter(n => n.type === "streak").length, 0);

    // Already studied today → nothing to save
    const r3 = notif.decideNotifications({ ...notifBase(), streak: 6, lastDate: now.toDateString(), shieldUsedMonth: shieldSpent, now });
    assert.equal(r3.send.length, 0);
  });

  test("notifications: exam countdown fires at T-milestones with dedup keys", () => {
    const r = notif.decideNotifications({ ...notifBase(), exams: [{ name: "Physics Board", date: inDays(7) }], now: at(18) });
    assert.equal(r.send.length, 1);
    assert.equal(r.send[0].type, "exam");
    assert.match(r.send[0].key, /T-7$/);

    // Same milestone never sends twice
    const again = notif.decideNotifications({ ...notifBase(), exams: [{ name: "Physics Board", date: inDays(7) }], state: r.nextState, now: at(19) });
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
      syllabusSubjects: ["P"], syllabusUploaded: true, notesHistory: [{ subject: "P" }], mistakes: [], streak: 20,
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
