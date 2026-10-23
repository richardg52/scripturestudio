-- Table of 8 (his order, 2026-10-22): "always an option to send to individual members and not everybody. Sometimes
-- members may already know or they are unavailable and inviting them would be a wasted invitation."
--
-- 1. FAMILY DINNERS (votes and invitations): the person planning chooses who is invited BEFORE it goes out. Until now a
--    new plan's guest list was wiped to "everyone" unless the host made it, and only the host could change it after.
--    Now the planner sets it on the new plan (never leaving themselves out; only seats of this family count), and the
--    planner or the host can change it later. Alerts already skip anyone left out (guard on alerts).
create or replace function private.g_events() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('t7.server_action', true) = 'on' then return new; end if;
  if private.is_host() then return new; end if;
  if tg_op = 'INSERT' then
    if new.host is distinct from private.me() then new.excluded := '{}'; return new; end if;
    new.excluded := coalesce((select array_agg(distinct x) from unnest(new.excluded) x
      where x <> private.me() and exists (select 1 from public.members m where m.id = x and m.family_id = new.family_id)), '{}');
    return new;
  end if;
  if new.excluded is distinct from old.excluded and old.host is distinct from private.me() then
    perform private.deny('Only the person who planned this, or the host, can change who is invited.');
  end if;
  if old.host = private.me() then
    if private.me() = any(new.excluded) then perform private.deny('You can''t leave yourself off your own plan.'); end if;
    return new;
  end if;
  if (to_jsonb(new) - 'status') = (to_jsonb(old) - 'status') and old.status = 'set' and new.status = 'done' then return new; end if;
  perform private.deny('Only the person who made this plan can change it.');
end $$;

-- 2. MEMPHIS LIVE "Who's in?": the asker picks who to ask. Only the people asked (and the asker, and the host) see the
--    question and its answers; only they can answer.
alter table public.live_asks add column invited text[] not null default '{}';
update public.live_asks set invited = array(select m.id from public.members m where m.family_id = live_asks.family_id and m.status = 'active');
drop policy live_asks_read on public.live_asks;
create policy live_asks_read on public.live_asks for select to authenticated using (
  family_id = private.my_family() and (private.me() = any(invited) or by_member = private.me() or private.is_host()));
drop policy live_answers_read on public.live_answers;
create policy live_answers_read on public.live_answers for select to authenticated using (
  family_id = private.my_family() and exists (select 1 from public.live_asks a where a.id = live_answers.ask_id));   -- the question's own rule decides

-- 3. SECRET SANTA and the FAMILY FEUD survey: the organizer picks who is told (functions/santa, functions/games: `invited`).
