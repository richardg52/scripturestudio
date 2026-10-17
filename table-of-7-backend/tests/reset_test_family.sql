-- Run in the Supabase SQL editor (or through the MCP) before attack_signin.py.
-- Touches ONLY the test family 'zztest' (seats z1, z2, z3). Never a Clark seat.
insert into families(id,name) values ('zztest','TEST FAMILY - delete after proof') on conflict do nothing;
insert into members(id,family_id,name,role) values ('z1','zztest','Zed Testhost','host'),('z2','zztest','Zed Testmember','member'),('z3','zztest','Zed Testpaused','member') on conflict do nothing;
insert into restaurants(id,name,city) values ('zz-a','Test Place A','Memphis'),('zz-b','Test Place B','Memphis') on conflict do nothing;
delete from events where family_id = 'zztest';
delete from media where family_id = 'zztest';
delete from alerts where to_member in ('z1','z2','z3');
update members set status = 'active', diet = null where family_id = 'zztest';
insert into member_secrets(member_id) values ('z1'),('z2'),('z3') on conflict (member_id) do update set pin_hash = null, fails = 0, locked_until = null;
delete from signin_ip_attempts;
delete from radar_sent where family_id = 'zztest';
delete from contacts where family_id = 'zztest';
delete from visits where family_id = 'zztest'; delete from reviews where family_id = 'zztest'; delete from notes where family_id = 'zztest';
delete from payments where family_id = 'zztest'; delete from never_again where family_id = 'zztest';
