-- 0003_study_data — activity, mistakes, PYQ attempts, syllabus coverage
-- Applied via: supabase db push  (never hand-pasted)
--
-- These four tables feed the Ledger Score pillars and the tools:
--   activity_days    -> streak, calendar, consistency pillar, focus-time stat
--   mistakes         -> fix-next list, mistake-velocity pillar
--   pyq_attempts     -> PYQ-accuracy pillar
--   syllabus_topics  -> syllabus-coverage pillar

create table if not exists public.activity_days (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  minutes    integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create table if not exists public.mistakes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  subject     text not null,
  topic       text not null,
  note        text,
  source      text not null default 'practice', -- practice | pyq | exam | manual
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.pyq_attempts (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users (id) on delete cascade,
  subject  text not null,
  topic    text,
  total    integer not null check (total > 0),
  correct  integer not null check (correct >= 0 and correct <= total),
  taken_at timestamptz not null default now()
);

create table if not exists public.syllabus_topics (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  subject    text not null,
  topic      text not null,
  covered    boolean not null default false,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, subject, topic)
);

alter table public.activity_days enable row level security;
alter table public.mistakes enable row level security;
alter table public.pyq_attempts enable row level security;
alter table public.syllabus_topics enable row level security;

create policy "activity_days: owner" on public.activity_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mistakes: owner" on public.mistakes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pyq_attempts: owner" on public.pyq_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "syllabus_topics: owner" on public.syllabus_topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists activity_days_user_day_idx on public.activity_days (user_id, day);
create index if not exists mistakes_user_created_idx on public.mistakes (user_id, created_at);
create index if not exists mistakes_user_open_idx on public.mistakes (user_id) where resolved_at is null;
create index if not exists pyq_attempts_user_taken_idx on public.pyq_attempts (user_id, taken_at);
create index if not exists syllabus_topics_user_subject_idx on public.syllabus_topics (user_id, subject);
