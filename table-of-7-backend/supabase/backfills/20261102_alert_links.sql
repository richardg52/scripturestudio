-- Run once on 2026-11-02 (137 rows). Alerts written before alerts.link existed had nowhere to go when tapped in the bell.
-- Updates cannot notify anyone: the push trigger on alerts fires on INSERT only. Only "Notifications are on" stays without a target.
with t as (
 select a.id, case
  when a.text ~ '^(📬|💛)' then 'mail'
  when a.text ~ '^🧳' then 'getaways'
  when a.text ~ '^(🌙|📨)' or a.text like '%Dessert after dinner%' then 'hangouts'
  when a.text ~ '^(🏈|📍|🚗)' then 'gamenight'
  when a.text like '%Open the Game Room to play.' or a.text ~ ' won (Tic-Tac-Toe|Spades|Connect Four|Checkers) \(' or a.text ~ '^Tic-Tac-Toe ended in a draw' then 'games'
  when a.text like '%approved your photo%' then 'gallery'
 end as go
 from alerts a join members m on m.id = a.to_member
 where m.family_id not like 'zztest%' and a.link is null and a.event_id is null)
update alerts a set link = t.go from t where a.id = t.id and t.go is not null;
