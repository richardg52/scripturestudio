-- Table of 7: Rides (his order, 2026-10-18: "I can drive 3" / "I need a ride", matched up, on any dinner or outing,
-- so everyone gets there, the young ones and the elders included). A ride belongs to one plan: a dinner (events), a
-- Family Outing, a Movie Night or a Topgolf outing; it goes when the plan goes.
--   ride_offers   a driver and how many seats they have (not counting themselves), when they leave, a note
--   ride_asks     a rider, how many are coming with them (party, the rider included), and their driver once matched
--   ride_pickups  where to pick the rider up. NO phone can read it: functions/rides hands it only to the rider and
--                 their own driver. The app holds no home addresses, so the rider types it when they ask.
-- Seeing a ride follows the plan: anyone who can see the plan sees its rides (excluded or uninvited members can't).
-- A car can never hold more than its seats: the trigger locks the driver's offer and counts before any match lands,
-- so two taps at the same moment can't both squeeze in. Phones may only READ; every write goes through functions/rides.
create table ride_offers (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  kind text not null check (kind in ('dinner','outing','movie','golf')), ref_id text not null,
  driver text not null references members on delete cascade,
  seats smallint not null check (seats between 1 and 7),
  leaving text, note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (kind, ref_id, driver));
create table ride_asks (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  kind text not null check (kind in ('dinner','outing','movie','golf')), ref_id text not null,
  rider text not null references members on delete cascade,
  party smallint not null default 1 check (party between 1 and 7),
  note text, driver text references members on delete set null, matched_at timestamptz,
  declined text[] not null default '{}',   -- drivers who let this rider go: never matched to them again
  created_at timestamptz not null default now(),
  unique (kind, ref_id, rider));
create table ride_pickups (
  ask_id text primary key references ride_asks on delete cascade,
  address text not null check (length(address) between 3 and 200), details text);

create or replace function private.ride_plan_visible(p_kind text, p_ref text) returns boolean language sql stable set search_path = '' as $$
  select case p_kind
    when 'dinner' then exists (select 1 from public.events where id = p_ref)
    when 'outing' then exists (select 1 from public.outings where id = p_ref)
    when 'movie'  then exists (select 1 from public.movie_nights where id = p_ref)
    when 'golf'   then exists (select 1 from public.golf_outings where id = p_ref)
    else false end $$;   -- invoker rights: the plan's own read rule decides

alter table ride_offers enable row level security;
alter table ride_asks enable row level security;
alter table ride_pickups enable row level security;   -- no policies: no phone reads or writes it
create policy ride_offers_read on ride_offers for select to authenticated using (family_id = private.my_family() and private.ride_plan_visible(kind, ref_id));
create policy ride_asks_read on ride_asks for select to authenticated using (family_id = private.my_family() and private.ride_plan_visible(kind, ref_id));
grant select on ride_offers, ride_asks to authenticated;
revoke insert, update, delete on ride_offers, ride_asks from anon, authenticated;
revoke all on ride_pickups from anon, authenticated;
grant execute on function private.ride_plan_visible(text, text) to authenticated;

-- the seat guard
create or replace function private.ride_seats_guard() returns trigger language plpgsql set search_path = '' as $$
declare cap int; used int;
begin
  if tg_table_name = 'ride_asks' then
    if new.driver is null then return new; end if;
    select seats into cap from public.ride_offers where kind = new.kind and ref_id = new.ref_id and driver = new.driver for update;
    if cap is null then raise exception 'ride_no_offer' using errcode = 'P0001'; end if;
    select coalesce(sum(party), 0) into used from public.ride_asks where kind = new.kind and ref_id = new.ref_id and driver = new.driver and id <> new.id;
    if used + new.party > cap then raise exception 'ride_full' using errcode = 'P0001'; end if;
  else
    perform 1 from public.ride_offers where id = new.id for update;
    select coalesce(sum(party), 0) into used from public.ride_asks where kind = new.kind and ref_id = new.ref_id and driver = new.driver;
    if used > new.seats then raise exception 'ride_full' using errcode = 'P0001'; end if;
  end if;
  return new;
end $$;
create trigger ride_asks_seats before insert or update of driver, party on ride_asks for each row execute function private.ride_seats_guard();
create trigger ride_offers_seats before update of seats on ride_offers for each row execute function private.ride_seats_guard();

-- a ride goes when its plan goes
create or replace function private.rides_gone() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.ride_asks where kind = tg_argv[0] and ref_id = old.id;
  delete from public.ride_offers where kind = tg_argv[0] and ref_id = old.id;
  return old;
end $$;
create trigger events_rides_gone after delete on events for each row execute function private.rides_gone('dinner');
create trigger outings_rides_gone after delete on outings for each row execute function private.rides_gone('outing');
create trigger movie_nights_rides_gone after delete on movie_nights for each row execute function private.rides_gone('movie');
create trigger golf_outings_rides_gone after delete on golf_outings for each row execute function private.rides_gone('golf');

alter publication supabase_realtime add table ride_offers, ride_asks;
