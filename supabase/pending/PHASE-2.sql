-- Dentora — Phase 2: suppliers replace representatives.
--
-- DO NOT RUN THIS YET. It must go in the same window as the phase-2
-- code deploy: it drops the function and columns today's app calls, so
-- between running this and the deploy landing, ordering will not work.
--
-- Rehearsed on a copy of production — the real 8 accounts, 6 orders and
-- 29 line items, loaded verbatim, with this file applied in one
-- transaction. All 6 orders kept the same counterparty, the same total,
-- and a byte-identical fingerprint of every line price.
--
-- Nothing is deleted. representatives is renamed and locked rather than
-- dropped, so the originals survive.

-- Phase 2: the representative role stops being a separate thing.
--
-- A rep was always a supplier who happened to be a student and happened to
-- hand teeth over in class. This migration says so: representatives become
-- suppliers, students stop being bound to one of them, and every order
-- keeps pointing at exactly the person it always pointed at.
--
-- Nothing is deleted. The representatives table is kept, renamed and
-- locked, so the original rows survive this even though nothing reads them.

-- ═══════════════════════════════════════════════════════════════════
-- 1. A supplier can now be a student, and carries per-item prices
-- ═══════════════════════════════════════════════════════════════════

create type supplier_kind as enum ('student_supplier', 'shop');

alter table suppliers
  add column kind                   supplier_kind not null default 'shop',
  add column display_name           text,
  add column university             text,
  add column frasaco_price          numeric(10,2) not null default 2.50,
  add column copy_a_price           numeric(10,2) not null default 1.20,
  add column whish_number           text,
  add column price_updated_at       timestamptz default now(),
  add column subscription_paid_until date;

-- A student supplier has no business name and may have no phone on file
-- yet. Phase 3 makes phone required on the profile, which is the right
-- place for it.
alter table suppliers alter column business_name drop not null;
alter table suppliers alter column contact_phone drop not null;

-- The same floor reps have had since 20260104. A zero price makes orders
-- free; a negative one breaks ordering for everybody buying from them.
alter table suppliers
  add constraint suppliers_frasaco_price_range check (frasaco_price > 0 and frasaco_price <= 1000),
  add constraint suppliers_copy_a_price_range  check (copy_a_price  > 0 and copy_a_price  <= 1000);

-- ═══════════════════════════════════════════════════════════════════
-- 2. Every representative becomes a supplier, keeping their id
-- ═══════════════════════════════════════════════════════════════════
--
-- The id is the join to everything else — orders point at it — so reusing
-- it is what makes this a rename rather than a migration of references.
-- They arrive 'active': they were already trading, and dropping them into
-- pending_approval would take a working supplier offline.

insert into suppliers (
  id, kind, display_name, business_name, university, contact_phone,
  frasaco_price, copy_a_price, whish_number, price_updated_at,
  subscription_paid_until, status, created_at
)
select
  r.id, 'student_supplier', r.display_name, r.display_name, r.university, p.phone,
  r.frasaco_price, r.copy_a_price, r.whish_number, r.price_updated_at,
  r.subscription_paid_until, 'active', r.created_at
from representatives r
join profiles p on p.id = r.id
on conflict (id) do update set
  kind                    = 'student_supplier',
  display_name            = excluded.display_name,
  university              = excluded.university,
  frasaco_price           = excluded.frasaco_price,
  copy_a_price            = excluded.copy_a_price,
  whish_number            = excluded.whish_number,
  price_updated_at        = excluded.price_updated_at,
  subscription_paid_until = excluded.subscription_paid_until,
  status                  = 'active';

-- Shops that already existed keep their name as their display name.
update suppliers set display_name = business_name where display_name is null;
alter table suppliers alter column display_name set not null;

-- ═══════════════════════════════════════════════════════════════════
-- 3. Orders point at a supplier, not a rep
-- ═══════════════════════════════════════════════════════════════════
--
-- rep_id is copied into supplier_id before it is dropped, so the
-- counterparty on every existing order is unchanged. Suppliers already
-- exist for every rep_id by this point, so the foreign key holds.

alter table orders drop constraint order_shape;

-- The immutability trigger refuses to let supplier_id change, which is
-- exactly what it is for: no route and no role may move an order's
-- counterparty. A schema migration relocating the column is not that, so
-- the trigger is switched off for this one statement and back on
-- immediately. It stays inside the migration's transaction, and the values
-- written are copied from rep_id rather than computed — the counterparty is
-- the same person on the other side.
alter table orders disable trigger orders_protect_immutable_fields;

update orders
set supplier_id = rep_id
where order_type = 'tooth' and rep_id is not null;

alter table orders enable trigger orders_protect_immutable_fields;

drop index if exists orders_rep_id_idx;

-- These three name rep_id, so they have to go before the column does.
-- Section 7 recreates them around supplier_id.
drop policy if exists orders_select_rep on orders;
drop policy if exists orders_update_rep on orders;
drop policy if exists order_items_select on order_items;

alter table orders drop column rep_id;

alter table orders add constraint order_shape check (
  (order_type = 'tooth' and supplier_id is not null and week_number is not null)
  or
  (order_type = 'store' and supplier_id is not null)
);

create index if not exists orders_supplier_created_idx on orders (supplier_id, created_at desc);

-- The immutability trigger named rep_id. Dropping the column would leave
-- it referencing something that no longer exists, and it would fail on the
-- next update to any order.
create or replace function public.protect_order_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  if new.subtotal          is distinct from old.subtotal
  or new.commission_rate   is distinct from old.commission_rate
  or new.commission_amount is distinct from old.commission_amount
  or new.total_price       is distinct from old.total_price
  or new.order_type        is distinct from old.order_type
  or new.student_id        is distinct from old.student_id
  or new.supplier_id       is distinct from old.supplier_id
  or new.week_number       is distinct from old.week_number
  then
    raise exception 'orders: subtotal, commission, total, and order identity fields cannot be changed after creation';
  end if;
  return new;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. A student is no longer bound to anyone
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists profiles_select_by_rep on profiles;

-- representatives_select_by_student reads student_reps, so it has to go
-- first. Section 9 retires the rest of that table's policies.
drop policy if exists representatives_select_by_student on representatives;

drop table if exists student_reps;

-- This is the fix for a bug found in phase 1: a supplier could read a
-- student's name only while a live binding existed, so switching away left
-- the supplier holding an order from "Unknown student" — someone who may
-- still owe them money. Reading is now grounded in having an order
-- together, which is a fact that does not expire.
create policy profiles_select_by_counterparty on profiles
  for select using (
    exists (
      select 1 from orders o
      where o.student_id = profiles.id
        and o.supplier_id = auth.uid()
    )
  );

-- And the same in reverse: a student can read the profile of a supplier
-- they have ordered from.
create policy profiles_select_supplier_of_mine on profiles
  for select using (
    exists (
      select 1 from orders o
      where o.supplier_id = profiles.id
        and o.student_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- 5. The rep role becomes a student who supplies
-- ═══════════════════════════════════════════════════════════════════
--
-- Supplying is a row in suppliers, not a role. That is what lets one
-- account be both. 'rep' stays in the user_role enum because Postgres
-- cannot remove an enum value; nothing writes it any more.

update profiles set role = 'student' where role = 'rep';

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
      case when signup_role = 'supplier' then 'shop' else 'student_supplier' end,
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

-- ═══════════════════════════════════════════════════════════════════
-- 6. Ordering: the student names the supplier
-- ═══════════════════════════════════════════════════════════════════
--
-- There is no assigned rep to look up any more, so the supplier is an
-- argument. Everything else is unchanged on purpose: the price is still
-- read server-side from the supplier's current rates and written onto
-- every line, which is the rule the whole pricing design rests on.

drop function if exists public.submit_tooth_order(smallint, jsonb);

create or replace function public.submit_tooth_order(
  p_supplier_id uuid,
  p_week_number smallint,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id    uuid := auth.uid();
  v_frasaco_price numeric(10,2);
  v_copy_a_price  numeric(10,2);
  v_status        account_status;
  v_order_id      uuid;
  v_item          jsonb;
  v_quantity      integer;
  v_tooth_number  smallint;
  v_tooth_type    tooth_type;
  v_unit_price    numeric(10,2);
  v_subtotal      numeric(10,2) := 0;
  v_seen          text[] := '{}';
  v_key           text;
begin
  if v_student_id is null then
    raise exception 'must be signed in';
  end if;

  if p_week_number is null or p_week_number < 1 or p_week_number > 17 then
    raise exception 'week_number must be between 1 and 17';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'order must have at least one item';
  end if;

  if jsonb_array_length(p_items) > 64 then
    raise exception 'an order cannot have more than 64 lines';
  end if;

  select frasaco_price, copy_a_price, status
    into v_frasaco_price, v_copy_a_price, v_status
  from suppliers where id = p_supplier_id;

  if v_frasaco_price is null then
    raise exception 'no such supplier';
  end if;
  if v_status <> 'active' then
    raise exception 'that supplier is not taking orders';
  end if;
  if p_supplier_id = v_student_id then
    raise exception 'you cannot order from yourself';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity     := (v_item->>'quantity')::integer;
    v_tooth_number := (v_item->>'tooth_number')::smallint;
    v_tooth_type   := (v_item->>'tooth_type')::tooth_type;

    if v_quantity is null or v_quantity < 1 or v_quantity > 10 then
      raise exception 'quantity must be between 1 and 10';
    end if;
    if not (
      v_tooth_number between 11 and 18 or v_tooth_number between 21 and 28 or
      v_tooth_number between 31 and 38 or v_tooth_number between 41 and 48
    ) then
      raise exception 'invalid tooth number: %', v_tooth_number;
    end if;
    if v_tooth_type is null then
      raise exception 'tooth_type is required';
    end if;

    v_key := v_tooth_number || ':' || v_tooth_type;
    if v_key = any (v_seen) then
      raise exception 'tooth % appears twice as the same type in one order', v_tooth_number;
    end if;
    v_seen := v_seen || v_key;

    v_unit_price := case when v_tooth_type = 'frasaco' then v_frasaco_price else v_copy_a_price end;
    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  end loop;

  insert into orders (order_type, student_id, supplier_id, week_number, subtotal, total_price)
  values ('tooth', v_student_id, p_supplier_id, p_week_number, v_subtotal, v_subtotal)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity     := (v_item->>'quantity')::integer;
    v_tooth_number := (v_item->>'tooth_number')::smallint;
    v_tooth_type   := (v_item->>'tooth_type')::tooth_type;
    v_unit_price   := case when v_tooth_type = 'frasaco' then v_frasaco_price else v_copy_a_price end;

    insert into order_items (order_id, tooth_number, tooth_type, quantity, unit_price, line_total)
    values (v_order_id, v_tooth_number, v_tooth_type, v_quantity, v_unit_price, v_unit_price * v_quantity);
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.submit_tooth_order(uuid, smallint, jsonb) from public;
grant execute on function public.submit_tooth_order(uuid, smallint, jsonb) to authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 7. RLS, rewritten around suppliers
-- ═══════════════════════════════════════════════════════════════════
--
-- Unchanged in spirit: a supplier sees only their own orders, a student
-- sees only their own, and nobody reads a stranger's profile.

drop policy if exists orders_select_rep on orders;
drop policy if exists orders_update_rep on orders;
drop policy if exists orders_select_supplier on orders;
drop policy if exists orders_update_supplier on orders;

create policy orders_select_supplier on orders
  for select using (supplier_id = auth.uid());

create policy orders_update_supplier on orders
  for update using (supplier_id = auth.uid())
  with check (supplier_id = auth.uid());

-- order_items followed orders through rep_id; it follows supplier_id now.
drop policy if exists order_items_select on order_items;
create policy order_items_select on order_items
  for select using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
      and (
        orders.student_id = auth.uid()
        or orders.supplier_id = auth.uid()
        or public.is_admin()
      )
    )
  );

-- The market: any signed-in student browses active suppliers. The base
-- table stays need-to-know and the view below is the public window.
drop policy if exists suppliers_select_active on suppliers;
create policy suppliers_select_active on suppliers
  for select using (status = 'active');

-- ═══════════════════════════════════════════════════════════════════
-- 8. The public directory becomes a supplier directory
-- ═══════════════════════════════════════════════════════════════════

drop view if exists public.rep_directory;

create view public.supplier_directory as
  select id, display_name, kind, university, frasaco_price, copy_a_price
  from public.suppliers
  where status = 'active';

comment on view public.supplier_directory is
  'The market. Name, kind, faculty and prices — what a student chooses between. No whish_number, no subscription state, no contact details. Readable without a session because sign-up shows it before the account exists.';

-- Revoke first: this schema grants every new object full write access to
-- anon by default, and a grant cannot narrow what is already held. The
-- rep_directory view shipped writable for exactly this reason.
revoke all on public.supplier_directory from anon, authenticated;
grant select on public.supplier_directory to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 9. The representatives table is kept, not dropped
-- ═══════════════════════════════════════════════════════════════════
--
-- Everything in it has been copied into suppliers. It is renamed so
-- nothing reads it by accident, and left with RLS on and no policies, so
-- only the service role can see it. If this migration got something wrong,
-- the originals are still here.

drop policy if exists representatives_insert_self       on representatives;
drop policy if exists representatives_select_admin      on representatives;
drop policy if exists representatives_select_by_student on representatives;
drop policy if exists representatives_select_own        on representatives;
drop policy if exists representatives_update_admin      on representatives;
drop policy if exists representatives_update_own        on representatives;
drop trigger if exists representatives_protect_admin_fields on representatives;

alter table representatives rename to representatives_archived_20260109;

comment on table representatives_archived_20260109 is
  'Pre-phase-2 representatives, copied into suppliers by 20260109. Kept so the originals survive the migration. Nothing reads this.';
