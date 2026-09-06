-- 0013_ai_advice — what the AI actually told this student, so it can check
-- later whether anything came of it.
-- Applied via: node scripts/supabase-mgmt.mjs apply-migration <file>
--
-- This is the one thing a general chatbot cannot do here. Not "remembering the
-- conversation", which is just a transcript, but holding advice next to the
-- ledger and seeing whether the student acted on it. The follow-up is measured
-- from rows they logged themselves, never asserted.
--
-- Only advice worth following up is stored: no question sets, no per-essay
-- grades. Those are outputs, not instructions, and keeping them would be noise
-- in the recall and rows nobody ever reads.

create table if not exists public.ai_advice (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  tool       text not null,
  subject    text,
  -- Null when neither the form nor the student's own topic vocabulary matched.
  -- A row with no topic still records that advice was given, it just cannot be
  -- checked for follow-through.
  topic      text,
  -- A short extract of what was advised, taken from the answer the student
  -- already saw. Deliberately not a second model call to summarise it: this
  -- runs on every AI response and the API budget is not the place to be clever.
  headline   text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_advice enable row level security;

create policy "ai_advice: owner insert" on public.ai_advice
  for insert with check (auth.uid() = user_id);
create policy "ai_advice: owner select" on public.ai_advice
  for select using (auth.uid() = user_id);
create policy "ai_advice: owner delete" on public.ai_advice
  for delete using (auth.uid() = user_id);

create index if not exists ai_advice_user_created_idx
  on public.ai_advice (user_id, created_at desc);
