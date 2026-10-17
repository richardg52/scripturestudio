-- Table of 7: Want to Try (his order, 2026-10-17). Anyone at the table saves a place they're curious about;
-- the list shows who added it, and the Concierge suggests from it first. One row per family and place.
-- A Google place is saved by its Place ID only (restaurants.source = 'google'), as everywhere else.
create table want_to_try (
  family_id text not null references families, restaurant_id text not null references restaurants on delete cascade,
  added_by text references members on delete set null, at timestamptz not null default now(),
  primary key (family_id, restaurant_id));
alter table want_to_try enable row level security;
create policy wt_read on want_to_try for select to authenticated using (family_id = private.my_family());
create policy wt_add on want_to_try for insert to authenticated with check (private.active() and family_id = private.my_family() and added_by = private.me());
create policy wt_del on want_to_try for delete to authenticated using (family_id = private.my_family() and (private.is_host() or (private.active() and added_by = private.me())));
grant select, insert, delete on want_to_try to authenticated;
alter publication supabase_realtime add table want_to_try;
