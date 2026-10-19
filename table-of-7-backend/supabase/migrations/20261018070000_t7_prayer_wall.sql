-- Table of 7: Family Prayer Wall (his order, 2026-10-18; the whole family sees every request, his choice). Post a
-- request, others tap "I prayed", the author marks it Answered with a praise report. A request may be posted without
-- a name: then `shown_by` is empty and the author is kept ONLY in prayer_authors, which no phone can read, so nobody
-- (not even the host) can learn it from the app. The author and the host can take a request down.
-- Phones may only READ prayers; every write goes through functions/prayer.
create table prayers (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  shown_by text references members on delete set null,     -- null = posted without a name
  text text not null check (length(text) between 1 and 600),
  prayed text[] not null default '{}',
  status text not null default 'open' check (status in ('open','answered')),
  praise text, answered_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table prayer_authors (
  prayer_id text primary key references prayers on delete cascade, member_id text not null references members on delete cascade);
alter table prayers enable row level security;
alter table prayer_authors enable row level security;     -- no policies: only the server reads or writes it
create policy prayers_read on prayers for select to authenticated using (family_id = private.my_family());
grant select on prayers to authenticated;
revoke insert, update, delete on prayers from anon, authenticated;
revoke all on prayer_authors from anon, authenticated;
alter publication supabase_realtime add table prayers;
