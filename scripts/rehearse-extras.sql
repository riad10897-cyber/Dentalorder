-- Rehearsal for 20260116000000_extras_from_your_seller.sql.
-- Every check reads what is stored, not which error came back.
\set QUIET on
\pset tuples_only on
\pset format unaligned
set client_min_messages = warning;
drop schema if exists t cascade;
create schema t; grant usage on schema t to authenticated, anon;
insert into auth.users (email, raw_user_meta_data) values
 ('sellera@x.com','{"full_name":"Seller A"}'::jsonb),
 ('sellerb@x.com','{"full_name":"Seller B"}'::jsonb),
 ('suspended@x.com','{"full_name":"Gone Seller"}'::jsonb),
 ('buyer@x.com','{"full_name":"Buyer","university":"BAU"}'::jsonb);
insert into public.suppliers (id, kind, display_name, status)
select id, 'student_supplier', split_part(email,'@',1), case when email like 'suspended%' then 'suspended' else 'active' end::account_status
from auth.users where email in ('sellera@x.com','sellerb@x.com','suspended@x.com');
create table t.v(k text primary key, v text); grant all on t.v to authenticated, anon;
create table t.out(n serial, line text); grant all on t.out, t.out_n_seq to authenticated, anon;
create function t.uid(e text) returns uuid language sql security definer as $$ select id from auth.users where email=e $$;
create function t.act(e text) returns void language sql as $$ select set_config('request.jwt.claim.sub', coalesce(t.uid(e)::text,''), false) $$;
create function t.put(k text, v text) returns void language sql security definer as $$ insert into t.v values (k,v) on conflict (k) do update set v=excluded.v $$;
create function t.get(k text) returns uuid language sql security definer as $$ select v::uuid from t.v where t.v.k=$1 $$;
create function t.val(k text) returns text language sql security definer as $$ select v from t.v where t.v.k=$1 $$;
create function t.cat(slug text) returns uuid language sql security definer as $$ select id from public.product_categories c where c.slug=$1 $$;
create function t.check(name text, ok boolean, detail text) returns void language sql security definer as
 $$ insert into t.out(line) values ((case when ok then 'PASS' else 'FAIL' end) || '  ' || name || coalesce('  — ' || detail, '')) $$;
create function t.try(sql text) returns text language plpgsql as $$
begin execute sql; return 'ok'; exception when others then return sqlstate || ': ' || sqlerrm; end $$;
create function t.ord(o uuid) returns record language sql security definer as $$ select subtotal, total_price from public.orders where id=o $$;
create function t.total(o uuid) returns numeric language sql security definer as $$ select total_price from public.orders where id=o $$;
create function t.lines(o uuid) returns text language sql security definer as $$
  select string_agg(coalesce(tooth_number||' '||tooth_type, product_name||' ('||coalesce(product_unit,'-')||')')
         ||' x'||quantity||' @'||unit_price||'='||line_total, ', ' order by tooth_number nulls last, product_name)
  from public.order_items where order_id=o $$;
create function t.norders() returns bigint language sql security definer as $$ select count(*) from public.orders $$;
grant execute on all functions in schema t to authenticated, anon;

-- ── Sellers list products, through RLS, as themselves ─────────────────
select t.act('sellera@x.com'); set role authenticated;
with i as (insert into public.products (supplier_id, category_id, name, unit, price)
           values (t.uid('sellera@x.com'), t.cat('gloves-masks'), 'Nitrile gloves', 'box of 100', 6.50) returning id)
select t.put('gloves', id::text) from i;
with i as (insert into public.products (supplier_id, category_id, name, unit, price)
           values (t.uid('sellera@x.com'), t.cat('burs'), 'Round bur', 'pack of 5', 3.00) returning id)
select t.put('bur', id::text) from i;
with i as (insert into public.products (supplier_id, category_id, name, unit, price, is_active)
           values (t.uid('sellera@x.com'), t.cat('materials'), 'Old composite', 'syringe', 9.00, false) returning id)
select t.put('off', id::text) from i;
with i as (insert into public.products (supplier_id, category_id, name, unit, price, in_stock)
           values (t.uid('sellera@x.com'), t.cat('instruments'), 'Mirror', 'each', 4.00, false) returning id)
select t.put('oos', id::text) from i;
reset role;
select t.act('sellerb@x.com'); set role authenticated;
with i as (insert into public.products (supplier_id, category_id, name, unit, price)
           values (t.uid('sellerb@x.com'), t.cat('equipment'), 'Seller B lamp', 'each', 20.00) returning id)
select t.put('b_lamp', id::text) from i;
reset role;
-- a suspended seller's product, written by hand (they can no longer write)
insert into public.products (supplier_id, category_id, name, unit, price)
values (t.uid('suspended@x.com'), t.cat('burs'), 'Gone bur', 'each', 1.00);
select t.check('sellers can list their own products through RLS', (select count(*) from public.products) = 6, null);

-- a suspended seller cannot add
select t.act('suspended@x.com'); set role authenticated;
select t.put('susp_add', t.try($q$insert into public.products (supplier_id, category_id, name, price) values (t.uid('suspended@x.com'), t.cat('burs'), 'X', 1)$q$));
reset role;
select t.check('a suspended seller cannot add products', (select count(*) from public.products) = 6, t.val('susp_add'));

-- ── Who sees what ─────────────────────────────────────────────────────
select t.act('buyer@x.com'); set role authenticated;
select t.put('stu_sees', (select string_agg(name, ', ' order by name) from public.products));
reset role;
select t.check('a student sees only switched-on, in-stock products of active sellers',
  t.val('stu_sees') = 'Nitrile gloves, Round bur, Seller B lamp', t.val('stu_sees'));

select t.act('sellerb@x.com'); set role authenticated;
select t.put('b_sees', (select string_agg(name, ', ' order by name) from public.products where supplier_id = t.uid('sellera@x.com')));
select t.put('b_edit', t.try($q$update public.products set price = 0.01 where id = t.get('gloves')$q$));
select t.put('b_edit_off', t.try($q$update public.products set is_active = true where id = t.get('off')$q$));
select t.put('b_del', t.try($q$delete from public.products where id = t.get('bur')$q$));
select t.put('b_steal', t.try($q$update public.products set supplier_id = t.uid('sellerb@x.com') where id = t.get('b_lamp')$q$));
select t.put('b_plant', t.try($q$insert into public.products (supplier_id, category_id, name, price) values (t.uid('sellera@x.com'), t.cat('burs'), 'Planted', 0.5)$q$));
reset role;
select t.check('seller B sees none of seller A''s hidden products — only what any student sees',
  t.val('b_sees') = 'Nitrile gloves, Round bur', t.val('b_sees'));
select t.check('seller B cannot reprice seller A''s product',
  (select price from public.products where id = t.get('gloves')) = 6.50, t.val('b_edit'));
select t.check('seller B cannot switch seller A''s product back on',
  (select is_active from public.products where id = t.get('off')) = false, t.val('b_edit_off'));
select t.check('seller B cannot delete seller A''s product',
  exists (select 1 from public.products where id = t.get('bur')), t.val('b_del'));
select t.check('a seller cannot hand their product to another seller',
  (select supplier_id from public.products where id = t.get('b_lamp')) = t.uid('sellerb@x.com'), t.val('b_steal'));
select t.check('a seller cannot list a product under another seller''s name',
  not exists (select 1 from public.products where name = 'Planted'), t.val('b_plant'));

set role anon;
select t.put('anon', t.try($q$select count(*) from public.products$q$));
reset role;
select t.check('signed-out visitors cannot read products', t.val('anon') like '42501%', t.val('anon'));

-- ── Ordering ──────────────────────────────────────────────────────────
-- Seller A: Frasaco 2.50, Copy A 1.20 (defaults). Gloves 6.50, bur 3.00.
select t.act('buyer@x.com'); set role authenticated;
-- mixed: 2 Frasaco 11 (5.00) + 1 Copy A 46 (1.20) + 2 gloves (13.00) + 1 bur (3.00) = 22.20
select t.put('mixed', public.submit_tooth_order(t.uid('sellera@x.com'), 5::smallint, jsonb_build_array(
  jsonb_build_object('tooth_number',11,'tooth_type','frasaco','quantity',2),
  jsonb_build_object('tooth_number',46,'tooth_type','copy_a','quantity',1),
  jsonb_build_object('product_id',t.get('gloves'),'quantity',2),
  jsonb_build_object('product_id',t.get('bur'),'quantity',1)), 22.20)::text);
-- products only
select t.put('extras_only', public.submit_tooth_order(t.uid('sellera@x.com'), 6::smallint, jsonb_build_array(
  jsonb_build_object('product_id',t.get('gloves'),'quantity',1)), 6.50)::text);
-- a crafted price, a crafted name: never read
select t.put('crafted', public.submit_tooth_order(t.uid('sellera@x.com'), 7::smallint, jsonb_build_array(
  jsonb_build_object('product_id',t.get('gloves'),'quantity',3,'unit_price',0.01,'price',0.01,'product_name','Free gloves','line_total',0.03)), null)::text);
reset role;
select t.check('mixed order: teeth and extras total correctly', t.total(t.get('mixed')) = 22.20, t.lines(t.get('mixed')) || ' → $' || t.total(t.get('mixed')));
select t.check('product line total = quantity × the seller''s price at submit',
  (select line_total = 13.00 and unit_price = 6.50 from public.order_items where order_id = t.get('mixed') and product_id = t.get('gloves')), null);
select t.check('name and unit are snapshotted on the line',
  (select product_name = 'Nitrile gloves' and product_unit = 'box of 100' from public.order_items where order_id = t.get('mixed') and product_id = t.get('gloves')), null);
select t.check('an order of extras only is fine', t.total(t.get('extras_only')) = 6.50, t.lines(t.get('extras_only')));
select t.check('a crafted price and name are ignored — the database prices it',
  t.total(t.get('crafted')) = 19.50 and t.lines(t.get('crafted')) like 'Nitrile gloves (box of 100) x3 @6.50=19.50', t.lines(t.get('crafted')));
select t.check('no commission on any of them',
  (select bool_and(commission_amount = 0 and commission_rate = 0) from public.orders where id in (t.get('mixed'), t.get('extras_only'), t.get('crafted'))), null);

-- ── Refused, and nothing written ──────────────────────────────────────
select t.put('n0', t.norders()::text);
select t.act('buyer@x.com'); set role authenticated;
select t.put('r_other', t.try($q$select public.submit_tooth_order(t.uid('sellera@x.com'), 8::smallint, jsonb_build_array(jsonb_build_object('product_id',t.get('b_lamp'),'quantity',1)), null)$q$));
select t.put('r_off',   t.try($q$select public.submit_tooth_order(t.uid('sellera@x.com'), 8::smallint, jsonb_build_array(jsonb_build_object('product_id',t.get('off'),'quantity',1)), null)$q$));
select t.put('r_oos',   t.try($q$select public.submit_tooth_order(t.uid('sellera@x.com'), 8::smallint, jsonb_build_array(jsonb_build_object('product_id',t.get('oos'),'quantity',1)), null)$q$));
select t.put('r_fake',  t.try($q$select public.submit_tooth_order(t.uid('sellera@x.com'), 8::smallint, jsonb_build_array(jsonb_build_object('product_id','00000000-0000-0000-0000-000000000000','quantity',1)), null)$q$));
select t.put('r_dup',   t.try($q$select public.submit_tooth_order(t.uid('sellera@x.com'), 8::smallint, jsonb_build_array(jsonb_build_object('product_id',t.get('bur'),'quantity',1), jsonb_build_object('product_id',t.get('bur'),'quantity',2)), null)$q$));
select t.put('r_both',  t.try($q$select public.submit_tooth_order(t.uid('sellera@x.com'), 8::smallint, jsonb_build_array(jsonb_build_object('product_id',t.get('bur'),'tooth_number',11,'tooth_type','frasaco','quantity',1)), null)$q$));
select t.put('r_empty', t.try($q$select public.submit_tooth_order(t.uid('sellera@x.com'), 8::smallint, '[]'::jsonb, null)$q$));
select t.put('r_qty',   t.try($q$select public.submit_tooth_order(t.uid('sellera@x.com'), 8::smallint, jsonb_build_array(jsonb_build_object('product_id',t.get('bur'),'quantity',11)), null)$q$));
select t.put('r_stale', t.try($q$select public.submit_tooth_order(t.uid('sellera@x.com'), 8::smallint, jsonb_build_array(jsonb_build_object('product_id',t.get('bur'),'quantity',1)), 2.00)$q$));
reset role;
select t.check('another seller''s product is refused', t.val('r_other') like 'DT003%', t.val('r_other'));
select t.check('a switched-off product is refused', t.val('r_off') like 'DT003%no longer sold%', t.val('r_off'));
select t.check('an out-of-stock product is refused', t.val('r_oos') like 'DT003%out of stock%', t.val('r_oos'));
select t.check('a made-up product is refused', t.val('r_fake') like 'DT003%', t.val('r_fake'));
select t.check('the same product twice is refused', t.val('r_dup') like '%twice%', t.val('r_dup'));
select t.check('a line cannot be both a tooth and a product', t.val('r_both') like '%either a tooth or a product%', t.val('r_both'));
select t.check('an empty order is refused', t.val('r_empty') like '%at least one item%', t.val('r_empty'));
select t.check('quantity over 10 is refused', t.val('r_qty') like '%quantity%', t.val('r_qty'));
select t.check('a stale total including extras is refused with the real one', t.val('r_stale') like 'DT001%3.00%', t.val('r_stale'));
select t.check('and none of those wrote an order', t.norders()::text = t.val('n0'), t.norders() || ' orders, was ' || t.val('n0'));

-- ── A price change, a rename, a new unit: the past order does not move ─
select t.act('sellera@x.com'); set role authenticated;
update public.products set price = 99.00, name = 'Renamed gloves', unit = 'box of 50' where id = t.get('gloves');
reset role;
select t.check('seller''s change took effect', (select price = 99.00 from public.products where id = t.get('gloves')), null);
select t.check('the past mixed order still totals $22.20 with its lines as bought',
  t.total(t.get('mixed')) = 22.20
  and (select unit_price = 6.50 and line_total = 13.00 and product_name = 'Nitrile gloves' and product_unit = 'box of 100'
       from public.order_items where order_id = t.get('mixed') and product_id = t.get('gloves')),
  t.lines(t.get('mixed')));
select t.put('rewrite', t.try($q$update public.order_items set unit_price = 0.01 where product_id = t.get('gloves')$q$));
select t.check('a product line cannot be rewritten, even by the superuser',
  (select bool_and(unit_price <> 0.01) from public.order_items where product_id = t.get('gloves')), t.val('rewrite'));
select t.put('del_ordered', t.try($q$delete from public.products where id = t.get('gloves')$q$));
select t.check('a product that has been ordered cannot be deleted — only switched off',
  exists (select 1 from public.products where id = t.get('gloves')), t.val('del_ordered'));

-- ── Editing reprices extras at today's price ─────────────────────────
select t.act('buyer@x.com'); set role authenticated;
select t.put('edited', public.edit_pending_order(t.get('extras_only'), jsonb_build_array(
  jsonb_build_object('product_id',t.get('gloves'),'quantity',1),
  jsonb_build_object('tooth_number',21,'tooth_type','frasaco','quantity',1)), 101.50)::text);
reset role;
select t.check('editing an order with extras reprices them at today''s price',
  t.total(t.get('edited')) = 101.50 and t.total(t.get('extras_only')) = 6.50, t.lines(t.get('edited')) || ' → $' || t.total(t.get('edited')));

-- ── The student and the seller can read the product lines ────────────
select t.act('buyer@x.com'); set role authenticated;
select t.put('stu_lines', (select count(*)::text from public.order_items where order_id = t.get('mixed')));
reset role;
select t.act('sellera@x.com'); set role authenticated;
select t.put('sel_lines', (select count(*)::text from public.order_items where order_id = t.get('mixed')));
reset role;
select t.act('sellerb@x.com'); set role authenticated;
select t.put('b_lines', (select count(*)::text from public.order_items where order_id = t.get('mixed')));
reset role;
select t.check('student and seller read all 4 lines; another seller reads none',
  t.val('stu_lines') = '4' and t.val('sel_lines') = '4' and t.val('b_lines') = '0',
  'student ' || t.val('stu_lines') || ', seller ' || t.val('sel_lines') || ', other seller ' || t.val('b_lines'));

select line from t.out order by n;
select (select count(*) from t.out where line like 'PASS%') || '/' || (select count(*) from t.out) || ' passed';
