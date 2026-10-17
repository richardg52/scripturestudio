-- Google Places: only the Place ID is kept (Google's terms forbid storing names, addresses,
-- prices or ratings). A Google restaurant is a row with id 'g:<place id>', its place_id, and the
-- city the family searched in. Everything else is fetched live when someone looks at it.
alter table restaurants alter column name drop not null;
alter table restaurants add column source text not null default 'family' check (source in ('family','google'));
alter table restaurants add constraint google_rows_hold_ids_only check (
  source = 'family' or (name is null and address is null and price is null and blurb is null and menu_url is null and neighborhood is null and place_id is not null and id = 'g:' || place_id));

-- The free amount, kept in our own book so the app refuses before Google could ever charge.
-- Caps sit under Google's monthly free usage: Text Search Pro 5,000 · Place Details Pro 5,000 ·
-- Place Details Enterprise 1,000.
create table places_usage (month date not null, sku text not null, used int not null default 0, primary key (month, sku));
alter table places_usage enable row level security;
revoke all on places_usage from anon, authenticated;

create or replace function public.places_take(p_sku text, p_n int default 1) returns jsonb language plpgsql security definer set search_path = '' as $$
declare cap int; m date := date_trunc('month', now() at time zone 'America/Chicago')::date; u int;
begin
  cap := case p_sku when 'text_pro' then 4500 when 'details_pro' then 4500 when 'details_enterprise' then 900 else 0 end;
  insert into public.places_usage(month, sku, used) values (m, p_sku, 0) on conflict do nothing;
  update public.places_usage set used = used + p_n where month = m and sku = p_sku and used + p_n <= cap returning used into u;
  if u is null then return jsonb_build_object('ok', false, 'cap', cap); end if;
  return jsonb_build_object('ok', true, 'used', u, 'cap', cap);
end $$;
revoke all on function public.places_take(text, int) from public, anon, authenticated;
grant execute on function public.places_take(text, int) to service_role;

-- How much of this month's free amount is used (the host can see it)
create or replace function public.places_usage_now() returns table(sku text, used int, cap int) language sql stable security definer set search_path = '' as $$
  select s.sku, coalesce(u.used, 0), s.cap from (values ('text_pro',4500),('details_pro',4500),('details_enterprise',900)) as s(sku, cap)
  left join public.places_usage u on u.sku = s.sku and u.month = date_trunc('month', now() at time zone 'America/Chicago')::date
  where private.my_family() is not null $$;
revoke all on function public.places_usage_now() from public, anon;
grant execute on function public.places_usage_now() to authenticated;

-- a family member may add a Google restaurant by its ID (nothing else)
drop policy res_add on restaurants;
create policy res_add on restaurants for insert to authenticated with check (private.active() and source = 'google');
