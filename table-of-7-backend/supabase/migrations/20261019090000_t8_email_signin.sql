-- Table of 8: sign in with EMAIL + 4-digit PIN (his order, 2026-10-19: "a simpler process sign-in with email and pin
-- and I handle all resets or lock outs"). Replaces full-name sign-in.
--   * Each seat's email is its sign-in name, so no two seats may share one (case and spaces ignored).
--   * First sign-in: the person chooses their PIN (his choice). Forgot it: the host resets it (host_reset_pin).
--   * 5 wrong PINs lock that seat UNTIL THE HOST UNLOCKS IT (his choice): host_unlock_pin, from Host controls.
--   * The network limit stays (20 wrong tries in 15 minutes from one address, wrong emails included), so nobody can
--     guess PINs or fish for the family's emails; it clears itself.
create unique index members_email_once on public.members (lower(btrim(email))) where coalesce(btrim(email), '') <> '';

create or replace function public.t7_pin_signin_email(p_email text, p_pin text, p_pin2 text, p_ip text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.members; s public.member_secrets; ipr public.signin_ip_attempts; em text;
begin
  em := lower(btrim(coalesce(p_email, '')));
  select * into ipr from public.signin_ip_attempts where ip = coalesce(p_ip, '?');
  if found and ipr.window_start > now() - interval '15 minutes' and ipr.fails >= 20 then
    return jsonb_build_object('ok', false, 'code', 'ip_locked', 'minutes', ceil(extract(epoch from (ipr.window_start + interval '15 minutes' - now())) / 60));
  end if;
  if em <> '' then select * into m from public.members where lower(btrim(email)) = em; end if;
  if em = '' or m.id is null then
    insert into public.signin_ip_attempts(ip, window_start, fails) values (coalesce(p_ip, '?'), now(), 1)
      on conflict (ip) do update set
        fails = case when signin_ip_attempts.window_start > now() - interval '15 minutes' then signin_ip_attempts.fails + 1 else 1 end,
        window_start = case when signin_ip_attempts.window_start > now() - interval '15 minutes' then signin_ip_attempts.window_start else now() end;
    return jsonb_build_object('ok', false, 'code', 'no_email');
  end if;
  insert into public.member_secrets(member_id) values (m.id) on conflict do nothing;
  select * into s from public.member_secrets where member_id = m.id for update;
  if s.locked_until is not null and s.locked_until > now() then
    return jsonb_build_object('ok', false, 'code', 'locked', 'first', split_part(m.name, ' ', 1));
  end if;
  if coalesce(p_pin, '') !~ '^\d{4}$' then return jsonb_build_object('ok', false, 'code', 'format'); end if;
  if s.pin_hash is null then
    if p_pin2 is null then return jsonb_build_object('ok', false, 'code', 'create', 'first', split_part(m.name, ' ', 1)); end if;
    if p_pin2 <> p_pin then return jsonb_build_object('ok', false, 'code', 'mismatch'); end if;
    update public.member_secrets set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)), fails = 0, locked_until = null, updated_at = now() where member_id = m.id;
    return jsonb_build_object('ok', true, 'member_id', m.id, 'user_id', m.user_id, 'created', true);
  end if;
  if extensions.crypt(p_pin, s.pin_hash) = s.pin_hash then
    update public.member_secrets set fails = 0, locked_until = null where member_id = m.id;
    return jsonb_build_object('ok', true, 'member_id', m.id, 'user_id', m.user_id);
  end if;
  insert into public.signin_ip_attempts(ip, window_start, fails) values (coalesce(p_ip, '?'), now(), 1)
    on conflict (ip) do update set
      fails = case when signin_ip_attempts.window_start > now() - interval '15 minutes' then signin_ip_attempts.fails + 1 else 1 end,
      window_start = case when signin_ip_attempts.window_start > now() - interval '15 minutes' then signin_ip_attempts.window_start else now() end;
  if s.fails + 1 >= 5 then
    update public.member_secrets set fails = 0, locked_until = 'infinity' where member_id = m.id;   -- until the host unlocks
    return jsonb_build_object('ok', false, 'code', 'locked', 'first', split_part(m.name, ' ', 1));
  end if;
  update public.member_secrets set fails = s.fails + 1 where member_id = m.id;
  return jsonb_build_object('ok', false, 'code', 'wrong', 'tries_left', 4 - s.fails);
end $$;
revoke all on function public.t7_pin_signin_email(text, text, text, text) from public, anon, authenticated;

-- the host lets a locked seat back in, keeping its PIN
create or replace function public.host_unlock_pin(p_member text) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_host() then return jsonb_build_object('ok', false, 'code', 'not_host'); end if;
  if not exists (select 1 from public.members where id = p_member and family_id = private.my_family()) then return jsonb_build_object('ok', false, 'code', 'no_seat'); end if;
  update public.member_secrets set fails = 0, locked_until = null, updated_at = now() where member_id = p_member;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.host_unlock_pin(text) from public, anon;
grant execute on function public.host_unlock_pin(text) to authenticated;

-- Host controls sees who has a PIN and who is locked out (never the PIN)
drop function public.pin_status();
create function public.pin_status() returns table(member_id text, has_pin boolean, locked boolean)
language sql stable security definer set search_path = '' as $$
  select m.id, (s.pin_hash is not null), coalesce(s.locked_until > now(), false)
  from public.members m left join public.member_secrets s on s.member_id = m.id
  where m.family_id = private.my_family() and private.is_host() $$;
revoke all on function public.pin_status() from public, anon;
grant execute on function public.pin_status() to authenticated;

drop function public.t7_pin_signin(text, text, text, text);   -- full-name sign-in is gone

-- A seat's email is its sign-in: only the host changes it (his order: "I handle all resets or lock outs").
create or replace function private.email_host_only() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.email is distinct from old.email and coalesce(auth.role(), '') = 'authenticated' and not private.is_host() then
    raise exception 'only_host_email' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger members_email_host_only before update of email on public.members for each row execute function private.email_host_only();
