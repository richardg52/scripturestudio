-- Table of 7: prove Standing dinners on the TEST family only. Run through the Supabase SQL tool after
-- reset_test_family.sql, then run reset_test_family.sql again. Expected (proven 2026-10-17):
--   first_run  → made 1 vote for 2026-11-01 (the first Sunday), 3 choices, Want to Try first, nothing on Never Again
--   second_run → made [] (the claim in standing_runs stops a second vote)
--   wrong_day  → made [] (Oct 25 + 6 = Oct 31, a Saturday)
--   hour_gate  → skipped unless it is 9 AM in Memphis
insert into standing_dinners(id, family_id, label, weekday, nth, time, lead_days, created_by) values ('zz-sd1','zztest','First Sunday Dinner',0,1,'17:30',6,'z1');
insert into want_to_try(family_id, restaurant_id, added_by) values ('zztest','acre','z2');
insert into never_again(family_id, restaurant_id, by, reason) values ('zztest','gus','z1','test');
select private.run_standing_dinners('2026-10-26', true) as first_run,
       private.run_standing_dinners('2026-10-26', true) as second_run,
       private.run_standing_dinners('2026-10-25', true) as wrong_day,
       private.run_standing_dinners('2026-10-26', false) as hour_gate;
select e.title, e.date, (select array_agg(o.restaurant_id order by o.pos) from event_options o where o.event_id = e.id) as choices,
       (select count(*) from alerts a where a.event_id = e.id) as alerts from events e where e.family_id = 'zztest';
