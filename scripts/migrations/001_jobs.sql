create table if not exists jobs (
  id           uuid primary key default gen_random_uuid(),
  type         text not null,
  payload      jsonb not null default '{}',
  status       text not null default 'pending'
                 check (status in ('pending', 'running', 'done', 'failed')),
  attempts     int  not null default 0,
  error        text,
  scheduled_at timestamptz not null default now(),
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

-- index used by the runner: pending jobs ordered by due time
create index if not exists jobs_runner_idx
  on jobs (scheduled_at asc)
  where status = 'pending';
