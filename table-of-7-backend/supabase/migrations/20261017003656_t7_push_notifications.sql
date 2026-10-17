-- Step 3: every alert also goes to the person's phones as a notification.
create extension if not exists pg_net with schema extensions;

-- One locked row: the Web Push keys (made by the server itself on first use) and the pass the
-- database shows the sender. Lives in the private schema: no phone can reach it.
create table private.push_config (id int primary key default 1 check (id = 1),
  vapid_public text, vapid_private text, trigger_token text not null default encode(extensions.gen_random_bytes(32), 'hex'));
insert into private.push_config (id) values (1) on conflict do nothing;
revoke all on private.push_config from public, anon, authenticated;

create or replace function public.push_config_get() returns jsonb language sql security definer set search_path = '' as
$$ select jsonb_build_object('pub', vapid_public, 'priv', vapid_private, 'token', trigger_token) from private.push_config where id = 1 $$;
create or replace function public.push_config_set_keys(p_pub text, p_priv text) returns void language sql security definer set search_path = '' as
$$ update private.push_config set vapid_public = p_pub, vapid_private = p_priv where id = 1 and vapid_public is null $$;
revoke all on function public.push_config_get(), public.push_config_set_keys(text, text) from public, anon, authenticated;
grant execute on function public.push_config_get(), public.push_config_set_keys(text, text) to service_role;

alter table push_subscriptions add column if not exists user_agent text;

-- After an alert is delivered (paused and excluded members were already skipped before insert),
-- hand it to the sender. A failure to reach the sender never blocks the alert itself.
create or replace function private.push_alert() returns trigger language plpgsql security definer set search_path = '' as $$
declare tok text;
begin
  if not exists (select 1 from public.push_subscriptions where member_id = new.to_member) then return null; end if;
  select trigger_token into tok from private.push_config where id = 1;
  perform net.http_post(
    url := 'https://vhonljdavmklymrocgiu.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-t7-token', tok),
    body := jsonb_build_object('action', 'send', 'alert_id', new.id));
  return null;
exception when others then return null;
end $$;
create trigger push_alert after insert on public.alerts for each row execute function private.push_alert();
