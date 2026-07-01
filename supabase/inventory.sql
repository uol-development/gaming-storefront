-- ============================================================================
-- NEXUS Admin — Inventory module schema
-- Run this in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (idempotent). Adds a per-product reorder threshold and a stock
-- movement ledger; stock levels themselves live on products.stock_quantity.
-- ============================================================================

-- Per-product low-stock (reorder) threshold.
alter table public.products
  add column if not exists low_stock_threshold int not null default 5;

-- Stock movement ledger — one row per adjustment (restock, correction, etc.).
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  delta int not null,                 -- signed change (+restock / -removal)
  reason text not null,               -- restock | correction | damaged | returned | recount | sale
  note text,
  resulting_quantity int not null,    -- stock level immediately after the move
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_stock_movements_product
  on public.stock_movements(product_id, created_at desc);

alter table public.stock_movements enable row level security;
drop policy if exists "stock_movements staff" on public.stock_movements;
create policy "stock_movements staff" on public.stock_movements
  for all using (public.is_staff()) with check (public.is_staff());
