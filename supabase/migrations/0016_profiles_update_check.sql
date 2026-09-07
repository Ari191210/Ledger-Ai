-- 0016_profiles_update_check — the half 0015 missed, 2026-09-07
--
-- An UPDATE policy carries two expressions: USING decides which rows may be
-- targeted, WITH CHECK decides what they may become. 0015 rewrote only the
-- USING half of "profiles: update own", so the check still called auth.uid()
-- per row and the linter kept flagging it. Same rule either side, as before.
alter policy "profiles: update own" on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
