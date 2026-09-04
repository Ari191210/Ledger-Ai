-- 0006_spaced_review — spaced-repetition state on mistakes
-- Applied via: supabase db push  (never hand-pasted)

alter table public.mistakes
  add column if not exists next_review_at timestamptz not null default now(),
  add column if not exists review_count   integer not null default 0;

create index if not exists mistakes_user_due_idx
  on public.mistakes (user_id, next_review_at)
  where resolved_at is null;
