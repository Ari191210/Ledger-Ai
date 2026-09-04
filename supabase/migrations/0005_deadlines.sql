-- 0005_deadlines — submissions, tests, exams in one countdown list
-- Applied via: supabase db push  (never hand-pasted)

create table if not exists public.deadlines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null,
  subject    text,
  kind       text not null default 'other', -- assignment | exam | test | other
  due_date   date not null,
  created_at timestamptz not null default now()
);

alter table public.deadlines enable row level security;

create policy "deadlines: owner" on public.deadlines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists deadlines_user_due_idx on public.deadlines (user_id, due_date);
