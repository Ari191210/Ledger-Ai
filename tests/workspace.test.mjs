// The Workspace Engine — WORKSPACE.md §6: "contrast assertions covering all
// 108 combinations in CI. Machine-verified legibility replaces visual review."
//
// This file IS that mechanism. 108 configurations cannot be reviewed by eye,
// and StudyLedger's support is one person, so correctness has to be proven
// rather than seen. Every assertion below is a claim the founder would
// otherwise have to check by opening 108 screenshots.
//
//   node --test tests/
//   node tests/workspace.test.mjs
//
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// A dedicated outDir: `node --test tests/` runs suites in parallel processes,
// and two suites compiling into one directory corrupt each other's output.
const outDir = path.join(root, ".test-build-workspace");

let ws;     // compiled lib/console/workspace
let colour; // compiled lib/console/color

// Synchronous, and the dynamic imports happen in the `setup imports` test
// below rather than here — the same shape as score-projection.test.mjs. An
// async `before` that awaits imports is flaky when `node --test tests/*.mjs`
// runs suites concurrently: the hook can outlive its parent and the whole
// suite is cancelled. Compile in the hook, import in a test.
before(() => {
  execFileSync(
    process.execPath,
    [path.join(root, "node_modules", "typescript", "bin", "tsc"), "-p", "tests/tsconfig.workspace.json"],
    { cwd: root },
  );
  // tsc emits extensionless relative specifiers (`from "./color"`), which the
  // Node ESM resolver rejects. Same class of fixup as the alias rewrite in
  // score-projection.test.mjs, applied to the console subtree.
  const dir = path.join(outDir, "console");
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
    const p = path.join(dir, f);
    fs.writeFileSync(
      p,
      fs.readFileSync(p, "utf8").replace(/(from\s+")(\.\/[\w-]+)(")/g, "$1$2.js$3"),
    );
  }
});

const load = (n) =>
  import(pathToFileURL(path.join(outDir, "console", n)).href);

test("setup imports", async () => {
  ws = await load("workspace.js");
  colour = await load("color.js");
});

/** Every DNA the engine can express. */
function everyDNA() {
  const all = [];
  for (const material of ws.MATERIALS)
    for (const voice of ws.VOICES)
      for (const pressure of ws.PRESSURES)
        for (const temperament of ws.TEMPERAMENTS)
          all.push({ material, voice, pressure, temperament });
  return all;
}

const px = (v) => Number(String(v).replace("px", ""));

// ── the contrast engine itself ─────────────────────────────────────────────

describe("colour — the contrast engine", () => {
  test("WCAG ratios match the published reference values", () => {
    assert.equal(colour.contrast("#000000", "#ffffff").toFixed(2), "21.00");
    assert.equal(colour.contrast("#ffffff", "#ffffff").toFixed(2), "1.00");
    // The two figures documented in console.css, measured not estimated.
    assert.equal(colour.contrast("#0f1d2b", "#f6f7f8").toFixed(2), "15.91");
    assert.equal(colour.contrast("#5a6875", "#f6f7f8").toFixed(2), "5.33");
  });

  test("contrast is symmetric", () => {
    assert.equal(colour.contrast("#2f6b4f", "#f6f7f8"), colour.contrast("#f6f7f8", "#2f6b4f"));
  });

  test("hex→hsl→hex round-trips within a rounding step", () => {
    for (const hex of ["#2f6b4f", "#0f1d2b", "#a33a2e", "#f6f7f8", "#000000", "#ffffff"]) {
      const { h, s, l } = colour.hexToHsl(hex);
      assert.equal(colour.hslToHex(h, s, l), hex, `round-trip ${hex}`);
    }
  });

  test("ensureContrast returns the original when it already passes", () => {
    assert.equal(colour.ensureContrast("#0f1d2b", "#f6f7f8", 4.5), "#0f1d2b");
  });

  test("ensureContrast darkens on light surfaces and lightens on dark ones", () => {
    const onLight = colour.ensureContrast("#cccccc", "#ffffff", 4.5);
    assert.ok(colour.contrast(onLight, "#ffffff") >= 4.5);
    assert.ok(colour.luminance(onLight) < colour.luminance("#cccccc"));

    const onDark = colour.ensureContrast("#222222", "#000000", 4.5);
    assert.ok(colour.contrast(onDark, "#000000") >= 4.5);
    assert.ok(colour.luminance(onDark) > colour.luminance("#222222"));
  });

  test("ensureContrast preserves hue — character survives the correction", () => {
    const before = colour.hexToHsl("#7fbfa0");
    const after = colour.hexToHsl(colour.ensureContrast("#7fbfa0", "#ffffff", 4.5));
    assert.ok(Math.abs(before.h - after.h) < 2, "hue drifted");
  });

  test("ensureContrast always terminates, for any hue against any surface", () => {
    for (let h = 0; h < 360; h += 15)
      for (const bg of ["#ffffff", "#000000", "#808080"]) {
        const fixed = colour.ensureContrast(colour.hslToHex(h, 1, 0.5), bg, 4.5);
        assert.ok(colour.contrast(fixed, bg) >= 4.5, `h=${h} on ${bg}`);
      }
  });
});

// ── the engine's shape ─────────────────────────────────────────────────────

describe("workspace — structure and caps", () => {
  test("108 combinations, exactly as the document claims", () => {
    assert.equal(ws.COMBINATION_COUNT, 108);
    assert.equal(everyDNA().length, 108);
  });

  test("trait count never exceeds five (governance)", () => {
    assert.ok(Object.keys(ws.DEFAULT_DNA).length <= 5);
  });

  test("preset count never exceeds seven (governance)", () => {
    assert.ok(Object.keys(ws.PRESETS).length <= ws.PRESET_CAP);
  });

  test("every preset is itself a valid DNA", () => {
    for (const [name, dna] of Object.entries(ws.PRESETS))
      assert.deepEqual(ws.parseDNA(dna), dna, `preset ${name}`);
  });

  test("derive is pure — same DNA in, identical tokens out", () => {
    for (const dna of everyDNA())
      assert.deepEqual(ws.derive(dna), ws.derive({ ...dna }));
  });
});

// ── §9 migration: day one must be byte-identical ───────────────────────────

describe("STUDIO — the shipped product, unchanged", () => {
  // console.css and derive() are two declarations of the same values: the CSS
  // is what a student sees before JavaScript runs, the engine is what they see
  // after. Asserting against hardcoded literals here would only prove the test
  // agrees with itself, so this parses the ACTUAL stylesheet — the one the
  // browser loads — and compares it to the engine field by field. Editing
  // either one alone fails CI, which is the only reason two sources of truth
  // are tolerable at all.
  const declared = () => {
    // Comments first: this stylesheet documents its own contrast ratios in
    // prose containing both `--` and `:`, which a naive declaration regex
    // happily parses as a token.
    const css = fs
      .readFileSync(path.join(root, "app", "console", "console.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    const block = css.slice(css.indexOf("[data-console] {"), css.indexOf("\n}"));
    const out = {};
    for (const [, name, value] of block.matchAll(/--([\w-]+):\s*([^;]+);/g))
      out[`--${name}`] = value.replace(/\s+/g, " ").trim();
    return out;
  };

  test("every token the engine emits is declared identically in console.css", () => {
    const engine = ws.derive(ws.PRESETS.STUDIO).tokens;
    const css = declared();
    for (const [token, value] of Object.entries(engine)) {
      assert.ok(token in css, `${token} is emitted by derive() but absent from console.css`);
      assert.equal(css[token], value, `${token} drifted between console.css and derive()`);
    }
  });

  test("the fallback stylesheet is complete — no token is engine-only", () => {
    // A token present only in the engine renders as `unset` before hydration,
    // which is a flash of unstyled interface rather than a flash of STUDIO.
    const missing = Object.keys(ws.derive(ws.PRESETS.STUDIO).tokens)
      .filter((t) => !(t in declared()));
    assert.deepEqual(missing, []);
  });

  test("STUDIO is the default — an unconfigured student sees today's product", () => {
    assert.deepEqual(ws.DEFAULT_DNA, ws.PRESETS.STUDIO);
    assert.deepEqual(ws.parseDNA(null), ws.PRESETS.STUDIO);
  });
});

// ── the load-bearing claim: all 108 are legible ────────────────────────────

describe("all 108 workspaces are provably legible", () => {
  test("ink clears AA as text on the page", () => {
    for (const dna of everyDNA()) {
      const x = ws.derive(dna).tokens;
      const r = colour.contrast(x["--g-7"], x["--g-0"]);
      assert.ok(r >= colour.AA_TEXT, `${JSON.stringify(dna)} ink ${r.toFixed(2)}`);
    }
  });

  test("secondary text clears AA on the page", () => {
    for (const dna of everyDNA()) {
      const x = ws.derive(dna).tokens;
      const r = colour.contrast(x["--g-6"], x["--g-0"]);
      assert.ok(r >= colour.AA_TEXT, `${JSON.stringify(dna)} secondary ${r.toFixed(2)}`);
    }
  });

  test("every semantic hue clears AA as text on the page", () => {
    for (const dna of everyDNA()) {
      const x = ws.derive(dna).tokens;
      for (const token of ["--progress-full", "--info", "--warn", "--error"]) {
        const r = colour.contrast(x[token], x["--g-0"]);
        assert.ok(r >= colour.AA_TEXT, `${JSON.stringify(dna)} ${token} ${r.toFixed(2)}`);
      }
    }
  });

  test("the progress fill clears 3.0 as a graphic on the recessed bed", () => {
    // The Track is the one place a semantic hue is painted rather than set as
    // text, and it sits on --g-1, not on the page.
    for (const dna of everyDNA()) {
      const x = ws.derive(dna).tokens;
      const r = colour.contrast(x["--progress-graphic"], x["--g-1"]);
      assert.ok(r >= colour.AA_GRAPHIC, `${JSON.stringify(dna)} track ${r.toFixed(2)}`);
    }
  });

  test("the filled primary control clears AA — ink fill, raised-tone text", () => {
    for (const dna of everyDNA()) {
      const x = ws.derive(dna).tokens;
      const r = colour.contrast(x["--g-3"], x["--g-7"]);
      assert.ok(r >= colour.AA_TEXT, `${JSON.stringify(dna)} primary ${r.toFixed(2)}`);
    }
  });

  test("the focus ring is visible against the page in every workspace", () => {
    for (const dna of everyDNA()) {
      const x = ws.derive(dna).tokens;
      const r = colour.contrast(x["--info"], x["--g-0"]);
      assert.ok(r >= colour.AA_GRAPHIC, `${JSON.stringify(dna)} focus ${r.toFixed(2)}`);
    }
  });

  test("depth stays tonal — raised lighter than page, recessed darker", () => {
    for (const dna of everyDNA()) {
      const x = ws.derive(dna).tokens;
      const page = colour.luminance(x["--g-0"]);
      assert.ok(colour.luminance(x["--g-3"]) >= page, `${dna.material} raised`);
      assert.ok(colour.luminance(x["--g-1"]) <= page, `${dna.material} recessed`);
    }
  });

  test("hairlines are visible without shouting (1.2–3.0 against the page)", () => {
    for (const dna of everyDNA()) {
      const x = ws.derive(dna).tokens;
      const r = colour.contrast(x["--g-4"], x["--g-0"]);
      assert.ok(r >= 1.2, `${dna.material} hairline invisible at ${r.toFixed(2)}`);
    }
  });

  test("disabled is quieter than secondary — it must not compete for attention", () => {
    for (const dna of everyDNA()) {
      const x = ws.derive(dna).tokens;
      const page = x["--g-0"];
      assert.ok(
        colour.contrast(x["--g-5"], page) < colour.contrast(x["--g-6"], page),
        `${dna.material} disabled is louder than secondary`,
      );
    }
  });
});

// ── foundation floors Identity may never breach ────────────────────────────

describe("Behaviour wins over Identity", () => {
  test("every spacing stop stays on the 4px foundation grid", () => {
    for (const dna of everyDNA()) {
      const x = ws.derive(dna).tokens;
      for (let i = 1; i <= 6; i++)
        assert.equal(px(x[`--s-${i}`]) % 4, 0, `${dna.pressure} --s-${i}`);
    }
  });

  test("spacing is strictly ascending — six distinct steps, never a collapse", () => {
    for (const dna of everyDNA()) {
      const x = ws.derive(dna).tokens;
      for (let i = 2; i <= 6; i++)
        assert.ok(px(x[`--s-${i}`]) > px(x[`--s-${i - 1}`]), `${dna.pressure} --s-${i}`);
    }
  });

  test("controls clear the 44px touch floor at every pressure", () => {
    // 15px body at line-height 1.2 (flex layout), plus both borders.
    const CONTENT = Math.ceil(15 * 1.2) + 2;
    for (const dna of everyDNA()) {
      const x = ws.derive(dna).tokens;
      const height = px(x["--control-pad-y"]) * 2 + CONTENT;
      assert.ok(height >= 44, `${dna.pressure} control is ${height}px`);
    }
  });

  test("motion durations stay perceptible and ordered at every pressure", () => {
    for (const dna of everyDNA()) {
      const x = ws.derive(dna).tokens;
      const [f, b, s] = ["--m-fast", "--m-base", "--m-slow"].map((k) => parseInt(x[k], 10));
      assert.ok(f >= 80 && f < b && b < s && s <= 1200, `${dna.pressure} ${f}/${b}/${s}`);
    }
  });

  test("TEMPERAMENT caps vitality but never suppresses it entirely", () => {
    for (const dna of everyDNA()) {
      const { vitalityCeiling } = ws.derive(dna);
      assert.ok(vitalityCeiling > 0.18 && vitalityCeiling <= 1, `${dna.temperament}`);
    }
  });

  test("`reserved` is quieter than `expressive`, and `standard` sits between", () => {
    const at = (temperament) =>
      ws.derive({ ...ws.PRESETS.STUDIO, temperament }).vitalityCeiling;
    assert.ok(at("reserved") < at("standard"));
    assert.ok(at("standard") <= at("expressive"));
  });
});

// ── untrusted input ────────────────────────────────────────────────────────

describe("parseDNA — a system boundary", () => {
  test("unknown values degrade one trait, never the whole workspace", () => {
    assert.deepEqual(
      ws.parseDNA({ material: "deep", voice: "comic-sans", pressure: "tight", temperament: null }),
      { material: "deep", voice: "plex", pressure: "tight", temperament: "standard" },
    );
  });

  test("hostile shapes never throw", () => {
    for (const raw of [null, undefined, 0, "", [], "deep", { __proto__: { material: "deep" } }])
      assert.deepEqual(ws.parseDNA(raw), ws.DEFAULT_DNA, `raw=${JSON.stringify(raw)}`);
  });

  test("output of parseDNA is always derivable", () => {
    assert.doesNotThrow(() => ws.derive(ws.parseDNA({ material: "nonsense" })));
  });
});
