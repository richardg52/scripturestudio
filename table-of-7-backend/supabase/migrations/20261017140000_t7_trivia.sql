-- Table of 7: Trivia Night (his order, 2026-10-17). A trivia game is a row in `games` (kind 'trivia', teams of
-- 1–4). The right answer to the question on screen lives in game_secrets, which NO phone can read: functions/games
-- checks the answer and only then shows it. "Table mode" = one phone runs the game for two teams at the table.
alter table games drop constraint games_kind_check;
alter table games add constraint games_kind_check check (kind in ('ttt','c4','checkers','trivia'));
alter table games drop constraint games_side_a_check;
alter table games drop constraint games_side_b_check;
alter table games add constraint games_side_a_check check (cardinality(side_a) between 1 and 4);
alter table games add constraint games_side_b_check check (cardinality(side_b) between 1 and 4);
create table game_secrets (game_id text primary key references games on delete cascade, data jsonb not null);
alter table game_secrets enable row level security;   -- no policies: only the server reads or writes it
revoke all on game_secrets from anon, authenticated;
