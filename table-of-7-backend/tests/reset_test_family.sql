-- Run in the Supabase SQL editor (or through the MCP) before attack_signin.py.
-- Touches ONLY the test family 'zztest' (seats z1, z2, z3, z4). Never a Clark seat.
select set_config('t8.off', '1', false);   -- lets this reset switch a test seat that a proof turned off back on (8.3)
insert into families(id,name) values ('zztest','TEST FAMILY - delete after proof') on conflict do nothing;
insert into members(id,family_id,name,role) values ('z1','zztest','Zed Testhost','host'),('z2','zztest','Zed Testmember','member'),('z3','zztest','Zed Testpaused','member'),('z4','zztest','Zed Testfour','member') on conflict do nothing;
-- (the test uses real restaurants from our list, gus and acre; it never adds a restaurant every family could see)
delete from events where family_id = 'zztest';
delete from media where family_id = 'zztest';
delete from alerts where to_member in ('z1','z2','z3','z4');
update members set status = 'active', diet = null, email = id || '@zztest.invalid' where family_id = 'zztest';   -- Table of 8 signs in by email
update members set status = 'suspended' where id = 'z4';   -- z4 waits paused; attack_signin.py wakes it only for the Family Feud proofs
insert into member_secrets(member_id) values ('z1'),('z2'),('z3'),('z4') on conflict (member_id) do update set pin_hash = null, fails = 0, locked_until = null;
delete from signin_ip_attempts;
delete from radar_sent where family_id = 'zztest';
delete from contacts where family_id = 'zztest';
delete from visits where family_id = 'zztest'; delete from reviews where family_id = 'zztest'; delete from notes where family_id = 'zztest';
delete from payments where family_id = 'zztest'; delete from never_again where family_id = 'zztest';
delete from want_to_try where family_id = 'zztest';
delete from standing_dinners where family_id = 'zztest';
delete from games where family_id = 'zztest';
delete from feud_surveys where family_id = 'zztest';
delete from movie_nights where family_id = 'zztest';   -- movie_people go with them
delete from golf_outings where family_id = 'zztest';   -- golf_people go with them
delete from santa_exchanges where family_id = 'zztest';   -- wishes and pairs go with them
delete from outings where family_id = 'zztest';   -- outing_people go with them
delete from prayers where family_id = 'zztest';   -- prayer_authors go with them
delete from tournaments where family_id = 'zztest';
delete from recipes where family_id = 'zztest';
delete from ride_asks where family_id = 'zztest'; delete from ride_offers where family_id = 'zztest';   -- pickups go with the asks
delete from live_asks where family_id = 'zztest';   -- answers go with them
delete from dates where family_id = 'zztest';
delete from watch_parties where family_id = 'zztest';   -- watch_people go with them
-- 8.3 (2026-10-23): mail, hangouts, getaways, turned-off seats, new-family requests, and a second test family
-- (zztest2, one seat y1) so the proofs can show a host can't reach into another family without ever aiming at a real seat.
delete from mail where family_id = 'zztest';   -- mail_box goes with it
delete from hangouts where family_id = 'zztest';   -- people and guests go with them
delete from getaways where family_id = 'zztest';   -- people go with them
update members m set status = coalesce(o.prev, 'active') from member_off o where o.member_id = m.id and m.family_id in ('zztest','zztest2');
delete from member_off where member_id in (select id from members where family_id in ('zztest','zztest2'));
update members set status = 'suspended' where id = 'z4';
delete from family_requests where email like '%@zztest.invalid';
insert into families(id,name) values ('zztest2','TEST FAMILY 2 - delete after proof') on conflict do nothing;
update families set status = 'active', off_note = null where id in ('zztest','zztest2');
insert into members(id,family_id,name,role,email) values ('y1','zztest2','Yan Testother','host','y1@zztest.invalid') on conflict do nothing;
select set_config('t8.off', '', false);
