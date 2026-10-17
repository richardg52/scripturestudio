-- 2b: what the screens need to share one table

alter table event_options add column pos smallint not null default 0;
alter table events add column warned2 boolean not null default false;
alter table payments drop constraint payments_mode_check;
alter table payments add constraint payments_mode_check check (mode in ('all','for','split','self','tab'));
alter table cards add column upload_path text, add column restaurant_id text references restaurants;
create table radar_sent (family_id text references families, key text, at timestamptz default now(), primary key (family_id, key));
alter table radar_sent enable row level security;
revoke all on radar_sent from anon, authenticated;

-- removing a seat must not be blocked by history that names them
alter table events drop constraint events_host_fkey, add constraint events_host_fkey foreign key (host) references members on delete set null;
alter table reservations drop constraint reservations_by_fkey, add constraint reservations_by_fkey foreign key (by) references members on delete set null;
alter table table_ready drop constraint table_ready_by_fkey, add constraint table_ready_by_fkey foreign key (by) references members on delete set null;
alter table event_options drop constraint event_options_added_by_fkey, add constraint event_options_added_by_fkey foreign key (added_by) references members on delete set null;
alter table payments drop constraint payments_payer_fkey, add constraint payments_payer_fkey foreign key (payer) references members on delete set null;
alter table payments drop constraint payments_for_member_fkey, add constraint payments_for_member_fkey foreign key (for_member) references members on delete set null;
alter table tabs alter column payer drop not null;
alter table tabs drop constraint tabs_payer_fkey, add constraint tabs_payer_fkey foreign key (payer) references members on delete set null;

-- events: anyone on the plan may mark it done after the wrap-up; everything else stays with its host
drop policy ev_edit on events;
create policy ev_edit on events for update to authenticated
  using (family_id = private.my_family() and (private.is_host() or private.acts(id)))
  with check (family_id = private.my_family());
create or replace function private.g_events() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.is_host() then return new; end if;
  if tg_op = 'INSERT' then new.excluded := '{}'; return new; end if;
  if new.excluded is distinct from old.excluded then perform private.deny('Only the host can change who is invited.'); end if;
  if old.host = private.me() then return new; end if;
  if (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status') and old.status = 'set' and new.status = 'done' then return new; end if;
  perform private.deny('Only the person who made this plan can change it.');
end $$;

-- the host clears a member's vote and RSVP when taking them off a plan
create policy vote_host_del on votes for delete to authenticated using (private.is_host() and private.sees(event_id));
create policy rsvp_host_del on rsvps for delete to authenticated using (private.is_host() and private.sees(event_id));

-- the family log of who paid: anyone at the table may correct an event's line
drop policy pay_del on payments;
create policy pay_del on payments for delete to authenticated using (private.active() and family_id = private.my_family());
-- Never Again: whoever added it, or the host, may take it off
drop policy na_del on never_again;
create policy na_del on never_again for delete to authenticated using (private.is_host() or (private.active() and by = private.me()));

-- The Tab: anyone on the plan may name the payer; after that the payer (or host) runs it
drop policy tab_add on tabs; drop policy tab_edit on tabs;
create policy tab_add on tabs for insert to authenticated with check (private.acts(event_id)
  and (payer is null or exists (select 1 from members m where m.id = payer and m.family_id = private.my_family())));
create policy tab_edit on tabs for update to authenticated using (private.active() and private.sees(event_id) and (payer is null or payer = private.me() or private.is_host() or private.acts(event_id)));
create policy tab_del on tabs for delete to authenticated using (private.is_host() or payer = private.me());
create or replace function private.g_tabs() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.is_host() or old.payer is null or old.payer = private.me() then return new; end if;
  -- anyone else may only name a payer when the current one steps aside; nothing else
  perform private.deny('Only the payer can change this tab.');
end $$;
create trigger g_tabs before update on public.tabs for each row when (auth.role() = 'authenticated') execute function private.g_tabs();

drop policy tkt_add on tab_tickets;
create policy tkt_add on tab_tickets for insert to authenticated with check (private.acts(event_id) and (owner = private.me()
  or exists (select 1 from tabs t where t.event_id = tab_tickets.event_id and (t.payer = private.me() or t.payer = tab_tickets.owner))));
drop policy tkt_edit on tab_tickets;
create policy tkt_edit on tab_tickets for update to authenticated using (private.active() and private.sees(event_id));
drop policy line_w on tab_lines;
create policy line_w on tab_lines for all to authenticated
  using (owner = private.me() and private.active() and exists (select 1 from tab_tickets k where k.event_id = tab_lines.event_id and k.owner = tab_lines.owner and k.status in ('draft','returned','payer')))
  with check (owner = private.me() and private.active() and exists (select 1 from tab_tickets k where k.event_id = tab_lines.event_id and k.owner = tab_lines.owner and k.status in ('draft','returned','payer')));

create or replace function private.g_tickets() returns trigger language plpgsql security definer set search_path = '' as $$
declare payer text; me text := private.me();
begin
  select t.payer into payer from public.tabs t where t.event_id = new.event_id;
  if (select closed from public.tabs where event_id = new.event_id) then perform private.deny('This tab is closed.'); end if;
  if tg_op = 'INSERT' then
    new.status := case when new.owner = payer then 'payer' else 'draft' end; return new;
  end if;
  -- following the tab's payer: the payer's ticket is 'payer'; a former payer's goes back to draft
  if new.status = 'payer' and new.owner = payer and (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status') then return new; end if;
  if old.status = 'payer' and new.status = 'draft' and new.owner is distinct from payer and (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status') then return new; end if;
  if new.status = old.status then
    if me = new.owner and old.status in ('draft','returned','payer') then return new; end if;
    if me = new.owner and old.status = 'confirmed' and new.covers = old.covers and new.tip_pct = old.tip_pct then return new; end if;  -- "I paid by Zelle"
    perform private.deny('This ticket can no longer be changed.');
  end if;
  if me = new.owner and old.status in ('draft','returned') and new.status = 'sent' then new.sent_at := now(); return new; end if;
  if me = new.owner and old.status = 'sent' and new.status = 'draft' then return new; end if;                                       -- un-send before the payer acts
  if me = payer and old.status = 'sent' and new.status = 'confirmed' then new.confirmed_at := now(); return new; end if;
  if me = payer and old.status = 'sent' and new.status = 'returned' then return new; end if;
  if me = payer and old.status = 'confirmed' and new.status = 'settled' then new.settled_at := now(); return new; end if;
  perform private.deny('Only the payer can confirm, send back or settle a ticket.');
end $$;

-- ===== Server actions: things that belong to the whole table happen once, here =====
create or replace function private.alert_family(e public.events, msg text, skip text) returns void language sql security definer set search_path = '' as $$
  insert into public.alerts(to_member, text, event_id)
  select m.id, msg, e.id from public.members m
  where m.family_id = e.family_id and m.status = 'active' and m.id is distinct from skip and not (m.id = any(e.excluded));
$$;

-- (open_live_vote, vote_warn and close_vote were first created here; their current bodies are in
--  20261016185302_t7_2b_server_actions_trusted.sql, which replaced them the same day.)
create or replace function public.open_live_vote(p_event text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.events; me text := private.me();
begin
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

-- Birthday radar: the first phone to notice claims it; only that phone sends the reminder
create or replace function public.radar_claim(p_key text) returns boolean language plpgsql security definer set search_path = '' as $$
declare fam text := private.my_family(); n int;
begin
  if fam is null or not private.active() then return false; end if;
  insert into public.radar_sent(family_id, key) values (fam, p_key) on conflict do nothing;
  get diagnostics n = row_count; return n = 1;
end $$;

revoke all on function public.open_live_vote(text), public.vote_warn(text), public.close_vote(text, boolean), public.radar_claim(text) from public, anon;
grant execute on function public.open_live_vote(text), public.vote_warn(text), public.close_vote(text, boolean), public.radar_claim(text) to authenticated;
revoke all on function private.alert_family(public.events, text, text) from public;

alter publication supabase_realtime add table guests, notes, reviews, visits, payments, never_again, contacts, members, tabs, tab_lines, cards;
