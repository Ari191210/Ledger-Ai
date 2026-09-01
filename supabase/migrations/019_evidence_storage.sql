-- ═══════════════════════════════════════════════════════════════════════════
-- 019_evidence_storage.sql   ·   M8-2
--
-- EXECUTION_PLAN M8-2: *"Wire the `evidence` table; photo → storage + evidence
-- record with `content_hash` dedup. Done when: re-uploading the same paper
-- creates one evidence row."*
--
-- `007_mistakes.sql` already declares everything the RECORD needs, including
-- the dedup this milestone is measured by:
--
--     CONSTRAINT evidence_student_hash_unique UNIQUE (student_id, content_hash)
--
-- so this migration adds NO column, NO constraint and NO table to `007`. The
-- mistake schema is frozen and stays frozen. What `007` could not declare is
-- where the BYTES live — Supabase Storage is a separate schema — and that is
-- the whole of this file.
--
-- ADDITIVE ONLY. One bucket, four policies. It drops nothing and alters
-- nothing that exists. Idempotent; safe to re-run.
--
-- Run in: Supabase → SQL Editor.
--
--
-- ═══════════════════════════════════════════════════════════════════════════
-- WHY THE BUCKET IS PRIVATE, AND WHY THAT IS NOT A PREFERENCE
-- ═══════════════════════════════════════════════════════════════════════════
--
-- A marked exam paper carries a minor's name, their school, their handwriting
-- and their marks. A public bucket hands all of that to anyone who ever sees
-- the URL, for good, with no account, no log and no revocation — and Supabase
-- public-object URLs are guessable from the path, which here is
-- `<student_id>/<content_hash>`.
--
-- Architecture R.4 (data isolation) and every RLS policy written in this
-- project so far scope reads to `auth.uid()`. Storage is scoped the same way,
-- because a second, weaker posture for the most sensitive artefact in the
-- product would make the first one decorative.
--
-- READS ARE THEREFORE SIGNED OR SERVER-SIDE. `lib/storage.ts` has no
-- `getPublicUrl()` and must never grow one.
--
--
-- ═══════════════════════════════════════════════════════════════════════════
-- WHY THE FIRST PATH SEGMENT IS THE OWNER
-- ═══════════════════════════════════════════════════════════════════════════
--
--     evidence/<student_id>/<sha256-of-the-bytes>
--
-- `storage.foldername(name)[1]` is the student id, so the policies below can
-- compare it to `auth.uid()`. A student cannot write into another student's
-- folder, because the folder name IS the identity check — isolation is
-- structural rather than remembered by the upload code.
--
-- The second segment is the content hash, which makes the upload idempotent:
-- the same paper re-photographed writes byte-identical content to the same key,
-- so the `007` unique constraint never leaves an orphaned second object.
--
--
-- ═══════════════════════════════════════════════════════════════════════════
-- WHY THERE IS NO UPDATE AND NO DELETE POLICY
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `007`'s comment on the `evidence` table: *"Every table is student-scoped …
-- The critical asymmetry: occurrences and evidence have SELECT and INSERT
-- policies and NO update or delete policy. Immutability is therefore a property
-- of the database, not a convention the application remembers."*
--
-- The bytes inherit that. An occurrence points at evidence with ON DELETE
-- RESTRICT precisely so a diagnosis cannot be retroactively invalidated;
-- letting the client delete the OBJECT would achieve exactly what the FK
-- forbids, one layer down. Deletion under O.5 (account deletion) runs as the
-- service role, which bypasses these policies.
--
-- The INSERT policy is scoped but not append-only-strict: `upsert` on an
-- identical key is how a retried upload heals a half-finished one. The key is
-- the hash of the content, so an overwrite cannot change what the object says.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · THE BUCKET
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence',
  'evidence',
  FALSE,                     -- see the header. Not a preference.
  20971520,                  -- 20 MB, the cap `lib/storage.ts` enforces too
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · POLICIES — the same `auth.uid()` posture as every table in 007
-- ═══════════════════════════════════════════════════════════════════════════

-- ── read your own evidence ──────────────────────────────────────────────────
DROP POLICY IF EXISTS evidence_objects_select_own ON storage.objects;
CREATE POLICY evidence_objects_select_own ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── write into your own folder, and only your own ───────────────────────────
DROP POLICY IF EXISTS evidence_objects_insert_own ON storage.objects;
CREATE POLICY evidence_objects_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── overwrite ONLY your own object at ONLY the same key ─────────────────────
-- Both USING and WITH CHECK are scoped, so an update cannot move an object out
-- of the owner's folder. Present so a retried upload of the same bytes heals;
-- it cannot change what any object says, because the key is the content hash.
DROP POLICY IF EXISTS evidence_objects_update_own ON storage.objects;
CREATE POLICY evidence_objects_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- NO DELETE POLICY. Deliberate, and load-bearing — see the header.


-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--
-- · It does not touch `evidence`, `occurrences`, `patterns` or `concepts`.
--   `007` is frozen (S.3, "KEEP, extend additively") and needed no extension
--   for M8-2: the dedup constraint the done-when rests on has been in `007`
--   since M1. This file adds storage, not schema.
-- · It does not create a signed-URL helper or a public URL. A read path is
--   `/diagnosis`'s problem (M13) and will be signed and short-lived.
-- · It does not add a `mime_type` or `byte_size` column to `evidence`. Those
--   facts live on the object and in `ingestion_stages.output` (verbatim, per
--   `008`), which is where a replay in 2030 will look for them.
-- · It does not apply itself. Nothing in this repository runs a migration; the
--   ledger gate (`scripts/check-migrations.mjs`) will report 019 UNAPPLIED
--   until a human runs it in the SQL editor, which is the intended posture.
-- ═══════════════════════════════════════════════════════════════════════════

-- >>> MIGRATION LEDGER REGISTRATION <<<
SELECT supabase_migrations.record_migration(
  '019',
  '019_evidence_storage.sql',
  '8aaf56d5575656cf51f137ffed72ba26798bdbdf19bdd9108c1c15e1eb8ed0f4',
  'self'
);
