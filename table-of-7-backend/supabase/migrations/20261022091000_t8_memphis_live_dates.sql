-- Table of 8 (his order, 2026-10-22): Memphis Live, Date Night and the kids' Adventure Club.
--
-- MEMPHIS LIVE: what's on around Memphis (concerts, comedy, sports, theater, family and outdoor events) with the date,
-- time, place and the real ticket link, and a family "Who's in?".
--   live_events   one row per showing, read from the venues' own public calendars (and Ticketmaster once his key is in).
--                 Shared by every family; written only by functions/live.
--   live_sync     when each source was last read and what it said (the Host sees it; no phone reads it directly).
--   live_asks     someone asked the family "Who's in?" for a show.
--   live_answers  each person's Yes / Maybe / No, the showings (dates and times) that work for them, and a note.
-- DATE NIGHT and ADVENTURE CLUB:
--   dates         a planned date: a couple's evening (kind couple) or a child's date with a grown-up (kind kids).
--                 Only the two people in it can see it. Up to three stops (time, place, note).
-- Phones only READ; every write goes through functions/live and functions/dates.

create table live_events (
  id text primary key,                                  -- source:its own id (one per showing)
  source text not null check (source in ('ticketmaster','gpac','shell','overton')),
  title text not null, starts_at timestamptz not null, all_day boolean not null default false,
  venue text not null default '', address text not null default '',
  category text not null check (category in ('concert','comedy','sports','theater','family','outdoor')),
  price text not null default '', free boolean not null default false,
  ticket_url text not null default '', info_url text not null default '', image_url text not null default '',
  fetched_at timestamptz not null default now());
create index live_events_when on live_events (starts_at);
create table live_sync (
  source text primary key, ok boolean not null default false, count int not null default 0,
  note text not null default '', at timestamptz not null default now());

create table live_asks (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  event_id text not null, title text not null, venue text not null default '', starts_at timestamptz not null,
  ticket_url text not null default '', by_member text not null references members on delete cascade,
  note text, created_at timestamptz not null default now(),
  unique (family_id, event_id));
create table live_answers (
  ask_id text not null references live_asks on delete cascade, member_id text not null references members on delete cascade,
  family_id text not null references families,
  answer text not null check (answer in ('yes','maybe','no')),
  picks text[] not null default '{}',                   -- the showings (live_events ids) that work for them
  note text, updated_at timestamptz not null default now(),
  primary key (ask_id, member_id));

create table dates (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  kind text not null check (kind in ('couple','kids')),
  created_by text not null references members on delete cascade,
  partner text not null references members on delete cascade,      -- the other person in the date
  title text not null check (length(title) between 1 and 80),
  date date not null, time text not null default '',
  stops jsonb not null default '[]',                     -- [{time, place, rid?, note}] up to three
  idea text not null default '',                        -- the idea it came from (a mood or an adventure)
  status text not null default 'asked' check (status in ('asked','yes','other','done','cancelled')),
  reply text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (created_by <> partner));

alter table live_events enable row level security;
alter table live_sync enable row level security;      -- no policies: no phone reads or writes it
alter table live_asks enable row level security;
alter table live_answers enable row level security;
alter table dates enable row level security;
create policy live_events_read on live_events for select to authenticated using (private.my_family() is not null);
create policy live_asks_read on live_asks for select to authenticated using (family_id = private.my_family());
create policy live_answers_read on live_answers for select to authenticated using (family_id = private.my_family());
-- a date is between two people: nobody else sees it, the Host included
create policy dates_read on dates for select to authenticated using (
  family_id = private.my_family() and exists (select 1 from public.members m where m.user_id = auth.uid() and m.id in (dates.created_by, dates.partner)));
grant select on live_events, live_asks, live_answers, dates to authenticated;
revoke insert, update, delete on live_events, live_asks, live_answers, dates from anon, authenticated;
revoke all on live_sync from anon, authenticated;

alter publication supabase_realtime add table live_asks;
alter publication supabase_realtime add table live_answers;
alter publication supabase_realtime add table dates;
