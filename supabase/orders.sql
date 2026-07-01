-- ============================================================================
-- NEXUS Admin — Orders module schema (+ demo seed)
-- Run this in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (idempotent); the demo seed only runs while orders is empty.
-- ============================================================================

-- ---------- Enums ----------
do $$ begin create type order_status as enum
  ('pending','processing','shipped','delivered','cancelled','refunded');
exception when duplicate_object then null; end $$;

do $$ begin create type payment_status as enum
  ('unpaid','paid','refunded','partially_refunded');
exception when duplicate_object then null; end $$;

-- ---------- Orders ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null default '',
  customer_email text not null default '',
  customer_phone text,
  status order_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  currency text not null default 'USD',
  subtotal integer not null default 0,   -- minor units (cents)
  shipping integer not null default 0,
  tax integer not null default 0,
  discount integer not null default 0,
  total integer not null default 0,
  shipping_address jsonb not null default '{}'::jsonb,
  billing_address jsonb not null default '{}'::jsonb,
  notes text,                            -- internal staff notes
  placed_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_placed on public.orders(placed_at desc);
create index if not exists idx_orders_deleted on public.orders(deleted_at);
drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------- Order items (line-item snapshots) ----------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,                    -- snapshot at purchase time
  sku text,
  image_url text,
  unit_price integer not null default 0, -- minor units (cents)
  quantity int not null default 1,
  line_total integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_order_items_order on public.order_items(order_id);

-- ---------- Row Level Security ----------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "orders staff" on public.orders;
create policy "orders staff" on public.orders
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "order_items staff" on public.order_items;
create policy "order_items staff" on public.order_items
  for all using (public.is_staff()) with check (public.is_staff());

-- ---------- Demo seed (only when there are no orders yet) ----------
do $$
begin
  if not exists (select 1 from public.orders) then
    insert into public.orders
      (id, order_number, customer_name, customer_email, status, payment_status,
       subtotal, shipping, tax, discount, total, shipping_address, placed_at)
    values
      ('aa000000-0000-4000-8000-000000000001','NEX-10001','Jordan Avery','jordan.avery@example.com','delivered','paid',
        299900,0,0,0,299900,
        '{"line1":"418 Kestrel Way","city":"Austin","state":"TX","postal_code":"78701","country":"US"}'::jsonb, now() - interval '18 days'),
      ('aa000000-0000-4000-8000-000000000002','NEX-10002','Sam Okafor','sam.okafor@example.com','processing','paid',
        257899,0,0,0,257899,
        '{"line1":"92 Harbor St","city":"Seattle","state":"WA","postal_code":"98101","country":"US"}'::jsonb, now() - interval '3 days'),
      ('aa000000-0000-4000-8000-000000000003','NEX-10003','Riley Chen','riley.chen@example.com','pending','unpaid',
        219900,0,0,0,219900,
        '{"line1":"1200 Aspen Grove","city":"Denver","state":"CO","postal_code":"80202","country":"US"}'::jsonb, now() - interval '9 hours'),
      ('aa000000-0000-4000-8000-000000000004','NEX-10004','Devin Park','devin.park@example.com','shipped','paid',
        104899,1999,0,0,106898,
        '{"line1":"77 Lincoln Ave","city":"Chicago","state":"IL","postal_code":"60614","country":"US"}'::jsonb, now() - interval '2 days'),
      ('aa000000-0000-4000-8000-000000000005','NEX-10005','Alex Romano','alex.romano@example.com','cancelled','refunded',
        39998,0,0,0,39998,
        '{"line1":"305 Cedar Loop","city":"Portland","state":"OR","postal_code":"97205","country":"US"}'::jsonb, now() - interval '25 days'),
      ('aa000000-0000-4000-8000-000000000006','NEX-10006','Casey Morgan','casey.morgan@example.com','delivered','paid',
        49900,0,0,0,49900,
        '{"line1":"640 Marigold Ct","city":"Nashville","state":"TN","postal_code":"37203","country":"US"}'::jsonb, now() - interval '40 days');

    insert into public.order_items (order_id, name, sku, unit_price, quantity, line_total)
    values
      ('aa000000-0000-4000-8000-000000000001','NEXUS Vortex 5090','NX-VTX-5090',299900,1,299900),
      ('aa000000-0000-4000-8000-000000000002','Razer Blade 16 RTX 5090','RZ-BL16-5090',249900,1,249900),
      ('aa000000-0000-4000-8000-000000000002','NEXUS Precision Wireless Mouse','NX-MSE-PRO',7999,1,7999),
      ('aa000000-0000-4000-8000-000000000003','ROG Zephyrus G16','AS-ROG-G16',219900,1,219900),
      ('aa000000-0000-4000-8000-000000000004','NEXUS 27" 240Hz Monitor','NX-MON-27240',89900,1,89900),
      ('aa000000-0000-4000-8000-000000000004','NEXUS Mechanical Keyboard','NX-KBD-MX',14999,1,14999),
      ('aa000000-0000-4000-8000-000000000005','NEXUS Wireless Headset','NX-HDS-W',19999,2,39998),
      ('aa000000-0000-4000-8000-000000000006','NEXUS Ergo Gaming Chair','NX-CHR-ERGO',49900,1,49900);
  end if;
end $$;
