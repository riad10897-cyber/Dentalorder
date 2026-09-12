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
