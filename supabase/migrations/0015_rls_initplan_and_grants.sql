-- 0015_rls_initplan_and_grants — audit fixes, 2026-09-07
-- Applied via: node scripts/supabase-mgmt.mjs apply-migration <file>
--
-- Two findings from the database linter, neither of them a data leak.
--
-- 1. Every owner policy called auth.uid() as a per-row expression, so Postgres
--    re-evaluated it for each row it tested instead of once per statement.
--    Wrapping it in a scalar subquery lets the planner hoist it into an
--    InitPlan. The policies are otherwise identical: same tables, same columns,
--    same rule. Nothing becomes visible that was not visible before.
--
-- 2. handle_new_user() is a trigger that copies a new auth user into profiles.
--    It is SECURITY DEFINER, which it must be, but EXECUTE was left granted to
--    anon and authenticated, so it was listed on the public REST surface. A
--    trigger function cannot actually be invoked over RPC (Postgres rejects it
--    for want of a trigger context), so this is exposure rather than a hole,
--    but it has no reason to be reachable.

-- ── 1. hoist auth.uid() out of the per-row path ─────────────────────────────

alter policy "profiles: read own" on public.profiles
  using ((select auth.uid()) = id);
alter policy "profiles: update own" on public.profiles
  using ((select auth.uid()) = id);

alter policy "activity_days: owner" on public.activity_days
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "mistakes: owner" on public.mistakes
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "pyq_attempts: owner" on public.pyq_attempts
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "syllabus_topics: owner" on public.syllabus_topics
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "habits: owner" on public.habits
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "habit_logs: owner" on public.habit_logs
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "deadlines: owner" on public.deadlines
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "parental_consents: owner" on public.parental_consents
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "focus_sessions: owner" on public.focus_sessions
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy "ai_invocations: owner select" on public.ai_invocations
  using ((select auth.uid()) = user_id);
alter policy "ai_invocations: owner insert" on public.ai_invocations
  with check ((select auth.uid()) = user_id);

alter policy "ai_advice: owner select" on public.ai_advice
  using ((select auth.uid()) = user_id);
alter policy "ai_advice: owner insert" on public.ai_advice
  with check ((select auth.uid()) = user_id);
alter policy "ai_advice: owner delete" on public.ai_advice
  using ((select auth.uid()) = user_id);

alter policy "subscriptions: read own" on public.subscriptions
  using ((select auth.uid()) = user_id);

-- ── 2. take the trigger function off the public API surface ─────────────────

revoke execute on function public.handle_new_user() from anon, authenticated, public;
