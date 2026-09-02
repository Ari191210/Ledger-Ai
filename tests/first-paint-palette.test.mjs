// ═══════════════════════════════════════════════════════════════════════════
// A student with no stored preference gets SWAN, in light
//
// ── WHY THIS TEST EXISTS ─────────────────────────────────────────────────
// Every swan test passed, `next build` was clean, the material was committed
// and pushed — and production still served a near-black page. A real 375px
// render is what caught it: `<html data-base="obsidian">`.
//
// The cause was that swan lives in the CONSOLE workspace engine
// (lib/console/workspace.ts), but the page's ground colour is set before
// hydration by an inline script in app/layout.tsx that predates Console and
// carries its own palette table. That table had no `swan` in it and defaulted
// to `obsidian`, so it overrode the design on every route.
//
// Two systems disagreeing about the default is not something a unit test on
// either one can see. This asserts the thing that actually reaches a
// student's screen: the FIRST PAINT.
//
//   node --test tests/first-paint-palette.test.mjs
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAYOUT = fs.readFileSync(path.join(root, "app", "layout.tsx"), "utf8");
const WORKSPACE = fs.readFileSync(path.join(root, "lib", "console", "workspace.ts"), "utf8");
const PALETTE = fs.readFileSync(path.join(root, "lib", "palette.ts"), "utf8");

/** The swan ramp, read from the engine so the two cannot drift apart. */
const swanRamp = (() => {
  const m = /swan:\s*\{\s*ramp:\s*\[([^\]]+)\]/.exec(WORKSPACE);
  assert.ok(m, "swan must exist in lib/console/workspace.ts");
  return m[1].split(",").map((s) => s.trim().replace(/["']/g, ""));
})();

describe("the pre-hydration script agrees with the design", () => {
  test("a student with no stored preference gets swan, not obsidian", () => {
    assert.match(LAYOUT, /localStorage\.getItem\('theme-base'\)\|\|'swan'/,
      "the first-paint default must be swan; obsidian is a near-black page",
    );
  });

  test("an unrecognised stored value falls back to swan", () => {
    // Someone who picked a material that was later removed must not be
    // dropped into the dark theme.
    assert.match(LAYOUT, /var bd=B\[b\]\|\|B\.swan;/);
  });

  test("swan and swan-night are both in the script's own table", () => {
    // The script cannot select a material it does not know about; a default
    // pointing at a missing key silently falls through to the fallback.
    assert.match(LAYOUT, /"swan":\{/);
    assert.match(LAYOUT, /"swan-night":\{/);
  });

  test("the script's swan matches the engine's swan exactly", () => {
    // Two hardcoded copies of a colour will drift. This is the assertion that
    // makes the duplication safe: the values must agree, token for token.
    const m = /"swan":\{"p":"([^"]+)","p2":"([^"]+)","i":"([^"]+)","i2":"([^"]+)","i3":"([^"]+)","L":1\}/.exec(LAYOUT);
    assert.ok(m, "swan must be in the layout table with a light flag");
    const [, p, p2, ink, ink2, ink3] = m;
    assert.equal(p, swanRamp[0], "page ground must equal the engine's --g-0");
    assert.equal(p2, swanRamp[1], "recessed must equal the engine's --g-1");
    assert.equal(ink, swanRamp[7], "ink must equal the engine's --g-7");
    assert.equal(ink2, swanRamp[6], "secondary ink must equal the engine's --g-6");
    assert.equal(ink3, swanRamp[5], "tertiary ink must equal the engine's --g-5");
  });

  test("swan is marked LIGHT, so the light branch runs on first paint", () => {
    // `L:1` is what sets data-mode="light". Without it the ground is swan but
    // the mode flag says dark, and anything keyed on the flag disagrees with
    // the page under it.
    assert.match(LAYOUT, /"swan":\{[^}]*"L":1\}/);
    // swan-night is the dark counterpart and must NOT carry it.
    assert.equal(/"swan-night":\{[^}]*"L":1\}/.test(LAYOUT), false);
  });

  test("obsidian survives as a choice, it is simply no longer the default", () => {
    // Removing it would silently re-theme anyone who deliberately chose it.
    assert.match(LAYOUT, /"obsidian":\{/);
  });
});

describe("Settings > Appearance offers the palette the student is actually in", () => {
  // THE THIRD COPY. lib/palette.ts predates the Console engine and is what
  // Settings renders a card per entry from. It listed fifteen bases, none of
  // them swan, and defaulted to obsidian.
  //
  // That is not a cosmetic mismatch. Settings writes the chosen id to
  // localStorage['theme-base'], the SAME key app/layout.tsx's pre-paint script
  // reads. So the palette a student was looking at did not appear in the list
  // of palettes offered, and getActiveBase() coerces any unrecognised value to
  // DEFAULT_BASE: opening Settings and touching nothing could throw a swan
  // user into a near-black theme they never chose.

  test("swan and swan-night are both offered as choices", () => {
    const m = /export const BASE_IDS = \[([\s\S]*?)\] as const/.exec(PALETTE);
    assert.ok(m, "BASE_IDS must exist in lib/palette.ts");
    const ids = m[1].split(",").map((x) => x.trim().replace(/["']/g, "")).filter(Boolean);
    assert.ok(ids.includes("swan"), "a student cannot choose a palette that is not listed");
    assert.ok(ids.includes("swan-night"), "the dark toggle's material must be selectable too");
  });

  test("the legacy module's default is swan, matching the engine and the script", () => {
    // Three copies, one answer. Two of them said swan and this one said
    // obsidian, which is how a swan user got re-themed by opening Settings.
    assert.match(PALETTE, /export const DEFAULT_BASE: BaseId = "swan"/);
  });

  test("the legacy module's swan matches the engine's swan exactly", () => {
    const m = /swan:\s*\{[^}]*paper: "([^"]+)", paper2: "([^"]+)", ink: "([^"]+)", ink2: "([^"]+)", ink3: "([^"]+)"/.exec(PALETTE);
    assert.ok(m, "swan must be in BASE_META with the full ramp");
    const [, pg, p2, ink, ink2, ink3] = m;
    assert.equal(pg, swanRamp[0], "page ground must equal the engine's --g-0");
    assert.equal(p2, swanRamp[1], "recessed must equal the engine's --g-1");
    assert.equal(ink, swanRamp[7], "ink must equal the engine's --g-7");
    assert.equal(ink2, swanRamp[6], "secondary ink must equal the engine's --g-6");
    assert.equal(ink3, swanRamp[5], "tertiary ink must equal the engine's --g-5");
  });

  test("swan is flagged light and swan-night is not", () => {
    // isLight drives data-mode. Without it the ground is swan but the mode
    // flag says dark, and anything keyed on the flag disagrees with the page.
    assert.match(PALETTE, /swan:\s*\{[^}]*isLight: true/);
    assert.equal(/"swan-night":\s*\{[^}]*isLight: true/.test(PALETTE), false);
  });
});
