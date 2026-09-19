-- Audit fixes, group 1.
--
-- A1 — role escalation at sign-up.
--
-- handle_new_user took the role straight out of raw_user_meta_data:
--
--     signup_role := coalesce((meta->>'role')::user_role, 'student');
--
-- raw_user_meta_data is whatever the caller put in the sign-up request,
-- and the sign-up request needs nothing but the publishable key — which
-- ships in the browser bundle. So a POST to /auth/v1/signup carrying
-- {"data": {"role": "admin"}} produced a real admin profile. is_admin()
-- gates roughly a third of the RLS policies, so that was read and write
-- across the whole database. The Zod union in the app guards the app's
-- own form; it never sees a request made directly to Supabase Auth.
--
-- The role now comes from a fixed list. Self-registration can produce
-- student, rep or supplier and nothing else: 'admin', a misspelling, or
-- a value that is not a role at all all land on 'student'. Admins are
-- made by hand in the SQL Editor (CLAUDE.md), which is unaffected —
-- this function only runs on INSERT into auth.users.
--
-- The CASE also removes a second failure mode. The old cast raised
-- 22P02 on any string that was not an enum member, which aborted the
-- trigger and failed the whole sign-up; a junk role now signs up
-- normally as a student.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta         jsonb := new.raw_user_meta_data;
  requested    text  := meta->>'role';
  signup_role  user_role;
  chosen_rep   uuid;
begin
  signup_role := case requested
                   when 'rep'      then 'rep'::user_role
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

  if signup_role = 'rep' then
    insert into public.representatives (id, display_name, university, year_of_study, section, whish_number)
    values (
      new.id,
      coalesce(meta->>'full_name', ''),
      coalesce(meta->>'university', ''),
      nullif(meta->>'year_of_study', '')::smallint,
      meta->>'section',
      meta->>'whish_number'
    );
  elsif signup_role = 'supplier' then
    insert into public.suppliers (id, business_name, contact_phone, contact_email, description)
    values (
      new.id,
      coalesce(meta->>'business_name', ''),
      coalesce(meta->>'contact_phone', ''),
      meta->>'contact_email',
      meta->>'description'
    );
  elsif signup_role = 'student' then
    chosen_rep := nullif(meta->>'rep_id', '')::uuid;
    if chosen_rep is not null then
      insert into public.student_reps (student_id, rep_id)
      values (new.id, chosen_rep);
    end if;
  end if;

  return new;
end;
$$;

-- M1 — a rep's prices had no floor.
--
-- The Zod schema behind the pricing form requires a positive number, but
-- representatives_update_own lets a rep PATCH their own row directly, so
-- the form was the only thing enforcing it. A negative price was accepted
-- and then broke ordering outright for that rep's entire group — the
-- order_items unit_price check fired and every submission failed. A zero
-- price was accepted and quietly produced $0.00 orders.
--
-- A check constraint holds on every path into the column: the form, a
-- crafted PATCH, the SQL Editor, a future server action. The ceiling
-- matches updateRepPricesSchema's .max(1000) so the two cannot drift.
alter table representatives
  add constraint representatives_frasaco_price_range
    check (frasaco_price > 0 and frasaco_price <= 1000),
  add constraint representatives_copy_a_price_range
    check (copy_a_price > 0 and copy_a_price <= 1000);
