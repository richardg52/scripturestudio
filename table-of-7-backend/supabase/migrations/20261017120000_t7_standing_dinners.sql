-- Table of 7: Standing dinners (his order, 2026-10-17). e.g. "the first Sunday of every month starts a family vote
-- by itself". The host sets a rule; every morning at 9 AM Central (pg_cron, 14:00 and 15:00 UTC) private.run_standing_dinners() looks
-- for rules whose dinner is exactly `lead_days` away, CLAIMS that rule+date in standing_runs first (primary key, so
-- a second run the same day finds it taken and does nothing), then opens the family vote with up to 3 choices by
-- the Concierge's rules and alerts every active seat (alerts → push). All in one transaction: no half-made vote.
-- The live clock still starts when someone taps Start (a 10–60 minute clock at 9 AM would close unseen).

-- the app's own markers (gone, nodinner, dessert, breakfast, lunch, new) copied to restaurants.meals so the server knows them
update restaurants r set meals = v.m from (values
('bhan-thai',array['gone']::text[]),
('saigon-le',array['gone']::text[]),
('interim',array['gone']::text[]),
('mahogany',array['new']::text[]),
('firebirds',array['lunch']::text[]),
('longhorn',array['lunch']::text[]),
('coltons',array['lunch']::text[]),
('outback',array['lunch']::text[]),
('houstons',array['gone','lunch']::text[]),
('seasons52',array['lunch']::text[]),
('chilis',array['lunch']::text[]),
('olive-garden',array['lunch']::text[]),
('red-lobster',array['lunch']::text[]),
('jack-pirtles',array['lunch']::text[]),
('huey',array['lunch']::text[]),
('dyers',array['lunch']::text[]),
('babalu',array['lunch']::text[]),
('stix',array['lunch']::text[]),
('soul-fish',array['lunch']::text[]),
('corkys',array['lunch']::text[]),
('interstate',array['lunch']::text[]),
('ar-bbq',array['lunch']::text[]),
('commissary',array['lunch']::text[]),
('tops',array['lunch']::text[]),
('elwoods',array['breakfast','lunch']::text[]),
('broken-egg',array['breakfast','lunch','nodinner']::text[]),
('brother-junipers',array['breakfast','lunch','nodinner']::text[]),
('bryants',array['breakfast','lunch','nodinner']::text[]),
('arcade',array['breakfast','lunch','nodinner']::text[]),
('sunrise',array['breakfast','lunch','nodinner']::text[]),
('cafe-eclectic',array['breakfast','lunch']::text[]),
('first-watch',array['breakfast','lunch','nodinner']::text[]),
('blue-plate',array['breakfast','gone','lunch']::text[]),
('muddys',array['dessert','lunch']::text[]),
('gibsons-donuts',array['dessert','breakfast']::text[]),
('makedas',array['dessert','lunch']::text[]),
('frost',array['dessert','breakfast','lunch']::text[]),
('la-baguette',array['dessert','breakfast','lunch']::text[]),
('rickis',array['dessert','lunch']::text[]),
('cheesecake-corner',array['dessert','lunch']::text[]),
('sweet-lalas',array['dessert','lunch']::text[]),
('dinstuhls',array['dessert','lunch']::text[]),
('peach-cobbler',array['dessert']::text[]),
('nothing-bundt',array['dessert','lunch']::text[]),
('crumbl',array['dessert','lunch']::text[]),
('jerrys-sno',array['dessert']::text[]),
('zio-matto',array['dessert']::text[]),
('napa-cafe',array['lunch']::text[]),
('five-daughters',array['dessert','breakfast']::text[]),
('loveless',array['breakfast','lunch']::text[]),
('sublime',array['dessert','breakfast']::text[]),
('intermezzo',array['dessert','lunch']::text[]),
('cafe-du-monde',array['dessert','breakfast']::text[]),
('haydels',array['dessert','breakfast']::text[]),
('hansens',array['dessert']::text[]),
('brennans',array['breakfast','lunch']::text[]),
('elis',array['dessert','lunch']::text[]),
('margies',array['dessert','lunch']::text[]),
('do-rite',array['dessert','breakfast','lunch']::text[]),
('magnolia',array['dessert','lunch']::text[]),
('levain',array['dessert','breakfast','lunch']::text[]),
('juniors',array['lunch']::text[]),
('venieros',array['dessert','lunch']::text[]),
('gramercy-tavern',array['lunch']::text[]),
('emporium-pies',array['dessert','lunch']::text[]),
('portos',array['dessert','breakfast','lunch']::text[]),
('bottega-louie',array['lunch']::text[])
) as v(id, m) where r.id = v.id;

create extension if not exists pg_cron;

create table standing_dinners (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  label text not null check (char_length(label) between 1 and 60),
  weekday smallint not null check (weekday between 0 and 6),           -- 0 = Sunday
  nth smallint check (nth in (1,2,3,4,5,-1)),                           -- null = every week, -1 = the last one
  time time not null default '17:30', lead_days smallint not null default 6 check (lead_days between 1 and 14),
  vote_minutes smallint not null default 10 check (vote_minutes in (5,10,15,20,30,60)),
  dress text not null default 'Smart casual', active boolean not null default true,
  created_by text references members on delete set null, created_at timestamptz not null default now());
create table standing_runs (
  standing_id text not null references standing_dinners on delete cascade, dinner_date date not null,
  event_id text references events on delete set null, at timestamptz not null default now(),
  primary key (standing_id, dinner_date));
alter table standing_dinners enable row level security;
alter table standing_runs enable row level security;
create policy sd_read on standing_dinners for select to authenticated using (family_id = private.my_family());
create policy sd_add on standing_dinners for insert to authenticated with check (private.is_host() and family_id = private.my_family() and created_by = private.me());
create policy sd_edit on standing_dinners for update to authenticated using (private.is_host() and family_id = private.my_family()) with check (family_id = private.my_family());
create policy sd_del on standing_dinners for delete to authenticated using (private.is_host() and family_id = private.my_family());
create policy sr_read on standing_runs for select to authenticated using (exists (select 1 from public.standing_dinners s where s.id = standing_id and s.family_id = private.my_family()));
grant select, insert, update, delete on standing_dinners to authenticated;
grant select on standing_runs to authenticated;
alter publication supabase_realtime add table standing_dinners, standing_runs;

-- does `d` fall on this rule?
create or replace function private.standing_match(s public.standing_dinners, d date) returns boolean language sql immutable set search_path = '' as $$
  select extract(dow from d)::int = s.weekday and (
    s.nth is null
    or (s.nth > 0 and (extract(day from d)::int - 1) / 7 + 1 = s.nth)
    or (s.nth = -1 and extract(month from d + 7) <> extract(month from d)))
$$;

create or replace function private.run_standing_dinners(p_today date default (now() at time zone 'America/Chicago')::date, p_any_hour boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.standing_dinners; d date; ev text; host text; made jsonb := '[]'::jsonb; n int;
begin
  -- the schedule fires at 14:00 and 15:00 UTC; only the one that is 9 AM in Memphis acts (daylight or standard time)
  if not p_any_hour and extract(hour from now() at time zone 'America/Chicago') <> 9 then return jsonb_build_object('ok', true, 'skipped', 'not 9 AM in Memphis'); end if;
  perform set_config('t7.server_action', 'on', true);
  for s in select * from public.standing_dinners where active loop
    d := p_today + s.lead_days;
    continue when not private.standing_match(s, d);
    insert into public.standing_runs(standing_id, dinner_date) values (s.id, d) on conflict do nothing;
    get diagnostics n = row_count;
    continue when n = 0;                                   -- already claimed: never twice
    select id into host from public.members where id = s.created_by and status = 'active' and family_id = s.family_id;
    if host is null then select id into host from public.members where family_id = s.family_id and role = 'host' and status = 'active' limit 1; end if;
    insert into public.events(family_id, type, mode, host, title, date, time, dress, vote_minutes, status, note)
      values (s.family_id, 'sunday', 'vote', host, s.label, d, s.time, s.dress, s.vote_minutes, 'open',
              'Our standing dinner. Vote when you can; anyone can add a place.')
      returning id into ev;
    insert into public.event_options(event_id, restaurant_id, added_by, pos)
      select ev, c.id, host, (row_number() over (order by c.want desc, c.shuffle)) - 1 from (
        select r.id, exists (select 1 from public.want_to_try w where w.family_id = s.family_id and w.restaurant_id = r.id) as want, random() as shuffle
        from public.restaurants r
        where coalesce(r.city, 'Memphis') = 'Memphis'
          and not (coalesce(r.meals, '{}') && array['gone','nodinner','dessert'])
          and not ('Bakery & Dessert' = any(coalesce(r.cuisines, '{}')))
          and (r.source is distinct from 'google' or exists (select 1 from public.want_to_try w where w.family_id = s.family_id and w.restaurant_id = r.id))
          and not exists (select 1 from public.never_again na where na.family_id = s.family_id and na.restaurant_id = r.id)
          and not exists (select 1 from public.visits v where v.family_id = s.family_id and v.restaurant_id = r.id and v.date > d - 90)
        order by want desc, shuffle limit 3) c;
    update public.standing_runs set event_id = ev where standing_id = s.id and dinner_date = d;
    perform private.alert_family((select e from public.events e where e.id = ev),
      s.label || ' on ' || to_char(d, 'FMDay, FMMonth FMDD') || ': the family vote is open. Tap to vote.', null);
    made := made || jsonb_build_object('standing', s.id, 'date', d, 'event', ev);
  end loop;
  return jsonb_build_object('ok', true, 'today', p_today, 'made', made);
end $$;
revoke all on function private.run_standing_dinners(date, boolean) from public;

-- 14:00 and 15:00 UTC: exactly one of them is 9 AM in Memphis all year; the function skips the other, and the claim
-- would stop a double run anyway
select cron.schedule('t7-standing-dinners', '0 14,15 * * *', $$select private.run_standing_dinners()$$);
