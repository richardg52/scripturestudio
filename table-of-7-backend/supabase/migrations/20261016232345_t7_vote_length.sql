-- The plan's maker chooses how long the live vote runs (his request, 2026-10-16)
alter table events add column vote_minutes smallint not null default 10 check (vote_minutes in (5,10,15,20,30,60));

create or replace function public.open_live_vote(p_event text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.events; me text := private.me();
begin
  perform set_config('t7.server_action', 'on', true);
  select * into e from public.events where id = p_event for update;
  if not found or not private.acts(p_event) then return jsonb_build_object('ok',false,'code','no_event'); end if;
  if e.status <> 'open' then return jsonb_build_object('ok',false,'code','closed'); end if;
  if e.vote_ends is null then
    update public.events set vote_ends = now() + make_interval(mins => e.vote_minutes) where id = p_event returning * into e;
    perform private.alert_family(e, (select split_part(name,' ',1) from public.members where id = me) || ' opened the ' || e.vote_minutes || '-minute vote for ' || coalesce(e.title,'dinner') || '. Vote now!', me);
    return jsonb_build_object('ok',true,'started',true,'vote_ends',e.vote_ends,'minutes',e.vote_minutes);
  end if;
  return jsonb_build_object('ok',true,'started',false,'vote_ends',e.vote_ends,'minutes',e.vote_minutes);
end $$;
