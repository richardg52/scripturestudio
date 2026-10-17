-- Table of 7: an invitation ("I decide · just invite") is born decided: its event is 'set' the moment it is
-- sent, with its one restaurant in `chosen`. The option guard refused that restaurant's own row ("This vote
-- has closed."), and the refusal stopped the rest of the send: the family's alerts, the host's RSVP and the
-- booking record were never written. Found 2026-10-17 testing Dessert after. A closed VOTE stays closed;
-- only a host-mode plan may carry its chosen restaurant.
create or replace function private.g_options() returns trigger language plpgsql security definer set search_path = '' as $$
declare e public.events;
begin
  if (select count(*) from public.event_options where event_id = new.event_id) >= 6 then perform private.deny('The ballot already has 6 places.'); end if;
  select * into e from public.events where id = new.event_id;
  if e.status <> 'open' and not (e.mode = 'host' and new.restaurant_id = e.chosen) then perform private.deny('This vote has closed.'); end if;
  return new;
end $$;
