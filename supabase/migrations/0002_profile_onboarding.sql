-- 0002_profile_onboarding — grade / board / stream / target exam
-- Applied via: supabase db push  (never hand-pasted)

alter table public.profiles
  add column if not exists grade        text,
  add column if not exists board        text,
  add column if not exists stream       text,
  add column if not exists target_exam  text,
  add column if not exists onboarded_at timestamptz;

-- existing "profiles: update own" policy is column-agnostic and covers these.
