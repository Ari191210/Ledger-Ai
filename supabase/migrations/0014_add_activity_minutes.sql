-- 0014_add_activity_minutes — make adding study minutes atomic.
-- Applied via: node scripts/supabase-mgmt.mjs apply-migration <file>
--
-- logActivity upserts an absolute value, so adding minutes meant reading the
-- current total in one round trip and writing total + n in another. Two writes
-- that interleave inside that gap both read the same starting value and the
-- later one wins outright, so fifty logged minutes silently become twenty five.
-- It is reachable in normal use: a focus timer finishing in one tab while the
-- Quick Log is submitted in another.
--
-- Doing the addition inside the statement removes the gap entirely.
--
-- security invoker, not definer: RLS still applies, so this function cannot be
-- used to write to somebody else's day. auth.uid() rather than a parameter, so
-- there is no user id for a caller to forge in the first place.

create or replace function public.add_activity_minutes(p_day date, p_minutes int)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.activity_days (user_id, day, minutes)
  values (auth.uid(), p_day, greatest(p_minutes, 0))
  on conflict (user_id, day)
  do update set minutes = activity_days.minutes + greatest(excluded.minutes, 0);
$$;

revoke all on function public.add_activity_minutes(date, int) from public;
grant execute on function public.add_activity_minutes(date, int) to authenticated;
