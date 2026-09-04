-- 0007_peer_heatmap — an anonymised, cross-user aggregate for the Peer
-- Heatmap tool. `mistakes` is RLS-scoped per user (owner-only), so reading
-- across users needs a SECURITY DEFINER function rather than a client
-- query. The cohort floor (>= 3 distinct students) is baked into the SQL
-- itself, not a client-side filter, so a topic with fewer strugglers than
-- that can never be returned however this function is called, and no
-- individual user_id is ever selected, only grouped counts.

create or replace function public.topic_struggle_stats()
returns table (subject text, topic text, student_count bigint, mistake_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select subject, topic, count(distinct user_id) as student_count, count(*) as mistake_count
  from public.mistakes
  where resolved_at is null
  group by subject, topic
  having count(distinct user_id) >= 3
  order by student_count desc, mistake_count desc
  limit 20;
$$;

grant execute on function public.topic_struggle_stats() to authenticated;
