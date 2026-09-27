\set QUIET on
\pset tuples_only on
\pset format unaligned
set client_min_messages = warning;
insert into auth.users (email, raw_user_meta_data) values
 ('shop@x.com','{"role":"supplier","full_name":"Shop","business_name":"Shop","contact_phone":"1"}'::jsonb),
 ('a@x.com','{"role":"student","full_name":"A","university":"BAU"}'::jsonb);
-- Sign-up makes students only; a supplier is a row added by hand.
insert into public.suppliers (id, kind, display_name, business_name, contact_phone)
select id, 'shop', 'Shop', 'Shop', '1' from auth.users where email = 'shop@x.com'
on conflict (id) do nothing;
update public.suppliers set status='active';
create table public.zz_out(n serial, line text);
grant all on public.zz_out, public.zz_out_n_seq to authenticated;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='a@x.com'),false) \g /dev/null
create function public.zz_sup() returns uuid language sql security definer as $$ select id from public.suppliers limit 1 $$;
create function public.zz_count() returns bigint language sql security definer as $$ select count(*) from public.orders $$;
create function public.zz_total(o uuid) returns numeric language sql security definer as $$ select total_price from public.orders where id=o $$;
grant execute on function public.zz_sup(), public.zz_count(), public.zz_total(uuid) to authenticated;

set role authenticated;
-- 1. the app deployed today: three NAMED args, as PostgREST sends them
do $$ declare v uuid; begin
  v := public.submit_tooth_order(p_supplier_id => public.zz_sup(), p_week_number => 5::smallint,
         p_items => '[{"tooth_number":11,"tooth_type":"frasaco","quantity":2}]'::jsonb);
  insert into public.zz_out(line) values ('PASS  today''s app (3 named args) still orders — $' || public.zz_total(v));
exception when others then insert into public.zz_out(line) values ('FAIL  today''s app broke: ' || sqlerrm); end $$;
-- 2. new app, correct total
do $$ declare v uuid; begin
  v := public.submit_tooth_order(public.zz_sup(), 5::smallint,
         '[{"tooth_number":11,"tooth_type":"frasaco","quantity":2},{"tooth_number":46,"tooth_type":"copy_a","quantity":1}]'::jsonb, 6.20);
  insert into public.zz_out(line) values ('PASS  shown $6.20, charged $' || public.zz_total(v));
exception when others then insert into public.zz_out(line) values ('FAIL  correct total refused: ' || sqlerrm); end $$;
reset role;

update public.suppliers set frasaco_price = 9.99;

set role authenticated;
-- 3. stale total after a price rise
do $$ declare n0 bigint := public.zz_count(); v uuid; begin
  v := public.submit_tooth_order(public.zz_sup(), 6::smallint, '[{"tooth_number":11,"tooth_type":"frasaco","quantity":2}]'::jsonb, 5.00);
  insert into public.zz_out(line) values ('FAIL  stale $5.00 was accepted, charged $' || public.zz_total(v));
exception when others then
  insert into public.zz_out(line) values (
    case when sqlstate='DT001' and sqlerrm like '%19.98%' and public.zz_count()=n0
      then 'PASS  stale $5.00 refused — ' || sqlstate || ': ' || sqlerrm || '; orders still ' || n0
      else 'FAIL  wrong refusal: ' || sqlstate || ' ' || sqlerrm || ' / orders ' || public.zz_count() || ' vs ' || n0 end);
end $$;
-- 4. confirm the new figure
do $$ declare v uuid; begin
  v := public.submit_tooth_order(public.zz_sup(), 6::smallint, '[{"tooth_number":11,"tooth_type":"frasaco","quantity":2}]'::jsonb, 19.98);
  insert into public.zz_out(line) values ('PASS  shown $19.98, charged $' || public.zz_total(v));
exception when others then insert into public.zz_out(line) values ('FAIL  ' || sqlerrm); end $$;
-- 5. float noise from the browser is not a price change
do $$ declare v uuid; begin
  v := public.submit_tooth_order(public.zz_sup(), 7::smallint, '[{"tooth_number":11,"tooth_type":"frasaco","quantity":2}]'::jsonb, 19.980000000000004);
  insert into public.zz_out(line) values ('PASS  19.980000000000004 read as $19.98 — charged $' || public.zz_total(v));
exception when others then insert into public.zz_out(line) values ('FAIL  float noise refused: ' || sqlerrm); end $$;
-- 6. an edit still works: it calls submit_tooth_order positionally, with three args
do $$ declare o uuid; e uuid; begin
  o := public.submit_tooth_order(public.zz_sup(), 8::smallint, '[{"tooth_number":21,"tooth_type":"frasaco","quantity":1}]'::jsonb, 9.99);
  e := public.edit_pending_order(o, '[{"tooth_number":21,"tooth_type":"frasaco","quantity":2}]'::jsonb, 19.98);
  insert into public.zz_out(line) values ('PASS  edits still work through it — $' || public.zz_total(o) || ' became $' || public.zz_total(e));
exception when others then insert into public.zz_out(line) values ('FAIL  edit broke: ' || sqlerrm); end $$;
reset role;

-- 7. only one function by that name, so PostgREST is never ambiguous
insert into public.zz_out(line) select
  case when count(*)=1 then 'PASS  exactly one submit_tooth_order: (' || string_agg(pg_get_function_identity_arguments(oid),'') || ')'
  else 'FAIL  ' || count(*) || ' overloads' end
from pg_proc where proname='submit_tooth_order' and pronamespace='public'::regnamespace;

select line from public.zz_out order by n;
select (select count(*) from public.zz_out where line like 'PASS%') || '/' || (select count(*) from public.zz_out) || ' passed';
