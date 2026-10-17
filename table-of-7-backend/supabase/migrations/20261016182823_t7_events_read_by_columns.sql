-- A brand-new event cannot see itself through private.sees() inside its own INSERT ... RETURNING,
-- so the event's own read rule reads its own columns directly.
drop policy ev_read on events;
create policy ev_read on events for select to authenticated
  using (family_id = private.my_family() and (not (private.me() = any(excluded)) or private.is_host()));
drop policy ev_edit on events;
create policy ev_edit on events for update to authenticated
  using (family_id = private.my_family() and (private.is_host() or (private.active() and host = private.me() and not (private.me() = any(excluded)))))
  with check (family_id = private.my_family());
