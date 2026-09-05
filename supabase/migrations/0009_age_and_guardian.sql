-- 0009_age_and_guardian — date of birth, guardian contact, consent audit trail
-- Applied via: supabase db push  (never hand-pasted)
--
-- Groundwork for DPDP Act 2023 s.9 / DPDP Rules 2025 r.10, which require
-- verifiable parental consent before processing the personal data of anyone
-- under 18. Substantive compliance is due 14 May 2027.
--
-- Deliberately schema only: nothing here blocks a signup or sends anything.
-- Rule 10 points at Aadhaar-linked DigiLocker tokens as the authoritative way
-- to verify a parent's identity, which is a partner integration we do not have,
-- so the verification METHOD is left open on purpose. Recording the method per
-- consent (rather than assuming one) is what lets us adopt DigiLocker later
-- without rewriting the history.

alter table public.profiles
  add column if not exists date_of_birth  date,
  add column if not exists guardian_email text;

-- existing "profiles: update own" policy is column-agnostic and covers these.

-- One row per consent event, append-only in spirit: we keep superseded rows so
-- there is an audit trail rather than a single mutable "consented" boolean.
create table if not exists public.parental_consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  guardian_email text not null,
  -- how the guardian was verified. 'email_link' is a good-faith step and is NOT
  -- verifiable consent under r.10; 'digilocker' is the one that would be.
  method         text not null default 'email_link',
  status         text not null default 'pending', -- pending | granted | withdrawn
  requested_at   timestamptz not null default now(),
  responded_at   timestamptz,
  -- evidence for a regulator: what we saw when consent was given
  evidence       jsonb
);

alter table public.parental_consents enable row level security;

-- The child owns the row. A guardian acting through an emailed link is not a
-- signed-in user, so any future grant path must go through a server action
-- using the service role, never this policy.
create policy "parental_consents: owner" on public.parental_consents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists parental_consents_user_idx
  on public.parental_consents (user_id, requested_at desc);
