-- Table of 7 Game Room round 3 (his order, 2026-10-17): Wild Card (Uno's rules), Bid Whist (his house rules) and
-- Dominoes (All Fives to 150). Hands, the kitty and the boneyard live in game_secrets (no phone can read them).
alter table games drop constraint games_kind_check;
alter table games add constraint games_kind_check check (kind in ('ttt','c4','checkers','trivia','feud','spades','blackjack','wildcard','bidwhist','dominoes'));
