-- Table of 7: Spades for couples (his order, 2026-10-17; HIS RULES: JOKERS & DEUCES). A Spades game is a row in
-- `games` (kind 'spades', two a side). The four hands live in game_secrets, which no phone can read; each player
-- gets only their own cards from functions/games.
alter table games drop constraint games_kind_check;
alter table games add constraint games_kind_check check (kind in ('ttt','c4','checkers','trivia','feud','spades'));
