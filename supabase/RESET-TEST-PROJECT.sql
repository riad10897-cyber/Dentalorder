-- ═══════════════════════════════════════════════════════════════════
-- Empty the TEST project, so schema-full.sql can be run again
-- ═══════════════════════════════════════════════════════════════════
--
-- schema-full.sql only works on an empty project. Run it twice, or run
-- it after applying the migrations by hand, and it stops on the first
-- object that already exists:
--
--   ERROR: 42710: type "user_role" already exists
--
-- Nothing is applied when that happens — the whole paste is one
-- transaction, so it is all or nothing. This file clears the way.
--
-- ⚠ THIS DELETES EVERYTHING IN THE PROJECT'S public SCHEMA: every table,
--   view, function, type, and all the rows in them. There is no undo.
--   Only ever run it on the TEST project.
--
--   Check first, in the SQL Editor:
--
--     select (select count(*) from public.profiles) as people,
--            (select count(*) from public.orders)   as orders;
--
--   The test project reads 0 and 0. If it reads anything else, you are
--   in the wrong project.
--
-- Accounts are not in this schema, so any test sign-ups survive in
-- Authentication → Users. Delete them there if you want a clean start;
-- leaving them behind will make the next sign-up with the same email
-- fail as a duplicate.
--
-- Verified: on a database already carrying the schema, this runs clean
-- and schema-full.sql then runs top to bottom with no errors.

drop schema public cascade;
create schema public;

-- Put back the grants a Supabase project ships with, which went out with
-- the schema. Without these the API cannot see anything you create next.
grant usage on schema public to anon, authenticated, service_role;
grant all   on schema public to postgres;

alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
