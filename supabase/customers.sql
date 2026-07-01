-- ============================================================================
-- NEXUS Admin — Customers module schema (+ backfill from existing orders)
-- Run this in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (idempotent). Customers are keyed by email; order history and
-- lifetime stats are derived from public.orders (matched on customer_email).
-- ============================================================================

-- ---------- Customers ----------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  phone text,
  tags text[] not null default '{}',
  notes text,
  marketing_opt_in boolean not null default false,
  is_blocked boolean not null default false,
  default_address jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_customers_email_lower on public.customers(lower(email));
create index if not exists idx_customers_deleted on public.customers(deleted_at);
drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------
alter table public.customers enable row level security;
drop policy if exists "customers staff" on public.customers;
create policy "customers staff" on public.customers
  for all using (public.is_staff()) with check (public.is_staff());

-- ---------- Backfill from existing orders ----------
-- Create a customer row for each distinct order email (keeping the most recent
-- name). Existing customer rows are preserved (on conflict do nothing).
insert into public.customers (email, name)
select distinct on (lower(o.customer_email)) o.customer_email, o.customer_name
from public.orders o
where coalesce(o.customer_email, '') <> ''
order by lower(o.customer_email), o.placed_at desc
on conflict (email) do nothing;
