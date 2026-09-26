-- ═══════════════════════════════════════════════════════════════════
-- Supplier sign-up: cast the kind literal to its enum
-- ═══════════════════════════════════════════════════════════════════
--
-- 20260109000000 introduced this insert:
--
--   case when signup_role = 'supplier' then 'shop' else 'student_supplier' end
--
-- Both branches are untyped literals, so Postgres resolves the CASE to
-- `text` before it ever looks at the target column, and the insert dies
-- with 42804 — "column kind is of type supplier_kind but expression is of
-- type text". There is no assignment cast from text to an enum.
--
-- Every branch of handle_new_user that writes a suppliers row hit this, so
-- no new supplier could sign up: Supabase reported it as the generic
-- "Database error creating new user". Students were never affected — their
-- path does not touch the table — and no existing account, order, price or
-- line total is involved either way.
--
-- The only change below is `::supplier_kind` on that expression.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta        jsonb := new.raw_user_meta_data;
  requested   text  := meta->>'role';
  signup_role user_role;
begin
  -- Self-registration can still only produce these. 'admin', a
  -- misspelling, and 'rep' all land on 'student' now.
  signup_role := case requested
                   when 'supplier' then 'supplier'::user_role
                   else 'student'::user_role
                 end;

  insert into public.profiles (id, role, full_name, phone, university, year_of_study, section)
  values (
    new.id,
    signup_role,
    coalesce(meta->>'full_name', ''),
    meta->>'phone',
    meta->>'university',
    nullif(meta->>'year_of_study', '')::smallint,
    meta->>'section'
  );

  -- A student who signs up wanting to supply gets a supplier row in the
  -- approval state suppliers have always started in.
  if signup_role = 'supplier' or coalesce(meta->>'supplies', '') = 'true' then
    insert into public.suppliers (
      id, kind, display_name, business_name, university, contact_phone, contact_email, description
    )
    values (
      new.id,
      (case
         when signup_role = 'supplier' then 'shop'
         else 'student_supplier'
       end)::supplier_kind,
      coalesce(nullif(meta->>'business_name', ''), meta->>'full_name', ''),
      nullif(meta->>'business_name', ''),
      meta->>'university',
      meta->>'contact_phone',
      meta->>'contact_email',
      meta->>'description'
    );
  end if;

  return new;
end;
$$;
