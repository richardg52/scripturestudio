-- Table of 7: Game Night Tournament (his order, 2026-10-18). Pick the players and the games; after each game anyone
-- playing records 1st (3 points) and 2nd (1 point); the leaderboard runs all night; "Crown the champion" ends it, and
-- the champions show in the Year at the Table. Scoring: functions/tourney/score.js (one copy, also in the app).
-- Phones may only READ tournaments; every write goes through functions/tourney.
create table tournaments (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  created_by text references members on delete set null,
  name text not null, date date not null,
  players text[] not null check (cardinality(players) between 2 and 12),
  games jsonb not null,                        -- [{kind, label}]
  results jsonb not null default '[]',         -- one per game: null or {first:[ids], second:[ids], by}
  status text not null default 'open' check (status in ('open','done','cancelled')),
  champions text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table tournaments enable row level security;
create policy tournaments_read on tournaments for select to authenticated using (family_id = private.my_family());
grant select on tournaments to authenticated;
revoke insert, update, delete on tournaments from anon, authenticated;
alter publication supabase_realtime add table tournaments;
