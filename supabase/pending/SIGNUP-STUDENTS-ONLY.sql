-- ═══════════════════════════════════════════════════════════════════
-- Run in BOTH projects: production and test. Either order.
-- ═══════════════════════════════════════════════════════════════════
--
-- Every sign-up becomes a student. Nobody can make themselves a supplier
-- — not through the form, and not by calling Supabase's sign-up directly
-- with the public key, which the form alone could not stop.
--
-- Existing accounts and suppliers are untouched. You make a supplier by
-- hand now; the query is in OPERATIONS.md §1.
--
-- Independent of STUDENT-CANCEL.sql: run them in either order.
--
-- Tested on a fresh copy of the full schema: requests for "supplier",
-- for "admin", and the old "supplies": "true" route all produced a plain
-- student with no supplier row; a normal student sign-up kept name,
-- phone, university and year.

-- ═══════════════════════════════════════════════════════════════════
-- Sign-up makes students only. Suppliers are made by hand.
-- ═══════════════════════════════════════════════════════════════════
--
-- The owner hands supplier accounts to the students who are actually
-- selling. Anyone could previously pick "Shop / supplier" at sign-up and
-- land in the approval queue — and removing that button is not enough on
-- its own, because Supabase's sign-up can be called directly with the
-- public key and any metadata the caller likes. So the rule lives here,
-- in the trigger every sign-up goes through:
--
--   - every new account is a student, whatever role it asks for;
--   - no sign-up ever creates a suppliers row, including the old
--     "supplies": "true" path.
--
-- Making someone a supplier is one INSERT in the SQL Editor, written out
-- in OPERATIONS.md §1. Existing suppliers are untouched.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := new.raw_user_meta_data;
begin
  insert into public.profiles (id, role, full_name, phone, university, year_of_study, section)
  values (
    new.id,
    'student'::user_role,
    coalesce(meta->>'full_name', ''),
    meta->>'phone',
    meta->>'university',
    nullif(meta->>'year_of_study', '')::smallint,
    meta->>'section'
  );
  return new;
end;
$$;
