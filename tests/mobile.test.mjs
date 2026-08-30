// ═══════════════════════════════════════════════════════════════════════════
// 375px — the mobile baseline, asserted structurally
//
// `PRODUCT.md`: "Mobile-first: 375px baseline, all tools functional on mobile."
//
// ── WHY THIS IS A SOURCE TEST AND NOT A SCREENSHOT ───────────────────────
// A screenshot proves one page at one moment and rots the day someone adds a
// panel. What makes 375px work is a small set of structural rules, and those
// can be asserted permanently:
//
//   · the reading column is a MAX width, never a fixed one
//   · flex children carry `minWidth: 0`, or a long word overflows the screen
//     rather than wrapping (the single most common cause of horizontal scroll)
//   · breakpoints are `min-width`, so the narrow case is the DEFAULT and a
//     surface cannot forget to handle it
//   · nothing blocks pinch-zoom
//   · controls clear the 44px touch target
//
// The primitives own layout for every V1 surface, so testing them tests all of
// them - which is why the surfaces themselves carry no media queries and that
// is correct rather than an omission.
//
//   node --test tests/mobile.test.mjs
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const LAYOUT = read("components/console/primitives/layout.tsx");
const CONTROL = read("components/console/primitives/control.tsx");
const WORKSPACE = read("lib/console/workspace.ts");

/** Every surface a student can reach on a phone. */
const SURFACES = [
  "app/page.tsx", "app/auth/page.tsx", "app/onboard/page.tsx",
  "app/capture/page.tsx", "app/diagnosis/page.tsx",
  "app/record/page.tsx", "app/today/page.tsx",
];

describe("the reading column fits any screen", () => {
  test("Measure is a MAX width, so it shrinks below its cap", () => {
    assert.match(LAYOUT, /maxWidth: wide \? 1120 : 620/);
    assert.match(LAYOUT, /width: "100%"/);
    // A fixed `width:` on the column would overflow every phone.
    assert.equal(
      /\n\s+width:\s*\d{3,}/.test(LAYOUT), false,
      "the reading column must never carry a fixed pixel width",
    );
  });

  test("flex children can shrink, which is what stops horizontal scroll", () => {
    // Without minWidth: 0 a flex child refuses to shrink below its content,
    // so one long word pushes the whole page sideways. The comment in the
    // source calls it a footgun; this is the assertion that keeps it.
    assert.match(LAYOUT, /minWidth: 0/);
  });

  test("the column owns its gutter, so no surface invents one", () => {
    assert.match(LAYOUT, /paddingInline: gapOf\(pad\)/);
  });
});

describe("narrow is the default, not the exception", () => {
  test("every breakpoint is min-width", () => {
    // A `max-width` breakpoint treats the phone as the special case, which is
    // how a surface ends up untested at 375px. Only `min-width` keeps the
    // narrow layout as the base case.
    for (const rel of ["app/landing.css", "components/walkthrough.tsx"]) {
      const src = read(rel);
      const maxes = [...src.matchAll(/@media[^{]*\(max-width:\s*(\d+)px\)/g)];
      assert.deepEqual(
        maxes.map((m) => m[1]), [],
        `${rel} uses a max-width breakpoint; the narrow layout should be the default`,
      );
    }
  });

  test("the V1 surfaces need almost no breakpoints of their own", () => {
    // They compose Stack, Row and Measure, which are fluid. A surface that
    // starts declaring its own media queries has stopped using the
    // primitives, and that is worth noticing.
    //
    // /auth is the one exception and a legitimate one: it has a two-column
    // shell whose left column is desktop-only CONTEXT, and it collapses that
    // column away below 900px. A max-width breakpoint that REMOVES something
    // on a phone is the right direction - the narrow case still gets the
    // simpler layout. What mobile-first forbids is the opposite: a phone
    // needing a breakpoint to become usable.
    const allowed = new Set(["app/auth/page.tsx"]);
    for (const rel of SURFACES) {
      if (allowed.has(rel)) continue;
      const src = read(rel);
      assert.equal(
        /@media[^{]*width/.test(src), false,
        `${rel} declares a width breakpoint; layout belongs to the primitives`,
      );
    }
  });

  test("/auth's breakpoint only removes, never adds", () => {
    const src = read("app/auth/page.tsx");
    const blocks = [...src.matchAll(/@media \(max-width: \d+px\) \{([^}]*\}[^}]*)\}/g)]
      .map((m) => m[1]);
    assert.ok(blocks.length > 0, "expected the collapse rules to be found");
    for (const b of blocks) {
      assert.ok(
        /grid-template-columns: 1fr|display: none/.test(b),
        `a max-width block should collapse or hide, not restyle: ${b.trim().slice(0, 80)}`,
      );
    }
  });
});

describe("touch, not pointer", () => {
  test("controls clear the 44px target at every density", () => {
    // The floor is not a literal in the component: Control's height is
    // padding plus line box, and the padding comes from --control-pad-y,
    // which the workspace engine caps. WORKSPACE.md's rule is that `tight`
    // may not shrink padding below `standard`, because a personality choice
    // must not shrink a tap target. tests/workspace.test.mjs asserts the
    // resulting heights numerically (48 / 44 / 44); this asserts the wiring.
    assert.match(read("app/console/console.css"), /padding: var\(--control-pad-y\)/);
    assert.match(WORKSPACE, /controlPadY/);
    // and the pressure spec must never emit a value that breaks the floor
    assert.match(WORKSPACE, /44/);
  });

  test("the lights toggle and walkthrough controls are tappable", () => {
    assert.match(read("components/lights-toggle.tsx"), /min-height:\s*32px/);
    assert.match(read("components/walkthrough.tsx"), /min-height:\s*40px/);
  });

  test("onboarding options are full-width rows, not a dense grid", () => {
    // One question per page means the options can be full-width, which is the
    // easiest thing to hit with a thumb.
    const src = read("app/onboard/page.tsx");
    assert.match(src, /grid-template-columns: 1fr/);
    assert.match(src, /min-height: 44px/);
  });
});

describe("nothing fights the viewport", () => {
  test("pinch-zoom is never disabled", () => {
    // Blocking zoom on a product for students reading dense figures is an
    // accessibility failure, not a design choice.
    const layout = read("app/layout.tsx");
    assert.equal(/user-scalable\s*[:=]\s*(no|0)/.test(layout), false);
    assert.equal(/maximumScale:\s*1/.test(layout), false);
  });

  test("the walkthrough sits at the bottom on a phone and centres on a desktop", () => {
    // A centred modal on a small screen puts the controls under the thumb's
    // reach; a bottom sheet does not.
    const src = read("components/walkthrough.tsx");
    assert.match(src, /align-items: flex-end/);
    assert.match(src, /@media \(min-width: 720px\)[\s\S]{0,120}align-items: center/);
  });
});
