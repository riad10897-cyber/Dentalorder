-- ═══════════════════════════════════════════════════════════════════
-- DentalOrder — complete schema, for a FRESH Supabase project
-- ═══════════════════════════════════════════════════════════════════
--
-- Every migration in supabase/migrations/, in filename order, in one
-- file. Paste the whole thing into the Supabase SQL Editor and press Run
-- once.
--
-- THIS IS FOR AN EMPTY PROJECT ONLY. It runs `create type` and
-- `create table` without guards, so against a project that already has
-- the schema it stops on the first object that exists and leaves the
-- rest unapplied. Use it to stand up a new project (the test project in
-- OPERATIONS.md, or a rebuild); use the individual migration files for a
-- project that already has data.
--
-- Generated file — do not edit. Change a migration and re-run
-- `npm run schema:build`.
--
-- Generated from:
--   20260101000000_initial_schema.sql
--   20260102000000_allow_direct_db_admin_changes.sql
--   20260103000000_tooth_order_rpc.sql
--   20260104000000_lock_down_signup_role_and_prices.sql
--   20260105000000_group2_audit_fixes.sql
--   20260106000000_lock_down_rep_directory.sql
--   20260107000000_rep_directory_prices.sql


-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260101000000_initial_schema.sql
-- ═══════════════════════════════════════════════════════════════════

-- DentalOrder — Phase 1 foundation schema
-- Full schema from Build Spec v3.0 §4, plus RLS policies from §11,
-- protective triggers for money/identity fields, and the profiles
-- auto-provisioning trigger.

-- ═════════════════════════════════════════════════════════════
-- ENUMS
-- ═════════════════════════════════════════════════════════════
create type user_role          as enum ('student','rep','supplier','admin');
create type order_type         as enum ('tooth','store');
create type payment_status     as enum ('unpaid','pending','paid');
create type fulfillment_status as enum ('pending','confirmed','fulfilled','cancelled');
create type tooth_type         as enum ('frasaco','copy_a');
create type account_status     as enum ('active','suspended','pending_approval');

-- ═════════════════════════════════════════════════════════════
-- PROFILES  (1:1 with auth.users)
-- ═════════════════════════════════════════════════════════════
create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  role          user_role not null default 'student',
  full_name     text not null,
  phone         text,
  university    text,          -- 'BAU' | 'LU' | 'USJ' | other
  year_of_study smallint,      -- 1..5
  section       text,
  status        account_status not null default 'active',
  created_at    timestamptz not null default now()
);

-- ═════════════════════════════════════════════════════════════
-- REPRESENTATIVES
-- ═════════════════════════════════════════════════════════════
create table representatives (
  id                uuid primary key references profiles(id) on delete cascade,
  display_name      text not null,
  university        text not null,
  year_of_study     smallint,
  section           text,
  frasaco_price     numeric(10,2) not null default 2.50,
  copy_a_price      numeric(10,2) not null default 1.20,
  whish_number      text,
  subscription_paid_until date,
  price_updated_at  timestamptz default now(),
  created_at        timestamptz not null default now()
);

-- student → rep assignment
create table student_reps (
  student_id uuid primary key references profiles(id) on delete cascade,
  rep_id     uuid not null references representatives(id) on delete restrict,
  assigned_at timestamptz not null default now()
);

-- ═════════════════════════════════════════════════════════════
-- SUPPLIERS
-- ═════════════════════════════════════════════════════════════
create table suppliers (
  id               uuid primary key references profiles(id) on delete cascade,
  business_name    text not null,
  contact_phone    text not null,
  contact_email    text,
  logo_url         text,
  description      text,
  commission_rate  numeric(5,2) not null default 10.00,  -- percent, admin-set
  delivery_notes   text,       -- shown to student at checkout
  status           account_status not null default 'pending_approval',
  created_at       timestamptz not null default now()
);

create table product_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  sort_order smallint not null default 0
);

create table products (
  id           uuid primary key default gen_random_uuid(),
  supplier_id  uuid not null references suppliers(id) on delete cascade,
  category_id  uuid references product_categories(id) on delete set null,
  name         text not null,
  description  text,
  image_url    text,
  price        numeric(10,2) not null check (price >= 0),
  unit         text,                    -- 'box of 100', 'each', 'pack'
  stock_qty    integer,                 -- null = untracked
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on products (supplier_id);
create index on products (category_id) where is_active;

-- ═════════════════════════════════════════════════════════════
-- ORDERS — one spine, two types
-- ═════════════════════════════════════════════════════════════
create table orders (
  id                 uuid primary key default gen_random_uuid(),
  order_type         order_type not null,
  student_id         uuid not null references profiles(id) on delete restrict,

  rep_id             uuid references representatives(id) on delete restrict, -- tooth only
  supplier_id        uuid references suppliers(id) on delete restrict,       -- store only

  week_number        smallint check (week_number between 1 and 17),          -- tooth only

  subtotal           numeric(10,2) not null default 0,
  commission_rate    numeric(5,2)  not null default 0,   -- snapshot, store only
  commission_amount  numeric(10,2) not null default 0,   -- snapshot, store only
  total_price        numeric(10,2) not null default 0,

  payment_status     payment_status not null default 'unpaid',
  fulfillment_status fulfillment_status not null default 'pending',
  delivery_address   text,                               -- store only
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- a tooth order has a rep and a week; a store order has a supplier
  constraint order_shape check (
    (order_type = 'tooth' and rep_id is not null and supplier_id is null and week_number is not null)
    or
    (order_type = 'store' and supplier_id is not null and rep_id is null)
  )
);
create index on orders (student_id, created_at desc);
create index on orders (rep_id) where order_type = 'tooth';
create index on orders (supplier_id) where order_type = 'store';

create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,

  -- tooth line
  tooth_number smallint check (
    tooth_number between 11 and 18 or tooth_number between 21 and 28 or
    tooth_number between 31 and 38 or tooth_number between 41 and 48
  ),
  tooth_type   tooth_type,

  -- store line
  product_id   uuid references products(id) on delete restrict,
  product_name text,          -- snapshot; product may later be renamed or deleted

  quantity     integer not null check (quantity > 0),
  unit_price   numeric(10,2) not null check (unit_price >= 0),  -- price snapshot
  line_total   numeric(10,2) not null,

  constraint item_shape check (
    (tooth_number is not null and tooth_type is not null and product_id is null)
    or
    (product_id is not null and tooth_number is null and tooth_type is null)
  )
);
create index on order_items (order_id);

-- ═════════════════════════════════════════════════════════════
-- COMMISSION STATEMENTS
-- ═════════════════════════════════════════════════════════════
create table commission_statements (
  id             uuid primary key default gen_random_uuid(),
  supplier_id    uuid not null references suppliers(id) on delete cascade,
  period_start   date not null,
  period_end     date not null,
  order_count    integer not null default 0,
  gross_sales    numeric(10,2) not null default 0,
  commission_due numeric(10,2) not null default 0,
  is_settled     boolean not null default false,
  settled_at     timestamptz,
  created_at     timestamptz not null default now(),
  unique (supplier_id, period_start, period_end)
);

-- ═════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS (security definer — read profiles without
-- triggering recursive RLS evaluation on the profiles table itself)
-- ═════════════════════════════════════════════════════════════
create or replace function public.current_user_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ═════════════════════════════════════════════════════════════
-- updated_at maintenance
-- ═════════════════════════════════════════════════════════════
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
  before update on products
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
  before update on orders
  for each row execute function public.set_updated_at();

-- ═════════════════════════════════════════════════════════════
-- PROTECT MONEY & IDENTITY FIELDS ON ORDERS
-- Rule: totals are computed server-side at insert. No role — not
-- even admin — may edit these on an existing order.
-- ═════════════════════════════════════════════════════════════
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
  or new.rep_id             is distinct from old.rep_id
  or new.supplier_id        is distinct from old.supplier_id
  or new.week_number        is distinct from old.week_number
  then
    raise exception 'orders: subtotal, commission, total, and order identity fields cannot be changed after creation';
  end if;
  return new;
end;
$$;

create trigger orders_protect_immutable_fields
  before update on orders
  for each row execute function public.protect_order_immutable_fields();

-- Suppliers self-register into pending_approval and cannot grant
-- themselves an approved status or set their own commission rate.
create or replace function public.protect_supplier_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and not public.is_admin() then
    if new.status is distinct from old.status then
      raise exception 'suppliers.status can only be changed by an admin';
    end if;
    if new.commission_rate is distinct from old.commission_rate then
      raise exception 'suppliers.commission_rate can only be changed by an admin';
    end if;
  end if;
  if tg_op = 'INSERT' and not public.is_admin() and new.status is distinct from 'pending_approval' then
    raise exception 'new suppliers must start pending_approval';
  end if;
  return new;
end;
$$;

create trigger suppliers_protect_admin_fields
  before insert or update on suppliers
  for each row execute function public.protect_supplier_admin_fields();

-- Only an admin may change profiles.status or profiles.role.
create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin() then
    if new.status is distinct from old.status then
      raise exception 'profiles.status can only be changed by an admin';
    end if;
    if new.role is distinct from old.role then
      raise exception 'profiles.role can only be changed by an admin';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_admin_fields
  before update on profiles
  for each row execute function public.protect_profile_admin_fields();

-- Only an admin may change a representative's subscription expiry.
create or replace function public.protect_representative_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin() and new.subscription_paid_until is distinct from old.subscription_paid_until then
    raise exception 'representatives.subscription_paid_until can only be changed by an admin';
  end if;
  return new;
end;
$$;

create trigger representatives_protect_admin_fields
  before update on representatives
  for each row execute function public.protect_representative_admin_fields();

-- ═════════════════════════════════════════════════════════════
-- AUTO-PROVISION profiles (+ role-specific row) ON SIGN-UP
-- ═════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta         jsonb := new.raw_user_meta_data;
  signup_role  user_role := coalesce((meta->>'role')::user_role, 'student');
  chosen_rep   uuid;
begin
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — enabled on every table, no exceptions
-- ═════════════════════════════════════════════════════════════
alter table profiles              enable row level security;
alter table representatives       enable row level security;
alter table student_reps          enable row level security;
alter table suppliers             enable row level security;
alter table product_categories    enable row level security;
alter table products              enable row level security;
alter table orders                enable row level security;
alter table order_items           enable row level security;
alter table commission_statements enable row level security;

-- ── profiles ──
create policy profiles_select_own on profiles
  for select using (id = auth.uid());

create policy profiles_select_admin on profiles
  for select using (public.is_admin());

-- Reps can see the profile of the students assigned to them (needed
-- for the rep dashboard's student list in Phase 2).
create policy profiles_select_by_rep on profiles
  for select using (
    exists (
      select 1 from student_reps
      where student_reps.student_id = profiles.id
      and student_reps.rep_id = auth.uid()
    )
  );

create policy profiles_update_own on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_update_admin on profiles
  for update using (public.is_admin());

-- No insert policy: rows are created only by the handle_new_user
-- trigger (security definer), never directly by a client.

-- ── representatives ──
-- Public reference data: students need to browse reps at signup.
create policy representatives_select_all on representatives
  for select using (true);

create policy representatives_insert_self on representatives
  for insert with check (id = auth.uid());

create policy representatives_update_own on representatives
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy representatives_update_admin on representatives
  for update using (public.is_admin());

-- ── student_reps ──
create policy student_reps_select_own on student_reps
  for select using (student_id = auth.uid());

create policy student_reps_select_by_rep on student_reps
  for select using (rep_id = auth.uid());

create policy student_reps_select_admin on student_reps
  for select using (public.is_admin());

create policy student_reps_insert_own on student_reps
  for insert with check (student_id = auth.uid());

create policy student_reps_update_own on student_reps
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());

-- ── suppliers ──
create policy suppliers_select_active on suppliers
  for select using (status = 'active');

create policy suppliers_select_own on suppliers
  for select using (id = auth.uid());

create policy suppliers_select_admin on suppliers
  for select using (public.is_admin());

create policy suppliers_insert_self on suppliers
  for insert with check (id = auth.uid());

create policy suppliers_update_own on suppliers
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy suppliers_update_admin on suppliers
  for update using (public.is_admin());

-- ── product_categories ──
create policy product_categories_select_all on product_categories
  for select using (true);

create policy product_categories_admin_write on product_categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ── products ──
create policy products_select_active on products
  for select using (is_active = true);

create policy products_select_own on products
  for select using (supplier_id = auth.uid());

create policy products_select_admin on products
  for select using (public.is_admin());

create policy products_insert_own on products
  for insert with check (
    supplier_id = auth.uid()
    and exists (select 1 from suppliers where id = auth.uid() and status = 'active')
  );

create policy products_update_own on products
  for update using (supplier_id = auth.uid()) with check (supplier_id = auth.uid());

create policy products_delete_own on products
  for delete using (supplier_id = auth.uid());

create policy products_admin_all on products
  for all using (public.is_admin()) with check (public.is_admin());

-- ── orders ──
create policy orders_select_student on orders
  for select using (student_id = auth.uid());

create policy orders_select_rep on orders
  for select using (order_type = 'tooth' and rep_id = auth.uid());

create policy orders_select_supplier on orders
  for select using (order_type = 'store' and supplier_id = auth.uid());

create policy orders_select_admin on orders
  for select using (public.is_admin());

create policy orders_insert_student on orders
  for insert with check (student_id = auth.uid());

-- Reps and suppliers may only touch status/notes on their own orders;
-- the trigger above blocks money and identity fields for everyone.
create policy orders_update_rep on orders
  for update using (order_type = 'tooth' and rep_id = auth.uid())
  with check (order_type = 'tooth' and rep_id = auth.uid());

create policy orders_update_supplier on orders
  for update using (order_type = 'store' and supplier_id = auth.uid())
  with check (order_type = 'store' and supplier_id = auth.uid());

create policy orders_update_admin on orders
  for update using (public.is_admin());

-- No delete policy: orders are never deleted, only cancelled via
-- fulfillment_status.

-- ── order_items ──
create policy order_items_select on order_items
  for select using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
      and (
        orders.student_id = auth.uid()
        or (orders.order_type = 'tooth' and orders.rep_id = auth.uid())
        or (orders.order_type = 'store' and orders.supplier_id = auth.uid())
        or public.is_admin()
      )
    )
  );

create policy order_items_insert on order_items
  for insert with check (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
      and orders.student_id = auth.uid()
    )
  );

-- No update policy on order_items at all: unit_price and line_total
-- are price snapshots and must never change after creation.
-- No delete policy: items are never removed from a placed order.

-- ── commission_statements ──
create policy commission_statements_select_own on commission_statements
  for select using (supplier_id = auth.uid());

create policy commission_statements_select_admin on commission_statements
  for select using (public.is_admin());

create policy commission_statements_admin_write on commission_statements
  for all using (public.is_admin()) with check (public.is_admin());

-- ═════════════════════════════════════════════════════════════
-- SEED — default product categories (spec §16)
-- ═════════════════════════════════════════════════════════════
insert into product_categories (name, slug, sort_order) values
  ('Disposables', 'disposables', 1),
  ('Instruments', 'instruments', 2),
  ('Materials',   'materials',   3),
  ('Equipment',   'equipment',   4),
  ('Lab',         'lab',         5)
on conflict (slug) do nothing;

-- END 20260101000000_initial_schema.sql

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260102000000_allow_direct_db_admin_changes.sql
-- ═══════════════════════════════════════════════════════════════════

-- The admin-only guards on profiles/suppliers/representatives checked
-- public.is_admin(), which reads profiles for auth.uid(). That's correct
-- for requests carrying a user's JWT, but auth.uid() is also null for any
-- session with no JWT at all — the SQL Editor, a migration, or the
-- service-role/secret key used directly. Those blocked legitimate manual
-- changes too, including the one the owner needs most: promoting a user
-- to admin by hand, since admin accounts are never created through the
-- public sign-up form (CLAUDE.md).
--
-- Fix: only enforce the "must be admin" check when there IS an
-- authenticated JWT (auth.uid() is not null) that isn't an admin's. A null
-- auth.uid() means this isn't a per-user API request at all, so it's
-- already as trusted as the database connection itself.

create or replace function public.protect_supplier_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and auth.uid() is not null and not public.is_admin() then
    if new.status is distinct from old.status then
      raise exception 'suppliers.status can only be changed by an admin';
    end if;
    if new.commission_rate is distinct from old.commission_rate then
      raise exception 'suppliers.commission_rate can only be changed by an admin';
    end if;
  end if;
  if tg_op = 'INSERT' and auth.uid() is not null and not public.is_admin() and new.status is distinct from 'pending_approval' then
    raise exception 'new suppliers must start pending_approval';
  end if;
  return new;
end;
$$;

create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.status is distinct from old.status then
      raise exception 'profiles.status can only be changed by an admin';
    end if;
    if new.role is distinct from old.role then
      raise exception 'profiles.role can only be changed by an admin';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.protect_representative_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_admin() and new.subscription_paid_until is distinct from old.subscription_paid_until then
    raise exception 'representatives.subscription_paid_until can only be changed by an admin';
  end if;
  return new;
end;
$$;

-- END 20260102000000_allow_direct_db_admin_changes.sql

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260103000000_tooth_order_rpc.sql
-- ═══════════════════════════════════════════════════════════════════

-- Phase 2: tooth order submission.
--
-- The Phase 1 orders_insert_student / order_items_insert policies only
-- checked student_id ownership — nothing stopped a crafted request from
-- POSTing directly to /rest/v1/orders with a fabricated subtotal or
-- total_price. That's exactly what "totals are computed server-side at
-- insert" (CLAUDE.md, spec §4) is supposed to prevent, and the existing
-- protective trigger only guards UPDATEs, not the initial INSERT.
--
-- Fix: tooth orders can now only be created through this function. It
-- looks up the caller's assigned rep and that rep's CURRENT prices,
-- computes every line and the subtotal itself, and is the only place
-- price ever gets written. The direct insert policies are dropped so
-- there is no other path in.

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

drop policy if exists orders_insert_student on orders;
drop policy if exists order_items_insert on order_items;

-- END 20260103000000_tooth_order_rpc.sql

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260104000000_lock_down_signup_role_and_prices.sql
-- ═══════════════════════════════════════════════════════════════════

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

-- END 20260104000000_lock_down_signup_role_and_prices.sql

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260105000000_group2_audit_fixes.sql
-- ═══════════════════════════════════════════════════════════════════

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

-- END 20260105000000_group2_audit_fixes.sql

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260106000000_lock_down_rep_directory.sql
-- ═══════════════════════════════════════════════════════════════════

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

-- END 20260106000000_lock_down_rep_directory.sql

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260107000000_rep_directory_prices.sql
-- ═══════════════════════════════════════════════════════════════════

-- Adds prices to the public rep list.
--
-- 20260105 built rep_directory with four columns to stop the list handing
-- out every rep's whish_number and subscription state. Prices were left out
-- with it, which was over-correction: a student choosing a rep is choosing
-- between their prices, and until now they could not see what they were
-- picking until after they had picked it. Switching rep makes that concrete
-- — the confirmation has to say what the student will actually pay.
--
-- Prices are not sensitive in the way a payment handle is. A rep sets them
-- publicly and competes on them; every one of their students already sees
-- them on the profile screen. whish_number and subscription_paid_until stay
-- out, which was the point of the original change.
--
-- `create or replace view` keeps the existing ACL, but the grants are
-- re-stated anyway: this schema's default privileges hand every new object
-- full write access to anon, and being explicit here is cheaper than
-- finding out again that a view was born writable.

create or replace view public.rep_directory as
  select id, display_name, university, section, frasaco_price, copy_a_price
  from public.representatives;

comment on view public.rep_directory is
  'Public rep picker list. Name, faculty, section and prices — the things a student chooses between. No whish_number, no subscription state. Readable without a session because sign-up needs it before the account exists.';

revoke all on public.rep_directory from anon, authenticated;
grant select on public.rep_directory to anon, authenticated;

-- END 20260107000000_rep_directory_prices.sql
