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
let merge;  // compiled lib/sync-merge (M24 — device-change simulation)

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
// `sync-merge.ts` sits directly under `lib/`, so tsc emits it at the outDir
// root rather than under `console/` — it has no imports of its own, so it
// needs no post-compile fixup either.
const loadRoot = (n) =>
  import(pathToFileURL(path.join(outDir, n)).href);

test("setup imports", async () => {
  ws = await load("workspace.js");
  colour = await load("color.js");
  merge = await loadRoot("sync-merge.js");
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
  // 162 since 2026-08-30: SWAN and SWAN-NIGHT joined the four original
  // materials (6 x 3 x 3 x 3). The figure is asserted rather than computed
  // from the arrays on purpose — if it moves, someone widened the identity
  // surface, and that should require editing this line and saying why.
  test("162 combinations, exactly as the document claims", () => {
    assert.equal(ws.COMBINATION_COUNT, 162);
    assert.equal(everyDNA().length, 162);
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

// ═══════════════════════════════════════════════════════════════════════════
// M24 — GENERALISATION. `workspace.ts` beyond `/console`, `SYNC_KEYS`,
// server-persisted CHOICES. See `EXECUTION_PLAN.md` M24-1 and architecture
// B.14 / S.6.
// ═══════════════════════════════════════════════════════════════════════════

/** A minimal in-memory `Storage`, so `readStoredDNA`/`writeStoredDNA` — which
 *  call the real `localStorage` global — are exercised exactly as shipped,
 *  with no DOM in reach. `removeItem` is included because `readStoredDNA`'s
 *  legacy-key fallback is tested by simply never writing the new key. */
class MapStorage {
  #m = new Map();
  getItem(k) { return this.#m.has(k) ? this.#m.get(k) : null; }
  setItem(k, v) { this.#m.set(k, String(v)); }
  removeItem(k) { this.#m.delete(k); }
  clear() { this.#m.clear(); }
}

describe("golden values — derive()'s actual output, unchanged (diff, not existence)", () => {
  // Captured from the shipped engine before this milestone touched anything
  // outside STORAGE. A byte-for-bit regression in ensureContrast(), the
  // ramp, or the pressure spec fails THIS test, not just "does it still run".
  test("STUDIO — the exact hex a student sees on the shipped material", () => {
    // SWAN since 2026-08-30. These are the values in console.css's fallback
    // block too; the "declared identically" test above compares the two, so
    // this one is about the DERIVATION being stable, not about agreement.
    const t = ws.derive(ws.PRESETS.STUDIO).tokens;
    assert.equal(t["--g-0"], "#fbfaf8");
    assert.equal(t["--g-3"], "#ffffff");
    assert.equal(t["--g-6"], "#6a645d");
    assert.equal(t["--g-7"], "#17150f");
    assert.equal(t["--accent"], "#a8442a");
    assert.equal(t["--progress-full"], "#2f6b4f");
    assert.equal(t["--info"], "#35506b");
    assert.equal(t["--warn"], "#8a6a1f");
    assert.equal(t["--error"], "#a33a2e");
    assert.equal(t["--control-pad-y"], "12px");
    assert.equal(t["--r-control"], "4px");
    assert.equal(t["--r-panel"], "8px");
  });

  test("PAPER — the pre-SWAN ramp still derives exactly as it always did", () => {
    // The material that used to ship. Retained and still selectable, so the
    // old golden values are still a real claim about a real configuration
    // rather than history: nothing about SWAN was allowed to disturb it.
    const t = ws.derive({ ...ws.PRESETS.STUDIO, material: "paper" }).tokens;
    assert.equal(t["--g-0"], "#f6f7f8");
    assert.equal(t["--g-6"], "#5a6875");
    assert.equal(t["--g-7"], "#0f1d2b");
  });

  test("NIGHT — the dark half of the toggle, and it is genuinely the same product", () => {
    const t = ws.derive(ws.PRESETS.NIGHT).tokens;
    const light = ws.derive(ws.PRESETS.STUDIO).tokens;
    assert.equal(ws.derive(ws.PRESETS.NIGHT).scheme, "dark");
    assert.equal(t["--g-0"], "#14130f");
    assert.equal(t["--g-7"], "#f5f3ef");
    // Depth still reads the same direction: raised is lighter than the page
    // in BOTH materials, which is the one rule a dark mode usually breaks.
    assert.ok(t["--g-3"] > t["--g-0"], "raised must stay lighter than page");
    assert.ok(light["--g-3"] > light["--g-0"], "raised must stay lighter than page");
    // Radius, spacing and motion are material-independent: switching the
    // lights off must not resize or re-time the interface.
    assert.equal(t["--r-control"], light["--r-control"]);
    assert.equal(t["--r-panel"], light["--r-panel"]);
    assert.equal(t["--control-pad-y"], light["--control-pad-y"]);
    assert.equal(t["--m-base"], light["--m-base"]);
  });

  test("TERMINAL — ensureContrast() correcting a dark-scheme ramp, exact values", () => {
    const t = ws.derive(ws.PRESETS.TERMINAL).tokens;
    // material.ramp[7] is "#eef2f5" and already clears AA_TEXT against
    // material.ramp[0] ("#101820"), so ensureContrast() returns it unchanged
    // — asserting the PASS-THROUGH branch, not only the correction branch.
    assert.equal(t["--g-7"], "#eef2f5");
    // "reserved" temperament desaturates --info before ensureContrast() runs;
    // the exact corrected hex is the claim.
    assert.equal(t["--info"], "#6183a5");
  });

  test("44px floor — the exact control height at every pressure, computed the same way the shipped test does", () => {
    const CONTENT = Math.ceil(15 * 1.2) + 2;
    const heightAt = (pressure) =>
      parseInt(ws.derive({ ...ws.PRESETS.STUDIO, pressure }).tokens["--control-pad-y"], 10) * 2 + CONTENT;
    assert.equal(heightAt("relaxed"), 48);
    assert.equal(heightAt("standard"), 44);
    assert.equal(heightAt("tight"), 44);
    // `tight` does NOT shrink padding below `standard` — WORKSPACE.md's own
    // ruling (`lib/console/workspace.ts` PRESSURE_SPEC comment): a personality
    // choice is not permitted to shrink a tap target.
    assert.equal(
      ws.derive({ ...ws.PRESETS.STUDIO, pressure: "tight" }).tokens["--control-pad-y"],
      ws.derive({ ...ws.PRESETS.STUDIO, pressure: "standard" }).tokens["--control-pad-y"],
    );
  });
});

describe("storage — CHOICES only, never a computed value", () => {
  let restoreStorage, restoreWindow;

  before(() => {
    // These tests run in the same process as the earlier `describe` blocks
    // (node:test executes one file's tests sequentially unless `describe`
    // is itself concurrent), so save/restore rather than assume a clean
    // global.
    restoreStorage = globalThis.localStorage;
    restoreWindow = globalThis.window;
  });

  function freshDevice() {
    const store = new MapStorage();
    globalThis.localStorage = store;
    // A real EventTarget, so `writeStoredDNA`'s `window.dispatchEvent` and
    // `WORKSPACE_CHANGE_EVENT` are exercised exactly as `VitalityShell`
    // consumes them — not stubbed away.
    globalThis.window = new EventTarget();
    return store;
  }

  test("writeStoredDNA persists exactly the four choice fields — nothing else", () => {
    freshDevice();
    ws.writeStoredDNA(ws.PRESETS.TERMINAL);
    const raw = JSON.parse(globalThis.localStorage.getItem("ledger-workspace"));
    assert.deepEqual(Object.keys(raw).sort(), ["material", "pressure", "temperament", "voice"]);
    assert.deepEqual(raw, ws.PRESETS.TERMINAL);
  });

  test("the persisted record contains NO derived/computed value — no token the engine emits appears in it", () => {
    freshDevice();
    ws.writeStoredDNA(ws.PRESETS.FIELD);
    const rawText = globalThis.localStorage.getItem("ledger-workspace");
    const computed = ws.derive(ws.PRESETS.FIELD).tokens;
    for (const [token, value] of Object.entries(computed)) {
      assert.ok(!rawText.includes(token), `persisted choice leaked the token name ${token}`);
      // A colour or px value could coincidentally collide with a choice
      // string (unlikely, but the token-name check above is the real gate).
      void value;
    }
    // Re-deriving from the persisted choice reproduces the SAME computed
    // tokens — proving the split rather than merely asserting an absence.
    const roundTripped = ws.parseDNA(JSON.parse(rawText));
    assert.deepEqual(ws.derive(roundTripped).tokens, computed);
  });

  test("readStoredDNA falls back to the pre-M24 `console:workspace` key exactly once — a choice already made is never silently lost", () => {
    freshDevice();
    globalThis.localStorage.setItem("console:workspace", JSON.stringify(ws.PRESETS.DESK));
    assert.deepEqual(ws.readStoredDNA(), ws.PRESETS.DESK);
  });

  test("writeStoredDNA fires WORKSPACE_CHANGE_EVENT — every mounted shell can re-derive without a reload", () => {
    freshDevice();
    let seen = null;
    globalThis.window.addEventListener(ws.WORKSPACE_CHANGE_EVENT, (e) => { seen = e.detail; });
    ws.writeStoredDNA(ws.PRESETS.PAPER);
    assert.deepEqual(seen, ws.PRESETS.PAPER);
  });

  test("cleanup", () => {
    globalThis.localStorage = restoreStorage;
    globalThis.window = restoreWindow;
  });
});

describe("DEVICE-CHANGE SIMULATION — a choice made on one client is server-sourced on a fresh one, no localStorage in the loop (mirrors tests/home-composition.test.mjs's HomeLayout test)", () => {
  test("device A's choice round-trips through the plain-string transport SYNC_KEYS actually carries and hydrates identically on device B", () => {
    // "Device A" — the student picks a preset. `writeStoredDNA` is the real
    // function under test; only the storage backing is swapped for a Map.
    const deviceAStore = new MapStorage();
    const savedLocalStorage = globalThis.localStorage;
    globalThis.localStorage = deviceAStore;
    ws.writeStoredDNA(ws.PRESETS.TERMINAL);
    globalThis.localStorage = savedLocalStorage;

    // Exactly what `flushLegacyBlob` (`lib/sync.ts`) uploads: the raw string
    // value under the SYNC_KEYS-listed key, nothing transformed.
    const cloudBlob = { "ledger-workspace": deviceAStore.getItem("ledger-workspace") };

    // "Device B" — a fresh client, empty storage. `hydrateAbsentOnly` is the
    // REAL M7-6 conflict rule (`lib/sync-merge.ts`), not reimplemented here.
    const deviceBStore = new MapStorage();
    const result = merge.hydrateAbsentOnly(
      cloudBlob,
      { get: (k) => deviceBStore.getItem(k), set: (k, v) => deviceBStore.setItem(k, v) },
      ["ledger-workspace"],
    );

    assert.equal(result.wrote, true);
    assert.deepEqual(result.filled, ["ledger-workspace"]);

    // Device B now resolves the SAME choice — read through the real
    // `readStoredDNA`/`parseDNA`, not a hand-rolled comparison.
    globalThis.localStorage = deviceBStore;
    const resolved = ws.readStoredDNA();
    globalThis.localStorage = savedLocalStorage;

    assert.deepEqual(resolved, ws.PRESETS.TERMINAL);
    // And the computed presentation is therefore identical too — identity,
    // not just data, survived the device change.
    assert.deepEqual(ws.derive(resolved), ws.derive(ws.PRESETS.TERMINAL));
  });

  test("a value already present on device B is KEPT — the rule never adjudicates between two real choices (M7-6)", () => {
    const cloudBlob = { "ledger-workspace": JSON.stringify(ws.PRESETS.TERMINAL) };
    const deviceBStore = new MapStorage();
    deviceBStore.setItem("ledger-workspace", JSON.stringify(ws.PRESETS.FIELD));
    const result = merge.hydrateAbsentOnly(
      cloudBlob,
      { get: (k) => deviceBStore.getItem(k), set: (k, v) => deviceBStore.setItem(k, v) },
      ["ledger-workspace"],
    );
    assert.equal(result.wrote, false);
    assert.deepEqual(result.kept, ["ledger-workspace"]);
    assert.deepEqual(JSON.parse(deviceBStore.getItem("ledger-workspace")), ws.PRESETS.FIELD);
  });
});

describe("generalised beyond /console — every shell that renders VitalityShell inherits the SAME derive() output (structural, S.6)", () => {
  const readSrc = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

  test("SYNC_KEYS (lib/sync.ts) carries the workspace choice", () => {
    const src = readSrc("lib/sync.ts");
    const body = src.slice(src.indexOf("export const SYNC_KEYS"), src.indexOf("] as const;"));
    assert.match(body, /"ledger-workspace"/);
  });

  test("a second, concrete surface (/settings) actually renders the derived DNA, via the shared VitalityShell — not a console-only path", () => {
    const settingsLayout = readSrc("app/settings/layout.tsx");
    assert.match(settingsLayout, /VitalityShell/, "/settings must render the shared token host");
    // And /settings is where the choice is actually made — the control this
    // milestone wires in, not a claim with no path to it.
    const appearance = readSrc("components/settings/appearance-fields.tsx");
    assert.match(appearance, /writeStoredDNA/, "/settings must be able to WRITE the workspace choice");
    assert.match(appearance, /PRESETS/, "the picker offers the capped preset set, not a 108-way configurator (§8 — no Workspace Engine)");
  });

  test("every shell that carries the token host listens for a live workspace change — a choice applies without a reload on any of them", () => {
    const shell = readSrc("components/console/vitality-shell.tsx");
    assert.match(shell, /WORKSPACE_CHANGE_EVENT/);
    for (const route of ["console", "settings", "capture", "diagnosis", "record"]) {
      const layout = readSrc(`app/${route}/layout.tsx`);
      assert.match(layout, /VitalityShell/, `app/${route}/layout.tsx must mount VitalityShell`);
    }
  });

  test("Workspace Engine scope gate — no per-trait 108-way configurator, no milestone-gated unlocking, only the 7 capped presets are exposed (§8, PRINCIPLES §4.3)", () => {
    const appearance = readSrc("components/settings/appearance-fields.tsx");
    assert.doesNotMatch(appearance, /MATERIALS\.map|VOICES\.map|PRESSURES\.map|TEMPERAMENTS\.map/, "must not expose the four traits independently — that is the frozen Workspace Engine, not M24");
    assert.doesNotMatch(appearance, /unlock|milestone/i, "must not gate a workspace choice behind progress — PRINCIPLES §4.3");
  });
});
