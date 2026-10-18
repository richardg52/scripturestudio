-- Table of 7: Blackjack (his order, 2026-10-17: "Black Jack"). Chips are points, never money. A table of 1–4 family
-- members against the dealer; the dealer's face-down card and the shoe live in game_secrets (no phone can read them).
-- Computer seats in Spades are "bot:1".."bot:3" in side_a / side_b; they are not members and are never alerted.
alter table games drop constraint games_kind_check;
alter table games add constraint games_kind_check check (kind in ('ttt','c4','checkers','trivia','feud','spades','blackjack'));
