# Pending migrations — 008 through 035

**Production is evidenced at 000–007.** Everything here is what it does not
have yet. Until these run, `/capture`, `/diagnosis`, `/record`, `/today` and
the personalisation writes all render but do nothing, because the tables they
read are absent.

That state is not a crash. The product treats missing evidence as a valid
state (architecture J.3.a), so every surface degrades to an honest empty
rather than throwing. It is still a hollow product until this is done.

## Run them

Supabase → **SQL Editor** → New query. For each part, in order:

1. Click into the editor and press **Ctrl+A**, then **Delete**.
   The editor runs **only the highlighted text** if anything is selected, and
   a partial run reports success. This has bitten this project before and is
   recorded in the vault's Gotchas.
2. Paste one part.
3. Confirm nothing is selected, then **Run**.
4. Read the `SELECT` at the end. It lists the ledger from the database itself,
   which is the only evidence that matters.

| Part | Migrations | Size |
|---|---|---|
| `part-01.sql` | 008 009 010 011 012 013 | 75 KB |
| `part-02.sql` | 014 015 016 | 125 KB |
| `part-03.sql` | 017 018 019 020 021 022 | 123 KB |
| `part-04.sql` | 023 024 025 | 112 KB |
| `part-05.sql` | 026 027 028 029 030 | 125 KB |
| `part-06.sql` | 031 032 033 034 035 | 73 KB |

**When it is done, the final `SELECT` returns 38 rows, `000` through `035`.**

## If a part fails halfway

Run it again. Every migration is idempotent — guarded with `IF NOT EXISTS` or
a `DO` block that checks the catalogue first — and the ledger (009) refuses to
record a version whose checksum disagrees with what it already holds, so a
partial run followed by a full run cannot leave the ledger lying.

## Verifying from outside the SQL editor

```
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/check-migrations.mjs
```

Two phases: repo structure, then the live ledger. It exits non-zero on drift
and names what is missing. Before these parts run it reports the ledger absent
entirely; after, it should report all 37 applied and unmodified.

## What was verified before this was written

- All 28 migrations applied in order to the staging database: **37/37 clean**.
- The six parts run **in order, twice**, against staging: every part OK on both
  passes, which is the idempotency claim tested rather than asserted.
- `scripts/check-migrations.mjs` passes against staging:
  *"37 recorded, all 37 repo migrations applied and unmodified."*

## Regenerating

These are concatenations of `supabase/migrations/*.sql` from 008, split on
migration boundaries so every part is a whole number of migrations. The source
files are authoritative; if they change, regenerate rather than editing a part
by hand.
