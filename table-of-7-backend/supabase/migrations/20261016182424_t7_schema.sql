create extension if not exists pgcrypto with schema extensions;

create table families (id text primary key default gen_random_uuid()::text, name text not null default 'Table of 7');

create table members (
  id text primary key, family_id text not null references families,
  user_id uuid unique references auth.users on delete set null,
  name text not null, email text, mobile text, birthday date, diet text, color text,
  role text not null default 'member' check (role in ('host','member')),
  status text not null default 'active' check (status in ('active','suspended')),
  zelle text, cashtag text, applepay text, created_at timestamptz default now());
create unique index members_name_uniq on members (family_id, lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));

-- PINs live apart from members: RLS on, no policies, no grants. No phone can ever read them.
create table member_secrets (
  member_id text primary key references members on delete cascade,
  pin_hash text, fails smallint not null default 0, locked_until timestamptz, updated_at timestamptz default now());
create table signin_ip_attempts (ip text primary key, window_start timestamptz not null default now(), fails int not null default 0);

create table contacts (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  name text not null, relation text, email text, mobile text, banned boolean not null default false,
  added_by text references members on delete set null, created_at timestamptz default now());

create table restaurants (
  id text primary key, place_id text unique, name text not null, city text, neighborhood text,
  address text, price smallint, cuisines text[], meals text[], blurb text, menu_url text,
  first_seen date default current_date);

create table events (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  type text not null, mode text not null check (mode in ('vote','host')), host text references members,
  title text, date date not null, time time not null, dress text, note text,
  budget_cap smallint default 0, vote_ends timestamptz, chosen text references restaurants,
  arrive_by time, theme text, gifts text, adults_only boolean default false,
  excluded text[] not null default '{}',
  status text not null default 'open' check (status in ('open','set','done')), created_at timestamptz default now());
create table event_options (event_id text references events on delete cascade, restaurant_id text references restaurants, added_by text references members, primary key (event_id, restaurant_id));
create table votes (event_id text references events on delete cascade, member_id text references members on delete cascade, restaurant_id text references restaurants, cast_at timestamptz default now(), primary key (event_id, member_id));
create table rsvps (event_id text references events on delete cascade, member_id text references members on delete cascade, answer text check (answer in ('yes','maybe','no')), primary key (event_id, member_id));
create table guests (id text primary key default gen_random_uuid()::text, event_id text not null references events on delete cascade, contact_id text references contacts on delete set null, name text, email text, asked_by text references members on delete set null);
create table guest_hands (guest_id text references guests on delete cascade, member_id text references members on delete cascade, primary key (guest_id, member_id));
create table reservations (event_id text primary key references events on delete cascade, status text not null default 'none' check (status in ('none','claimed','booked')), by text references members, confirmation text, updated_at timestamptz default now());
create table arrivals (event_id text references events on delete cascade, member_id text references members on delete cascade, status text check (status in ('way','late','here')), eta_min smallint, at timestamptz default now(), primary key (event_id, member_id));
create table table_ready (event_id text primary key references events on delete cascade, by text references members, at timestamptz default now());
create table visits (id text primary key default gen_random_uuid()::text, family_id text not null references families, restaurant_id text references restaurants, date date, event_id text references events on delete set null);
create table reviews (id text primary key default gen_random_uuid()::text, family_id text not null references families, restaurant_id text references restaurants, member_id text references members on delete cascade, event_id text references events on delete set null, date date,
  food smallint, service smallint, price smallint, selection smallint, clean smallint, location smallint, text text,
  status text not null default 'ok' check (status in ('ok','held')));
create table payments (id text primary key default gen_random_uuid()::text, family_id text not null references families, event_id text references events on delete set null, restaurant_id text references restaurants, date date,
  payer text references members, mode text check (mode in ('all','for','split','self')), for_member text references members, amount numeric(10,2));
create table notes (id text primary key default gen_random_uuid()::text, family_id text not null references families, event_id text references events on delete cascade, member_id text references members on delete cascade, text text,
  status text not null default 'ok' check (status in ('ok','held')), at timestamptz default now());
create table media (id text primary key default gen_random_uuid()::text, family_id text not null references families, event_id text references events on delete set null, restaurant_id text references restaurants,
  kind text not null default 'photo' check (kind in ('photo','video','audio')), category text check (category in ('food','place','sights','family')),
  caption text, storage_path text not null, by text references members on delete set null,
  status text not null default 'pending' check (status in ('pending','approved')), at timestamptz default now());
create table cards (id text primary key default gen_random_uuid()::text, family_id text not null references families, by text references members on delete set null, media_id text references media on delete set null,
  style text check (style in ('keepsake','snapshot')), message text, event_id text references events on delete set null, recipients text[],
  status text not null default 'pending' check (status in ('pending','approved','declined','sent')), at timestamptz default now());
create table tabs (event_id text primary key references events on delete cascade, payer text not null references members,
  tax_rate numeric(5,2) default 9.75, auto_gratuity boolean default false, receipt_total numeric(10,2),
  check_no int, closed boolean not null default false, created_at timestamptz default now());
create table tab_tickets (event_id text references tabs on delete cascade, owner text references members on delete cascade,
  covers text[] not null, tip_pct smallint default 20,
  status text not null default 'draft' check (status in ('draft','sent','returned','confirmed','settled','payer')),
  return_note text, paid_via text, sent_at timestamptz, confirmed_at timestamptz, settled_at timestamptz,
  primary key (event_id, owner));
create table tab_lines (id text primary key default gen_random_uuid()::text, event_id text not null, owner text not null,
  category text check (category in ('Appetizer','Drink','Entrée','Side','Dessert','Other')),
  description text, amount numeric(10,2) not null check (amount > 0),
  foreign key (event_id, owner) references tab_tickets on delete cascade);
create table never_again (family_id text references families, restaurant_id text references restaurants, by text references members on delete set null, reason text, date date default current_date, primary key (family_id, restaurant_id));
create table alerts (id text primary key default gen_random_uuid()::text, to_member text not null references members on delete cascade, text text, event_id text references events on delete cascade, read boolean not null default false, at timestamptz default now());
create table push_subscriptions (member_id text not null references members on delete cascade, endpoint text primary key, keys jsonb, created_at timestamptz default now());

create index on alerts (to_member, at desc);
create index on votes (event_id); create index on rsvps (event_id); create index on arrivals (event_id);
create index on guests (event_id); create index on tab_lines (event_id, owner); create index on events (family_id, date);
