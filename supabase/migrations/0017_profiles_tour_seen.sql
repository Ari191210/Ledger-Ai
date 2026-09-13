-- 0017_profiles_tour_seen — remember that the dashboard walkthrough has been shown.
--
-- A column rather than localStorage, for the same reason onboarded_at is one:
-- first-run state that follows the student to their next device. Null means the
-- tour has not been completed or skipped yet.
--
-- No new policy: profiles already allows a row's owner to select and update
-- their own row, and this column rides those.

alter table public.profiles
  add column if not exists tour_seen_at timestamptz;

comment on column public.profiles.tour_seen_at is
  'When the dashboard walkthrough was completed or skipped. Null = never shown.';
