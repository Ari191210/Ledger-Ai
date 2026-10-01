-- Two-factor by email code, replacing the authenticator app (no student had
-- enrolled one: auth.mfa_factors was empty when this was written).
--
-- Supabase's built-in MFA offers an authenticator app or SMS, not email, so
-- this is ours:
--
--   * The setting lives in auth.users.raw_app_meta_data ->> 'two_factor'
--     ('email' when on). app_metadata can only be written with the service
--     role, so a student cannot switch it off from the browser, and it rides
--     inside the JWT, so the proxy only asks the database about students who
--     have it on.
--   * A code belongs to one user, one sign-in (the JWT's session_id) and one
--     purpose. Only an HMAC of it is stored. 10 minutes, 5 tries.
--   * A sign-in that has entered its code gets a row in two_factor_sessions.
--   * Both tables are in `private`, which the API does not serve; only
--     service_role, through the two functions below, touches them.
--
-- The rule itself stays in private.session_meets_mfa(), which the 0019
-- restrictive policies already call. CREATE OR REPLACE keeps its OID, so those
-- fourteen policies pick up the new body without being touched.

create table private.two_factor_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  purpose text not null check (purpose in ('signin', 'enable', 'disable')),
  code_hash text not null,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index two_factor_codes_user_idx on private.two_factor_codes (user_id, created_at desc);
alter table private.two_factor_codes enable row level security;

create table private.two_factor_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  verified_at timestamptz not null default now()
);
create index two_factor_sessions_user_idx on private.two_factor_sessions (user_id);
alter table private.two_factor_sessions enable row level security;

revoke all on table private.two_factor_codes from anon, authenticated;
revoke all on table private.two_factor_sessions from anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on table private.two_factor_codes to service_role;
grant select, insert, update, delete on table private.two_factor_sessions to service_role;

-- Does this sign-in still owe an email code? Mirrored in lib/auth/mfa.ts.
-- Only a sign-in that began with a password owes one: Google, an email link
-- and a password reset have each just proven the inbox, so a second email
-- would prove nothing new. It is an allow-list of exempt methods, so a method
-- this does not know about still asks for the code.
create or replace function private.session_meets_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(
      (select u.raw_app_meta_data ->> 'two_factor' from auth.users u where u.id = auth.uid()),
      ''
    ) <> 'email'
    or exists (
      select 1
      from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) m
      where m ->> 'method' in ('oauth', 'otp', 'magiclink', 'recovery', 'invite', 'email/signup')
    )
    or exists (
      select 1 from private.two_factor_sessions s
      where s.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
        and s.user_id = auth.uid()
    );
$$;

-- For the proxy and API routes: the same answer, asked as the signed-in user.
-- Invoker, so it adds no door of its own; it can only call the rule above.
create or replace function public.two_factor_satisfied()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.session_meets_mfa();
$$;

revoke all on function public.two_factor_satisfied() from public, anon;
grant execute on function public.two_factor_satisfied() to authenticated;

-- Issue a code. Service role only (the route that emails it). Rate limited per
-- user: one a minute, five an hour, so a leaked password cannot flood an inbox.
create or replace function public.two_factor_issue(p_user uuid, p_session uuid, p_purpose text, p_hash text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  recent int;
  latest timestamptz;
begin
  select count(*), max(created_at) into recent, latest
  from private.two_factor_codes
  where user_id = p_user and created_at > now() - interval '1 hour';

  if latest is not null and latest > now() - interval '60 seconds' then
    return 'too_soon';
  end if;
  if recent >= 5 then
    return 'too_many';
  end if;

  delete from private.two_factor_codes where user_id = p_user and created_at < now() - interval '1 day';
  insert into private.two_factor_codes (user_id, session_id, purpose, code_hash, expires_at)
  values (p_user, p_session, p_purpose, p_hash, now() + interval '10 minutes');
  return 'ok';
end;
$$;

-- Check a code. Service role only. The newest unused code for this sign-in and
-- purpose is the only one that counts; five wrong tries lock it.
create or replace function public.two_factor_consume(p_user uuid, p_session uuid, p_purpose text, p_hash text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c private.two_factor_codes%rowtype;
begin
  select * into c
  from private.two_factor_codes
  where user_id = p_user and session_id = p_session and purpose = p_purpose and used_at is null
  order by created_at desc
  limit 1
  for update;

  if not found then
    return 'none';
  end if;
  if c.expires_at < now() then
    return 'expired';
  end if;
  if c.attempts >= 5 then
    return 'locked';
  end if;
  if c.code_hash <> p_hash then
    update private.two_factor_codes set attempts = attempts + 1 where id = c.id;
    return 'wrong';
  end if;

  update private.two_factor_codes set used_at = now() where id = c.id;
  if p_purpose in ('signin', 'enable') then
    insert into private.two_factor_sessions (session_id, user_id)
    values (p_session, p_user)
    on conflict (session_id) do nothing;
  end if;
  return 'ok';
end;
$$;

-- Forget every verified sign-in but one (password change, turning it off).
create or replace function public.two_factor_forget(p_user uuid, p_keep uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from private.two_factor_sessions
  where user_id = p_user and session_id is distinct from p_keep;
$$;

revoke all on function public.two_factor_issue(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.two_factor_consume(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.two_factor_forget(uuid, uuid) from public, anon, authenticated;
grant execute on function public.two_factor_issue(uuid, uuid, text, text) to service_role;
grant execute on function public.two_factor_consume(uuid, uuid, text, text) to service_role;
grant execute on function public.two_factor_forget(uuid, uuid) to service_role;
