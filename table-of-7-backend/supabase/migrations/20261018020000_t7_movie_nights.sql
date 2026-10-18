-- Table of 7: Movie nights (his order, 2026-10-17): "choose a movie and see reviews and purchase tickets from the app and
-- then everybody going can pay the one person like the check does … or pay themselves … then send a receipt saying
-- movie, time, location and ticket information."
-- Phones may only READ these tables; every change goes through functions/movies, which checks who may do what.
-- The movie's title, poster and rating come from TMDB (stored for the plan). The theater is kept by its Google Place ID
-- only (Google's terms); its name and address are fetched live when shown.
create table movie_nights (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  created_by text references members on delete set null,
  movie jsonb not null,                       -- {id, title, poster, year, runtime, cert, rating}
  theater_pid text, city text,                 -- Google Place ID only
  date date not null, time text not null,      -- the showtime, "19:30"
  note text, dinner_event text references events on delete set null,
  invited text[] not null,
  status text not null default 'open' check (status in ('open','cancelled')),
  buyer text references members on delete set null,
  tickets jsonb,                               -- {count, each, fees, total, share, seats, conf, room, at}
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table movie_people (
  night_id text not null references movie_nights on delete cascade, member_id text not null references members on delete cascade,
  rsvp text check (rsvp in ('yes','maybe','no')),
  pay text check (pay in ('owe','sent','self','received')),
  amount numeric(8,2), via text, own jsonb,     -- own: a self-payer's {seats, conf}
  sent_at timestamptz, received_at timestamptz,
  primary key (night_id, member_id));
alter table movie_nights enable row level security;
alter table movie_people enable row level security;
create policy movie_nights_read on movie_nights for select to authenticated
  using (family_id = private.my_family() and (private.me() = any(invited) or private.is_host()));
create policy movie_people_read on movie_people for select to authenticated
  using (exists (select 1 from public.movie_nights n where n.id = night_id and n.family_id = private.my_family() and (private.me() = any(n.invited) or private.is_host())));
grant select on movie_nights, movie_people to authenticated;
revoke insert, update, delete on movie_nights, movie_people from anon, authenticated;
alter publication supabase_realtime add table movie_nights, movie_people;
