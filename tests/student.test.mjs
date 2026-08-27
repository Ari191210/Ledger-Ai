// Unit tests for the Student system — the unified data model (lib/student/).
//
// Same self-contained approach as score-projection.test.mjs: compile the pure
// modules with the project's own TypeScript, rewrite path aliases for plain
// Node resolution, then run under node:test.
//
//   node --test tests/
//   node tests/student.test.mjs
//
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, ".test-build", "lib", "student");

let types, actions, derive, nextAction;

before(async () => {
  execFileSync(
    process.execPath,
    [path.join(root, "node_modules", "typescript", "bin", "tsc"), "-p", "tests/student.tsconfig.json"],
    { cwd: root },
  );
  // tsc emits extensionless relative specifiers ("./store"), which Node's ESM
  // loader rejects. Rewrite them to explicit "./store.js" paths.
  for (const f of fs.readdirSync(outDir).filter(n => n.endsWith(".js"))) {
    const p = path.join(outDir, f);
    fs.writeFileSync(
      p,
      fs.readFileSync(p, "utf8")
        .replace(/from "(\.\.?\/[^"]+)"/g, (m, spec) => (spec.endsWith(".js") ? m : `from "${spec}.js"`)),
    );
  }
  const load = (name) => import(pathToFileURL(path.join(outDir, `${name}.js`)).href);
  types      = await load("types");
  actions    = await load("actions");
  derive     = await load("derive");
  nextAction = await load("next-action");
});

// Deadline arithmetic runs against the real clock inside the engine, so
// fixtures must be expressed relative to the real today rather than a pinned
// date — otherwise "90 days out" silently becomes overdue once the wall clock
// passes it, and the tests rot.
const TODAY = () => derive.today();
const inDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return derive.today(d);
};

const fresh = () => types.emptyStudent();

// ── The empty student ──────────────────────────────────────────────────────

describe("empty student", () => {
  test("starts with no fabricated records", () => {
    const s = fresh();
    assert.equal(s.colleges.length, 0);
    assert.equal(s.essays.length, 0);
    assert.equal(s.opportunities.length, 0);
    assert.equal(s.testing.scores.length, 0);
    assert.equal(s.tasks.length, 0);
    assert.equal(s.events.length, 0);
  });

  test("reports journey status as unavailable, not 0%", () => {
    // The distinction the whole product rests on: "no data" must never be
    // rendered as a real figure of zero.
    const st = derive.journeyStatus(fresh());
    assert.equal(st.available, false);
    assert.equal(st.percent, undefined);
  });

  test("profile strength is unavailable with no evidence", () => {
    const ps = derive.overallProfileStrength(fresh());
    assert.equal(ps.available, false);
    assert.equal(ps.score, undefined);
  });

  test("produces no recommendations, but does ask for input", () => {
    const s = fresh();
    assert.equal(nextAction.nextBestActions(s).length, 0);
    assert.ok(nextAction.setupPrompts(s).length > 0, "must request the missing inputs");
  });
});

// ── Date handling ──────────────────────────────────────────────────────────

describe("dates", () => {
  test("today() uses local time, not UTC", () => {
    // 23:30 local on the 1st is still the 1st. toISOString() would roll this
    // to the 2nd for any timezone east of UTC.
    const late = new Date(2026, 2, 1, 23, 30, 0);
    assert.equal(derive.today(late), "2026-03-01");
  });

  test("daysUntil is signed", () => {
    assert.equal(derive.daysUntil("2026-03-11", "2026-03-01"), 10);
    assert.equal(derive.daysUntil("2026-02-27", "2026-03-01"), -2);
    assert.equal(derive.daysUntil("2026-03-01", "2026-03-01"), 0);
  });

  test("formatDeadline reads naturally", () => {
    assert.equal(derive.formatDeadline(derive.today()), "Today");
  });
});

// ── Cross-entity invariants (Vision §28) ───────────────────────────────────

describe("college → application → calendar", () => {
  test("adding a college opens an application and a calendar deadline", () => {
    const s = actions.addCollege(fresh(), {
      name: "Purdue", tier: "target", round: "RD", deadline: "2026-11-01",
    });
    assert.equal(s.colleges.length, 1);
    assert.equal(s.applications.length, 1, "application workspace is created automatically");
    assert.equal(s.applications[0].collegeId, s.colleges[0].id);
    assert.ok(s.applications[0].checklist.length > 0, "checklist is seeded");

    const evt = s.events.find(e => e.source?.kind === "college");
    assert.ok(evt, "deadline is mirrored into the calendar");
    assert.equal(evt.date, "2026-11-01");
  });

  test("changing the deadline moves the event rather than duplicating it", () => {
    let s = actions.addCollege(fresh(), {
      name: "Purdue", tier: "target", round: "RD", deadline: "2026-11-01",
    });
    s = actions.updateCollege(s, s.colleges[0].id, { deadline: "2026-12-15" });

    const evts = s.events.filter(e => e.source?.kind === "college");
    assert.equal(evts.length, 1, "exactly one event per source record");
    assert.equal(evts[0].date, "2026-12-15");
  });

  test("clearing a deadline removes its event", () => {
    let s = actions.addCollege(fresh(), {
      name: "Purdue", tier: "target", round: "RD", deadline: "2026-11-01",
    });
    s = actions.updateCollege(s, s.colleges[0].id, { deadline: undefined });
    assert.equal(s.events.filter(e => e.source?.kind === "college").length, 0);
  });

  test("deleting a college leaves no orphans behind", () => {
    let s = actions.addCollege(fresh(), {
      name: "Purdue", tier: "target", round: "RD", deadline: "2026-11-01",
    });
    const col = s.colleges[0];
    s = actions.addEssay(s, {
      title: "Purdue supplemental", kind: "supplemental",
      collegeId: col.id, status: "not-started",
    });
    s = actions.addRecommender(s, {
      name: "Ms Rao", status: "not-requested", collegeIds: [col.id],
    });

    s = actions.removeCollege(s, col.id);

    assert.equal(s.colleges.length, 0);
    assert.equal(s.applications.length, 0, "application is removed with its college");
    assert.equal(s.events.filter(e => e.source?.kind === "college").length, 0);
    // The essay survives — the student's writing is theirs — but the dead
    // reference must be cleared so no module resolves a missing college.
    assert.equal(s.essays.length, 1, "essay text is never destroyed");
    assert.equal(s.essays[0].collegeId, undefined, "dangling reference cleared");
    assert.deepEqual(s.recommenders[0].collegeIds, [], "recommender unlinked");
  });
});

describe("essay drafts", () => {
  test("saving is append-only, preserving version history", () => {
    let s = actions.addEssay(fresh(), {
      title: "Common App", kind: "common-app", status: "not-started",
    });
    const id = s.essays[0].id;
    s = actions.saveEssayDraft(s, id, "First attempt.");
    s = actions.saveEssayDraft(s, id, "First attempt, now revised and longer.");

    assert.equal(s.essays[0].drafts.length, 2, "old draft is retained");
    assert.equal(s.essays[0].drafts[0].body, "First attempt.");
    assert.equal(actions.latestDraft(s.essays[0]).wordCount, 6);
    assert.equal(s.essays[0].status, "drafting", "status advances off not-started");
  });

  test("word count ignores surrounding whitespace", () => {
    assert.equal(actions.countWords("   "), 0);
    assert.equal(actions.countWords(" one   two \n three "), 3);
  });
});

// ── Progress figures ───────────────────────────────────────────────────────

describe("journey status", () => {
  test("averages only the areas that have data", () => {
    // One categorised college makes two areas measurable: the college list
    // itself, and the application workspace that was opened alongside it.
    // Averaging across all ten areas would report ~20%, which would be a
    // fabricated discouragement.
    const s = actions.addCollege(fresh(), { name: "UIUC", tier: "target", round: "RD" });
    const st = derive.journeyStatus(s);
    assert.equal(st.available, true);
    assert.equal(st.tracked, 2, "colleges and applications are both now tracked");
    assert.equal(st.total, 10);

    const areas = derive.journeyAreas(s);
    assert.equal(areas.find(a => a.area === "colleges").percent, 100);
    assert.equal(areas.find(a => a.area === "applications").percent, 0);
    assert.equal(st.percent, 50, "mean of the tracked areas only");
  });

  test("an uncategorised college counts as tracked but incomplete", () => {
    const s = actions.addCollege(fresh(), { name: "UIUC", tier: "unsorted", round: "RD" });
    const areas = derive.journeyAreas(s);
    const colleges = areas.find(a => a.area === "colleges");
    assert.equal(colleges.available, true);
    assert.equal(colleges.percent, 0);
    assert.match(colleges.basis, /0 of 1/);
  });

  test("every area explains its own basis", () => {
    for (const area of derive.journeyAreas(fresh())) {
      assert.ok(area.basis.length > 0, `${area.area} must state its basis`);
      assert.equal(area.available, false);
    }
  });

  // The basis string is read on the first screen of the product, so it has to
  // be correct English, not merely present. A naive `noun + "s"` printed
  // "2 activitys" on the home page for weeks: the suite asserted the string
  // was non-empty and never that it was well-formed, so nothing failed.
  test("plural nouns in a basis are well-formed at every count", () => {
    // "-ys" is never a valid English plural; "-ies" is the correct form.
    const badPlural = /\b\w+ys\b/;

    for (const n of [0, 1, 2, 5]) {
      let s = fresh();
      for (let i = 0; i < n; i++) {
        s = actions.addActivity(s, { name: `Activity ${i}`, category: "clubs" });
      }
      const area = derive.journeyAreas(s).find(a => a.area === "extracurriculars");
      assert.ok(
        !badPlural.test(area.basis),
        `count ${n} produced a malformed plural: "${area.basis}"`,
      );
    }
  });

  test("a count of one is singular, and more than one is plural", () => {
    const one = derive
      .journeyAreas(actions.addActivity(fresh(), { name: "Debate", category: "clubs" }))
      .find(a => a.area === "extracurriculars");
    assert.match(one.basis, /^1 activity recorded$/);

    let s = actions.addActivity(fresh(), { name: "Debate", category: "clubs" });
    s = actions.addActivity(s, { name: "Robotics", category: "technology" });
    const two = derive.journeyAreas(s).find(a => a.area === "extracurriculars");
    assert.match(two.basis, /^2 activities recorded$/);
  });
});

describe("application progress", () => {
  test("is the share of completed checklist items", () => {
    let s = actions.addCollege(fresh(), { name: "Purdue", tier: "target", round: "RD" });
    const app = s.applications[0];
    assert.equal(derive.applicationProgress(app), 0);

    s = actions.toggleChecklistItem(s, app.id, app.checklist[0].id);
    s = actions.toggleChecklistItem(s, app.id, app.checklist[1].id);
    const pct = derive.applicationProgress(s.applications[0]);
    assert.equal(pct, Math.round((2 / app.checklist.length) * 100));
  });
});

// ── Testing analysis ───────────────────────────────────────────────────────

describe("test score analysis", () => {
  const withScores = () => {
    let s = fresh();
    s = actions.addTestPlan(s, { kind: "SAT", targetScore: 1500, testDate: inDays(40) });
    s = actions.addTestScore(s, {
      kind: "SAT", attempt: "practice", takenOn: "2026-01-10", total: 1300, max: 1600,
      sections: [
        { name: "Math", score: 600, max: 800 },
        { name: "Reading & Writing", score: 700, max: 800 },
      ],
    });
    s = actions.addTestScore(s, {
      kind: "SAT", attempt: "practice", takenOn: "2026-02-10", total: 1390, max: 1600,
      sections: [
        { name: "Math", score: 640, max: 800 },
        { name: "Reading & Writing", score: 750, max: 800 },
      ],
    });
    return s;
  };

  test("identifies the weakest section of the latest attempt", () => {
    const weak = derive.weakestSection(withScores().testing.scores, "SAT");
    assert.equal(weak.name, "Math");
    assert.equal(weak.pct, 80);
  });

  test("reports section movement across attempts", () => {
    const trends = derive.sectionTrends(withScores().testing.scores, "SAT");
    const math = trends.find(t => t.name === "Math");
    assert.equal(math.delta, 40);
    assert.equal(math.attempts, 2);
  });

  test("reports no trend from a single attempt", () => {
    // One data point is not a trend; claiming otherwise is fabrication.
    let s = fresh();
    s = actions.addTestScore(s, {
      kind: "SAT", attempt: "diagnostic", takenOn: "2026-01-10", total: 1300, max: 1600,
      sections: [{ name: "Math", score: 600, max: 800 }],
    });
    assert.deepEqual(derive.sectionTrends(s.testing.scores, "SAT"), []);
  });

  test("adding a test plan puts the test date on the calendar", () => {
    const s = withScores();
    const evt = s.events.find(e => e.kind === "test-date");
    assert.ok(evt);
    assert.equal(evt.date, inDays(40));
  });
});

// ── College list balance ───────────────────────────────────────────────────

describe("college list balance", () => {
  test("stays silent on a list too small to judge", () => {
    let s = fresh();
    s = actions.addCollege(s, { name: "A", tier: "reach", round: "RD" });
    s = actions.addCollege(s, { name: "B", tier: "reach", round: "RD" });
    assert.equal(derive.listBalance(s.colleges).warning, undefined);
  });

  test("flags a reach-heavy list once it is large enough", () => {
    let s = fresh();
    for (const n of ["A", "B", "C", "D"]) s = actions.addCollege(s, { name: n, tier: "reach", round: "RD" });
    s = actions.addCollege(s, { name: "E", tier: "likely", round: "RD" });
    const b = derive.listBalance(s.colleges);
    assert.equal(b.reach, 4);
    assert.match(b.warning, /reach-heavy/);
  });

  test("flags a list with no likely schools", () => {
    let s = fresh();
    s = actions.addCollege(s, { name: "A", tier: "reach", round: "RD" });
    s = actions.addCollege(s, { name: "B", tier: "reach", round: "RD" });
    s = actions.addCollege(s, { name: "C", tier: "target", round: "RD" });
    s = actions.addCollege(s, { name: "D", tier: "target", round: "RD" });
    assert.match(derive.listBalance(s.colleges).warning, /no likely schools/);
  });
});

// ── Fit score ──────────────────────────────────────────────────────────────

describe("fit score", () => {
  test("is withheld when too little is known", () => {
    const s = actions.addCollege(fresh(), { name: "Purdue", tier: "target", round: "RD" });
    const fit = derive.fitScore(s, s.colleges[0]);
    // Only application readiness is computable; one factor is not an assessment.
    assert.equal(fit.available, false);
    assert.equal(fit.percent, undefined);
    assert.ok(fit.missing.length > 0, "says what it needs");
  });

  test("computes once enough factors exist, and explains each one", () => {
    let s = actions.updateProfile(fresh(), { intendedMajor: "Computer Science", country: "India" });
    s = actions.addCollege(s, {
      name: "Purdue", tier: "target", round: "RD",
      intendedMajor: "Computer Science", testPolicy: "optional", country: "USA",
    });
    const fit = derive.fitScore(s, s.colleges[0]);
    assert.equal(fit.available, true);
    assert.ok(fit.percent >= 0 && fit.percent <= 100);
    for (const f of fit.factors) {
      assert.ok(f.reason.length > 0, `${f.label} must explain itself`);
    }
    const major = fit.factors.find(f => f.label === "Major fit");
    assert.equal(major.score, 100);
  });

  test("never claims an admissions chance", () => {
    let s = actions.updateProfile(fresh(), { intendedMajor: "CS", country: "India" });
    s = actions.addCollege(s, {
      name: "MIT", tier: "reach", round: "RD",
      intendedMajor: "CS", testPolicy: "required", country: "USA",
    });
    const fit = derive.fitScore(s, s.colleges[0]);
    const text = JSON.stringify(fit).toLowerCase();
    for (const banned of ["chance", "admit", "acceptance rate", "you will get in"]) {
      assert.ok(!text.includes(banned), `fit score must not mention "${banned}"`);
    }
  });
});

// ── Profile strength ───────────────────────────────────────────────────────

describe("profile strength", () => {
  test("distinguishes no evidence from weak evidence", () => {
    // An activity with no leadership role scores low but IS measured.
    // A student with no activities at all is simply not measured.
    const none = derive.profileStrength(fresh()).find(d => d.key === "leadership");
    assert.equal(none.available, false);
    assert.equal(none.score, undefined);

    const s = actions.addActivity(fresh(), {
      name: "Robotics club", category: "technology", leadership: false,
    });
    const some = derive.profileStrength(s).find(d => d.key === "leadership");
    assert.equal(some.available, true);
    assert.equal(some.score, 0);
    assert.match(some.basis, /0 of 1/);
  });

  test("impact measures documented outcomes", () => {
    let s = actions.addActivity(fresh(), {
      name: "Robotics", category: "technology", leadership: true, impact: "Grew team from 4 to 18.",
    });
    s = actions.addActivity(s, { name: "Debate", category: "clubs", leadership: false });
    const impact = derive.profileStrength(s).find(d => d.key === "impact");
    assert.equal(impact.score, 5, "one of two activities documents an outcome");
  });

  test("overall strength averages only measured dimensions", () => {
    const s = actions.addActivity(fresh(), {
      name: "Robotics", category: "technology", leadership: true,
    });
    const overall = derive.overallProfileStrength(s);
    assert.equal(overall.available, true);
    assert.equal(overall.measured, 2, "leadership and impact are measurable from one activity");
  });
});

// ── The Next Best Action engine ────────────────────────────────────────────

describe("next best actions", () => {
  test("ranks an overdue task above a distant deadline", () => {
    let s = fresh();
    s = actions.addTask(s, {
      title: "Distant task", priority: "high", dueDate: inDays(90), createdAt: TODAY(),
    });
    s = actions.addTask(s, {
      title: "Overdue task", priority: "low", dueDate: inDays(-3), createdAt: TODAY(),
    });
    const actionsOut = nextAction.nextBestActions(s);
    assert.equal(actionsOut[0].title, "Overdue task");
  });

  test("ranks a near deadline above open-ended improvement work", () => {
    let s = actions.addCollege(fresh(), {
      name: "Purdue", tier: "target", round: "RD", deadline: inDays(2),
    });
    s = actions.addActivity(s, { name: "Robotics", category: "technology", leadership: true });
    const [first] = nextAction.nextBestActions(s);
    assert.equal(first.area, "applications");
    assert.match(first.reason, /deadline/i);
  });

  test("every action cites the record that produced it", () => {
    let s = actions.addCollege(fresh(), {
      name: "Purdue", tier: "target", round: "RD", deadline: inDays(20),
    });
    s = actions.addEssay(s, {
      title: "Purdue supplemental", kind: "supplemental", status: "drafting", deadline: inDays(10),
    });
    s = actions.addTestPlan(s, { kind: "SAT", targetScore: 1500, testDate: inDays(45) });

    const out = nextAction.nextBestActions(s);
    assert.ok(out.length > 0);
    for (const a of out) {
      assert.ok(a.reason.length > 0, `"${a.title}" must carry a reason`);
      assert.ok(a.href.startsWith("/"), "must link somewhere actionable");
      assert.ok(a.cta.length > 0);
    }
  });

  test("recommends the diagnostic when a test is planned but unscored", () => {
    const s = actions.addTestPlan(fresh(), { kind: "SAT", targetScore: 1500, testDate: inDays(30) });
    const diag = nextAction.nextBestActions(s).find(a => a.title.includes("diagnostic"));
    assert.ok(diag, "a planned test with no score should prompt a diagnostic");
    assert.match(diag.reason, /no score recorded/i);
  });

  test("names the weakest section using the real score history", () => {
    let s = actions.addTestPlan(fresh(), { kind: "SAT", targetScore: 1500, testDate: inDays(60) });
    s = actions.addTestScore(s, {
      kind: "SAT", attempt: "practice", takenOn: "2026-01-10", total: 1300, max: 1600,
      sections: [{ name: "Math", score: 600, max: 800 }, { name: "Reading", score: 700, max: 800 }],
    });
    s = actions.addTestScore(s, {
      kind: "SAT", attempt: "practice", takenOn: "2026-02-10", total: 1340, max: 1600,
      sections: [{ name: "Math", score: 620, max: 800 }, { name: "Reading", score: 720, max: 800 }],
    });
    const rec = nextAction.nextBestActions(s).find(a => a.title.includes("Math"));
    assert.ok(rec, "should surface the weakest section");
    assert.match(rec.reason, /2 attempts/);
    assert.match(rec.reason, /Math/);
  });

  test("prompts submission only when the checklist is genuinely complete", () => {
    let s = actions.addCollege(fresh(), {
      name: "Purdue", tier: "target", round: "RD", deadline: inDays(10),
    });
    const app = s.applications[0];
    for (const item of app.checklist) s = actions.toggleChecklistItem(s, app.id, item.id);

    const submit = nextAction.nextBestActions(s).find(a => a.title.startsWith("Submit"));
    assert.ok(submit, "a complete checklist should prompt submission");
    assert.match(submit.reason, /Every checklist item is complete/);
  });

  test("ignores a submitted application", () => {
    let s = actions.addCollege(fresh(), {
      name: "Purdue", tier: "target", round: "RD", deadline: inDays(5),
    });
    s = actions.setApplicationSubmitted(s, s.applications[0].id, true);
    const out = nextAction.nextBestActions(s);
    assert.equal(out.filter(a => a.area === "applications").length, 0);
  });

  test("returns a bounded, prioritised queue rather than everything", () => {
    let s = fresh();
    for (let i = 0; i < 25; i++) {
      s = actions.addTask(s, {
        title: `Task ${i}`, priority: "medium", dueDate: inDays(i + 1), createdAt: TODAY(),
      });
    }
    const out = nextAction.nextBestActions(s, 5);
    assert.equal(out.length, 5, "the queue is cut short by design");
    for (let i = 1; i < out.length; i++) {
      assert.ok(out[i - 1].weight >= out[i].weight, "sorted by weight");
    }
  });

  test("does not invent advice for an empty profile", () => {
    assert.equal(nextAction.nextBestActions(fresh()).length, 0);
  });
});

// ── Tasks ──────────────────────────────────────────────────────────────────

describe("tasks", () => {
  test("completing a task stamps the time and drops it from the queue", () => {
    let s = actions.addTask(fresh(), {
      title: "Draft supplemental", priority: "high", dueDate: inDays(1), createdAt: TODAY(),
    });
    const id = s.tasks[0].id;
    assert.equal(nextAction.nextBestActions(s).length, 1);

    s = actions.toggleTask(s, id);
    assert.equal(s.tasks[0].done, true);
    assert.ok(s.tasks[0].completedAt, "completion is timestamped");
    assert.equal(nextAction.nextBestActions(s).length, 0);
  });
});

// ── Calendar integrity ─────────────────────────────────────────────────────

describe("calendar", () => {
  test("derived events cannot be deleted directly", () => {
    // Deleting the projection instead of the source would desynchronise the
    // calendar from the record that owns the date.
    const s = actions.addCollege(fresh(), {
      name: "Purdue", tier: "target", round: "RD", deadline: inDays(30),
    });
    const evt = s.events[0];
    const after = actions.removeEvent(s, evt.id);
    assert.equal(after.events.length, 1, "the source record owns this date");
  });

  test("custom events can be added and removed freely", () => {
    let s = actions.addCustomEvent(fresh(), {
      title: "School exam", date: inDays(7), kind: "exam",
    });
    assert.equal(s.events.length, 1);
    s = actions.removeEvent(s, s.events[0].id);
    assert.equal(s.events.length, 0);
  });

  test("upcoming is ordered soonest first and excludes the past", () => {
    let s = actions.addCustomEvent(fresh(), { title: "Later", date: inDays(20), kind: "custom" });
    s = actions.addCustomEvent(s, { title: "Sooner", date: inDays(3), kind: "custom" });
    s = actions.addCustomEvent(s, { title: "Past", date: inDays(-5), kind: "custom" });

    const up = derive.upcoming(s);
    assert.deepEqual(up.map(u => u.title), ["Sooner", "Later"]);
    assert.deepEqual(derive.overdue(s).map(u => u.title), ["Past"]);
  });
});
