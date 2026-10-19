-- Table of 8: Memphis Grizzlies home games as a Family Outing kind (his order, 2026-10-19), with the game (and its official
-- Ticketmaster link) taken from the team's own schedule by functions/outings, never from the phone.
alter table public.outings drop constraint outings_kind_check;
alter table public.outings add constraint outings_kind_check check (kind in ('tigers','grizzlies','bowling','minigolf','zoo','escape','skating','arcade','museum','other'));
