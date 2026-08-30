// ═══════════════════════════════════════════════════════════════════════════
// NO DASHES IN COPY A STUDENT READS — PRODUCT_DECISIONS §7.8 A
//
// §7.8 A was written for model output and is enforced there by stripDashes().
// The STATIC copy predates the rule and was never swept, so the live hero lede
// carried an em-dash for as long as the rule has existed. This is the check
// that closes that gap and keeps it closed.
//
// ── WHY THIS READS RENDERED TEXT, NOT SOURCE LINES ───────────────────────
// A naive scan of the source flags every code comment, and a rule that cries
// wolf on its own explanatory prose gets suppressed rather than obeyed. What
// matters is what reaches a student, so this extracts JSX text nodes and
// user-facing string literals and ignores comments entirely.
//
//   node --test tests/copy-style.test.mjs
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DASH = /[\u2014\u2013\u2015]/;

/** Every surface a student meets, in the order they meet them. */
const SURFACES = [
  "app/page.tsx",
  "app/auth/page.tsx",
  "app/onboard/page.tsx",
  "app/capture/page.tsx",
  "app/diagnosis/page.tsx",
  "app/record/page.tsx",
  "app/today/page.tsx",
  "components/walkthrough.tsx",
  "components/lights-toggle.tsx",
  "lib/onboarding-questions.ts",
];

/**
 * Strip comments, then take the text a student can actually see: JSX text
 * nodes, and the string literals that feed copy props. Deliberately not a
 * parser: a parser is a dependency, and the shapes this repo uses are narrow.
 */
function visibleText(src) {
  const noComments = src
    .replace(/\/\*[\s\S]*?\*\//g, " ")   // block comments, incl. JSX {/* */}
    .replace(/^\s*\/\/.*$/gm, " ");      // line comments

  const parts = [];
  // JSX text between tags, e.g. >Nothing is ever deleted.<
  for (const m of noComments.match(/>[^<>{}]{3,}</g) ?? []) parts.push(m.slice(1, -1));
  // Copy-bearing string literals: prompts, bodies, titles, labels, hints.
  const copyKeys = /\b(title|body|prompt|because|label|hint|detail|description|placeholder)\s*[:=]\s*(["'`])((?:[^\\]|\\.)*?)\2/g;
  let m;
  while ((m = copyKeys.exec(noComments)) !== null) parts.push(m[3]);
  return parts;
}

describe("§7.8 A — no dash reaches a student, in static copy either", () => {
  for (const rel of SURFACES) {
    test(`${rel} is clean`, () => {
      const src = fs.readFileSync(path.join(root, rel), "utf8");
      const offences = visibleText(src)
        .filter((s) => DASH.test(s))
        .map((s) => s.trim().replace(/\s+/g, " ").slice(0, 90));
      assert.deepEqual(
        offences, [],
        `dash in copy a student reads:\n    ${offences.join("\n    ")}`,
      );
    });
  }

  test("the extractor genuinely catches one, so a pass means something", () => {
    // A test that cannot fail is decoration. This proves the detector works.
    const planted = `<p>a permanent record of how you learn \u2014 so the mistake</p>`;
    assert.equal(visibleText(planted).some((s) => DASH.test(s)), true);
  });

  test("and it ignores dashes inside comments, which are not copy", () => {
    const commented = `{/* the retired line is struck \u2014 not removed */}\n<p>Clean copy.</p>`;
    assert.equal(visibleText(commented).some((s) => DASH.test(s)), false);
  });
});
