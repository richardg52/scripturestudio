-- Table of 8 for sale (his order + GO, 2026-10-23: "setup Stripe (under the SmartestDesk) … when the customer add it
-- automatically uploads the new product … the core system and product is ready for sale"). Every family table now has
-- a plan and a list of features it has paid for; Stripe (functions/billing) is the only thing that changes them.
--   features: rooms games · dates · faith · live · outings · (watch — licensed, coming soon for customers)
--             premium getaways · tourney · rides · autopilot · topgolf · keepsake · (movies — licensed, coming soon)
--             'all' = every feature including the licensed ones (Dr. Clark's family and the test/demo families)
-- The app reads families.plan / features / seats (its own family only, by the existing fam_read rule) to show 🔒;
-- triggers below refuse a new game, party, trip… for a family that hasn't got the feature, whatever wrote it.
alter table public.families add column plan text, add column features text[] not null default '{}', add column seats smallint not null default 12,
  add column billing_status text;
update public.families set features = '{all}', plan = 'owner' where id in ('clark','zztest','zztest2','zzdemo');

-- Stripe's side: no phone reads it
create table public.billing (
  family_id text primary key references public.families on delete cascade,
  customer text, subscription text, plan text, cycle text, status text, period_end timestamptz,
  group_owner text references public.families on delete set null,   -- Church & Community: the table that pays for the group
  updated_at timestamptz not null default now());
create table public.billing_orders (                                  -- one table per paid checkout, however many times Stripe or the buyer knocks
  session_id text primary key, family_id text references public.families on delete set null, host_email text, created_at timestamptz not null default now());
alter table public.billing enable row level security; alter table public.billing_orders enable row level security;
revoke all on public.billing, public.billing_orders from anon, authenticated;

create or replace function private.family_has(p_family text, p_feature text) returns boolean language sql stable security definer set search_path = '' as
$$ select coalesce((select 'all' = any(f.features) or p_feature = any(f.features) from public.families f where f.id = p_family), false) $$;
revoke all on function private.family_has(text, text) from public;
grant execute on function private.family_has(text, text) to authenticated;

-- the backstop: a room or Premium feature the family hasn't got cannot be started, by any road
create or replace function private.feature_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.family_has(new.family_id, tg_argv[0]) then
    raise exception 'not_on_plan:%', tg_argv[0] using errcode = 'P0001';
  end if;
  return new;
end $$;
do $$ declare r record; begin
  for r in select * from (values ('games','games'),('feud_surveys','games'),('watch_parties','watch'),('dates','dates'),('prayers','faith'),('recipes','faith'),
      ('santa_exchanges','faith'),('live_asks','live'),('outings','outings'),('golf_outings','topgolf'),('movie_nights','movies'),('ride_offers','rides'),
      ('ride_asks','rides'),('tournaments','tourney'),('getaways','getaways'),('standing_dinners','autopilot')) v(t, f) loop
    execute format('create trigger %I before insert on public.%I for each row execute function private.feature_guard(%L)', 'plan_' || r.t, r.t, r.f);
  end loop; end $$;

-- seats: a family table holds the seats its plan pays for (12 included)
create or replace function private.seat_guard() returns trigger language plpgsql security definer set search_path = '' as $$
declare cap int; n int;
begin
  select seats into cap from public.families where id = new.family_id;
  if private.family_has(new.family_id, 'all') then return new; end if;
  select count(*) into n from public.members where family_id = new.family_id;
  if n >= coalesce(cap, 12) then raise exception 'seat_limit' using errcode = 'P0001'; end if;
  return new;
end $$;
create trigger members_seat_guard before insert on public.members for each row execute function private.seat_guard();

-- a table the owner approves or starts himself is his gift: every room and Premium feature (the licensed ones stay his)
create or replace function private.gift_features() returns text[] language sql immutable set search_path = '' as
$$ select array['games','dates','faith','live','outings','getaways','tourney','rides','autopilot','topgolf','keepsake'] $$;
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
  update public.families set plan = 'gift', features = private.gift_features() where id = x->>'family_id';
  update public.family_requests set status = 'approved', family_id = x->>'family_id', decided_by = c.id, decided_at = now() where id = r.id;
  if r.asked_by is not null then insert into public.alerts(to_member, text) values (r.asked_by, '🏡 ' || r.family_name || ' is approved. ' || split_part(r.name, ' ', 1) || ' can sign in with their email now.'); end if;
  return x;
end $$;
create or replace function public.owner_new_family(p_family text, p_name text, p_email text, p_mobile text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare x jsonb;
begin
  if not private.is_owner() then return jsonb_build_object('ok', false, 'code', 'not_owner'); end if;
  x := private.make_family(p_family, p_name, p_email, p_mobile, (private.caller()).id);
  if (x->>'ok')::boolean then update public.families set plan = 'gift', features = private.gift_features() where id = x->>'family_id'; end if;
  return x;
end $$;
-- the paid road makes the table the same way (functions/billing, service role only)
create or replace function public.billing_make_family(p_session text, p_family text, p_name text, p_email text, p_plan text, p_features text[], p_seats int,
  p_customer text, p_subscription text, p_cycle text, p_group_owner text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare x jsonb; fid text; em text := lower(btrim(coalesce(p_email, '')));
begin
  if p_session is not null then
    insert into public.billing_orders(session_id, host_email) values (p_session, em) on conflict do nothing;
    if not found then
      select family_id into fid from public.billing_orders where session_id = p_session;
      return jsonb_build_object('ok', true, 'family_id', fid, 'already', true);
    end if;
  end if;
  x := private.make_family(p_family, p_name, em, null, null);
  if not (x->>'ok')::boolean and x->>'code' = 'email_taken' then
    -- paid: never lose the table. Make it with a holding address and tell the owner to set the real one.
    x := private.make_family(p_family, p_name, 'fix-' || substr(md5(random()::text), 1, 10) || '@tableof8.invalid', null, null) || jsonb_build_object('email_taken', true);
    insert into public.alerts(to_member, text) select member_id, '💳 A paid table (' || left(p_family, 40) || ') used an email that already has a seat. Owner desk → set its host''s email.' from public.app_owners;
  end if;
  if not coalesce((x->>'ok')::boolean, false) then return x; end if;
  fid := x->>'family_id';
  update public.families set plan = p_plan, features = coalesce(p_features, '{}'), seats = greatest(12, coalesce(p_seats, 12)), billing_status = 'active' where id = fid;
  insert into public.billing(family_id, customer, subscription, plan, cycle, status, group_owner) values (fid, p_customer, p_subscription, p_plan, p_cycle, 'active', p_group_owner)
    on conflict (family_id) do update set customer = excluded.customer, subscription = excluded.subscription, plan = excluded.plan, cycle = excluded.cycle, status = 'active', updated_at = now();
  if p_session is not null then update public.billing_orders set family_id = fid where session_id = p_session; end if;
  return x;
end $$;
revoke all on function public.billing_make_family(text, text, text, text, text, text[], int, text, text, text, text) from public, anon, authenticated;
-- the owner sets any table's sign-in email (a paid table whose email was already taken, a typo at checkout)
create or replace function public.owner_set_email(p_member text, p_email text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare em text := lower(btrim(coalesce(p_email, '')));
begin
  if not private.is_owner() then return jsonb_build_object('ok', false, 'code', 'not_owner'); end if;
  if em !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then return jsonb_build_object('ok', false, 'code', 'email'); end if;
  if exists (select 1 from public.members where lower(btrim(email)) = em and id <> p_member) then return jsonb_build_object('ok', false, 'code', 'email_taken'); end if;
  update public.members set email = em where id = p_member;
  return jsonb_build_object('ok', found);
end $$;
revoke all on function public.owner_set_email(text, text) from public, anon;
grant execute on function public.owner_set_email(text, text) to authenticated;
-- functions/billing (service role only): a table whose subscription has ended closes, with a note on how to renew;
-- a renewed subscription opens it again. Every phone at a closed table is signed out at once. (applied as t8_billing_close)
create or replace function public.billing_family_state(p_family text, p_open boolean, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  update public.families set status = case when p_open then 'active' else 'off' end,
    off_note = case when p_open then null else left(coalesce(p_note, ''), 300) end,
    billing_status = case when p_open then 'active' else 'ended' end where id = p_family;
  if not p_open then delete from auth.sessions where user_id in (select user_id from public.members where family_id = p_family and user_id is not null); end if;
  return jsonb_build_object('ok', found);
end $$;
revoke all on function public.billing_family_state(text, boolean, text) from public, anon, authenticated;
alter publication supabase_realtime add table public.families;   -- an add-on bought on one phone opens on every phone at once
