-- ═══════════════════════════════════════════════════════════════════
-- Sellers' phone numbers and private details stop being public
-- ═══════════════════════════════════════════════════════════════════
--
-- Found from a Supabase advisor warning (supplier_directory is a
-- SECURITY DEFINER view), 24 Oct 2026. The view itself was fine: it
-- shows only name, faculty and prices. The hole was beside it. The
-- suppliers table has a policy letting anyone read active sellers' rows
-- (suppliers_select_active), and Supabase gives anon and authenticated
-- SELECT on every column by default. So anyone holding the public key —
-- it is in every page — could read each active seller's contact phone,
-- email, Whish number, commission rate and subscription date, straight
-- from the table, without the view. Reproduced on a scratch copy: anon
-- read both sellers' phone numbers.
--
-- The fix is column privileges, not policies: rows stay as visible as
-- they are (the market needs active sellers), but only the columns the
-- app shows can be read at all.
--
--   anon:           id, display_name, kind, university, the two prices,
--                   status — exactly what the market shows.
--   authenticated:  the same, plus the week (current_week, week_set_at),
--                   when prices last changed, and created_at.
--
-- Everything else (contact_phone, contact_email, whish_number,
-- business_name, description, logo_url, delivery_notes, commission_rate,
-- subscription_paid_until) is readable only with the secret key or in
-- the SQL Editor. The app reads none of those columns.
--
-- With that in place the view no longer needs the creator's rights, so
-- it becomes security_invoker, which clears the advisor warning.
--
-- No row, price or order changes. Safe to run twice.

revoke select on public.suppliers from anon, authenticated;

grant select (id, display_name, kind, university, frasaco_price, copy_a_price, status)
  on public.suppliers to anon;

grant select (id, display_name, kind, university, frasaco_price, copy_a_price, status,
              current_week, week_set_at, price_updated_at, created_at)
  on public.suppliers to authenticated;

alter view public.supplier_directory set (security_invoker = true);
