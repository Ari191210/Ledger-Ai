-- 0008_ai_rate_limit — a log of AI tool calls, used to enforce a per-user
-- rate limit on /api/ai (lib/ai/rate-limit.ts). Every AI tool call was
-- previously unlimited for any signed-in user against a real Anthropic key.

create table if not exists public.ai_invocations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  tool       text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_invocations enable row level security;

create policy "ai_invocations: owner insert" on public.ai_invocations
  for insert with check (auth.uid() = user_id);
create policy "ai_invocations: owner select" on public.ai_invocations
  for select using (auth.uid() = user_id);

create index if not exists ai_invocations_user_created_idx
  on public.ai_invocations (user_id, created_at);
