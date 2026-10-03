-- ═══════════════════════════════════════════════════════════════════
-- DentalOrder — complete schema, for a FRESH Supabase project
-- ═══════════════════════════════════════════════════════════════════
--
-- Every migration in supabase/migrations/, in filename order, in one
-- file. Paste the whole thing into the Supabase SQL Editor and press Run
-- once.
--
-- Verified on an empty PostgreSQL 16 carrying only what a new Supabase
-- project already has (the auth schema, auth.uid(), the anon /
-- authenticated / service_role roles): it runs top to bottom in a single
-- transaction with no errors. The four "policy ... does not exist,
-- skipping" notices are `drop policy if exists` doing its job.
--
-- It also creates the trigger on auth.users, so sign-up works the moment
-- the run finishes — there is nothing to wire up afterwards.
--
-- One oddity worth knowing: a fresh project ends up with an empty table
-- called representatives_archived_20260109. The restructure renamed the
-- old representatives table rather than dropping it, so that the
-- originals would still be there if the migration got something wrong.
-- On a new project it never held anything and can be ignored.
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
--   20260108000000_reject_order_with_reason.sql
--   20260109000000_suppliers_replace_reps.sql
--   20260110000000_fix_supplier_signup_kind_cast.sql
--   20260111000000_lock_order_items.sql
--   20260112000000_edit_pending_order.sql
--   20260113000000_new_order_expected_total.sql
--   20260114000000_student_cancels_pending_order.sql
--   20260115000000_signup_students_only.sql
--   20260116000000_extras_from_your_seller.sql
--   20260117000000_product_details.sql


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

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260108000000_reject_order_with_reason.sql
-- ═══════════════════════════════════════════════════════════════════

-- Phase 1: a supplier can reject a pending order, and say why.
--
-- Until now a supplier's only options were to confirm or to fulfil. An
-- order they could not supply — wrong teeth, out of stock, student never
-- turned up — had nowhere to go, so it sat pending forever, stayed in the
-- weekly batch the supplier buys against, and left the student with no idea
-- anything was wrong.
--
-- 'rejected' is a fulfilment outcome, not a payment one, so it belongs on
-- fulfillment_status. It is deliberately distinct from 'cancelled':
-- cancelled is for a student or an admin withdrawing an order, rejected is
-- the supplier refusing it. Collapsing them would lose who did it.

alter type fulfillment_status add value if not exists 'rejected';

alter table orders add column if not exists rejection_reason text;

comment on column orders.rejection_reason is
  'Why the supplier rejected the order. Shown to the student. Only ever set together with fulfillment_status = rejected.';

-- A3 narrowed the rep to two updatable columns; rejecting needs to write
-- the reason alongside the status, so the grant is restated with all three.
-- Revoke first: a grant cannot narrow what is already held.
revoke update on public.orders from anon, authenticated;
grant update (fulfillment_status, payment_status, rejection_reason) on public.orders to authenticated;

-- The rules about rejection live here rather than only in the server
-- action, so they hold whatever calls the API.
--
-- The comparisons are `::text` on purpose. Postgres will not let a new enum
-- value be *used* in the same transaction that adds it, and the Supabase SQL
-- Editor may run this whole file as one. Comparing the cast text sidesteps
-- that without weakening the check.
create or replace function public.protect_order_rejection()
returns trigger
language plpgsql
as $$
begin
  if new.fulfillment_status::text = 'rejected'
     and old.fulfillment_status::text is distinct from 'rejected' then
    if old.fulfillment_status::text <> 'pending' then
      raise exception 'only a pending order can be rejected (this one is %)', old.fulfillment_status;
    end if;
    if coalesce(btrim(new.rejection_reason), '') = '' then
      raise exception 'a rejected order must say why';
    end if;
  end if;

  -- The reason belongs to the rejection. It cannot be attached to an order
  -- that is not rejected, and it cannot be quietly edited afterwards.
  if new.fulfillment_status::text <> 'rejected'
     and coalesce(btrim(new.rejection_reason), '') <> '' then
    raise exception 'rejection_reason can only be set on a rejected order';
  end if;

  if old.fulfillment_status::text = 'rejected'
     and new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'a rejection reason cannot be changed after the fact';
  end if;

  return new;
end;
$$;

create trigger orders_protect_rejection
  before update on orders
  for each row execute function public.protect_order_rejection();

-- END 20260108000000_reject_order_with_reason.sql

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260109000000_suppliers_replace_reps.sql
-- ═══════════════════════════════════════════════════════════════════

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

-- END 20260109000000_suppliers_replace_reps.sql

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260110000000_fix_supplier_signup_kind_cast.sql
-- ═══════════════════════════════════════════════════════════════════

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

-- END 20260110000000_fix_supplier_signup_kind_cast.sql

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260111000000_lock_order_items.sql
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- An order line cannot be changed after it is written — by anyone
-- ═══════════════════════════════════════════════════════════════════
--
-- CLAUDE.md: "No route or role may edit unit_price, line_total, subtotal,
-- commission_amount, or total_price on an existing order."
--
-- orders has held that since the first migration: a trigger refuses any
-- change to its money and identity columns, and a trigger fires for every
-- role, including the secret key. order_items never got one. Its only
-- protection was having no UPDATE policy, which stops a student or a
-- supplier but not the secret key or the SQL Editor — both bypass RLS.
--
-- The Money rules workflow found it the first time it actually ran: the
-- secret key set a line's unit_price and line_total to 0.01 and they
-- stuck. Reproduced on production with a throwaway order: the line read
-- $0.01 while the order total still read $5.00, so the order and its own
-- lines disagreed. A student's token was already refused.
--
-- No app code has ever written to order_items after insert, so nothing
-- that runs today is affected. This closes it for the roles RLS cannot.
--
-- Why refuse every update rather than list columns: a line has no field
-- that may legitimately change. order_id, tooth_number, tooth_type,
-- product_id say what it is; quantity, unit_price and line_total are the
-- money; product_name is a snapshot of the name at the time, for the same
-- reason the price is. A column list would only be a way to forget one
-- when a column is added.
--
-- DELETE is deliberately left alone. Removing a line outright is how test
-- data is cleaned up and how an admin would remove an order entirely, and
-- it is still closed to students and suppliers by RLS.

create or replace function public.protect_order_items()
returns trigger
language plpgsql
as $$
begin
  raise exception 'order_items: a line cannot be changed after it is written. Its price, quantity and tooth are what was charged.'
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists order_items_protect on public.order_items;
create trigger order_items_protect
  before update on public.order_items
  for each row execute function public.protect_order_items();

-- END 20260111000000_lock_order_items.sql

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260112000000_edit_pending_order.sql
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- Phase 5: a student can edit an order while it is still pending
-- ═══════════════════════════════════════════════════════════════════
--
-- An order and its lines can never be changed in place — that is the rule
-- the whole pricing design rests on, and the last migration closed it for
-- every role. So an edit is a swap, done in one transaction:
--
--   1. the new selection is placed as a fresh order, through
--      submit_tooth_order — the same pricing path every order takes, so
--      it is priced at the supplier's CURRENT prices (an edit is a new
--      quote);
--   2. the old order is marked cancelled and pointed at its replacement.
--
-- Nothing is deleted. The old order stays in the database, with its own
-- lines and its own prices, as the record of what was first asked for.
-- It is hidden from the student and the supplier, because to them there
-- is one order and it has changed.
--
-- Rules, all enforced here rather than trusted to the app:
--   - only the student who placed it can edit it;
--   - only while it is pending. Once the supplier has confirmed, rejected
--     or handed it over, the edit is refused;
--   - same supplier, same week — they are read from the old order, never
--     taken from the request;
--   - an order can be replaced once. The replacement is itself pending
--     and can be edited in turn, which replaces it.
--
-- The race: the old order is locked for the length of the edit. If the
-- supplier confirms first, the edit sees "confirmed" and is refused. If
-- the edit lands first, the supplier's confirm hits an order that is
-- already cancelled and replaced — and is refused by the trigger below,
-- rather than quietly confirming an order nobody can see.

-- ── 1. Where an order went when it was edited ─────────────────────────

alter table public.orders
  add column if not exists replaced_by uuid references public.orders (id);

create index if not exists orders_replaced_by_idx
  on public.orders (replaced_by) where replaced_by is not null;

comment on column public.orders.replaced_by is
  'Set when a student edits a pending order: the order that took its place. A replaced order is cancelled, frozen, and hidden from the student and the supplier.';

-- ── 2. A replaced order is frozen ─────────────────────────────────────

create or replace function public.protect_order_replacement()
returns trigger
language plpgsql
as $$
begin
  -- Nothing about a replaced order may change afterwards: not its status
  -- (a late "confirm" must not revive it), not its payment, and not where
  -- it points.
  if old.replaced_by is not null then
    if new.replaced_by       is distinct from old.replaced_by
    or new.fulfillment_status is distinct from old.fulfillment_status
    or new.payment_status    is distinct from old.payment_status
    then
      raise exception 'this order was edited and replaced; it can no longer be changed'
        using errcode = 'DT002';
    end if;
    return new;
  end if;

  -- Replacing is only ever pending -> cancelled, in the same statement.
  if new.replaced_by is not null then
    if old.fulfillment_status::text <> 'pending'
    or new.fulfillment_status::text <> 'cancelled' then
      raise exception 'only a pending order can be replaced, and it must be cancelled when it is';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_protect_replacement on public.orders;
create trigger orders_protect_replacement
  before update on public.orders
  for each row execute function public.protect_order_replacement();

-- replaced_by is deliberately NOT added to authenticated's column grant.
-- Students and suppliers can only reach it through the function below.

-- ── 3. Hidden from both sides ─────────────────────────────────────────
--
-- order_items_select reads orders through these policies, so the old
-- order's lines disappear with it. Admins still see everything.

drop policy if exists orders_select_student on public.orders;
create policy orders_select_student on public.orders
  for select using (student_id = auth.uid() and replaced_by is null);

drop policy if exists orders_select_supplier on public.orders;
create policy orders_select_supplier on public.orders
  for select using (supplier_id = auth.uid() and replaced_by is null);

drop policy if exists orders_update_supplier on public.orders;
create policy orders_update_supplier on public.orders
  for update using (supplier_id = auth.uid() and replaced_by is null)
  with check (supplier_id = auth.uid());

-- ── 4. The edit ───────────────────────────────────────────────────────
--
-- p_expected_total is the total the student was shown on the review
-- screen. If the supplier changes prices between that screen and the tap,
-- the edit is refused with DT001 and the new total, so the app can show
-- "prices changed" and ask again — a total the student never saw is never
-- charged. Pass null to skip the check.

create or replace function public.edit_pending_order(
  p_order_id       uuid,
  p_items          jsonb,
  p_expected_total numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_old     public.orders%rowtype;
  v_new     uuid;
  v_total   numeric(10,2);
begin
  if v_student is null then
    raise exception 'must be signed in';
  end if;

  select * into v_old from public.orders where id = p_order_id for update;

  -- "Not found" for someone else's order too: no hint that it exists.
  if not found or v_old.student_id <> v_student then
    raise exception 'order not found';
  end if;
  if v_old.order_type::text <> 'tooth' then
    raise exception 'only a tooth order can be edited';
  end if;
  if v_old.replaced_by is not null then
    raise exception 'this order has already been edited' using errcode = 'DT002';
  end if;
  if v_old.fulfillment_status::text <> 'pending' then
    raise exception 'this order can no longer be edited — the supplier has already %',
      case v_old.fulfillment_status::text
        when 'confirmed' then 'confirmed it'
        when 'fulfilled' then 'handed it over'
        when 'rejected'  then 'rejected it'
        when 'cancelled' then 'had it cancelled'
        else 'moved it on'
      end
      using errcode = 'DT002';
  end if;

  -- Same supplier, same week, from the old order. Priced now.
  v_new := public.submit_tooth_order(v_old.supplier_id, v_old.week_number, p_items);

  select total_price into v_total from public.orders where id = v_new;
  if p_expected_total is not null and v_total <> p_expected_total then
    -- Raising rolls the new order back with everything else.
    raise exception 'prices changed: the total is now %', v_total
      using errcode = 'DT001', detail = v_total::text;
  end if;

  update public.orders
     set fulfillment_status = 'cancelled',
         replaced_by        = v_new
   where id = p_order_id;

  return v_new;
end;
$$;

revoke all on function public.edit_pending_order(uuid, jsonb, numeric) from public;
revoke all on function public.edit_pending_order(uuid, jsonb, numeric) from anon;
grant execute on function public.edit_pending_order(uuid, jsonb, numeric) to authenticated;

-- END 20260112000000_edit_pending_order.sql

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260113000000_new_order_expected_total.sql
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- A new order is charged what the screen said, or refused
-- ═══════════════════════════════════════════════════════════════════
--
-- Phase 5 gave an edit this protection; an ordinary order did not have
-- it. submit_tooth_order has always priced from the supplier's current
-- prices, which is right, but nothing checked those were the prices the
-- student had just been shown. If a supplier changed prices while a
-- student was on the chart, the student was charged a total they never
-- saw. Until today a price change in Settings also left the market
-- showing the old price for up to five minutes, which made it likely
-- rather than rare.
--
-- The function now takes the total the student was shown. If the real
-- total differs, it refuses with DT001 — the same code the edit uses —
-- and the new total, and writes nothing. The app tells the student the
-- price changed and lets them confirm the new figure.
--
-- p_expected_total defaults to null, meaning "no check". That is what
-- keeps the app that is deployed right now working the moment this runs:
-- it calls with three named arguments, which resolve to this function
-- with the default. The new app always passes the fourth.
--
-- The three-argument version is dropped rather than kept beside this
-- one: two overloads that both accept three named arguments would be
-- ambiguous, and PostgREST would refuse to choose.

drop function if exists public.submit_tooth_order(uuid, smallint, jsonb);

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

revoke all on function public.submit_tooth_order(uuid, smallint, jsonb, numeric) from public;
revoke all on function public.submit_tooth_order(uuid, smallint, jsonb, numeric) from anon;
grant execute on function public.submit_tooth_order(uuid, smallint, jsonb, numeric) to authenticated;

-- END 20260113000000_new_order_expected_total.sql

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260114000000_student_cancels_pending_order.sql
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- A student can cancel their own order while it is still pending
-- ═══════════════════════════════════════════════════════════════════
--
-- Students could edit a pending order but not withdraw it: an edit must
-- keep at least one tooth, and students have no UPDATE rights on orders
-- at all — only the supplier does. A student who no longer wanted an order
-- had to message the supplier.
--
-- Cancelling is a status, not a delete. The order stays, with its lines
-- and prices, marked cancelled and stamped with when. The student sees it
-- under Finished; it drops out of the supplier's pending list and out of
-- every total, which already exclude cancelled orders.
--
-- Rules, enforced here:
--   - only the student who placed it;
--   - only while pending — once the supplier has confirmed, rejected or
--     handed it over, it is refused with DT002, like a late edit;
--   - an order already replaced by an edit cannot be cancelled (it is
--     already gone as far as anyone can see);
--   - once a student has cancelled, the order is frozen. A supplier whose
--     screen still shows it as pending and taps Confirm is refused, rather
--     than quietly reviving an order the student withdrew.

alter table public.orders
  add column if not exists cancelled_at timestamptz;

comment on column public.orders.cancelled_at is
  'Set when the student cancels a pending order. A cancelled-by-student order is frozen.';

create or replace function public.protect_order_cancellation()
returns trigger
language plpgsql
as $$
begin
  if old.cancelled_at is not null then
    if new.cancelled_at       is distinct from old.cancelled_at
    or new.fulfillment_status is distinct from old.fulfillment_status
    or new.payment_status     is distinct from old.payment_status
    then
      raise exception 'the student cancelled this order; it can no longer be changed'
        using errcode = 'DT002';
    end if;
    return new;
  end if;

  if new.cancelled_at is not null then
    if old.fulfillment_status::text <> 'pending'
    or new.fulfillment_status::text <> 'cancelled' then
      raise exception 'only a pending order can be cancelled by the student, and it must be marked cancelled when it is';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_protect_cancellation on public.orders;
create trigger orders_protect_cancellation
  before update on public.orders
  for each row execute function public.protect_order_cancellation();

-- cancelled_at is deliberately not in authenticated's column grant. The
-- function below is the only way a student or supplier can set it.

create or replace function public.cancel_pending_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_old     public.orders%rowtype;
begin
  if v_student is null then
    raise exception 'must be signed in';
  end if;

  -- Locked, so a supplier confirming at the same moment waits for this
  -- and then finds the order cancelled — or wins, and this finds it
  -- confirmed and refuses.
  select * into v_old from public.orders where id = p_order_id for update;

  if not found or v_old.student_id <> v_student or v_old.replaced_by is not null then
    raise exception 'order not found';
  end if;
  if v_old.order_type::text <> 'tooth' then
    raise exception 'only a tooth order can be cancelled here';
  end if;
  if v_old.fulfillment_status::text = 'cancelled' then
    raise exception 'this order is already cancelled' using errcode = 'DT002';
  end if;
  if v_old.fulfillment_status::text <> 'pending' then
    raise exception 'this order can no longer be cancelled — the supplier has already %',
      case v_old.fulfillment_status::text
        when 'confirmed' then 'confirmed it'
        when 'fulfilled' then 'handed it over'
        when 'rejected'  then 'rejected it'
        else 'moved it on'
      end
      using errcode = 'DT002';
  end if;

  update public.orders
     set fulfillment_status = 'cancelled',
         cancelled_at       = now()
   where id = p_order_id;
end;
$$;

revoke all on function public.cancel_pending_order(uuid) from public;
revoke all on function public.cancel_pending_order(uuid) from anon;
grant execute on function public.cancel_pending_order(uuid) to authenticated;

-- END 20260114000000_student_cancels_pending_order.sql

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260115000000_signup_students_only.sql
-- ═══════════════════════════════════════════════════════════════════

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

-- END 20260115000000_signup_students_only.sql

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260116000000_extras_from_your_seller.sql
-- ═══════════════════════════════════════════════════════════════════

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

-- END 20260116000000_extras_from_your_seller.sql

-- ═══════════════════════════════════════════════════════════════════
-- BEGIN 20260117000000_product_details.sql
-- ═══════════════════════════════════════════════════════════════════

-- Product details: a description and a brand
--
-- Step 2 of DESIGN_GOAL.md. A product was a name, a price and a unit;
-- nothing a student could use to tell two boxes of gloves apart.
--
-- 1. products.description already exists (unused until now). It gets a
--    length limit: up to 300 characters, and never just spaces.
-- 2. products.brand is new, optional, up to 60 characters.
--
-- Nothing else changes. No price, total or order is touched; existing
-- policies already let a seller write their own products' columns and
-- students read the ones on sale. Neither field is copied onto order
-- lines: they describe the product, they are not part of what was paid.
--
-- Safe to run twice.

alter table public.products
  add column if not exists brand text;

alter table public.products drop constraint if exists products_description_length;
alter table public.products drop constraint if exists products_brand_length;

alter table public.products
  add constraint products_description_length
  check (description is null or (btrim(description) <> '' and length(description) <= 300));
alter table public.products
  add constraint products_brand_length
  check (brand is null or (btrim(brand) <> '' and length(brand) <= 60));

-- END 20260117000000_product_details.sql
