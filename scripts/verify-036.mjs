// Prove the diagnosis before shipping 036. Two things must be true:
//
//   1. `text[] || 'literal'` really does fail the way I claim
//   2. `array_append(text[], 'literal')` really does work
//
// And crucially: 036's body must be IDENTICAL to 029's apart from those seven
// lines. A CREATE OR REPLACE FUNCTION replaces the whole body, so a
// transcription slip would silently drop behaviour from a security-sensitive
// function.
import fs from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  fs.readFileSync(".env.staging.local", "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

// ── 1. the body diff ─────────────────────────────────────────────────────
const bodyOf = (file) => {
  const s = fs.readFileSync(`supabase/migrations/${file}`, "utf8");
  const i = s.indexOf("CREATE OR REPLACE FUNCTION public.get_parent_projection");
  const j = s.indexOf("$$;", i);
  return s.slice(i, j + 3).split(/\r?\n/).map((l) => l.trimEnd());
};
const a = bodyOf("029_parent_space.sql");
const b = bodyOf("036_parent_projection_array_fix.sql");

const diffs = [];
const max = Math.max(a.length, b.length);
for (let i = 0; i < max; i++) {
  if (a[i] !== b[i]) diffs.push({ n: i + 1, from: a[i], to: b[i] });
}
console.log(`029 body: ${a.length} lines, 036 body: ${b.length} lines`);
console.log(`differing lines: ${diffs.length}`);
for (const d of diffs) {
  console.log(`  ${d.n}\n    029: ${(d.from ?? "(absent)").trim()}\n    036: ${(d.to ?? "(absent)").trim()}`);
}
const onlyAppends = diffs.every((d) =>
  /v_cats := v_cats \|\|/.test(d.from ?? "") && /array_append/.test(d.to ?? ""));
console.log(onlyAppends && diffs.length === 7
  ? "\n-> exactly the 7 append lines differ, nothing else"
  : "\n-> WARNING: the bodies differ somewhere other than the appends");

// ── 2. the behaviour, against a real Postgres ────────────────────────────
const c = new pg.Client({
  connectionString: env.STAGING_DATABASE_URL, ssl: { rejectUnauthorized: false },
});
await c.connect();

try {
  await c.query(`DO $$ DECLARE v TEXT[] := '{}'; BEGIN v := v || 'consistency'; END $$;`);
  console.log("\nold form: SUCCEEDED (so my diagnosis is wrong)");
} catch (e) {
  console.log(`\nold form (v || 'literal'):  fails -> ${e.message.split("\n")[0]}`);
}
try {
  await c.query(`DO $$ DECLARE v TEXT[] := '{}'; BEGIN
    v := array_append(v, 'consistency');
    IF array_length(v,1) <> 1 THEN RAISE EXCEPTION 'wrong length'; END IF;
  END $$;`);
  console.log("new form (array_append):    works");
} catch (e) {
  console.log(`new form: FAILED -> ${e.message.split("\n")[0]}`);
}
await c.end();
