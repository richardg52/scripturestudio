-- Table of 8 (his order, 2026-10-22): "a section with Netflix and Chill and Big Game Night of the week — NFL Thursday,
-- Sunday evening and Monday night games only — who's house, what we will bring. Use logos where you can."
--   watch_parties  one night in: kind netflix (a Netflix movie or show) or game (a prime-time NFL game); whose house it is,
--                  the day and time, who is invited (the planner picks), and the "what we'll bring" list (needs).
--   watch_people   each invited person's answer (yes / maybe / no) and what they're bringing.
-- Only the people invited (and the planner, and the host) can see a party. Phones only READ; functions/watch writes.
create table watch_parties (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  kind text not null check (kind in ('netflix','game')),
  ref text not null default '',                          -- TMDB id (netflix) or the ESPN game id (game)
  title text not null check (length(title) between 1 and 120),
  info jsonb not null default '{}',                      -- poster / team logos / network / kickoff, as shown on the card
  date date not null, time text not null default '',
  at_member text not null references members on delete cascade,   -- whose house
  created_by text not null references members on delete cascade,
  invited text[] not null default '{}',
  needs text[] not null default '{}',                    -- the "what we'll bring" list
  note text, status text not null default 'open' check (status in ('open','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table watch_people (
  party_id text not null references watch_parties on delete cascade, member_id text not null references members on delete cascade,
  family_id text not null references families,
  rsvp text check (rsvp in ('yes','maybe','no')),
  bring text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (party_id, member_id));

alter table watch_parties enable row level security;
alter table watch_people enable row level security;
create policy watch_parties_read on watch_parties for select to authenticated using (
  family_id = private.my_family() and (private.me() = any(invited) or created_by = private.me() or private.is_host()));
create policy watch_people_read on watch_people for select to authenticated using (
  family_id = private.my_family() and exists (select 1 from public.watch_parties p where p.id = watch_people.party_id));
grant select on watch_parties, watch_people to authenticated;
revoke insert, update, delete on watch_parties, watch_people from anon, authenticated;
alter publication supabase_realtime add table watch_parties;
alter publication supabase_realtime add table watch_people;
