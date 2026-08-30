// ═══════════════════════════════════════════════════════════════════════════
// THE FIRST-RUN WALKTHROUGH — PRODUCT_DECISIONS §2.6 / §7.7
//
// §7.7 NARROWS the old tour ban rather than deleting it. That leaves a line
// this component has to stay on, and a line is only real if something checks
// it: it may say where things are and what to do next, and it may not sell,
// congratulate, gate, or list features.
//
// These tests are the check. Most are structural, over the source, because the
// claims are about what the component CANNOT do rather than what it renders on
// a given frame.
//
//   node --test tests/walkthrough.test.mjs
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const SRC = read("components/walkthrough.tsx");
const CAPTURE = read("app/capture/page.tsx");
const ONBOARD = read("app/onboard/page.tsx");

/** The step copy, extracted from the STEPS table rather than retyped. */
const stepText = (() => {
  const block = SRC.slice(SRC.indexOf("const STEPS"), SRC.indexOf("export default"));
  return (block.match(/"([^"\\]|\\.)*"/g) ?? []).map((s) => s.slice(1, -1)).join(" ");
})();

describe("§7.7 — it is a walkthrough, not the tour that was banned", () => {
  test("it ends, and the ending is remembered", () => {
    assert.match(SRC, /localStorage\.setItem\(SEEN_KEY, "1"\)/);
    assert.match(SRC, /localStorage\.getItem\(SEEN_KEY\) === "1"/);
  });

  test("a student can leave at any point, three ways", () => {
    assert.match(SRC, /onClick=\{end\}/);              // the Skip control
    assert.match(SRC, /e\.key === "Escape"/);          // the keyboard
    assert.match(SRC, /e\.target === e\.currentTarget/); // clicking the scrim
  });

  test("it is short: four steps, not a feature tour", () => {
    const steps = SRC.slice(SRC.indexOf("const STEPS"), SRC.indexOf("export default"));
    assert.equal((steps.match(/title:/g) ?? []).length, 4);
  });

  test("no reward, achievement or unlocking language anywhere", () => {
    // PRINCIPLES §4.3 and §6 — nothing here may read as earning something.
    // Checked against the STEP COPY and the rendered labels, not the whole
    // file: the header comment names these words in order to ban them, and a
    // scan that cannot tell a prohibition from a violation is not a check.
    const visible = stepText + " " + (SRC.match(/>[^<>{}\n]{2,}</g) ?? []).join(" ");
    for (const banned of [
      "unlock", "earn", "achievement", "badge", "congratulations", "well done",
      "level up", "reward", "streak", "points", "welcome aboard",
    ]) {
      assert.equal(
        visible.toLowerCase().includes(banned),
        false,
        `"${banned}" is gamification and §4.3 bans it`,
      );
    }
  });

  test("no marketing adjectives — it states what a surface is FOR", () => {
    for (const sell of [
      "powerful", "amazing", "seamless", "effortless", "revolutionary",
      "supercharge", "unlock your", "ai-powered", "best-in-class",
    ]) {
      assert.equal(stepText.toLowerCase().includes(sell), false, `"${sell}" is marketing copy`);
    }
  });

  test("it never claims the student has done anything", () => {
    // The product has no evidence about them yet, so any past-tense claim
    // about their work would be fabricated (PRINCIPLES §3 / law 7).
    for (const claim of ["you have made", "your progress", "you've completed", "so far you"]) {
      assert.equal(stepText.toLowerCase().includes(claim), false, `"${claim}" is a claim with no evidence`);
    }
  });

  test("no em-dash in anything a student reads (§7.8 A)", () => {
    assert.equal(/[\u2014\u2013\u2015]/.test(stepText), false);
  });

  test("the morbid metaphor family stays retired here too (§4.1)", () => {
    for (const word of ["obituary", "autopsy", "coroner", "cremator", "trauma", "forensic"]) {
      assert.equal(stepText.toLowerCase().includes(word), false, `"${word}" is banned permanently`);
    }
  });

  test("motion slides and does not fade (§6.5)", () => {
    assert.match(SRC, /transform: translateY/);
    assert.equal(/opacity:\s*0/.test(SRC), false, "nothing fades");
  });

  test("reduced motion is respected", () => {
    assert.match(SRC, /prefers-reduced-motion: reduce/);
  });

  test("it is a real dialog for assistive tech", () => {
    assert.match(SRC, /role="dialog"/);
    assert.match(SRC, /aria-modal="true"/);
    assert.match(SRC, /aria-labelledby="wt-title"/);
  });

  test("colour is not the only carrier of position", () => {
    // The dots are decorative and marked as such; the readable counter is text.
    assert.match(SRC, /aria-hidden="true"/);
    assert.match(SRC, /\{step \+ 1\} of \{STEPS\.length\}/);
  });
});

describe("it is reached from onboarding, and only on the first run", () => {
  test("onboarding hands over with the flag", () => {
    assert.match(ONBOARD, /router\.replace\("\/capture\?first=1"\)/);
  });

  test("capture reads the flag and renders the walkthrough", () => {
    assert.match(CAPTURE, /useSearchParams\(\)\?\.get\("first"\) === "1"/);
    assert.match(CAPTURE, /<Walkthrough active=\{firstRun\} \/>/);
  });

  test("the flag alone does not force it — the component decides", () => {
    // A student who has seen it and lands on the URL again is not shown it
    // twice, which is what "ends and does not return" means.
    assert.match(SRC, /if \(!active\) return;/);
    assert.match(SRC, /if \(localStorage\.getItem\(SEEN_KEY\) === "1"\) return;/);
  });

  test("with no storage it does not start at all", () => {
    // It could not record that it ended, so it would return on every visit.
    // Not starting is the honest failure.
    assert.match(SRC, /\} catch \{\r?\n\s*return; \/\/ no storage/);
  });
});
