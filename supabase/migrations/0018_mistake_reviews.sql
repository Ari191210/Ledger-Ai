-- 0018_mistake_reviews — every review of a mistake, as it happens
-- Applied via: node scripts/supabase-mgmt.mjs apply-migration <file>
--
-- The mistakes pillar used to score "fewer new mistakes in the last 7 days",
-- which paid a student for not logging: one mistake ever logged jumped the
-- pillar from 0 to 193, every honest log after that cost points, and someone
-- who logged once and then stopped sat at 200 of 200 forever.
--
-- Scoring fixed mistakes instead is the right incentive, but `mistakes` only
-- records the end of that work: resolved_at, reached after five remembered
-- reviews spaced 1, 3, 7, 14 and 30 days apart, so about 55 days from logging.
-- A new student would earn nothing in this pillar for two months, and a single
-- forgotten review pushes it further out.
--
-- So the pillar scores the reviews themselves, and this table is where they are
-- recorded. `review_count` on the row cannot stand in: it is a running total
-- that resets to zero on a forgotten review, and it carries no timestamp, so it
-- can answer neither "how much work in the last 30 days" nor "when".
--
-- Forgotten reviews are stored too, and deliberately: sitting with a mistake
-- you still cannot do is the work, and a table that kept only the wins would
-- flatter the student the way the old pillar did.

create table if not exists public.mistake_reviews (
  id          uuid primary key default gen_random_uuid(),
  -- auth.uid() bare, not wrapped in a subquery: a column default cannot contain
  -- one. The policy below still wraps it, where the planner can hoist it.
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mistake_id  uuid not null references public.mistakes (id) on delete cascade,
  remembered  boolean not null,
  reviewed_at timestamptz not null default now()
);

alter table public.mistake_reviews enable row level security;

drop policy if exists "mistake_reviews: owner" on public.mistake_reviews;
create policy "mistake_reviews: owner" on public.mistake_reviews
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- The scoring window reads a user's recent reviews newest first.
create index if not exists mistake_reviews_user_reviewed_idx
  on public.mistake_reviews (user_id, reviewed_at desc);
