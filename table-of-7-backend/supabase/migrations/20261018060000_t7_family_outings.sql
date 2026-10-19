-- Table of 7: Family Outing (his order, 2026-10-18; plus "University of Memphis Tigers Basketball Games"). One planner
-- for bowling, a Tigers game, the zoo, mini golf, an escape room and more, built on the Topgolf Outing pattern: plan a
-- day and a place, everyone answers, one person books (tickets, a lane, a room) on the place's own site, everyone pays
-- that person back or pays their own way, and each gets a receipt. A Tigers outing carries the game from the Tigers'
-- official calendar (gotigersgo.com). The app never books and never moves money; the booker types the real cost.
-- Phones may only READ these tables; every change goes through functions/outings. The place is kept by its Google
-- Place ID only (Google's terms).
create table outings (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  created_by text references members on delete set null,
  kind text not null check (kind in ('tigers','bowling','minigolf','zoo','escape','skating','arcade','museum','other')),
  title text,                                  -- for "other", or a planner's own name
  game jsonb,                                  -- Tigers: {uid, opponent, home, location, start}
  place_pid text, city text,                   -- Google Place ID only
  date date not null, time text not null, hours numeric(3,1) check (hours between 0.5 and 8),
  note text, dinner_event text references events on delete set null,
  invited text[] not null,
  status text not null default 'open' check (status in ('open','cancelled')),
  buyer text references members on delete set null,
  booking jsonb,                               -- {count, each, extras, total, share, details, conf, at}
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table outing_people (
  outing_id text not null references outings on delete cascade, member_id text not null references members on delete cascade,
  rsvp text check (rsvp in ('yes','maybe','no')),
  pay text check (pay in ('owe','sent','self','received')),
  amount numeric(8,2), via text, own jsonb,
  sent_at timestamptz, received_at timestamptz,
  primary key (outing_id, member_id));
alter table outings enable row level security;
alter table outing_people enable row level security;
create policy outings_read on outings for select to authenticated
  using (family_id = private.my_family() and (private.me() = any(invited) or private.is_host()));
create policy outing_people_read on outing_people for select to authenticated
  using (exists (select 1 from public.outings o where o.id = outing_id and o.family_id = private.my_family() and (private.me() = any(o.invited) or private.is_host())));
grant select on outings, outing_people to authenticated;
revoke insert, update, delete on outings, outing_people from anon, authenticated;
alter publication supabase_realtime add table outings, outing_people;
