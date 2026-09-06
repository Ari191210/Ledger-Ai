-- 0012_subscriptions — what plan a student is on
-- Applied via: node scripts/supabase-mgmt.mjs apply-migration <file>
--
-- Deliberately its own table rather than a column on profiles. The profiles
-- policy is "update own", so a plan column there would be self-upgradable:
-- any student could grant themselves the paid tier straight from the browser
-- with the anon key. Here there is a read-own policy and no write policy at
-- all, so only the service role can change what someone is paying for.

create table if not exists public.subscriptions (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  plan       text not null default 'free' check (plan in ('free', 'pro')),
  -- Set when a paid plan is active. A past date means the plan has lapsed and
  -- the student falls back to free, so an expiry never needs a cleanup job.
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Read only. There is no insert, update or delete policy on purpose.
create policy "subscriptions: read own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Students with no row are on free, so a row is only created when someone
-- upgrades. Nothing needs backfilling.
