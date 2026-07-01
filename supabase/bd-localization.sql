-- ============================================================================
-- NEXUS — Bangladesh localization (orders: payment method + delivery zone)
-- Run this in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (idempotent). Product/order AMOUNT conversion to BDT is done
-- separately by the app maintainer via a service-role script (not DDL).
-- ============================================================================

alter table public.orders add column if not exists payment_method text; -- cod | bkash | nagad | rocket | card
alter table public.orders add column if not exists payment_ref text;    -- wallet number / txn id (optional)
alter table public.orders add column if not exists delivery_zone text;  -- inside_dhaka | outside_dhaka

-- New orders default to Taka.
alter table public.orders alter column currency set default 'BDT';
