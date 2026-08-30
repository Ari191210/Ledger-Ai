// ═══════════════════════════════════════════════════════════════════════════
// PRE-LEDGER SCHEMA DRIFT — the class of bug that broke two pastes
//
// Migrations 000-007 predate the migration ledger. Nothing owns their shape,
// so nothing has ever asserted that two databases agree about it, and two
// production pastes failed on exactly that:
//
//   ERROR 42703: column u.created_at does not exist
//   ERROR 42883: operator does not exist: uuid = text
//
// Both were in `user_data`. This file is the check that would have caught them
// before a paste, generalised to every pre-ledger table.
//
// ── WHAT IT ASSERTS, AND WHY THAT IS THE RIGHT LINE ──────────────────────
// NOT "the two databases are identical": they legitimately differ while
// migrations are pending, and a test that fails for a legitimate reason gets
// ignored. It asserts the narrower, permanent claim: every migration that
// READS a pre-ledger table must tolerate BOTH shapes, by introspecting the
// catalogue or by casting, rather than naming a column or a type outright.
//
//   node --test tests/schema-drift.test.mjs
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIG = path.join(root, "supabase", "migrations");

const sql = (f) => fs.readFileSync(path.join(MIG, f), "utf8");
/** Migration text with comments stripped: only what the database executes. */
const code = (f) =>
  sql(f).split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

const files = fs.readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();
/** Pending migrations: the ones that must survive an unmigrated database. */
const pending = files.filter((f) => parseInt(f.slice(0, 3), 10) >= 8);

/** Every pending migration that reads user_data, the drifted table. */
const readsUserData = pending.filter((f) => /\buser_data\b/.test(code(f)));

describe("pre-ledger drift — user_data is a different table on each database", () => {
  test("the drift is documented where someone will meet it", () => {
    // 006 found this first and wrote it down. If that explanation is ever
    // deleted, the next person rediscovers it through a failed production run.
    assert.match(sql("006_ai_usage_server_side.sql"), /user_data\.id is TEXT in the live database/);
  });

  test("every migration that reads user_data.id casts it", () => {
    // production: TEXT. staging: UUID. `a.id = u.id` is uuid = text and
    // Postgres refuses to guess, which is the second error above.
    for (const f of readsUserData) {
      const src = code(f);
      // find bare `u.id` / `ud.id` uses that are not already cast
      const bare = [...src.matchAll(/\b(u|ud)\.id\b(?!\s*::)/g)]
        .filter((m) => {
          const after = src.slice(m.index, m.index + 60);
          // `u.id IS NOT NULL` and `u.id::text` are both fine
          return !/^\w+\.id\s+IS\s+(NOT\s+)?NULL/i.test(after);
        });
      assert.equal(
        bare.length, 0,
        `${f} uses user_data.id without a cast ${bare.length} time(s); ` +
        `production stores it as TEXT and staging as UUID`,
      );
    }
  });

  test("no migration hardcodes a user_data column that exists on only one side", () => {
    // created_at, targetExam and onboardingDone exist on staging and not on
    // production. Naming any of them literally is the first error above.
    //
    // A CONDITIONAL use is fine and is the fix: 012 puts 'u.created_at' in a
    // string that is only chosen when information_schema says the column
    // exists. So the check is not "does this name appear" but "does it appear
    // in SQL the database will run unconditionally" - which means outside a
    // quoted expression built by CASE/format.
    const ONE_SIDED = ["created_at", "targetExam", "onboardingDone", "referralCode"];
    for (const f of readsUserData) {
      const src = code(f);
      const risky = ONE_SIDED.filter((col) => {
        const literal = new RegExp(`\\b(u|ud)\\.("?)${col}\\2\\b`, "g");
        for (const m of src.matchAll(literal)) {
          // Inside single quotes it is a fragment of a generated statement,
          // guarded by whatever chose it. Count the quotes before it on the
          // line: an odd number means the match sits inside a string.
          const lineStart = src.lastIndexOf("\n", m.index) + 1;
          const before = src.slice(lineStart, m.index);
          const quotes = (before.match(/'/g) || []).length;
          if (quotes % 2 === 0) return true; // unquoted, therefore unconditional
        }
        return false;
      });
      assert.deepEqual(
        risky, [],
        `${f} names ${risky.join(", ")} on a user_data alias in unconditional SQL; ` +
        `that column is absent from production. Read information_schema and ` +
        `build the statement from what exists, as 012 does.`,
      );
    }
  });

  test("012 discovers the columns rather than assuming them", () => {
    const src = code("012_students_and_profiles.sql");
    assert.match(src, /information_schema\.columns/);
    assert.match(src, /column_name IN \('targetExam', 'target_exam'\)/);
    assert.match(src, /has_created_at/);
  });

  test("the UUID guard avoids the format() placeholder hazard", () => {
    // A regex ending in the anchor character is read by format() as the start
    // of a positional placeholder, which truncated this file's SQL twice.
    const src = code("012_students_and_profiles.sql");
    assert.match(src, /LIKE %L/, "the shape guard should be a LIKE pattern");
    assert.equal(
      /~\s*'\^/.test(src), false,
      "a regex anchor inside a format() template is the bug that truncated this file",
    );
  });
});

describe("what is NOT drift, so the check does not cry wolf", () => {
  test("columns added by pending migrations are expected to be absent", () => {
    // score_history gains nine columns in 027, concepts gains four across
    // 013 and 035, user_data gains four in 017. Production lacks all of them
    // because it has not run those migrations, which is the normal state
    // before a deploy rather than a divergence.
    const owners = (col) =>
      files.filter((f) => new RegExp(`ADD COLUMN[^;]*\\b"?${col}"?\\b`, "i").test(code(f)));
    for (const [col, mig] of [
      ["score_state", "027"], ["formula_version", "027"],
      ["label_embedding", "035"], ["taxonomy_version", "013"],
      ["legacy_blob", "017"],
    ]) {
      const found = owners(col);
      assert.ok(found.length > 0, `nothing adds ${col}; it would be real drift`);
      assert.equal(found[0].slice(0, 3), mig, `${col} should be added by ${mig}`);
    }
  });
});
