-- Table of 7: Secret Santa (his order, 2026-10-18; couples kept apart, his choice). Someone starts an exchange, the
-- family joins, the organizer marks couples / households, and the SERVER draws names: nobody draws themselves or
-- anyone in their own household. Who drew whom lives in santa_pairs, which NO phone can read: functions/santa tells
-- each person only their own match (and their own private "bought" mark). Wish lists are shared with everyone in
-- the exchange so Santas can shop. Phones may only READ santa_exchanges and santa_wishes; every write goes through
-- functions/santa.
create table santa_exchanges (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  created_by text references members on delete set null,
  name text not null, budget numeric(8,2), exchange_date date, note text,
  joined text[] not null default '{}',
  households jsonb not null default '[]',      -- [[member ids], …] people who must not draw each other
  status text not null default 'open' check (status in ('open','drawn','revealed','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table santa_wishes (
  exchange_id text not null references santa_exchanges on delete cascade, member_id text not null references members on delete cascade,
  items jsonb not null default '[]',           -- [{text, link, size}]
  updated_at timestamptz not null default now(), primary key (exchange_id, member_id));
create table santa_pairs (
  exchange_id text not null references santa_exchanges on delete cascade, giver text not null references members on delete cascade,
  receiver text not null references members on delete cascade, bought boolean not null default false,
  primary key (exchange_id, giver));
alter table santa_exchanges enable row level security;
alter table santa_wishes enable row level security;
alter table santa_pairs enable row level security;      -- no policies: only the server reads or writes it
create policy santa_exchanges_read on santa_exchanges for select to authenticated using (family_id = private.my_family());
create policy santa_wishes_read on santa_wishes for select to authenticated
  using (exists (select 1 from public.santa_exchanges x where x.id = exchange_id and x.family_id = private.my_family()
    and (private.me() = any(x.joined) or private.is_host())));
grant select on santa_exchanges, santa_wishes to authenticated;
revoke all on santa_pairs from anon, authenticated;
revoke insert, update, delete on santa_exchanges, santa_wishes from anon, authenticated;
alter publication supabase_realtime add table santa_exchanges, santa_wishes;
