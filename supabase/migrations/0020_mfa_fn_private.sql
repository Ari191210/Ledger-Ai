-- 0019 put session_meets_mfa() in public, which PostgREST exposes as
-- /rest/v1/rpc/session_meets_mfa (security advisor lint 0029). It only returns
-- the caller's own yes/no, so nothing leaked, but a policy helper has no reason
-- to be an API endpoint. Move it to a schema the API does not serve. Policies
-- hold the function by OID, so the 0019 policies follow it unchanged.

create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.session_meets_mfa() set schema private;
