-- 0011_signals: exam start times, and confidence before a paper
-- Applied via: supabase db push  (never hand-pasted)
--
-- Two columns, each unlocking a signal that cannot be computed from what is
-- already stored.
--
-- deadlines.start_hour: an exam has a time, not just a date. Without it we
-- cannot tell a student that their accuracy peaks at 10pm while their board
-- exam starts at 10:30am, which is the single most useful thing the circadian
-- data can say. Nullable, because most deadlines are not timed and we will not
-- invent an hour we were not given.
--
-- pyq_attempts.predicted_correct: what the student thought they would score,
-- recorded before they mark the paper. The gap between predicted and actual is
-- calibration, which is among the best evidenced study interventions there is
-- and which almost nothing consumer-facing measures.

alter table public.deadlines
  add column if not exists start_hour smallint
    check (start_hour is null or (start_hour >= 0 and start_hour <= 23));

alter table public.pyq_attempts
  add column if not exists predicted_correct integer
    check (predicted_correct is null or predicted_correct >= 0);

-- existing owner-only policies on both tables are column-agnostic and cover these.
