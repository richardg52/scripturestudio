-- Table of 7: Game Room (his order, 2026-10-17): Tic-Tac-Toe, Connect Four and Checkers between family members,
-- one on one or couple against couple. Phones may only READ games; every change goes through functions/games,
-- which checks the player, the turn and the move with the shared rules (functions/games/rules.js).
-- Pass & play on one phone never touches the server.
create table games (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  kind text not null check (kind in ('ttt','c4','checkers')),
  side_a text[] not null check (cardinality(side_a) between 1 and 2), side_b text[] not null check (cardinality(side_b) between 1 and 2),
  state jsonb not null, turn smallint not null default 0 check (turn in (0,1)),
  status text not null default 'live' check (status in ('live','done')), winner smallint check (winner in (0,1,2)), why text,
  moves int not null default 0, last jsonb, created_by text references members on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table games enable row level security;
create policy games_read on games for select to authenticated using (family_id = private.my_family());
grant select on games to authenticated;
alter publication supabase_realtime add table games;
