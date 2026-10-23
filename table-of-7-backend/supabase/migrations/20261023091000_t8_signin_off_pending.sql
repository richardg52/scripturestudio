-- Table of 8 · 8.3 sign-in (his order, 2026-10-23): a seat that is shut off, or a family that is off, gets no session —
-- it gets the message instead, and only AFTER the right PIN (so an email alone never reads anyone's note).
-- An email still waiting on a new-family request is told it is waiting, not "that email isn't at the table".
create or replace function private.signin_gate(p_member text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.members; f public.families; o public.member_off; byn text;
begin
  perform private.expire_offs(p_member);
  select * into m from public.members where id = p_member;
  select * into f from public.families where id = m.family_id;
  if f.status = 'off' then return jsonb_build_object('ok', false, 'code', 'family_off', 'family', f.name, 'note', f.off_note); end if;
  if m.status = 'off' then
    select * into o from public.member_off where member_id = m.id;
    select split_part(name, ' ', 1) into byn from public.members where id = o.by_member;
    return jsonb_build_object('ok', false, 'code', 'off', 'first', split_part(m.name, ' ', 1),
      'until', case when o.until is null or o.until = 'infinity' then null else o.until end, 'note', o.note, 'by', byn);
  end if;
  return null;
end $$;
revoke all on function private.signin_gate(text) from public, anon, authenticated;

create or replace function public.t7_pin_signin_email(p_email text, p_pin text, p_pin2 text, p_ip text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.members; s public.member_secrets; ipr public.signin_ip_attempts; em text; g jsonb; rq public.family_requests;
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
    if em <> '' then
      select * into rq from public.family_requests where lower(btrim(email)) = em order by created_at desc limit 1;
      if rq.status = 'pending' then return jsonb_build_object('ok', false, 'code', 'pending', 'family', rq.family_name); end if;
    end if;
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
    g := private.signin_gate(m.id); if g is not null then return g; end if;
    return jsonb_build_object('ok', true, 'member_id', m.id, 'user_id', m.user_id, 'created', true);
  end if;
  if extensions.crypt(p_pin, s.pin_hash) = s.pin_hash then
    update public.member_secrets set fails = 0, locked_until = null where member_id = m.id;
    g := private.signin_gate(m.id); if g is not null then return g; end if;
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
