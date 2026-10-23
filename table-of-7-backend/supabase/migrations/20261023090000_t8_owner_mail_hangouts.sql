-- Table of 8 · 8.3 (his order, 2026-10-23):
--   1  "start a new family in the app"            → family_requests; the OWNER (Dr. Clark) approves, or starts one himself
--   2  "send direct message to certain members"    → mail / mail_box (Family Mail)
--      "invite … to a second event after a current (Hangouts) event … only a few"   → hangouts (after_of = the event it follows)
--   3  Getaways (couples or family, how many)       → getaways / getaway_people; outside invites ride on a hangout's share link
--   4  "send a private request … while you were away you got mail"   → mail kind 'request' (the pop-up is the app's)
--   5  "shut any member completely off immediately, permanently or temporary, with a message"   → status 'off' + member_off
--   7  "who's bringing what and estimated arrival time for each member"   → watch_people / hangout_people arrival columns
-- Phones only READ these tables; functions/{mail,hangouts,getaways,family,watch} and the RPCs below write them.

-- ── 5 · SHUT OFF ─────────────────────────────────────────────────────────────────────────────────────────────────
-- 'off' is not 'suspended' (paused: can look, can't act). Off: can't get in at all, and every read comes back empty.
alter table public.members drop constraint members_status_check;
alter table public.members add constraint members_status_check check (status in ('active','suspended','off'));
-- why and until when, kept apart from members so the rest of the family never reads the host's note
create table public.member_off (
  member_id text primary key references public.members on delete cascade,
  until timestamptz not null,                       -- 'infinity' = until someone turns them back on
  note text, by_member text references public.members on delete set null,
  at timestamptz not null default now(),
  prev text not null default 'active' check (prev in ('active','suspended')));
-- a whole family can be turned off by the owner (a table that stops paying, or asks to close)
alter table public.families add column status text not null default 'active' check (status in ('active','off')),
  add column off_note text, add column created_at timestamptz not null default now(), add column created_by text;
-- the owner of the app: Dr. Clark's seat. Only the database names an owner; no phone can add one.
create table public.app_owners (member_id text primary key references public.members on delete cascade);
insert into public.app_owners values ('m1');

create or replace function private.me() returns text language sql stable security definer set search_path = '' as
$$ select m.id from public.members m join public.families f on f.id = m.family_id
   where m.user_id = auth.uid() and m.status <> 'off' and f.status = 'active' $$;
create or replace function private.my_family() returns text language sql stable security definer set search_path = '' as
$$ select m.family_id from public.members m join public.families f on f.id = m.family_id
   where m.user_id = auth.uid() and m.status <> 'off' and f.status = 'active' $$;
create or replace function private.is_host() returns boolean language sql stable security definer set search_path = '' as
$$ select coalesce((select m.role = 'host' and m.status = 'active' and f.status = 'active' from public.members m
   join public.families f on f.id = m.family_id where m.user_id = auth.uid()), false) $$;
create or replace function private.active() returns boolean language sql stable security definer set search_path = '' as
$$ select coalesce((select m.status = 'active' and f.status = 'active' from public.members m
   join public.families f on f.id = m.family_id where m.user_id = auth.uid()), false) $$;
create or replace function private.is_owner() returns boolean language sql stable security definer set search_path = '' as
$$ select exists (select 1 from public.app_owners o join public.members m on m.id = o.member_id
   where m.user_id = auth.uid() and m.status = 'active') $$;
revoke all on function private.is_owner() from public;
grant execute on function private.is_owner() to authenticated;

-- status may move to or from 'off' only inside shut_off / turn_on / the expiry (they set t8.off for their own transaction)
create or replace function private.off_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status and 'off' in (old.status, new.status)
     and coalesce(current_setting('t8.off', true), '') <> '1' then
    raise exception 'off_owner_only' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger members_off_guard before update of status on public.members for each row execute function private.off_guard();
create or replace function private.g_members() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('t8.off', true), '') = '1' then return new; end if;
  if private.is_host() then
    if new.id = private.me() and (new.status <> 'active') then perform private.deny('The host cannot pause their own seat.'); end if;
    return new;
  end if;
  if new.status is distinct from old.status or new.name is distinct from old.name then
    perform private.deny('Only the host can rename or pause a seat.'); end if;
  return new;
end $$;
-- nothing reaches a seat that is paused or off
create or replace function private.g_alerts() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.members m where m.id = new.to_member and m.status in ('suspended','off')) then return null; end if;
  if new.event_id is not null and exists (select 1 from public.events e where e.id = new.event_id and new.to_member = any(e.excluded)) then return null; end if;
  new.at := now(); new.read := false; return new;
end $$;

-- the caller's own seat, read by auth.uid() so it answers even when they are off
create or replace function private.caller() returns public.members language sql stable security definer set search_path = '' as
$$ select * from public.members where user_id = auth.uid() $$;
revoke all on function private.caller() from public;

-- may the caller shut off / turn on this seat? the host inside their own family, the owner anywhere; never yourself, never the owner
create or replace function private.may_switch(t public.members) returns text language plpgsql stable security definer set search_path = '' as $$
declare c public.members := private.caller();
begin
  if c.id is null or c.status <> 'active' then return 'not_allowed'; end if;
  if t.id is null then return 'no_seat'; end if;
  if t.id = c.id then return 'self'; end if;
  if exists (select 1 from public.app_owners where member_id = t.id) then return 'owner'; end if;
  if private.is_owner() or (private.is_host() and t.family_id = private.my_family()) then return null; end if;
  return 'not_allowed';
end $$;

create or replace function public.shut_off(p_member text, p_until timestamptz default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.members; why text; c public.members := private.caller();
begin
  select * into t from public.members where id = p_member for update;
  why := private.may_switch(t); if why is not null then return jsonb_build_object('ok', false, 'code', why); end if;
  if p_until is not null and p_until <= now() then return jsonb_build_object('ok', false, 'code', 'past'); end if;
  insert into public.member_off(member_id, until, note, by_member, prev)
    values (t.id, coalesce(p_until, 'infinity'), left(nullif(btrim(coalesce(p_note, '')), ''), 300), c.id, case when t.status = 'suspended' then 'suspended' else 'active' end)
    on conflict (member_id) do update set until = excluded.until, note = excluded.note, by_member = excluded.by_member, at = now();
  perform set_config('t8.off', '1', true);
  update public.members set status = 'off' where id = t.id;
  -- immediately: every session that seat holds ends now (their phone can't refresh; the app shows the message)
  if t.user_id is not null then delete from auth.sessions where user_id = t.user_id; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.turn_on(p_member text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.members; why text; o public.member_off;
begin
  select * into t from public.members where id = p_member for update;
  why := private.may_switch(t); if why is not null then return jsonb_build_object('ok', false, 'code', why); end if;
  select * into o from public.member_off where member_id = t.id;
  perform set_config('t8.off', '1', true);
  update public.members set status = coalesce(o.prev, 'active') where id = t.id and status = 'off';
  delete from public.member_off where member_id = t.id;
  return jsonb_build_object('ok', true);
end $$;

-- a temporary shut-off ends by itself (every minute, and the moment that person tries to sign in)
create or replace function private.expire_offs(p_member text default null) returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform set_config('t8.off', '1', true);
  with gone as (delete from public.member_off o where o.until <= now() and (p_member is null or o.member_id = p_member) returning o.member_id, o.prev)
  update public.members m set status = g.prev from gone g where m.id = g.member_id and m.status = 'off';
  get diagnostics n = row_count; return n;
end $$;
revoke all on function private.expire_offs(text) from public, anon, authenticated;
select cron.schedule('t8-expire-offs', '* * * * *', 'select private.expire_offs()');

-- what the app shows: am I off? until when? the message. Also: am I the host, am I the owner.
create or replace function public.my_standing() returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.members; o public.member_off; f public.families; byn text;
begin
  c := private.caller(); if c.id is null then return jsonb_build_object('ok', false, 'code', 'no_seat'); end if;
  if c.status = 'off' then perform private.expire_offs(c.id); c := private.caller(); end if;
  select * into f from public.families where id = c.family_id;
  select * into o from public.member_off where member_id = c.id;
  select split_part(name, ' ', 1) into byn from public.members where id = o.by_member;
  return jsonb_build_object('ok', true, 'member_id', c.id, 'status', c.status, 'family', f.name, 'family_off', f.status = 'off', 'family_note', f.off_note,
    'until', case when o.until is null or o.until = 'infinity' then null else o.until end, 'forever', o.until = 'infinity', 'note', o.note, 'by', byn,
    'host', c.role = 'host', 'owner', exists (select 1 from public.app_owners where member_id = c.id));
end $$;

-- the host's (own family) / the owner's (every family) list of who is off, why, and until when
create or replace function public.off_list() returns table(member_id text, family_id text, until timestamptz, forever boolean, note text, by_name text, at timestamptz)
language sql stable security definer set search_path = '' as $$
  select o.member_id, m.family_id, case when o.until = 'infinity' then null else o.until end, o.until = 'infinity', o.note,
         (select split_part(b.name, ' ', 1) from public.members b where b.id = o.by_member), o.at
  from public.member_off o join public.members m on m.id = o.member_id
  where private.is_owner() or (private.is_host() and m.family_id = private.my_family()) $$;

-- ── 1 · NEW FAMILIES ─────────────────────────────────────────────────────────────────────────────────────────────
create table public.family_requests (
  id text primary key default gen_random_uuid()::text,
  family_name text not null check (length(btrim(family_name)) between 2 and 60),
  name text not null check (length(btrim(name)) between 2 and 80),
  email text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'), mobile text, note text,
  asked_by text references public.members on delete set null, ip text,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  family_id text references public.families on delete set null, decided_by text references public.members on delete set null, decided_at timestamptz,
  created_at timestamptz not null default now());
create unique index family_requests_one_pending on public.family_requests (lower(btrim(email))) where status = 'pending';

-- make the family and its host seat (the host signs in with this email and chooses their PIN)
create or replace function private.make_family(p_family text, p_name text, p_email text, p_mobile text, p_by text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare fid text; mid text; em text := lower(btrim(coalesce(p_email, '')));
begin
  if length(btrim(coalesce(p_family, ''))) < 2 then return jsonb_build_object('ok', false, 'code', 'family_name'); end if;
  if length(btrim(coalesce(p_name, ''))) < 2 then return jsonb_build_object('ok', false, 'code', 'name'); end if;
  if em !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then return jsonb_build_object('ok', false, 'code', 'email'); end if;
  if exists (select 1 from public.members where lower(btrim(email)) = em) then return jsonb_build_object('ok', false, 'code', 'email_taken'); end if;
  fid := left(trim(both '-' from lower(regexp_replace(btrim(p_family), '[^a-zA-Z0-9]+', '-', 'g'))), 30) || '-' || substr(md5(random()::text), 1, 5);
  mid := 'm-' || substr(md5(random()::text), 1, 10);
  insert into public.families(id, name, created_by) values (fid, left(btrim(p_family), 60), p_by);
  insert into public.members(id, family_id, name, email, mobile, role, status)
    values (mid, fid, left(regexp_replace(btrim(p_name), '\s+', ' ', 'g'), 80), em, nullif(btrim(coalesce(p_mobile, '')), ''), 'host', 'active');
  return jsonb_build_object('ok', true, 'family_id', fid, 'member_id', mid);
end $$;
revoke all on function private.make_family(text, text, text, text, text) from public, anon, authenticated;

create or replace function public.owner_decide(p_request text, p_ok boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.family_requests; c public.members := private.caller(); x jsonb;
begin
  if not private.is_owner() then return jsonb_build_object('ok', false, 'code', 'not_owner'); end if;
  select * into r from public.family_requests where id = p_request for update;
  if r.id is null or r.status <> 'pending' then return jsonb_build_object('ok', false, 'code', 'no_request'); end if;
  if not p_ok then
    update public.family_requests set status = 'declined', decided_by = c.id, decided_at = now() where id = r.id;
    return jsonb_build_object('ok', true);
  end if;
  x := private.make_family(r.family_name, r.name, r.email, r.mobile, c.id);
  if not (x->>'ok')::boolean then return x; end if;
  update public.family_requests set status = 'approved', family_id = x->>'family_id', decided_by = c.id, decided_at = now() where id = r.id;
  if r.asked_by is not null then insert into public.alerts(to_member, text) values (r.asked_by, '🏡 ' || r.family_name || ' is approved. ' || split_part(r.name, ' ', 1) || ' can sign in with their email now.'); end if;
  return x;
end $$;

create or replace function public.owner_new_family(p_family text, p_name text, p_email text, p_mobile text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_owner() then return jsonb_build_object('ok', false, 'code', 'not_owner'); end if;
  return private.make_family(p_family, p_name, p_email, p_mobile, (private.caller()).id);
end $$;

-- the owner turns a whole family off or on (never the owner's own)
create or replace function public.owner_family_set(p_family text, p_on boolean, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_owner() then return jsonb_build_object('ok', false, 'code', 'not_owner'); end if;
  if p_family = (private.caller()).family_id then return jsonb_build_object('ok', false, 'code', 'own_family'); end if;
  update public.families set status = case when p_on then 'active' else 'off' end, off_note = case when p_on then null else left(nullif(btrim(coalesce(p_note, '')), ''), 300) end where id = p_family;
  if not found then return jsonb_build_object('ok', false, 'code', 'no_family'); end if;
  if not p_on then delete from auth.sessions where user_id in (select user_id from public.members where family_id = p_family and user_id is not null); end if;
  return jsonb_build_object('ok', true);
end $$;

-- the owner's desk: every family, its seats, and the requests
create or replace function public.owner_desk() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_owner() then return jsonb_build_object('ok', false, 'code', 'not_owner'); end if;
  return jsonb_build_object('ok', true,
    'families', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'status', f.status, 'note', f.off_note, 'created', f.created_at,
        'seats', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'role', m.role, 'status', m.status) order by m.role, m.name), '[]') from public.members m where m.family_id = f.id))
        order by f.created_at) from public.families f), '[]'),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'family_name', r.family_name, 'name', r.name, 'email', r.email, 'mobile', r.mobile, 'note', r.note,
        'status', r.status, 'at', r.created_at, 'asked_by', (select m.name from public.members m where m.id = r.asked_by)) order by r.created_at desc)
        from public.family_requests r where r.status = 'pending' or r.decided_at > now() - interval '30 days'), '[]'));
end $$;

-- ── 2 & 4 · FAMILY MAIL ──────────────────────────────────────────────────────────────────────────────────────────
create table public.mail (
  id text primary key default gen_random_uuid()::text, family_id text not null references public.families,
  from_member text not null references public.members on delete cascade, to_members text[] not null check (cardinality(to_members) between 1 and 40),
  kind text not null default 'note' check (kind in ('note','request','hug')),
  subject text check (length(subject) <= 120), body text not null check (length(body) between 1 and 4000),
  thread text, created_at timestamptz not null default now());
create table public.mail_box (
  mail_id text not null references public.mail on delete cascade, member_id text not null references public.members on delete cascade,
  family_id text not null references public.families, read_at timestamptz,
  answer text check (answer in ('yes','no')), answer_note text check (length(answer_note) <= 500), answered_at timestamptz,
  archived boolean not null default false, primary key (mail_id, member_id));
create index on public.mail (family_id, created_at desc);
create index on public.mail_box (member_id, read_at);

-- ── 2 & 3 · HANGOUTS (a few people; "after" the current event; or a Getaway stop) ─────────────────────────────────
create table public.hangouts (
  id text primary key default gen_random_uuid()::text, family_id text not null references public.families,
  created_by text not null references public.members on delete cascade,
  title text not null check (length(title) between 1 and 120),
  place jsonb not null default '{}',              -- name, address, maps, menu, website, reviews (our own fields, no Google data stored)
  date date not null, time text not null default '', dress text, cost_pp numeric(8,2), note text,
  invited text[] not null default '{}',
  after_of jsonb,                                 -- {kind, id, title}: the event this one follows ("after the game…")
  src text,                                       -- where it was started: restaurant / couples / getaway / live / free
  share_token text unique,                        -- the outside-invite link (null = no link)
  status text not null default 'open' check (status in ('open','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.hangout_people (
  hangout_id text not null references public.hangouts on delete cascade, member_id text not null references public.members on delete cascade,
  family_id text not null references public.families, rsvp text check (rsvp in ('yes','maybe','no')),
  plan_at text, way_min smallint, way_at timestamptz, here_at timestamptz,
  updated_at timestamptz not null default now(), primary key (hangout_id, member_id));
-- people outside the app who answered through the link (first name only)
create table public.hangout_guests (
  id text primary key default gen_random_uuid()::text, hangout_id text not null references public.hangouts on delete cascade,
  name text not null check (length(name) between 1 and 60), rsvp text not null check (rsvp in ('yes','maybe','no')),
  note text check (length(note) <= 300), at timestamptz not null default now());
-- ── 7 · ARRIVAL TIMES on watch parties, and the house's address for directions ─────────────────────────────────
alter table public.watch_parties add column address text;
alter table public.watch_people add column plan_at text, add column way_min smallint, add column way_at timestamptz, add column here_at timestamptz;

-- ── 3 · GETAWAYS ─────────────────────────────────────────────────────────────────────────────────────────────────
create table public.getaways (
  id text primary key default gen_random_uuid()::text, family_id text not null references public.families,
  created_by text not null references public.members on delete cascade,
  city text not null, title text not null check (length(title) between 1 and 120),
  start date not null, nights smallint not null check (nights between 1 and 14),
  travel text not null default 'drive' check (travel in ('drive','fly')), tier text not null default 'mid' check (tier in ('mid','upscale')),
  adults smallint not null default 2 check (adults between 1 and 30), kids smallint not null default 0 check (kids between 0 and 30),
  invited text[] not null default '{}', plan jsonb not null default '{}', estimate jsonb not null default '{}', note text,
  status text not null default 'open' check (status in ('open','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.getaway_people (
  getaway_id text not null references public.getaways on delete cascade, member_id text not null references public.members on delete cascade,
  family_id text not null references public.families, rsvp text check (rsvp in ('yes','maybe','no')),
  updated_at timestamptz not null default now(), primary key (getaway_id, member_id));

-- public link / request limits (no phone reads it)
create table public.rate_hits (k text not null, at timestamptz not null default now());
create index on public.rate_hits (k, at);

-- ── READS ────────────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.member_off enable row level security;
alter table public.app_owners enable row level security;
alter table public.family_requests enable row level security;
alter table public.mail enable row level security;
alter table public.mail_box enable row level security;
alter table public.hangouts enable row level security;
alter table public.hangout_people enable row level security;
alter table public.hangout_guests enable row level security;
alter table public.getaways enable row level security;
alter table public.getaway_people enable row level security;
alter table public.rate_hits enable row level security;
revoke all on public.member_off, public.app_owners, public.family_requests, public.rate_hits from anon, authenticated;
revoke all on public.mail, public.mail_box, public.hangouts, public.hangout_people, public.hangout_guests, public.getaways, public.getaway_people from anon;
revoke insert, update, delete on public.mail, public.mail_box, public.hangouts, public.hangout_people, public.hangout_guests, public.getaways, public.getaway_people from authenticated;
grant select on public.mail, public.mail_box, public.hangouts, public.hangout_people, public.hangout_guests, public.getaways, public.getaway_people to authenticated;

-- mail: only the sender and the people it was sent to. Not the host, not the owner.
create policy mail_read on public.mail for select to authenticated using (
  family_id = private.my_family() and (from_member = private.me() or private.me() = any(to_members)));
create policy mail_box_read on public.mail_box for select to authenticated using (
  family_id = private.my_family() and exists (select 1 from public.mail m where m.id = mail_box.mail_id));
-- hangouts and getaways: the people invited, whoever planned it, and the host (as with watch parties)
create policy hangouts_read on public.hangouts for select to authenticated using (
  family_id = private.my_family() and (private.me() = any(invited) or created_by = private.me() or private.is_host()));
create policy hangout_people_read on public.hangout_people for select to authenticated using (
  family_id = private.my_family() and exists (select 1 from public.hangouts h where h.id = hangout_people.hangout_id));
create policy hangout_guests_read on public.hangout_guests for select to authenticated using (
  exists (select 1 from public.hangouts h where h.id = hangout_guests.hangout_id));
create policy getaways_read on public.getaways for select to authenticated using (
  family_id = private.my_family() and (private.me() = any(invited) or created_by = private.me() or private.is_host()));
create policy getaway_people_read on public.getaway_people for select to authenticated using (
  family_id = private.my_family() and exists (select 1 from public.getaways g where g.id = getaway_people.getaway_id));

revoke all on function public.shut_off(text, timestamptz, text), public.turn_on(text), public.my_standing(), public.off_list(),
  public.owner_decide(text, boolean), public.owner_new_family(text, text, text, text), public.owner_family_set(text, boolean, text), public.owner_desk() from public, anon;
grant execute on function public.shut_off(text, timestamptz, text), public.turn_on(text), public.my_standing(), public.off_list(),
  public.owner_decide(text, boolean), public.owner_new_family(text, text, text, text), public.owner_family_set(text, boolean, text), public.owner_desk() to authenticated;
revoke all on function private.may_switch(public.members) from public;

alter publication supabase_realtime add table public.mail, public.mail_box, public.hangouts, public.hangout_people, public.hangout_guests, public.getaways, public.getaway_people;
