// ═══════════════════════════════════════════════════════════════════════════
// HOUSE STYLE — PRODUCT_DECISIONS §7.8
//
// Two founder rules of 2026-08-30, tested rather than trusted:
//
//   A. No em-dashes or en-dashes in anything a student reads.
//   B. The tutor never closes a concept on its own say-so.
//
// Rule A is tested twice over, because it is enforced twice over: the prompt
// asks the model not to produce dashes, and `stripDashes` guarantees none
// survive if it does anyway. A style rule that lives only in a prompt is a
// style rule that regresses silently on the next model version — which is the
// entire reason §7.8 says "enforced at the AI boundary, not by asking the
// model nicely".
//
//   node --test tests/house-style.test.mjs
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routeSrc = fs.readFileSync(path.join(root, "app", "api", "ai", "route.ts"), "utf8");

// ── The function under test, compiled out of the route it ships in ─────────
// Extracted rather than reimplemented: a copy of the regex in this file would
// pass forever while the shipped one rotted. Same posture as the other
// structural suites in this repo.
const OUT = path.join(root, ".test-build-house-style");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const fnStart = routeSrc.indexOf("export function stripDashes");
assert.ok(fnStart > 0, "stripDashes is not exported from app/api/ai/route.ts");
const fnEnd = routeSrc.indexOf("\n}", fnStart) + 2;
fs.writeFileSync(path.join(OUT, "strip.ts"), routeSrc.slice(fnStart, fnEnd));
execSync(`npx tsc "${path.join(OUT, "strip.ts")}" --module esnext --target es2022 --skipLibCheck`, { cwd: root });
const { stripDashes } = await import(
  `file:///${path.join(OUT, "strip.js").replace(/\\/g, "/")}?v=${Date.now()}`
);

describe("§7.8 A — no dash reaches a student", () => {
  test("every dash character is removed from prose", () => {
    for (const dash of ["\u2014", "\u2013", "\u2015"]) {
      const out = stripDashes(`the record is permanent${dash}nothing is deleted`);
      assert.equal(/[\u2014\u2013\u2015]/.test(out), false, `${dash.codePointAt(0).toString(16)} survived`);
    }
  });

  test("a dash between words becomes a comma, not a jam", () => {
    assert.equal(stripDashes("a\u2014b"), "a, b");
    assert.equal(
      stripDashes("Torque is a vector\u2014its direction matters."),
      "Torque is a vector, its direction matters.",
    );
  });

  test("a spaced dash collapses to one space, never a double space", () => {
    assert.equal(stripDashes("one \u2014 two"), "one two");
    assert.equal(stripDashes("one -- two"), "one two");
    assert.equal(/\s{2}/.test(stripDashes("one \u2014 two")), false);
  });

  test("the typist's double hyphen is caught too", () => {
    assert.equal(/--/.test(stripDashes("sign error -- again")), false);
  });

  test("a dash inside code is SYNTAX and is left alone", () => {
    // Rewriting this would turn a correct answer into a broken one, which is a
    // far worse failure than a dash in prose.
    const withCode = "Use `a - b` here.\n```js\nconst x = a - b; // a--b\n```";
    assert.equal(stripDashes(withCode), withCode);
  });

  test("prose around a code span is still cleaned", () => {
    const out = stripDashes("first\u2014use `a - b`\u2014then check");
    assert.equal(out.includes("`a - b`"), true, "the code span survived");
    assert.equal(/[\u2014\u2013\u2015]/.test(out), false, "prose dashes survived");
  });

  test("ordinary prose is returned untouched", () => {
    const plain = "Sign convention for torque. Four occurrences, 23 marks lost.";
    assert.equal(stripDashes(plain), plain);
  });

  test("the rule is also stated to the model, not only enforced after it", () => {
    assert.match(routeSrc, /Never use an em-dash or an en-dash in prose/);
  });

  test("the strip is applied to the response, at every depth", () => {
    assert.match(routeSrc, /stripDashesDeep\(verdict\.value\)/);
    assert.match(routeSrc, /function stripDashesDeep/);
  });

  test("the house style reaches every capability, not a chosen few", () => {
    // It is appended inside buildProfileContext, which M15-1 applies to all 86,
    // so covering the block is the same claim as covering every capability.
    assert.match(routeSrc, /HOUSE STYLE - these are not preferences/);
    const ctxFn = routeSrc.slice(
      routeSrc.indexOf("function buildProfileContext("),
      routeSrc.indexOf("THE ONE SERVER-SIDE READ"),
    );
    assert.ok(
      ctxFn.includes("HOUSE STYLE - these are not preferences"),
      "the house style must live inside buildProfileContext, which every capability receives",
    );
  });
});

describe("§7.8 B — a concept is not closed by the model", () => {
  test("the tutor is told never to declare an explanation finished", () => {
    assert.match(routeSrc, /Never end an explanation on your own judgement/);
  });

  test("the closer phrases are named, so the ban is checkable", () => {
    for (const closer of ["hope that helps", "you've got it now", "that covers"]) {
      assert.ok(routeSrc.includes(closer), `${closer} is not named in HOUSE_STYLE`);
    }
  });

  test("the model must check understanding rather than assume it", () => {
    assert.match(routeSrc, /ask the student to state it back/);
    assert.match(routeSrc, /Keep going until they\r?\n?\s*\*?\s*demonstrate it/);
  });

  test("it never implies the student should already understand", () => {
    assert.match(routeSrc, /Never imply they should\r?\n?\s*\*?\s*already understand/);
  });

  test("fabrication is banned in the same block", () => {
    // §3 of the constitution, restated where the model can act on it.
    assert.match(routeSrc, /Never fabricate a figure, a trend, a mark/);
  });

  test("the house style is not personalised away by any preference", () => {
    // It is appended AFTER the conditional aiProfile block and OUTSIDE it, so
    // no answer a student gives can remove it. Position is the guarantee here,
    // not wording, so position is what is asserted.
    const houseIdx = routeSrc.indexOf("HOUSE STYLE - these are not preferences");
    const profileIdx = routeSrc.indexOf("const aiProfile = profile.aiProfile;");
    const closeIdx = routeSrc.indexOf("END STUDENT CONTEXT");
    assert.ok(profileIdx > 0 && houseIdx > profileIdx, "the block must come after the optional one");
    assert.ok(houseIdx < closeIdx, "and before the context closes");
    assert.match(routeSrc, /these are not preferences and are never overridden/);
  });
});
