-- Table of 7: Family Feud (his order, 2026-10-17). THE FAMILY IS THE SURVEY: a survey of five questions goes to
-- every seat; each person answers privately; the board is built from those real answers, and an answer's points
-- are the number of family members who gave it. No survey number is ever invented.
-- Phones may READ a survey's questions and who has answered; the answers themselves live in feud_answers, which
-- NO phone can read. Every write goes through functions/games. A Feud game is a row in `games` (kind 'feud'); its
-- hidden board sits in game_secrets until the judge reveals it.
create table feud_surveys (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  prompts text[] not null check (cardinality(prompts) between 1 and 5),
  status text not null default 'open' check (status in ('open','closed')),
  answered text[] not null default '{}', created_by text references members on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table feud_surveys enable row level security;
create policy feud_surveys_read on feud_surveys for select to authenticated using (family_id = private.my_family());
grant select on feud_surveys to authenticated;
alter publication supabase_realtime add table feud_surveys;
create table feud_answers (
  survey_id text not null references feud_surveys on delete cascade, member_id text not null references members on delete cascade,
  answers text[] not null, updated_at timestamptz not null default now(), primary key (survey_id, member_id));
alter table feud_answers enable row level security;   -- no policies: only the server reads or writes it
revoke all on feud_answers from anon, authenticated;
alter table games drop constraint games_kind_check;
alter table games add constraint games_kind_check check (kind in ('ttt','c4','checkers','trivia','feud'));
