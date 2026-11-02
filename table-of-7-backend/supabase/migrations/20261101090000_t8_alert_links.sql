-- 2026-11-01: an alert says where tapping it goes ("kind:id": mail:<thread>, photo:<id>, gallery, approvals, card,
-- movie:<id>, golf:<id>, santa:<id>, outing:<id>, tourney:<id>, hangout:<id>, dinner:<id>). Without it, alerts with no
-- dinner went nowhere and every phone notification opened Home (Rosa's approved photo; Candyce's mail).
alter table public.alerts add column if not exists link text;
alter table public.alerts drop constraint if exists alerts_link_shape;
alter table public.alerts add constraint alerts_link_shape check (link is null or link ~ '^[a-z]+(:[A-Za-z0-9_.-]{1,80})?$');
