-- Table of 8: each Tigers home game's own buy page at the University of Memphis box office (his order, 2026-10-19:
-- "real purchase links"). The box office (gotigersgo.evenue.net) refuses requests from servers (403 to Supabase,
-- measured 2026-10-19; it also turns away other automated programs) and allows no cross-site reading from a phone, so
-- its list is read in a real browser, every link is checked to name its own game, and the result is kept here. Server only: no phone reads
-- it; functions/outings attaches the link to the game by the Tigers' calendar id (uid). A game not listed here opens
-- the box office's Tigers list instead (never a guessed link). Refresh: tests/refresh_tigers_tickets.mjs <a copy of the box
-- office page saved from a browser> prints the rows to load; run it when the box office adds or changes games, and at
-- the start of each season.
create table public.tigers_ticket_links (
  uid text primary key,                 -- the Tigers calendar's UID, e.g. vcal_20277-admin.gotigersgo.com
  game_date date not null, opponent text not null,
  url text not null check (url ~ '^https://gotigersgo\.evenue\.net/event/[A-Z0-9]+/[A-Z0-9]+$'),
  checked_at timestamptz not null default now());
alter table public.tigers_ticket_links enable row level security;   -- no policies: the server alone reads it
revoke all on public.tigers_ticket_links from anon, authenticated;
insert into public.tigers_ticket_links (uid, game_date, opponent, url) values
  ('vcal_20277-admin.gotigersgo.com', '2026-11-07', 'VCU', 'https://gotigersgo.evenue.net/event/B26/BK1'),
  ('vcal_20279-admin.gotigersgo.com', '2026-11-15', 'Louisville', 'https://gotigersgo.evenue.net/event/B26/BK2'),
  ('vcal_20280-admin.gotigersgo.com', '2026-11-22', 'Evansville', 'https://gotigersgo.evenue.net/event/B26/BK3'),
  ('vcal_20283-admin.gotigersgo.com', '2026-12-02', 'Jackson State', 'https://gotigersgo.evenue.net/event/B26/BK4'),
  ('vcal_20285-admin.gotigersgo.com', '2026-12-11', 'Grand Canyon', 'https://gotigersgo.evenue.net/event/B26/BK5'),
  ('vcal_20288-admin.gotigersgo.com', '2026-12-22', 'Little Rock', 'https://gotigersgo.evenue.net/event/B26/BK6'),
  ('vcal_20337-admin.gotigersgo.com', '2026-12-30', 'East Carolina', 'https://gotigersgo.evenue.net/event/B26/BK7'),
  ('vcal_20339-admin.gotigersgo.com', '2027-01-06', 'Rice', 'https://gotigersgo.evenue.net/event/B26/BK8'),
  ('vcal_20341-admin.gotigersgo.com', '2027-01-14', 'Wichita State', 'https://gotigersgo.evenue.net/event/B26/BK9'),
  ('vcal_20344-admin.gotigersgo.com', '2027-01-23', 'North Texas', 'https://gotigersgo.evenue.net/event/B26/BK10'),
  ('vcal_20347-admin.gotigersgo.com', '2027-02-07', 'UAB', 'https://gotigersgo.evenue.net/event/B26/BK11'),
  ('vcal_20348-admin.gotigersgo.com', '2027-02-11', 'Charlotte', 'https://gotigersgo.evenue.net/event/B26/BK12'),
  ('vcal_20287-admin.gotigersgo.com', '2027-02-20', 'Utah State', 'https://gotigersgo.evenue.net/event/B26/BK13'),
  ('vcal_20351-admin.gotigersgo.com', '2027-02-25', 'Tulsa', 'https://gotigersgo.evenue.net/event/B26/BK14'),
  ('vcal_20352-admin.gotigersgo.com', '2027-02-28', 'South Florida', 'https://gotigersgo.evenue.net/event/B26/BK15'),
  ('vcal_20354-admin.gotigersgo.com', '2027-03-07', 'Tulane', 'https://gotigersgo.evenue.net/event/B26/BK16');
