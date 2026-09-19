-- Audit fixes, group 2.
--
-- ═════════════════════════════════════════════════════════════
-- A2 — the public rep list handed out every rep's payment handle
-- ═════════════════════════════════════════════════════════════
--
-- representatives_select_all was `using (true)`, and RLS is row-level:
-- letting a row through lets every column through. So any signed-in
-- user — a student of another rep, a supplier, anyone — could read
-- whish_number and subscription_paid_until off every rep in the
-- project. whish_number is a payment handle. It is collected at
-- sign-up and displayed nowhere in the app.
--
-- The directory is also read with no session at all: the sign-up page
-- needs the list before the account exists, so the anon role has to be
-- able to see it. That rules out solving this with policies alone.
--
-- Split the two jobs instead. The base table becomes need-to-know, and
-- a view carries the four columns that are genuinely public. The view
-- is intentionally NOT security_invoker: it runs as its owner and so
-- reads past the base table's RLS, which is the whole point — it is
-- the one sanctioned window onto representatives, and it exposes no
-- money and no payment handle.

drop policy if exists representatives_select_all on representatives;

-- A rep sees their own row in full, whish_number included.
create policy representatives_select_own on representatives
  for select using (id = auth.uid());

-- A student sees their own rep in full. They have to: getStudentContext
-- reads frasaco_price and copy_a_price through this, and they pay this
-- person directly, so the payment handle is theirs to have.
create policy representatives_select_by_student on representatives
  for select using (
    exists (
      select 1 from student_reps
      where student_reps.rep_id = representatives.id
      and student_reps.student_id = auth.uid()
    )
  );

create policy representatives_select_admin on representatives
  for select using (public.is_admin());

create view public.rep_directory as
  select id, display_name, university, section
  from public.representatives;

comment on view public.rep_directory is
  'Public rep picker list. Four columns on purpose: no prices, no whish_number, no subscription state. Readable without a session because sign-up needs it before the account exists.';

grant select on public.rep_directory to anon, authenticated;

-- ═════════════════════════════════════════════════════════════
-- M2 / D2 — an order could carry unlimited and duplicate lines
-- ═════════════════════════════════════════════════════════════
--
-- submit_tooth_order checked that the array was non-empty and never
-- checked how long it was, and nothing stopped the same tooth and type
-- appearing twice. A crafted call made a 500-line order totalling
-- $12,500, or stacked tooth 11 three times, and the rep's weekly batch
-- dutifully added it all up. The real ceiling is 64: 32 FDI positions
-- in two types, which is every tooth the chart can produce.
--
-- The unique index is the constraint that actually holds; the check
-- inside the function exists so the student gets a sentence instead of
-- a Postgres index violation.

create unique index order_items_one_row_per_tooth_and_type
  on order_items (order_id, tooth_number, tooth_type)
  where tooth_number is not null;

-- ═════════════════════════════════════════════════════════════
-- D3 — orders could hold negative money
-- ═════════════════════════════════════════════════════════════
--
-- products.price had `check (price >= 0)`; orders never did. Nothing
-- reachable by a student could write one, but the column that records
-- what somebody owes should not be able to go below zero at all.

alter table orders
  add constraint orders_subtotal_non_negative check (subtotal >= 0),
  add constraint orders_total_price_non_negative check (total_price >= 0),
  add constraint orders_commission_amount_non_negative check (commission_amount >= 0);

-- ═════════════════════════════════════════════════════════════
-- A3 — reps could write columns the spec never gave them
-- ═════════════════════════════════════════════════════════════
--
-- Spec §11: "Reps read orders where rep_id matches their id; they may
-- update fulfillment_status and payment_status only." orders_update_rep
-- allowed any column the immutability trigger did not already guard, so
-- a rep could write notes and delivery_address on a student's order.
--
-- RLS cannot express "these columns"; a column grant can. This narrows
-- every non-superuser path, admin included — the spec gives admin
-- suppliers.commission_rate, profiles.status,
-- representatives.subscription_paid_until and commission_statements,
-- not order fields. The orders_set_updated_at trigger still maintains
-- updated_at, because triggers run as the table owner rather than as
-- whoever made the request.

revoke update on public.orders from anon, authenticated;
grant update (fulfillment_status, payment_status) on public.orders to authenticated;

-- ═════════════════════════════════════════════════════════════
-- M2, continued — the readable version of the line-count rule
-- ═════════════════════════════════════════════════════════════

create or replace function public.submit_tooth_order(p_week_number smallint, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id   uuid := auth.uid();
  v_rep_id       uuid;
  v_frasaco_price numeric(10,2);
  v_copy_a_price  numeric(10,2);
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

  -- 32 FDI positions in two types is everything the chart can produce.
  if jsonb_array_length(p_items) > 64 then
    raise exception 'an order cannot have more than 64 lines';
  end if;

  select rep_id into v_rep_id from student_reps where student_id = v_student_id;
  if v_rep_id is null then
    raise exception 'no representative assigned';
  end if;

  select frasaco_price, copy_a_price into v_frasaco_price, v_copy_a_price
  from representatives where id = v_rep_id;

  -- Validate every line and total the order before writing anything, so a
  -- bad line fails the whole submission instead of leaving a partial order.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    v_tooth_number := (v_item->>'tooth_number')::smallint;
    v_tooth_type := (v_item->>'tooth_type')::tooth_type;

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

    -- One line per tooth and type. Ordering tooth 11 in both Frasaco and
    -- Copy A is two lines and stays legal; sending tooth 11 Frasaco twice
    -- is a malformed order, and used to silently double the rep's batch.
    v_key := v_tooth_number || ':' || v_tooth_type;
    if v_key = any (v_seen) then
      raise exception 'tooth % appears twice as the same type in one order', v_tooth_number;
    end if;
    v_seen := v_seen || v_key;

    v_unit_price := case when v_tooth_type = 'frasaco' then v_frasaco_price else v_copy_a_price end;
    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  end loop;

  insert into orders (order_type, student_id, rep_id, week_number, subtotal, total_price)
  values ('tooth', v_student_id, v_rep_id, p_week_number, v_subtotal, v_subtotal)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    v_tooth_number := (v_item->>'tooth_number')::smallint;
    v_tooth_type := (v_item->>'tooth_type')::tooth_type;
    v_unit_price := case when v_tooth_type = 'frasaco' then v_frasaco_price else v_copy_a_price end;

    insert into order_items (order_id, tooth_number, tooth_type, quantity, unit_price, line_total)
    values (v_order_id, v_tooth_number, v_tooth_type, v_quantity, v_unit_price, v_unit_price * v_quantity);
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.submit_tooth_order(smallint, jsonb) from public;
grant execute on function public.submit_tooth_order(smallint, jsonb) to authenticated;
