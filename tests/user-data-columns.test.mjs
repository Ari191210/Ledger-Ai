// A FIELD NAME IS NOT ALWAYS A COLUMN NAME.
//
// `saveUserData()` spreads its keys straight into a PostgREST upsert, so every
// key it sends must BE a column in `user_data`. That table is inconsistent by
// history: `weakTopics`, `parentCode` and `papersCount` are genuinely
// camelCase columns, while `onboarding_done` is snake_case.
//
// Writing `onboardingDone` produced:
//
//   400 PGRST204 Could not find the 'onboardingDone' column of 'user_data'
//
// which a student met as "Could not save. Check your connection and try
// again." on the LAST page of onboarding, with no way past it. Every new
// student was trapped at the final step of creating an account. The read had
// the same fault in reverse: `serverRow.onboardingDone` was always undefined,
// so the server's answer could never win and a cold cache sent a student back
// through onboarding they had already completed.
//
// It was found by WALKING the journey in a browser, not by reading the code.
// These tests are the cheap version of that walk.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USER_DATA = fs.readFileSync(path.join(root, "lib", "user-data.ts"), "utf8");
const SCHEMA = JSON.parse(fs.readFileSync(path.join(root, "supabase", "production-schema.json"), "utf8"));

/** Production's real columns, measured from PostgREST's OpenAPI spec. */
const COLUMNS = new Set(Object.keys(SCHEMA.tables.user_data));

describe("every field written to user_data is a real column", () => {
  test("onboarding_done is the column, and onboardingDone is not", () => {
    // The premise of the whole bug. If this ever flips, the mapping below is
    // wrong rather than right.
    assert.ok(COLUMNS.has("onboarding_done"), "production has onboarding_done");
    assert.equal(COLUMNS.has("onboardingDone"), false, "production does NOT have onboardingDone");
  });

  test("saveUserData maps field names to column names before writing", () => {
    // A bare `...updates` spread is what caused the 400. The payload must go
    // through the mapper.
    assert.match(USER_DATA, /const COLUMN_NAMES/, "COLUMN_NAMES map must exist");
    assert.match(USER_DATA, /onboardingDone:\s*"onboarding_done"/);
    assert.match(
      USER_DATA,
      /\.\.\.toColumns\(updates as Record<string, unknown>\)/,
      "the upsert must spread toColumns(updates), never updates directly",
    );
  });

  test("the upsert never spreads the raw updates object", () => {
    const upsert = /from\("user_data"\)\.upsert\(\{([\s\S]*?)\}\);/.exec(USER_DATA);
    assert.ok(upsert, "the user_data upsert must be findable");
    assert.equal(
      /\.\.\.updates\b/.test(upsert[1]),
      false,
      "spreading `updates` sends field names as column names, which 400s",
    );
  });

  test("the read takes the flag from the COLUMN, not the field name", () => {
    // serverRow.onboardingDone is always undefined; reading it silently
    // defeats the server and falls through to localStorage.
    assert.match(
      USER_DATA,
      /\(data as Record<string, unknown>\)\.onboarding_done/,
      "the server flag must be read as onboarding_done",
    );
    assert.equal(
      /serverRow\.onboardingDone\s*!==\s*undefined/.test(USER_DATA),
      false,
      "reading serverRow.onboardingDone can never see the server's value",
    );
  });

  test("every name in COLUMN_NAMES maps to a column that exists", () => {
    const block = /const COLUMN_NAMES[^{]*\{([\s\S]*?)\}/.exec(USER_DATA);
    assert.ok(block, "COLUMN_NAMES must be findable");
    const pairs = [...block[1].matchAll(/(\w+):\s*"([^"]+)"/g)];
    assert.ok(pairs.length > 0, "the map must not be empty");
    for (const [, field, column] of pairs) {
      assert.ok(COLUMNS.has(column), `${field} maps to "${column}", which is not a column in production`);
    }
  });

  test("PROFILE_FIELDS names only things the schema can hold", () => {
    // These are the fields the profile resolver moves between cache and
    // server. Each must be either a real column or explicitly mapped to one.
    const m = /const PROFILE_FIELDS = \[([^\]]*)\]/.exec(USER_DATA);
    assert.ok(m, "PROFILE_FIELDS must be findable");
    const fields = [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]);

    const mapBlock = /const COLUMN_NAMES[^{]*\{([\s\S]*?)\}/.exec(USER_DATA);
    const mapped = new Set([...mapBlock[1].matchAll(/(\w+):\s*"[^"]+"/g)].map(x => x[1]));

    for (const f of fields) {
      // `subjects` and `targetExam` are handled by saveStudentProfile's own
      // translation before they reach a column, so they are exempt here.
      if (["subjects", "targetExam"].includes(f)) continue;
      assert.ok(
        COLUMNS.has(f) || mapped.has(f),
        `PROFILE_FIELDS names "${f}", which is neither a column nor mapped to one`,
      );
    }
  });
});
