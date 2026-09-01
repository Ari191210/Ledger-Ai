// ═══════════════════════════════════════════════════════════════════════════
// THE LIGHTS — swan / swan-night, as one material swap
//
// The dark half of the interface is a MATERIAL, not a dark mode: no `.dark`
// class, no second stylesheet, no duplicated palette. That claim is only worth
// making if something checks the properties it implies, which is what this
// file does.
//
// The behavioural half runs the real `derive()` out of the shipped engine.
// The structural half reads the component, for the claims that are about what
// it must never do.
//
//   node --test tests/lights.test.mjs
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const SRC = read("components/lights-toggle.tsx");

let ws;
before(() => {
  const out = path.join(root, ".test-build-lights");
  fs.rmSync(out, { recursive: true, force: true });
  execSync(
    "npx tsc lib/console/workspace.ts lib/console/color.ts --outDir .test-build-lights " +
    "--module esnext --target es2022 --moduleResolution bundler --skipLibCheck",
    { cwd: root },
  );
  const wp = path.join(out, "workspace.js");
  fs.writeFileSync(wp, fs.readFileSync(wp, "utf8").replace('"./color"', '"./color.js"'));
  return import(`file:///${wp.replace(/\\/g, "/")}?v=${Date.now()}`).then((m) => { ws = m; });
});

describe("the two materials are the same product, unlit", () => {
  test("light is the shipped default, and it is swan", () => {
    // Founder ruling 2026-08-30: "we will always go for light mode".
    assert.equal(ws.DEFAULT_DNA.material, "swan");
    assert.equal(ws.LIGHT_MATERIAL, "swan");
    assert.equal(ws.DARK_MATERIAL, "swan-night");
    assert.equal(ws.derive(ws.DEFAULT_DNA).scheme, "light");
  });

  test("switching the lights changes tone and nothing else", () => {
    const light = ws.derive(ws.DEFAULT_DNA).tokens;
    const dark = ws.derive({ ...ws.DEFAULT_DNA, material: ws.DARK_MATERIAL }).tokens;

    // Geometry, spacing and motion are material-independent. A dark mode that
    // resizes or re-times the interface is the usual failure, and this is the
    // assertion that forbids it.
    for (const token of ["--r-control", "--r-panel", "--s-1", "--s-4", "--s-6",
      "--control-pad-y", "--m-fast", "--m-base", "--m-slow"]) {
      assert.equal(dark[token], light[token], `${token} changed with the lights`);
    }
    // and the ground genuinely moved
    assert.notEqual(dark["--g-0"], light["--g-0"]);
  });

  test("depth still reads the same direction in the dark", () => {
    // Raised is lighter than the page in BOTH materials. Inverting that in
    // dark mode is what makes most dark themes feel like a different product.
    for (const material of [ws.LIGHT_MATERIAL, ws.DARK_MATERIAL]) {
      const t = ws.derive({ ...ws.DEFAULT_DNA, material }).tokens;
      assert.ok(t["--g-3"] > t["--g-0"], `${material}: raised must be lighter than page`);
      assert.ok(t["--g-1"] < t["--g-2"], `${material}: recessed must be darker than surface`);
    }
  });

  test("the round trip is lossless", () => {
    const before = ws.derive(ws.DEFAULT_DNA).tokens;
    const after = ws.derive({
      ...{ ...ws.DEFAULT_DNA, material: ws.DARK_MATERIAL },
      material: ws.LIGHT_MATERIAL,
    }).tokens;
    assert.deepEqual(after, before, "going dark and back must return the same tokens");
  });

  test("both materials clear AA for text", () => {
    const ratio = (a, b) => {
      const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      const lum = (h) => {
        const x = h.replace("#", "");
        const [r, g, bl] = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)).map(lin);
        return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      };
      const [hi, lo] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (hi + 0.05) / (lo + 0.05);
    };
    for (const material of [ws.LIGHT_MATERIAL, ws.DARK_MATERIAL]) {
      const t = ws.derive({ ...ws.DEFAULT_DNA, material }).tokens;
      assert.ok(ratio(t["--g-7"], t["--g-0"]) >= 4.5, `${material}: ink fails AA`);
      assert.ok(ratio(t["--g-6"], t["--g-0"]) >= 4.5, `${material}: secondary fails AA`);
      assert.ok(ratio(t["--accent"], t["--g-0"]) >= 4.5, `${material}: accent fails AA`);
    }
  });
});

describe("the control itself", () => {
  test("it writes ONE field and preserves the rest of the DNA", () => {
    // Writing a whole DNA object here would silently reset a student's voice,
    // pressure and temperament to defaults - a real bug, cheaply prevented.
    assert.match(SRC, /const dna = readStoredDNA\(\);/);
    assert.match(SRC, /writeStoredDNA\(\{ \.\.\.dna, material: next \? DARK_MATERIAL : LIGHT_MATERIAL \}\)/);
  });

  test("it follows a change made on another surface", () => {
    assert.match(SRC, /WORKSPACE_CHANGE_EVENT/);
    assert.match(SRC, /removeEventListener\(WORKSPACE_CHANGE_EVENT/);
  });

  test("it never consults prefers-color-scheme", () => {
    // The operating system knows what time it is, not what this student wants.
    assert.equal(/prefers-color-scheme/.test(SRC), false);
  });

  test("it declares the state it is IN, not the one it goes to", () => {
    // "Dark" on a light screen is ambiguous; aria-pressed carries the same
    // fact, so there is exactly one interpretation.
    assert.match(SRC, /aria-pressed=\{dark\}/);
    assert.match(SRC, /\{dark \? "Dark" : "Light"\}/);
  });

  test("it does not render a guess before it has read the real state", () => {
    assert.match(SRC, /visibility: "hidden"/);
    assert.match(SRC, /setReady\(true\)/);
  });

  test("the state mark is never the sole carrier of meaning", () => {
    assert.match(SRC, /aria-hidden="true"/);
    assert.match(SRC, /aria-label=\{dark \?/);
  });

  test("it defines no colour of its own", () => {
    // Everything reads through the token layer, so the control is correct in
    // both materials by construction rather than by being styled twice.
    assert.equal(/#[0-9a-fA-F]{3,6}/.test(SRC), false, "a hardcoded colour would break in one material");
  });
});

describe("it is reachable from every surface a student uses", () => {
  for (const rel of ["app/diagnosis/page.tsx",
    "app/record/page.tsx", "app/today/page.tsx"]) {
    test(`${rel} carries it in the masthead`, () => {
      const src = read(rel);
      assert.match(src, /import LightsToggle from "@\/components\/lights-toggle"/);
      // In the masthead row, after the wordmark's Spacer - not buried in a
      // settings page a student would have to go looking for.
      const mark = src.indexOf("StudyLedger");
      const toggle = src.indexOf("<LightsToggle />");
      assert.ok(toggle > mark && toggle - mark < 400, "must sit in the masthead row");
    });
  }
});
