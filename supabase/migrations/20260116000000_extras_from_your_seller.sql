-- ═══════════════════════════════════════════════════════════════════
-- Extras from your seller: products on the weekly order
-- ═══════════════════════════════════════════════════════════════════
--
-- A seller lists a few products besides teeth. A student adds them to
-- the weekly order they are already placing with that seller: one seller,
-- one order, one pickup, one payment.
--
-- What this does NOT change: the twelve orders already in production, and
-- every order line in them. No row is updated or deleted except the two
-- product categories nobody uses (see 1).
--
-- A note on the name "tooth": every weekly order is order_type = 'tooth',
-- and stays that way when it carries extras. Every screen and policy
-- filters on it, so from here on 'tooth' means "a weekly order from a
-- seller". The constraints already allow product lines on such an order:
-- order_shape asks only for a supplier and a week, and item_shape lets a
-- line be either a tooth or a product. Neither needs to change.
--
-- No commission: weekly orders are inserted with commission 0, as they
-- always have been. Nothing here reads suppliers.commission_rate.

-- ── 1. The five categories, and only those ─────────────────────────────
--
-- The original spec seeded Disposables, Instruments, Materials, Equipment
-- and Lab. The list is now Burs, Instruments, Materials, Gloves & masks,
-- Equipment. Production has no products, so nothing points at the two
-- that go. Only an admin can write this table (existing policy).

insert into public.product_categories (name, slug, sort_order) values
  ('Burs',           'burs',          1),
  ('Instruments',    'instruments',   2),
  ('Materials',      'materials',     3),
  ('Gloves & masks', 'gloves-masks',  4),
  ('Equipment',      'equipment',     5)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

delete from public.product_categories where slug in ('disposables', 'lab');

-- ── 2. Products: in stock, required category, sane values ──────────────
--
-- is_active is "switched off" (the seller stopped selling it, hidden from
-- students). in_stock is the day-to-day toggle (still sold, none right
-- now). Both have to be on for a student to see or order it.

alter table public.products
  add column if not exists in_stock boolean not null default true;

-- Every product sits in one of the five. Restrict, not set null: a
-- category cannot be deleted out from under the products in it.
alter table public.products alter column category_id set not null;
alter table public.products drop constraint if exists products_category_id_fkey;
alter table public.products
  add constraint products_category_id_fkey
  foreign key (category_id) references public.product_categories (id) on delete restrict;

-- Dropped first so a second run of this file is harmless.
alter table public.products drop constraint if exists products_price_check;
alter table public.products drop constraint if exists products_price_range;
alter table public.products drop constraint if exists products_name_present;
alter table public.products drop constraint if exists products_unit_length;
alter table public.products
  add constraint products_price_range check (price > 0 and price <= 2000);
alter table public.products
  add constraint products_name_present check (btrim(name) <> '' and length(name) <= 80);
alter table public.products
  add constraint products_unit_length check (unit is null or length(unit) <= 40);

-- ── 3. Who can see and change products ─────────────────────────────────
--
-- Before this, any switched-on product of any seller — suspended ones
-- included, out of stock included — was readable by anyone, signed in or
-- not. Now:
--   - a signed-in student sees a product only if it is switched on, in
--     stock, and its seller is active (supplier_directory lists exactly
--     the active sellers);
--   - a seller sees and changes all of their own, and nobody else's
--     beyond what any student sees;
--   - signed-out visitors see nothing.

revoke all on public.products from anon;

drop policy if exists products_select_active on public.products;
drop policy if exists products_select_market on public.products;
create policy products_select_market on public.products
  for select to authenticated
  using (
    is_active and in_stock
    and exists (select 1 from public.supplier_directory d where d.id = products.supplier_id)
  );

drop policy if exists products_select_own on public.products;
create policy products_select_own on public.products
  for select to authenticated using (supplier_id = auth.uid());

drop policy if exists products_insert_own on public.products;
create policy products_insert_own on public.products
  for insert to authenticated
  with check (
    supplier_id = auth.uid()
    and exists (select 1 from public.suppliers where id = auth.uid() and status = 'active')
  );

drop policy if exists products_update_own on public.products;
create policy products_update_own on public.products
  for update to authenticated
  using (supplier_id = auth.uid()) with check (supplier_id = auth.uid());

drop policy if exists products_delete_own on public.products;
create policy products_delete_own on public.products
  for delete to authenticated using (supplier_id = auth.uid());

-- ── 4. Product lines on an order ───────────────────────────────────────
--
-- The name and the price were already snapshotted columns. The unit joins
-- them: "Nitrile gloves × 2" means nothing without "box of 100", and a
-- seller may later change the box size.

alter table public.order_items add column if not exists product_unit text;

-- One line per product per order, as with teeth.
create unique index if not exists order_items_one_row_per_product
  on public.order_items (order_id, product_id) where product_id is not null;

-- order_items_protect (20260111000000) already refuses every UPDATE to
-- every line, product lines included. Nothing to add there.

-- ── 5. Placing an order: teeth, products, or both ──────────────────────
--
-- Same function, same arguments, same rules. An item is now either
--   { "tooth_number": 11, "tooth_type": "frasaco", "quantity": 2 }
--   { "product_id": "…", "quantity": 1 }
-- and every price comes from the database. Anything else a client sends
-- with an item — a price, a name — is never read.
--
-- A product is refused unless it belongs to this seller, is switched on
-- and is in stock (DT003, naming the product where it is safe to).
--
-- Every line is priced once, into v_lines, and inserted from there. Read
-- twice, a seller changing a price mid-order could make the lines and
-- the total disagree.

create or replace function public.submit_tooth_order(
  p_supplier_id    uuid,
  p_week_number    smallint,
  p_items          jsonb,
  p_expected_total numeric default null
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
  v_product_id    uuid;
  v_product       record;
  v_unit_price    numeric(10,2);
  v_subtotal      numeric(10,2) := 0;
  v_seen          text[] := '{}';
  v_key           text;
  v_lines         jsonb := '[]'::jsonb;
  v_line          jsonb;
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

  -- 64 tooth lines (32 positions, two types) plus room for extras.
  if jsonb_array_length(p_items) > 100 then
    raise exception 'an order cannot have more than 100 lines';
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

  -- Pass 1: validate and price every line, once.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity < 1 or v_quantity > 10 then
      raise exception 'quantity must be between 1 and 10';
    end if;

    if v_item ? 'product_id' then
      if v_item ? 'tooth_number' or v_item ? 'tooth_type' then
        raise exception 'a line is either a tooth or a product, not both';
      end if;
      v_product_id := (v_item->>'product_id')::uuid;

      select id, supplier_id, name, unit, price, is_active, in_stock
        into v_product
      from products where id = v_product_id;

      -- Someone else's product reads exactly like no product at all.
      if not found or v_product.supplier_id <> p_supplier_id then
        raise exception 'that product is not available from this seller'
          using errcode = 'DT003';
      end if;
      if not v_product.is_active then
        raise exception '% is no longer sold', v_product.name using errcode = 'DT003';
      end if;
      if not v_product.in_stock then
        raise exception '% is out of stock', v_product.name using errcode = 'DT003';
      end if;

      v_key := 'p:' || v_product_id;
      if v_key = any (v_seen) then
        raise exception '% appears twice in one order', v_product.name;
      end if;
      v_seen := v_seen || v_key;

      v_unit_price := v_product.price;
      v_lines := v_lines || jsonb_build_object(
        'product_id',   v_product.id,
        'product_name', v_product.name,
        'product_unit', v_product.unit,
        'quantity',     v_quantity,
        'unit_price',   v_unit_price
      );
    else
      v_tooth_number := (v_item->>'tooth_number')::smallint;
      v_tooth_type   := (v_item->>'tooth_type')::tooth_type;

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
      v_lines := v_lines || jsonb_build_object(
        'tooth_number', v_tooth_number,
        'tooth_type',   v_tooth_type,
        'quantity',     v_quantity,
        'unit_price',   v_unit_price
      );
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  end loop;

  -- The student is charged what their screen said, or told it changed.
  -- Checked before anything is written, so a refusal leaves no trace.
  if p_expected_total is not null
     and round(p_expected_total, 2) <> v_subtotal then
    raise exception 'prices changed: the total is now %', v_subtotal
      using errcode = 'DT001', detail = v_subtotal::text;
  end if;

  insert into orders (order_type, student_id, supplier_id, week_number, subtotal, total_price)
  values ('tooth', v_student_id, p_supplier_id, p_week_number, v_subtotal, v_subtotal)
  returning id into v_order_id;

  -- Pass 2: write exactly the lines priced above.
  for v_line in select * from jsonb_array_elements(v_lines)
  loop
    v_unit_price := (v_line->>'unit_price')::numeric(10,2);
    v_quantity   := (v_line->>'quantity')::integer;

    insert into order_items (
      order_id, tooth_number, tooth_type,
      product_id, product_name, product_unit,
      quantity, unit_price, line_total
    )
    values (
      v_order_id,
      (v_line->>'tooth_number')::smallint,
      (v_line->>'tooth_type')::tooth_type,
      (v_line->>'product_id')::uuid,
      v_line->>'product_name',
      v_line->>'product_unit',
      v_quantity, v_unit_price, v_unit_price * v_quantity
    );
  end loop;

  return v_order_id;
end;
$$;

-- Same signature as before, so the grant carries over; restated so this
-- file stands on its own.
revoke all on function public.submit_tooth_order(uuid, smallint, jsonb, numeric) from public;
revoke all on function public.submit_tooth_order(uuid, smallint, jsonb, numeric) from anon;
grant execute on function public.submit_tooth_order(uuid, smallint, jsonb, numeric) to authenticated;
