# Production's shape before the migrations, measured 2026-08-30

> **Superseded later the same day: all 37 migrations have since been applied.**
> Production now holds 71 tables, not 16. This document is kept for two
> reasons. The drifts recorded below are what made the migrations fail in the
> first place, and the METHOD section is the part worth reusing before any
> future migration touches a pre-existing table.
>
> For the current shape, run `node scripts/capture-production-schema.mjs`.

Not read from migration files. Measured against
`heppfjyimtvuullxlwwa.supabase.co` with the service-role key.

This file exists because three defects in a row came from assuming production
looked like staging.

## How the types were established

Three methods were tried. **Only the third is evidence**, and the first two
are recorded here because both looked convincing while being wrong.

| Method | Verdict |
|---|---|
| `select=*` and inspect the JSON | **Useless.** PostgREST serialises `text[]` and a jsonb array **identically**. This is exactly what hid the `interests` defect. |
| the `->` arrow operator | **Worse than useless.** It reported `interests` as jsonb, contradicting the user's error. A control run against staging columns whose types were already known showed PostgREST **accepts** `->` on a known `text[]`. It produced a confident wrong answer. |
| **PostgREST's OpenAPI spec** (`GET /rest/v1/`) | **Authoritative.** PostgREST derives it from the real catalogue and reports declared types directly. This is what `scripts/capture-production-schema.mjs` uses. |

A useful cross-check, which agrees with the spec: send a filter whose value is
invalid for the column and read the type out of the error.

- `?interests=eq.zzz` -> `malformed array literal` -> **an array type**
- `?exams=eq.zzz` -> `invalid input syntax for type json` -> **json/jsonb**
- `?id=eq.not-a-uuid` -> `200 []`, no error -> **text, not uuid**

The machine-readable capture lives in `supabase/production-schema.json`.
Refresh it with `node scripts/capture-production-schema.mjs`.

## `user_data` — 22 columns

```
aiProfile           jsonb
ai_calls_reset_at   timestamptz
ai_calls_today      integer
blob                jsonb
board               text
emailEnabled        boolean
exams               jsonb
focus               jsonb
grade               text
id                  TEXT          <- NOT uuid. staging has uuid.
interests           TEXT[]        <- NOT jsonb. staging has jsonb.
marks               jsonb
onboarding_done     boolean       <- staging has "onboardingDone"
papersCount         integer
parentCode          text
parentName          text
plan                jsonb
stream              text
target_exam         text          <- staging has "targetExam"
updated_at          timestamptz
username            text
weakTopics          jsonb
```

**Absent in production, present in staging:** `created_at`, `targetExam`,
`notifState`, `parentAlerts`, `referralCode`, `onboardingDone`, and the
`legacy_blob*` family added by 017.

## Pre-ledger tables

Production has **16** tables, measured from the OpenAPI spec:

`ai_history`, `ai_rate_limits`, `announcements`, `concepts`, `error_logs`,
`evidence`, `jobs`, `occurrences`, `page_events`, `patterns`,
`push_subscriptions`, `rooms`, `score_history`, `stripe_customers`,
`stripe_events`, `user_data`.

007's four tables (`concepts`, `evidence`, `patterns`, `occurrences`) are all
present, which is what lets 009 record version 007.

**Absent, despite being referenced by some migrations:** `mistakes`,
`mistake_reviews`, `user_streaks`, `study_sessions`, `notifications`.

`study_sessions` is created by pending migration 021, so 022-032 resolve
**provided the parts run in order**. The other four are created by nothing in
the repository, so migrations mentioning them (011, 015, 025, 027, 029) must
treat them as optional. 011 and 015 already do, via `to_regclass` probes, and
the full rehearsal confirms every part applies without them.

## What was verified against this shape

- `scripts/rehearse-production.mjs` — **all six pending parts applied in
  order**, against a database built from `production-schema.json`. Finishes at
  37 of 37 ledger rows with `personal_model`, `mistake_resolutions`,
  `academic_record`, `recommendations` and `students.last_seen_at` all created.
- `scripts/verify-012-shapes.mjs` — seven shapes of `user_data`, including
  this exact one, all pass.
- `scripts/verify-029-exams.mjs` — `parent_exams_view` builds and returns rows
  against this exact shape.

All three work by renaming staging's real schema aside inside a transaction
that always ends in `ROLLBACK`, then running the actual SQL from the actual
files. Each re-checks that staging came back before exiting.

## Things that are correct and look wrong

Worth writing down, because each one cost an investigation.

- **There is no `today_items` table, and there should not be.** Architecture
  B.12: *"Today owns no facts. It is a projection with a cache and one durable
  field, `students.last_seen_at`."* 033 adds that column and
  `mark_today_seen()`, no table.
- **`004b_stripe_tables_only.sql` is a real migration.** Any tool that matches
  migration files with a three-digit-only pattern will silently drop it and
  then report a correct ledger as having a spurious extra row.
- **009 recording fewer versions than expected is usually right.** Its
  backfill for 000-008 is evidence-based: it records 001 only if
  `ai_rate_limits` exists, 004 only if the `page_events` / `jobs` /
  `stripe_*` set exists, and 006 only if `consume_ai_call()` exists. A missing
  row means the objects are missing, not that the ledger is broken.
- **`pgvector` lives in `public` on these projects**, not in `extensions`. A
  harness that renames `public` aside takes the `vector` type with it, and
  `CREATE EXTENSION IF NOT EXISTS` will not bring it back, because the
  extension does still exist.
