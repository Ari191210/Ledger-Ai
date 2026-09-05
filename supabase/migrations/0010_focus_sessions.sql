-- 0010_focus_sessions: what a focus session was actually spent on
-- Applied via: supabase db push  (never hand-pasted)
--
-- activity_days only stores a daily total of minutes, which is enough to feed
-- the consistency pillar and nothing else. It cannot answer "what did I work
-- on", so the timer had no way to be anything other than a generic Pomodoro.
--
-- Abandoned sessions are recorded on purpose. A tool that only remembers your
-- wins is flattery; the useful signal is that you started four Chemistry
-- sessions this week and finished one.

create table if not exists public.focus_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  subject    text,
  topic      text,
  minutes    integer not null,
  completed  boolean not null default true,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.focus_sessions enable row level security;

create policy "focus_sessions: owner" on public.focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists focus_sessions_user_started_idx
  on public.focus_sessions (user_id, started_at desc);
