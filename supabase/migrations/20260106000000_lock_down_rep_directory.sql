-- Closes a hole opened by 20260105000000_group2_audit_fixes.sql.
--
-- That migration created public.rep_directory to stop the rep list handing
-- out every rep's payment handle, and granted SELECT on it. Granting SELECT
-- was not the problem. What it missed is that Supabase ships
--
--   alter default privileges in schema public
--     grant all on tables to anon, authenticated, service_role;
--
-- so the view was born holding INSERT, UPDATE, DELETE and TRUNCATE for anon
-- and authenticated before that GRANT ran. The later `grant select` only
-- added to a set that already had everything.
--
-- rep_directory is a simple single-table view, which makes it automatically
-- updatable, and it is deliberately not security_invoker so the public list
-- can be read without a session — which means writes through it run as the
-- view's owner and bypass RLS on representatives entirely.
--
-- Net effect: anyone with the publishable key, which ships in the browser
-- bundle, could rename or delete every rep in the project with one request
-- and no account. Reproduced against the live database with a filter
-- matching no rows: PostgREST answered 204, not 403.
--
-- Revoke first, then grant only SELECT. Order matters — a grant cannot undo
-- what default privileges already handed out.

revoke all on public.rep_directory from anon, authenticated;
grant select on public.rep_directory to anon, authenticated;

-- Any future view added to this schema is born the same way. Revoke before
-- granting, every time.
