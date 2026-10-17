-- Table of 7: What I ordered (his order, 2026-10-17). A line in the wrap-up ("What did you order?"), kept with
-- that person's own review, shown on the restaurant page next to their score and on the next dinner card there.
-- Who may write it is the existing review rule: only the reviewer (or the host).
alter table reviews add column ordered text check (char_length(ordered) <= 200);
