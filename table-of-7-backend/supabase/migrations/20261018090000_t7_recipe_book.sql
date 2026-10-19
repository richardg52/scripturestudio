-- Table of 7: Family Recipe Book (his order, 2026-10-18; photos show right away, no approval, his choice). A recipe
-- has a title, who it came from ("Grandma's cornbread"), a kind, serves, time, ingredients, steps, notes and a photo.
-- Anyone in the family can add one; the person who added it or the host can change or remove it; anyone can star it.
-- Photos live in the family's own private folder of the `media` bucket (<family>/recipes/…), which only that family's
-- signed-in phones can open. Phones may only READ recipes; every write goes through functions/recipes.
create table recipes (
  id text primary key default gen_random_uuid()::text, family_id text not null references families,
  added_by text references members on delete set null,
  title text not null check (length(title) between 1 and 80),
  credit text, kind text not null default 'main' check (kind in ('main','side','dessert','bread','breakfast','drink','other')),
  serves text, time text,
  ingredients text[] not null default '{}', steps text[] not null default '{}', notes text,
  photo_path text, favorites text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table recipes enable row level security;
create policy recipes_read on recipes for select to authenticated using (family_id = private.my_family());
grant select on recipes to authenticated;
revoke insert, update, delete on recipes from anon, authenticated;
alter publication supabase_realtime add table recipes;
-- One photo belongs to one recipe: removing or replacing a recipe's photo can never delete another recipe's picture.
-- (The road also only accepts a photo inside <family>/recipes/, so a dinner photo or a card can never be named.)
create unique index recipes_photo_once on recipes (photo_path) where photo_path is not null;
