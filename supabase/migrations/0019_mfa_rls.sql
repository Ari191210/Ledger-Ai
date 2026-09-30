-- Two-factor at the database, not only at the website. The proxy stops a
-- password-only (aal1) session from reaching any page or API route, but the
-- Supabase anon key is public by design, so someone holding a stolen password
-- could sign in, get an aal1 token, and query PostgREST directly, never
-- touching studyledger.in. These restrictive policies close that door:
-- every row stays invisible and unwritable to an aal1 session whose user has
-- turned two-factor on. Users without two-factor are unaffected.
--
-- Restrictive policies AND with the existing permissive owner policies, so
-- nothing already allowed for aal2 or non-2FA users changes. This is the
-- pattern from the Supabase MFA guide (auth/auth-mfa, "Enforce for users who
-- have MFA enabled").
--
-- Cost: one indexed lookup on auth.mfa_factors per statement (the select is
-- wrapped so Postgres evaluates it once per query, not per row; see 0015).

create or replace function public.session_meets_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or not exists (
      select 1 from auth.mfa_factors
      where user_id = auth.uid() and status = 'verified'
    );
$$;

revoke all on function public.session_meets_mfa() from public, anon;
grant execute on function public.session_meets_mfa() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'activity_days', 'mistakes', 'mistake_reviews', 'pyq_attempts',
    'syllabus_topics', 'habits', 'habit_logs', 'deadlines', 'focus_sessions',
    'parental_consents', 'subscriptions', 'ai_advice', 'ai_invocations'
  ] loop
    continue when to_regclass('public.' || t) is null;
    execute format(
      'create policy "two-factor required when enabled" on public.%I
         as restrictive for all to authenticated
         using ((select public.session_meets_mfa()))
         with check ((select public.session_meets_mfa()))',
      t
    );
  end loop;
end $$;
