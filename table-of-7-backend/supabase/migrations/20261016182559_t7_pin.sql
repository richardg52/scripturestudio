-- Called only by the sign-in server function (service role). Phones cannot call it.
create or replace function public.t7_pin_signin(p_name text, p_pin text, p_pin2 text, p_ip text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.members; s public.member_secrets; ipr public.signin_ip_attempts; nm text;
begin
  nm := lower(regexp_replace(btrim(coalesce(p_name,'')), '\s+', ' ', 'g'));
  -- network limit: 20 wrong PINs in 15 minutes from one address
  select * into ipr from public.signin_ip_attempts where ip = coalesce(p_ip,'?');
  if found and ipr.window_start > now() - interval '15 minutes' and ipr.fails >= 20 then
    return jsonb_build_object('ok',false,'code','ip_locked','minutes', ceil(extract(epoch from (ipr.window_start + interval '15 minutes' - now()))/60));
  end if;
  select * into m from public.members where lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) = nm;
  if not found then return jsonb_build_object('ok',false,'code','no_name'); end if;
  insert into public.member_secrets(member_id) values (m.id) on conflict do nothing;
  select * into s from public.member_secrets where member_id = m.id for update;
  if s.locked_until is not null and s.locked_until > now() then
    return jsonb_build_object('ok',false,'code','locked','minutes', ceil(extract(epoch from (s.locked_until - now()))/60));
  end if;
  if coalesce(p_pin,'') !~ '^\d{4}$' then return jsonb_build_object('ok',false,'code','format'); end if;
  if s.pin_hash is null then
    if p_pin2 is null then return jsonb_build_object('ok',false,'code','create','first', split_part(m.name,' ',1)); end if;
    if p_pin2 <> p_pin then return jsonb_build_object('ok',false,'code','mismatch'); end if;
    update public.member_secrets set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)), fails = 0, locked_until = null, updated_at = now() where member_id = m.id;
    return jsonb_build_object('ok',true,'member_id',m.id,'user_id',m.user_id,'created',true);
  end if;
  if extensions.crypt(p_pin, s.pin_hash) = s.pin_hash then
    update public.member_secrets set fails = 0, locked_until = null where member_id = m.id;
    return jsonb_build_object('ok',true,'member_id',m.id,'user_id',m.user_id);
  end if;
  -- wrong PIN
  insert into public.signin_ip_attempts(ip, window_start, fails) values (coalesce(p_ip,'?'), now(), 1)
    on conflict (ip) do update set
      fails = case when signin_ip_attempts.window_start > now() - interval '15 minutes' then signin_ip_attempts.fails + 1 else 1 end,
      window_start = case when signin_ip_attempts.window_start > now() - interval '15 minutes' then signin_ip_attempts.window_start else now() end;
  if s.fails + 1 >= 5 then
    update public.member_secrets set fails = 0, locked_until = now() + interval '5 minutes' where member_id = m.id;
    return jsonb_build_object('ok',false,'code','locked','minutes',5);
  end if;
  update public.member_secrets set fails = s.fails + 1 where member_id = m.id;
  return jsonb_build_object('ok',false,'code','wrong','tries_left', 4 - s.fails);
end $$;

create or replace function public.t7_link_user(p_member text, p_user uuid) returns void language sql security definer set search_path = '' as
$$ update public.members set user_id = p_user where id = p_member and user_id is null $$;

-- Signed-in: change your own PIN (the old one must be right; wrong guesses count toward the lock)
create or replace function public.change_my_pin(old_pin text, new_pin text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me text := private.me(); s public.member_secrets;
begin
  if me is null then return jsonb_build_object('ok',false,'code','signed_out'); end if;
  if coalesce(new_pin,'') !~ '^\d{4}$' then return jsonb_build_object('ok',false,'code','format'); end if;
  select * into s from public.member_secrets where member_id = me for update;
  if s.locked_until is not null and s.locked_until > now() then return jsonb_build_object('ok',false,'code','locked','minutes', ceil(extract(epoch from (s.locked_until - now()))/60)); end if;
  if s.pin_hash is null or extensions.crypt(coalesce(old_pin,''), s.pin_hash) <> s.pin_hash then
    if s.fails + 1 >= 5 then update public.member_secrets set fails = 0, locked_until = now() + interval '5 minutes' where member_id = me;
      return jsonb_build_object('ok',false,'code','locked','minutes',5); end if;
    update public.member_secrets set fails = s.fails + 1 where member_id = me;
    return jsonb_build_object('ok',false,'code','wrong','tries_left', 4 - s.fails);
  end if;
  update public.member_secrets set pin_hash = extensions.crypt(new_pin, extensions.gen_salt('bf', 10)), fails = 0, locked_until = null, updated_at = now() where member_id = me;
  return jsonb_build_object('ok',true);
end $$;

-- Host only: clear someone's PIN (and any lock) so they create a new one next time
create or replace function public.host_reset_pin(p_member text) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_host() then return jsonb_build_object('ok',false,'code','not_host'); end if;
  if not exists (select 1 from public.members where id = p_member and family_id = private.my_family()) then return jsonb_build_object('ok',false,'code','no_seat'); end if;
  insert into public.member_secrets(member_id) values (p_member) on conflict (member_id) do update set pin_hash = null, fails = 0, locked_until = null, updated_at = now();
  return jsonb_build_object('ok',true);
end $$;

-- Who has set a PIN yet (no hashes leave the server)
create or replace function public.pin_status() returns table(member_id text, has_pin boolean) language sql stable security definer set search_path = '' as
$$ select m.id, (s.pin_hash is not null) from public.members m left join public.member_secrets s on s.member_id = m.id
   where m.family_id = private.my_family() $$;

revoke all on function public.t7_pin_signin(text,text,text,text), public.t7_link_user(text,uuid) from public, anon, authenticated;
grant execute on function public.t7_pin_signin(text,text,text,text), public.t7_link_user(text,uuid) to service_role;
revoke all on function public.change_my_pin(text,text), public.host_reset_pin(text), public.pin_status() from public, anon;
grant execute on function public.change_my_pin(text,text), public.host_reset_pin(text), public.pin_status() to authenticated;

-- The family and its eight seats (names only; contact details come later, from Dr. Clark)
insert into families(id, name) values ('clark', 'Table of 7');
insert into members(id, family_id, name, color, role) values
 ('m1','clark','Richard Clark','#9a3343','host'),
 ('m2','clark','Jasmine Clark','#2f6b5a','member'),
 ('m3','clark','Devonte Clark','#8a6526','member'),
 ('m4','clark','Rosa Andino','#4a4f8c','member'),
 ('m5','clark','Mario Davison','#8a4a6e','member'),
 ('m6','clark','Derrick Williams','#3d6f8a','member'),
 ('m7','clark','Candyce Jackson','#6b5a2f','member'),
 ('m8','clark','Nikki','#5c4a8a','member');
insert into member_secrets(member_id) select id from members;

-- live updates for the ballot, check-in board and alert badge
alter publication supabase_realtime add table votes, event_options, arrivals, table_ready, rsvps, guest_hands, alerts, media, reservations, events, tab_tickets;
