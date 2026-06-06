-- ══════════════════════════════════════════════════════════════════
-- Migration 003 — AI rate limiting columns on user_data
-- Run in Supabase SQL editor: paste and click Run
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE user_data
  ADD COLUMN IF NOT EXISTS ai_calls_today    INT          DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_calls_reset_at TIMESTAMPTZ;
