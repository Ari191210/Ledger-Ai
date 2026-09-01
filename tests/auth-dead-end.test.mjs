// ═══════════════════════════════════════════════════════════════════════════
// Every guarded surface sends a signed-out student to sign-in
//
// ── WHAT THIS PREVENTS ───────────────────────────────────────────────────
// /today used to render "Sign in to see today." as a bare sentence with no
// control. A student who arrived without a session was told what was wrong
// and given nothing to click. It looked exactly like being dumped on the
// wrong page, which is how it was reported.
//
// The cause was that /today had no layout, so it never mounted AuthGuard and
// had grown its own half-answer instead. Adding the layout fixed the
// redirect; this test is what stops the half-answer coming back, on any
// surface.
//
// The rule: a guarded route decides the signed-out case in ONE place, its
// AuthGuard. A page that also renders its own "please sign in" text is
// either dead code or a second, worse answer.
//
//   node --test tests/auth-dead-end.test.mjs
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

/** Surfaces that require a session. Each must have a layout that guards it. */
const GUARDED = ["today", "record", "diagnosis", "settings", "console"];

/**
 * Comments describe the rule; only code can break it.
 *
 * This tracks multi-line blocks rather than filtering line-by-line: the
 * comment explaining the old dead end QUOTES the phrase being banned, and a
 * naive filter that only drops lines starting with `//` or `*` would read
 * that quotation as the defect returning.
 */
const code = (src) => {
  const out = [];
  let inBlock = false;
  for (const line of src.split(/\r?\n/)) {
    const t = line.trim();
    if (inBlock) {
      if (t.includes("*/")) inBlock = false;
      continue;
    }
    if (t.startsWith("{/*") || t.startsWith("/*")) {
      if (!t.includes("*/")) inBlock = true;
      continue;
    }
    if (t.startsWith("//")) continue;
    out.push(line);
  }
  return out.join("\n");
};

describe("a signed-out student is never left without a way forward", () => {
  for (const route of GUARDED) {
    test(`/${route} mounts AuthGuard in its layout`, () => {
      const layout = `app/${route}/layout.tsx`;
      assert.ok(fs.existsSync(path.join(root, layout)),
        `/${route} has no layout.tsx, so nothing guards it and its tokens will not resolve`);
      assert.match(read(layout), /AuthGuard/,
        `/${route}'s layout does not mount AuthGuard`);
    });

    test(`/${route} does not also answer the signed-out case itself`, () => {
      const page = `app/${route}/page.tsx`;
      if (!fs.existsSync(path.join(root, page))) return;
      const src = code(read(page));

      // The specific shape that produced the dead end: text shown when there
      // is no user, rather than a redirect.
      assert.equal(
        /Sign in to see|Please sign in|You must be signed in/i.test(src), false,
        `${page} renders its own signed-out message. AuthGuard already redirects, `
        + "so this is unreachable at best and a dead end at worst.",
      );
    });
  }

  test("AuthGuard redirects rather than rendering an explanation", () => {
    const g = code(read("components/auth-guard.tsx"));
    assert.match(g, /router\.replace\("\/auth"\)/,
      "the guard must send the student somewhere they can act");
    // And it must render nothing while denied, so no page content flashes.
    assert.match(g, /decision === "denied"\) return null/);
  });
});
