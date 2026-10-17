-- The plan guard stops a phone editing someone else's plan. The server's own vote actions
-- (open, warn, close) run on a phone's behalf, so they mark themselves trusted for that one
-- transaction. Phones cannot set this: only the public schema is reachable from outside.
-- (Found 2026-10-16 in the two-phone test: a member opening the 10-minute vote was refused by the guard.)
create or replace function private.g_events() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('t7.server_action', true) = 'on' then return new; end if;
  if private.is_host() then return new; end if;
  if tg_op = 'INSERT' then new.excluded := '{}'; return new; end if;
  if new.excluded is distinct from old.excluded then perform private.deny('Only the host can change who is invited.'); end if;
  if old.host = private.me() then return new; end if;
  if (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status') and old.status = 'set' and new.status = 'done' then return new; end if;
  perform private.deny('Only the person who made this plan can change it.');
end $$;

create or replace function public.open_live_vote(p_event text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.events; me text := private.me();
begin
  perform set_config('t7.server_action', 'on', true);
  select * into e from public.events where id = p_event for update;
  if not found or not private.acts(p_event) then return jsonb_build_object('ok',false,'code','no_event'); end if;
  if e.status <> 'open' then return jsonb_build_object('ok',false,'code','closed'); end if;
  if e.vote_ends is null then
    update public.events set vote_ends = now() + interval '10 minutes' where id = p_event returning * into e;
    perform private.alert_family(e, (select split_part(name,' ',1) from public.members where id = me) || ' opened the 10-minute vote for ' || coalesce(e.title,'dinner') || '. Vote now!', me);
    return jsonb_build_object('ok',true,'started',true,'vote_ends',e.vote_ends);
  end if;
  return jsonb_build_object('ok',true,'started',false,'vote_ends',e.vote_ends);
end $$;

create or replace function public.vote_warn(p_event text) returns void language plpgsql security definer set search_path = '' as $$
declare e public.events;
begin
  perform set_config('t7.server_action', 'on', true);
  select * into e from public.events where id = p_event for update;
  if not found or not private.sees(p_event) or e.status <> 'open' or e.warned2 or e.vote_ends is null or e.vote_ends - now() > interval '2 minutes' then return; end if;
  update public.events set warned2 = true where id = p_event;
  insert into public.alerts(to_member, text, event_id)
  select m.id, '2 minutes left to vote for ' || coalesce(e.title,'dinner') || '.', e.id from public.members m
  where m.family_id = e.family_id and m.status = 'active' and not (m.id = any(e.excluded))
    and not exists (select 1 from public.votes v where v.event_id = e.id and v.member_id = m.id);
end $$;

create or replace function public.close_vote(p_event text, p_force boolean default false) returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.events; me text := private.me(); n_voted int; n_active int; winner text; hv text; rname text;
begin
  perform set_config('t7.server_action', 'on', true);
  select * into e from public.events where id = p_event for update;
  if not found or not private.sees(p_event) then return jsonb_build_object('ok',false,'code','no_event'); end if;
  if e.status <> 'open' then return jsonb_build_object('ok',true,'chosen',e.chosen,'already',true); end if;
  select count(*) into n_voted from public.votes where event_id = e.id;
  select count(*) into n_active from public.members m where m.family_id = e.family_id and m.status = 'active' and not (m.id = any(e.excluded));
  if p_force then
    if not (private.is_host() or (e.host = me and private.active())) then return jsonb_build_object('ok',false,'code','not_host'); end if;
    if n_voted = 0 then return jsonb_build_object('ok',false,'code','no_votes'); end if;
  elsif not (e.vote_ends is not null and (now() >= e.vote_ends or n_voted >= n_active)) then
    return jsonb_build_object('ok',false,'code','still_open');
  end if;
  select restaurant_id into hv from public.votes where event_id = e.id and member_id = e.host;
  with tally as (
    select o.restaurant_id, o.pos, count(v.member_id) as n from public.event_options o
    left join public.votes v on v.event_id = o.event_id and v.restaurant_id = o.restaurant_id
    where o.event_id = e.id group by o.restaurant_id, o.pos),
  leaders as (select * from tally where n = (select max(n) from tally))
  select coalesce((select restaurant_id from leaders where restaurant_id = hv), (select restaurant_id from leaders order by pos, restaurant_id limit 1)) into winner;
  if winner is null then return jsonb_build_object('ok',false,'code','no_options'); end if;
  update public.events set chosen = winner, status = 'set' where id = e.id returning * into e;
  select name into rname from public.restaurants where id = winner;
  perform private.alert_family(e, 'The family chose ' || coalesce(rname, 'a place') || ' for ' || coalesce(e.title,'dinner') || '. See you at ' || to_char(e.time, 'FMHH12:MI AM') || '.', null);
  return jsonb_build_object('ok',true,'chosen',winner);
end $$;
