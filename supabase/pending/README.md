# Parts 01-06 APPLIED · part-07 PENDING

## One part left to run: `part-07.sql`

**It fixes a real defect that is live in production right now.**

029's `get_parent_projection()` appends to a `TEXT[]` as though it were a
string:

```sql
v_cats := v_cats || 'consistency';       -- malformed array literal
```

Postgres reads the bare literal as an *array literal*, so the call raises. The
failure lands in the `INSERT` that writes `parent_access_log`, which is the
whole of V.8.7: *"every parent read appends a parent_access_log row the
student can read."*

So today, **any parent read with at least one category enabled fails**, and the
student's record of who looked at what is never written. A parent whose policy
is still all-FALSE is unaffected, which is exactly why this survived: 029's own
verification only exercised the empty case.

036 replaces the function body with `array_append(...)`. Proven before
shipping: the body differs from 029's on **exactly the seven append lines and
nothing else**, the old form fails on a real Postgres, and the new form works
(`node scripts/verify-036.mjs`).

It ships as its own part because 029 is applied and checksum-locked, and 009
refuses an edit to an applied migration by design.

---

## Parts 01-06, applied 2026-08-30

Production holds migrations `000` through `035` plus `004b`, and
`scripts/check-migrations.mjs` passed against it. Production went from 16
tables to 71.

Verified after the run by `scripts/verify-production-live.mjs`:

- every table each surface reads exists and is queryable
- `students.last_seen_at`, `concepts.label_embedding` and the `search_vector`
  columns all landed, so 035's pgvector work took
- all seven routes return 200, and the APIs still return 401 to an anonymous
  caller
- the 012 backfill migrated 17 students and correctly wrote **zero** profiles,
  because all 17 `user_data` rows were empty. Inventing a profile would have
  been a §7 violation.
- 017 froze 12 of 13 legacy blobs. The 13th is `{}`, which it skips on purpose.

---

## How to run a part

Supabase, SQL Editor, New query:

1. Click into the editor and press **Ctrl+A**, then **Delete**.
   The editor runs **only the highlighted text** if anything is selected, and
   a partial run reports success.
2. Paste one part.
3. Confirm nothing is selected, then **Run**.
4. Read the `SELECT` at the end. It lists the ledger from the database itself.

To check state at any time:

```
node scripts/check-production-ledger.mjs
```

Re-running an applied part is harmless: every migration is idempotent and the
ledger refuses a changed checksum.

| Part | Migrations | Status |
|---|---|---|
| `part-01.sql` | 008 009 010 011 012 013 | applied |
| `part-02.sql` | 014 015 016 | applied |
| `part-03.sql` | 017 018 019 020 021 022 | applied |
| `part-04.sql` | 023 024 025 | applied |
| `part-05.sql` | 026 027 028 029 030 | applied |
| `part-06.sql` | 031 032 033 034 035 | applied |
| `part-07.sql` | 036 | **PENDING** |

**When part-07 is done, the final `SELECT` returns 38 rows: `000` through
`036`, plus `004b`.**

All seven were rehearsed end to end by `scripts/rehearse-production.mjs`,
which builds a database from production's own measured schema
(`supabase/production-schema.json`, captured from the live PostgREST spec) and
runs the files against it in order. All seven applied cleanly and the ledger
finished at 38 of 38.

## If a part fails halfway

Run it again. Every migration is idempotent, guarded with `IF NOT EXISTS` or a
`DO` block that checks the catalogue first, and the ledger (009) refuses to
record a version whose checksum disagrees with what it already holds, so a
partial run followed by a full run cannot leave the ledger lying.

## A note on 012, which failed once

`012` originally read `user_data.created_at` and `user_data."targetExam"`.
Production has neither: it carries `target_exam` and `onboarding_done`
instead. `user_data` predates the migration ledger, so nothing ever checked
that two databases agreed about its shape, and they did not.

The backfill now reads `information_schema` and builds its INSERTs from the
columns that are actually present, so the same file runs on both. Verified
against production's shape by reproducing it on staging inside a transaction
and rolling back.

## Verifying from outside the SQL editor

```
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/check-migrations.mjs
```

Two phases: repo structure, then the live ledger. It exits non-zero on drift
and names what is missing. Before these parts run it reports the ledger absent
entirely; after, it should report all 37 applied and unmodified.

## Regenerating

These are concatenations of `supabase/migrations/*.sql` from 008, split on
migration boundaries so every part is a whole number of migrations. The source
files are authoritative. If they change, regenerate rather than editing a part
by hand.
