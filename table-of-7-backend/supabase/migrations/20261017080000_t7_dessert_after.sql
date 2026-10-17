-- Table of 7: Dessert after (his order, 2026-10-17). An optional second stop on a plan: a bakery,
-- ice cream or dessert shop from our list, or a Google place saved by its Place ID only.
-- Who may set it is the existing rule for editing a plan: the plan's host, or the table's host.
alter table events add column dessert text references restaurants on delete set null;
