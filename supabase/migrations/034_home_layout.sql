-- ═══════════════════════════════════════════════════════════════════════════
-- 034_home_layout.sql   ·   M22-2 / M22-3
--
-- WHAT THIS CLOSES
--
-- Architecture Part M (Home composition) in full; Part S.6's REBUILD note for
-- `lib/dash-layout.ts`; EXECUTION_PLAN M22-2 ("Server-persisted HomeLayout
-- replacing 5 unsynced booleans... Done when: layout survives a device
-- change") and M22-3 ("Four importance tiers + the anti-inflation guardrails
-- ... Done when: M.5 — 'critical' cannot inflate").
--
-- CURRENT FACT this replaces: `localStorage["ledger-dash-layout"]` — five
-- untyped booleans, unsynced, device-local, no ordering, no sizing, no
-- registry, no importance channel (M.2's "CURRENT FACT — the gap").
--
-- TWO TABLES, TWO TRUST LEVELS — the same split 031 §"WHY A NEW ROLE" draws
-- for the Personal Model, applied to Home:
--
--   1. home_layout                 the STUDENT's data (M.1: "which
--                                   components are visible, in what order,
--                                   at what size" is the student's). One row
--                                   per student. The student may read AND
--                                   write their own row in full.
--
--   2. home_importance_promotions  the SYSTEM's data (M.1: "what is critical
--                                   enough to override the student's order"
--                                   is the system's, under M.5). Append-only.
--                                   The student may READ their own rows (M.5
--                                   .5's "promotion frequency is measurable")
--                                   but has NO write path at all — enforced
--                                   by GRANT, not by application code, which
--                                   is exactly what makes M22-3's own done-
--                                   when ("'critical' cannot inflate") true
--                                   at the database layer, not just in
--                                   `lib/home/importance.ts`. A hand-crafted
--                                   INSERT from an authenticated session
--                                   attempting to self-promote any component
--                                   to `critical` fails with Postgres error
--                                   42501 before a row is touched — the same
--                                   guarantee 031 §5 gives
--                                   `personal_model_aggregator` over
--                                   `explicit_value`, mirrored here for the
--                                   student over `home_importance_promotions`
--                                   in its entirety.
--
-- NOT APPLIED to any database. Same posture as every migration since 015.
-- Run in: Supabase → SQL Editor. Idempotent; safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · home_layout — THE STUDENT'S DATA (M22-2)
--
-- `entries` is the whole `HomeLayout.entries` array (`lib/home/types.ts`) as
-- JSONB — one row, one document, matching the shape the client already
-- validates client-side (`validateHomeLayout`) and the server re-validates
-- before every write (`app/api/home-layout/route.ts` calls the same
-- function — never trusts the client's own validation alone).
--
-- Why JSONB and not one row per (student, component): a `HomeLayout` is read
-- and written as ONE unit — "the merge is a pure function... given the same
-- three inputs it always produces the same layout" (M.3) reads the whole
-- document, never a single component's row. A five-row table would need a
-- transaction to keep "order" consistent across a reorder; one JSONB column,
-- written whole, cannot half-apply.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.home_layout (
  student_id  UUID        NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  entries     JSONB       NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(entries) = 'array'),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.home_layout IS
  'M22-2. One row per student — the server-persisted HomeLayout that replaces localStorage["ledger-dash-layout"]. Visibility/order/size ONLY; importance/tier is never stored here (see home_importance_promotions) — the student owns layout, the system owns importance (M.1), and this table is physically incapable of expressing the latter.';

-- `updated_at` maintenance — same shape as every other student-owned table
-- in this repo (e.g. 031's `personal_model_touch`).
CREATE OR REPLACE FUNCTION public.home_layout_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS home_layout_touch_trg ON public.home_layout;
CREATE TRIGGER home_layout_touch_trg
  BEFORE UPDATE ON public.home_layout
  FOR EACH ROW EXECUTE FUNCTION public.home_layout_touch();

-- ── M.2's one hard rule, enforced a second time here ────────────────────────
-- `lib/home/layout.ts`'s `validateHomeLayout` already refuses a submitted
-- layout that hides the Score before it ever reaches this table. This
-- trigger is the belt-and-braces twin (same posture 031 §6's
-- `personal_model_explicit_is_sacred` documents): even a future write path
-- that forgets to call the application validator cannot persist
-- `{"componentId":"score", ..., "visible": false}` — the row is rejected by
-- the database itself.
CREATE OR REPLACE FUNCTION public.home_layout_score_is_chrome()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(NEW.entries) AS e
    WHERE e ->> 'componentId' = 'score' AND (e ->> 'visible') = 'false'
  ) THEN
    RAISE EXCEPTION 'home_layout: componentId "score" cannot be hidden — it is persistent chrome (M.2)'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS home_layout_score_is_chrome_trg ON public.home_layout;
CREATE TRIGGER home_layout_score_is_chrome_trg
  BEFORE INSERT OR UPDATE ON public.home_layout
  FOR EACH ROW EXECUTE FUNCTION public.home_layout_score_is_chrome();

ALTER TABLE public.home_layout ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS home_layout_select_own ON public.home_layout;
CREATE POLICY home_layout_select_own ON public.home_layout
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS home_layout_upsert_own ON public.home_layout;
CREATE POLICY home_layout_upsert_own ON public.home_layout
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS home_layout_update_own ON public.home_layout;
CREATE POLICY home_layout_update_own ON public.home_layout
  FOR UPDATE TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- No DELETE policy — a student who wants defaults back submits the registry
-- defaults as their layout (an UPDATE), same as every other "reset" in this
-- codebase; the row itself is never removed except by the ON DELETE CASCADE
-- from auth.users (account deletion, Part O).

REVOKE ALL ON public.home_layout FROM authenticated;
GRANT SELECT ON public.home_layout TO authenticated;
GRANT INSERT (student_id, entries) ON public.home_layout TO authenticated;
GRANT UPDATE (entries) ON public.home_layout TO authenticated;

REVOKE ALL ON public.home_layout FROM service_role;
GRANT SELECT, INSERT, UPDATE ON public.home_layout TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · home_importance_promotions — THE SYSTEM'S DATA (M22-3, M.5.5)
--
-- Append-only. `tier` excludes 'ambient' by construction — ambient is the
-- implicit default and is never itself a promotion (mirrors
-- `lib/home/types.ts`'s `HomeImportancePromotion.tier` type,
-- `Exclude<HomeImportanceTier, "ambient">`).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.home_importance_promotions (
  promotion_id    UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  component_id    TEXT        NOT NULL CHECK (component_id IN ('score','recommendation','recent_activity','exams','features')),
  tier            TEXT        NOT NULL CHECK (tier IN ('highlighted','promoted','critical')),
  trigger         TEXT        NOT NULL,
  evidence_refs   JSONB       NOT NULL CHECK (jsonb_typeof(evidence_refs) = 'array' AND jsonb_array_length(evidence_refs) >= 1),
  promoted_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.home_importance_promotions IS
  'M22-3 / M.5.5. Append-only log of every promotion above ambient, with trigger and evidence — "promotion frequency is measurable and regressions are visible." Written ONLY by service_role (the home-layout API route, after lib/home/importance.ts resolves signals server-side). A student may SELECT their own rows and may not INSERT/UPDATE/DELETE at all — the GRANT below is the structural half of "critical cannot inflate": there is no path from an authenticated session to this table except reading it.';

CREATE INDEX IF NOT EXISTS home_importance_promotions_student_idx
  ON public.home_importance_promotions (student_id, promoted_at DESC);

ALTER TABLE public.home_importance_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS home_importance_promotions_select_own ON public.home_importance_promotions;
CREATE POLICY home_importance_promotions_select_own ON public.home_importance_promotions
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- Deliberately NO INSERT/UPDATE/DELETE policy for `authenticated`. RLS
-- defaults to deny; the REVOKE below removes the privilege at the GRANT
-- layer too (belt-and-braces, same posture 020/025/031 use elsewhere), so
-- even a future permissive policy authored without reading this comment
-- still meets a table-level REVOKE that must be separately, deliberately
-- reversed.
REVOKE ALL ON public.home_importance_promotions FROM authenticated;
GRANT SELECT ON public.home_importance_promotions TO authenticated;

REVOKE ALL ON public.home_importance_promotions FROM service_role;
GRANT SELECT, INSERT ON public.home_importance_promotions TO service_role;
-- No UPDATE, no DELETE, for anyone — append-only, matching
-- `personal_model_signals` (031) and `audit_entries` (016).


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · Verification the founder can run after applying this file
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  n_tbl INT;
BEGIN
  SELECT count(*) INTO n_tbl FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('home_layout', 'home_importance_promotions');
  IF n_tbl <> 2 THEN
    RAISE EXCEPTION '034: expected 2 tables (home_layout, home_importance_promotions), found %', n_tbl;
  END IF;

  -- The anti-inflation grant, checked directly rather than trusted: `authenticated`
  -- must have SELECT and nothing else on the promotions table.
  IF EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'home_importance_promotions'
      AND grantee = 'authenticated' AND privilege_type <> 'SELECT'
  ) THEN
    RAISE EXCEPTION '034: authenticated has a privilege beyond SELECT on home_importance_promotions — the anti-inflation guarantee is broken';
  END IF;

  RAISE NOTICE '034: home_layout + home_importance_promotions installed; authenticated write path to promotions confirmed absent.';
END $$;

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '034',
  '034_home_layout.sql',
  '9c77396bb61e70612355c16429df02162860a992c2a7e52e1fecba3d1f7f4cc7',
  'self'
);
