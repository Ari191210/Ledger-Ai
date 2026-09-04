-- 0004_habits — habit definitions + daily completion log
-- Applied via: supabase db push  (never hand-pasted)

create table if not exists public.habits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  archived   boolean not null default false
);

create table if not exists public.habit_logs (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  day      date not null,
  unique (habit_id, day)
);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "habits: owner" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habit_logs: owner" on public.habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists habits_user_idx on public.habits (user_id) where not archived;
create index if not exists habit_logs_user_habit_day_idx on public.habit_logs (user_id, habit_id, day);
