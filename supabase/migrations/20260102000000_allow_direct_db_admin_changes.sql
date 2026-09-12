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
