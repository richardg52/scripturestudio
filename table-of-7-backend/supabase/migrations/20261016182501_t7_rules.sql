create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.me() returns text language sql stable security definer set search_path = '' as
$$ select id from public.members where user_id = auth.uid() $$;
create or replace function private.my_family() returns text language sql stable security definer set search_path = '' as
$$ select family_id from public.members where user_id = auth.uid() $$;
create or replace function private.is_host() returns boolean language sql stable security definer set search_path = '' as
$$ select coalesce((select role = 'host' and status = 'active' from public.members where user_id = auth.uid()), false) $$;
create or replace function private.active() returns boolean language sql stable security definer set search_path = '' as
$$ select coalesce((select status = 'active' from public.members where user_id = auth.uid()), false) $$;
-- can see an event: same family and not taken off it (the host always sees)
create or replace function private.sees(e text) returns boolean language sql stable security definer set search_path = '' as
$$ select exists (select 1 from public.events ev where ev.id = e and ev.family_id = private.my_family()
     and (not (private.me() = any(ev.excluded)) or private.is_host())) $$;
-- may act on an event: sees it, is on it, and is not paused
create or replace function private.acts(e text) returns boolean language sql stable security definer set search_path = '' as
$$ select private.active() and exists (select 1 from public.events ev where ev.id = e and ev.family_id = private.my_family()
     and not (private.me() = any(ev.excluded))) $$;
revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

-- RLS on every table; anon gets nothing, ever.
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop; end $$;
revoke all on member_secrets, signin_ip_attempts from authenticated;

-- families / members
create policy fam_read on families for select to authenticated using (id = private.my_family());
create policy mem_read on members for select to authenticated using (family_id = private.my_family());
create policy mem_edit on members for update to authenticated using (private.active() and (id = private.me() or private.is_host())) with check (family_id = private.my_family());
create policy mem_add on members for insert to authenticated with check (private.is_host() and family_id = private.my_family());
create policy mem_del on members for delete to authenticated using (private.is_host() and family_id = private.my_family() and id <> private.me());
revoke update on members from authenticated;
grant update (name, email, mobile, birthday, diet, color, zelle, cashtag, applepay, status) on members to authenticated;

-- contacts
create policy con_read on contacts for select to authenticated using (family_id = private.my_family());
create policy con_add on contacts for insert to authenticated with check (private.active() and family_id = private.my_family() and added_by = private.me());
create policy con_edit on contacts for update to authenticated using (private.active() and family_id = private.my_family() and (added_by = private.me() or private.is_host()));
create policy con_del on contacts for delete to authenticated using (private.active() and family_id = private.my_family() and (added_by = private.me() or private.is_host()));

-- restaurants
create policy res_read on restaurants for select to authenticated using (true);
create policy res_add on restaurants for insert to authenticated with check (private.active());
create policy res_edit on restaurants for update to authenticated using (private.is_host());

-- events
create policy ev_read on events for select to authenticated using (private.sees(id));
create policy ev_add on events for insert to authenticated with check (private.active() and family_id = private.my_family() and host = private.me());
create policy ev_edit on events for update to authenticated using (private.is_host() or (private.acts(id) and host = private.me()));
create policy ev_del on events for delete to authenticated using (private.is_host() or (private.acts(id) and host = private.me()));

-- per-event rows: read if you can see the event
do $$ declare t text; begin
  foreach t in array array['event_options','votes','rsvps','guests','reservations','arrivals','table_ready','tabs','tab_tickets','tab_lines'] loop
    execute format('create policy %I on public.%I for select to authenticated using (private.sees(event_id))', t || '_read', t);
  end loop; end $$;
create policy gh_read on guest_hands for select to authenticated using (exists (select 1 from guests g where g.id = guest_id and private.sees(g.event_id)));

create policy opt_add on event_options for insert to authenticated with check (private.acts(event_id) and added_by = private.me());
create policy opt_del on event_options for delete to authenticated using (private.is_host() or added_by = private.me());

-- your own vote, RSVP, check-in, raised hand: only for yourself
create policy vote_w on votes for all to authenticated using (member_id = private.me() and private.acts(event_id)) with check (member_id = private.me() and private.acts(event_id));
create policy rsvp_w on rsvps for all to authenticated using (member_id = private.me() and private.acts(event_id)) with check (member_id = private.me() and private.acts(event_id));
create policy arr_w on arrivals for all to authenticated using (member_id = private.me() and private.acts(event_id)) with check (member_id = private.me() and private.acts(event_id));
create policy gh_w on guest_hands for all to authenticated
  using (member_id = private.me() and exists (select 1 from guests g where g.id = guest_id and private.acts(g.event_id)))
  with check (member_id = private.me() and exists (select 1 from guests g where g.id = guest_id and private.acts(g.event_id)));

create policy guest_add on guests for insert to authenticated with check (private.acts(event_id) and asked_by = private.me()
  and (contact_id is null or not exists (select 1 from contacts c where c.id = contact_id and c.banned)));
create policy guest_del on guests for delete to authenticated using (private.is_host() or (asked_by = private.me() and private.acts(event_id)));

-- reservations: whoever claims it holds it; nobody books over them (the host can clear it)
create policy rsv_add on reservations for insert to authenticated with check (private.acts(event_id) and (by is null or by = private.me()));
create policy rsv_edit on reservations for update to authenticated
  using (private.is_host() or (private.acts(event_id) and (by is null or by = private.me() or status = 'none')))
  with check (private.is_host() or by is null or by = private.me());

create policy tr_add on table_ready for insert to authenticated with check (private.acts(event_id) and by = private.me());
create policy tr_del on table_ready for delete to authenticated using (private.is_host() or by = private.me());

-- family-wide history
create policy vis_read on visits for select to authenticated using (family_id = private.my_family());
create policy vis_add on visits for insert to authenticated with check (private.active() and family_id = private.my_family());
create policy vis_del on visits for delete to authenticated using (private.is_host());

create policy rev_read on reviews for select to authenticated using (family_id = private.my_family() and (status = 'ok' or member_id = private.me() or private.is_host()));
create policy rev_add on reviews for insert to authenticated with check (private.active() and family_id = private.my_family() and member_id = private.me());
create policy rev_edit on reviews for update to authenticated using (private.is_host() or (private.active() and member_id = private.me()));
create policy rev_del on reviews for delete to authenticated using (private.is_host() or (private.active() and member_id = private.me()));

create policy note_read on notes for select to authenticated using (family_id = private.my_family() and (status = 'ok' or member_id = private.me() or private.is_host()) and (event_id is null or private.sees(event_id)));
create policy note_add on notes for insert to authenticated with check (private.active() and family_id = private.my_family() and member_id = private.me() and (event_id is null or private.acts(event_id)));
create policy note_edit on notes for update to authenticated using (private.is_host() or (private.active() and member_id = private.me()));
create policy note_del on notes for delete to authenticated using (private.is_host() or (private.active() and member_id = private.me()));

create policy pay_read on payments for select to authenticated using (family_id = private.my_family());
create policy pay_add on payments for insert to authenticated with check (private.active() and family_id = private.my_family());
create policy pay_del on payments for delete to authenticated using (private.is_host() or payer = private.me());

create policy media_read on media for select to authenticated using (family_id = private.my_family() and (status = 'approved' or by = private.me() or private.is_host()));
create policy media_add on media for insert to authenticated with check (private.active() and family_id = private.my_family() and by = private.me());
create policy media_edit on media for update to authenticated using (private.is_host() or (private.active() and by = private.me()));
create policy media_del on media for delete to authenticated using (private.is_host() or (private.active() and by = private.me()));

create policy card_read on cards for select to authenticated using (family_id = private.my_family() and (by = private.me() or private.is_host() or status in ('approved','sent')));
create policy card_add on cards for insert to authenticated with check (private.active() and family_id = private.my_family() and by = private.me());
create policy card_edit on cards for update to authenticated using (private.is_host() or (private.active() and by = private.me()));
create policy card_del on cards for delete to authenticated using (private.is_host() or (private.active() and by = private.me()));

create policy na_read on never_again for select to authenticated using (family_id = private.my_family());
create policy na_add on never_again for insert to authenticated with check (private.active() and family_id = private.my_family() and by = private.me());
create policy na_del on never_again for delete to authenticated using (private.is_host());

-- The Tab
create policy tab_add on tabs for insert to authenticated with check (private.acts(event_id) and payer = private.me());
create policy tab_edit on tabs for update to authenticated using (payer = private.me() and private.active());
create policy tkt_add on tab_tickets for insert to authenticated with check (private.acts(event_id) and (owner = private.me() or exists (select 1 from tabs t where t.event_id = tab_tickets.event_id and t.payer = private.me())));
create policy tkt_edit on tab_tickets for update to authenticated using (private.active() and (owner = private.me() or exists (select 1 from tabs t where t.event_id = tab_tickets.event_id and t.payer = private.me())));
create policy tkt_del on tab_tickets for delete to authenticated using (private.active() and owner = private.me() and status in ('draft','returned'));
create policy line_w on tab_lines for all to authenticated
  using (owner = private.me() and private.active() and exists (select 1 from tab_tickets k where k.event_id = tab_lines.event_id and k.owner = tab_lines.owner and k.status in ('draft','returned')))
  with check (owner = private.me() and private.active() and exists (select 1 from tab_tickets k where k.event_id = tab_lines.event_id and k.owner = tab_lines.owner and k.status in ('draft','returned')));

-- alerts: you read and mark your own; anyone active may send to the family
create policy al_read on alerts for select to authenticated using (to_member = private.me());
create policy al_read_mark on alerts for update to authenticated using (to_member = private.me());
create policy al_del on alerts for delete to authenticated using (to_member = private.me());
create policy al_add on alerts for insert to authenticated with check (private.active()
  and exists (select 1 from members m where m.id = to_member and m.family_id = private.my_family()));
revoke update on alerts from authenticated; grant update (read) on alerts to authenticated;

create policy push_w on push_subscriptions for all to authenticated using (member_id = private.me()) with check (member_id = private.me());
