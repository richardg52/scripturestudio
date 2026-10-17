create or replace function private.deny(msg text) returns void language plpgsql as $$ begin raise exception using message = msg, errcode = '42501'; end $$;

create or replace function private.g_members() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.is_host() then
    if new.id = private.me() and (new.status <> 'active') then perform private.deny('The host cannot pause their own seat.'); end if;
    return new;
  end if;
  if new.status is distinct from old.status or new.name is distinct from old.name then
    perform private.deny('Only the host can rename or pause a seat.'); end if;
  return new;
end $$;
create trigger g_members before update on public.members for each row execute function private.g_members();

create or replace function private.g_contacts() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_host() then
    if tg_op = 'INSERT' then new.banned := false;
    elsif new.banned is distinct from old.banned then perform private.deny('Only the host can mark a contact Not welcome.'); end if;
  end if; return new;
end $$;
create trigger g_contacts before insert or update on public.contacts for each row execute function private.g_contacts();

create or replace function private.g_events() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_host() then
    if tg_op = 'INSERT' then new.excluded := '{}';
    elsif new.excluded is distinct from old.excluded then perform private.deny('Only the host can change who is invited.'); end if;
  end if; return new;
end $$;
create trigger g_events before insert or update on public.events for each row execute function private.g_events();

-- reviews / notes: anyone may hold their own post; only the host releases or changes status otherwise
create or replace function private.g_held() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_host() and new.status is distinct from old.status and not (old.status = 'ok' and new.status = 'held') then
    perform private.deny('Only the host can release a held post.'); end if;
  return new;
end $$;
create trigger g_reviews before update on public.reviews for each row execute function private.g_held();
create trigger g_notes before update on public.notes for each row execute function private.g_held();

create or replace function private.g_media() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_host() then
    if tg_op = 'INSERT' then new.status := 'pending';
    elsif new.status is distinct from old.status then perform private.deny('Only the host can approve photos.'); end if;
  end if; return new;
end $$;
create trigger g_media before insert or update on public.media for each row execute function private.g_media();

create or replace function private.g_cards() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_host() then
    if tg_op = 'INSERT' then new.status := 'pending';
    elsif new.status is distinct from old.status and not (old.status = 'approved' and new.status = 'sent') then
      perform private.deny('Only the host can approve cards.'); end if;
  end if; return new;
end $$;
create trigger g_cards before insert or update on public.cards for each row execute function private.g_cards();

create or replace function private.g_options() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.event_options where event_id = new.event_id) >= 6 then perform private.deny('The ballot already has 6 places.'); end if;
  if (select status from public.events where id = new.event_id) <> 'open' then perform private.deny('This vote has closed.'); end if;
  return new;
end $$;
create trigger g_options before insert on public.event_options for each row execute function private.g_options();

create or replace function private.g_votes() returns trigger language plpgsql security definer set search_path = '' as $$
declare ev public.events;
begin
  select * into ev from public.events where id = new.event_id;
  if ev.status <> 'open' or (ev.vote_ends is not null and now() > ev.vote_ends) then perform private.deny('This vote has closed.'); end if;
  if not exists (select 1 from public.event_options where event_id = new.event_id and restaurant_id = new.restaurant_id) then
    perform private.deny('That place is not on the ballot.'); end if;
  new.cast_at := now(); return new;
end $$;
create trigger g_votes before insert or update on public.votes for each row execute function private.g_votes();

create or replace function private.g_reservations() returns trigger language plpgsql security definer set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger g_reservations before insert or update on public.reservations for each row execute function private.g_reservations();

-- The Tab: each ticket moves only the way the handoff says
create or replace function private.g_tickets() returns trigger language plpgsql security definer set search_path = '' as $$
declare payer text; me text := private.me();
begin
  select t.payer into payer from public.tabs t where t.event_id = new.event_id;
  if (select closed from public.tabs where event_id = new.event_id) then perform private.deny('This tab is closed.'); end if;
  if tg_op = 'INSERT' then
    new.status := case when new.owner = payer then 'payer' else 'draft' end; return new;
  end if;
  if new.status = old.status then
    if me = new.owner and old.status in ('draft','returned','payer') then return new; end if;            -- editing own open ticket
    if me = new.owner and old.status = 'confirmed' and new.covers = old.covers and new.tip_pct = old.tip_pct then return new; end if; -- "I paid by Zelle"
    perform private.deny('This ticket can no longer be changed.');
  end if;
  if me = new.owner and old.status in ('draft','returned') and new.status = 'sent' then new.sent_at := now(); return new; end if;
  if me = payer and old.status = 'sent' and new.status = 'confirmed' then new.confirmed_at := now(); return new; end if;
  if me = payer and old.status = 'sent' and new.status = 'returned' then return new; end if;
  if me = payer and old.status = 'confirmed' and new.status = 'settled' then new.settled_at := now(); return new; end if;
  perform private.deny('Only the payer can confirm, send back or settle a ticket.');
end $$;
create trigger g_tickets before insert or update on public.tab_tickets for each row execute function private.g_tickets();

-- Alerts never reach a paused member or someone taken off that event
create or replace function private.g_alerts() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.members m where m.id = new.to_member and m.status = 'suspended') then return null; end if;
  if new.event_id is not null and exists (select 1 from public.events e where e.id = new.event_id and new.to_member = any(e.excluded)) then return null; end if;
  new.at := now(); new.read := false; return new;
end $$;
create trigger g_alerts before insert on public.alerts for each row execute function private.g_alerts();

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;
