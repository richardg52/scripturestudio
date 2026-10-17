-- His request 2026-10-17: after dinner each person gives the place one score, 1 to 10; the family score is the average.
alter table public.reviews add column if not exists overall smallint check (overall between 1 and 10);
