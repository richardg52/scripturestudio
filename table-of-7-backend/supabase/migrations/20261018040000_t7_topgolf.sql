-- Table of 7: Topgolf outings (his order, 2026-10-18: "top golf outing like we do for the movies"). Built like Movie
-- Night: plan a date and time at a Topgolf, everyone answers, one person books the bay on Topgolf's own site, everyone
-- pays that person back (or pays for themselves), and each gets a receipt with the time, place and booking details.
-- Topgolf prices each bay by the hour (the rate depends on the venue, day and time; up to 6 play in a bay), so the app
-- never states a price: the booker enters the real total from their confirmation.
-- Phones may only READ these tables; every change goes through functions/golf. The venue is kept by its Google Place ID
-- only (Google's terms); its name, address, website and phone are fetched live when shown.
create table golf_outings (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  created_by text references members on delete set null,
  venue_pid text, city text,                   -- Google Place ID only
  date date not null, time text not null,      -- the tee time, "18:00"
  hours numeric(3,1) not null default 2 check (hours between 1 and 4),
  note text, dinner_event text references events on delete set null,
  invited text[] not null,
  status text not null default 'open' check (status in ('open','cancelled')),
  buyer text references members on delete set null,
  booking jsonb,                               -- {players, bays, bay_cost, extras, total, share, bay_no, conf, at}
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table golf_people (
  outing_id text not null references golf_outings on delete cascade, member_id text not null references members on delete cascade,
  rsvp text check (rsvp in ('yes','maybe','no')),
  pay text check (pay in ('owe','sent','self','received')),
  amount numeric(8,2), via text, own jsonb,     -- own: a self-payer's {conf}
  sent_at timestamptz, received_at timestamptz,
  primary key (outing_id, member_id));
alter table golf_outings enable row level security;
alter table golf_people enable row level security;
create policy golf_outings_read on golf_outings for select to authenticated
  using (family_id = private.my_family() and (private.me() = any(invited) or private.is_host()));
create policy golf_people_read on golf_people for select to authenticated
  using (exists (select 1 from public.golf_outings o where o.id = outing_id and o.family_id = private.my_family() and (private.me() = any(o.invited) or private.is_host())));
grant select on golf_outings, golf_people to authenticated;
revoke insert, update, delete on golf_outings, golf_people from anon, authenticated;
alter publication supabase_realtime add table golf_outings, golf_people;
