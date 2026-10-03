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
