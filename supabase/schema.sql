-- ============================================================================
-- NEXUS Admin — Foundation + Products schema
-- Run this in your Supabase project: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (idempotent).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------- Enums ----------
do $$ begin create type user_role as enum
  ('super_admin','admin','manager','staff','editor','support');
exception when duplicate_object then null; end $$;

do $$ begin create type product_status as enum
  ('draft','published','archived','scheduled');
exception when duplicate_object then null; end $$;

do $$ begin create type inventory_status as enum
  ('in_stock','low_stock','out_of_stock','backorder');
exception when duplicate_object then null; end $$;

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ---------- Profiles (auth.users mirror + role) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  role user_role not null default 'staff',
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end; $$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_staff() returns boolean as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_suspended = false
      and p.role in ('super_admin','admin','manager','staff','editor','support')
  );
$$ language sql stable security definer;

-- ---------- Categories ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  banner_url text,
  position int not null default 0,
  is_active boolean not null default true,
  seo jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_categories_parent on public.categories(parent_id);
drop trigger if exists trg_categories_updated on public.categories;
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------- Products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sku text,
  barcode text,
  brand text,
  category_id uuid references public.categories(id) on delete set null,
  short_description text,
  description text,
  features text[] not null default '{}',
  specs jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  status product_status not null default 'draft',
  published_at timestamptz,
  scheduled_at timestamptz,
  price integer not null default 0,           -- minor units (cents)
  sale_price integer,
  cost_price integer,
  tax_class text,
  shipping_class text,
  weight numeric,
  dimensions jsonb not null default '{}'::jsonb,
  warranty text,
  stock_quantity int not null default 0,
  inventory_status inventory_status not null default 'in_stock',
  featured_image_url text,
  rating numeric not null default 0,
  reviews_count int not null default 0,
  seo jsonb not null default '{}'::jsonb,      -- meta_title, meta_description, og_image
  deleted_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_deleted on public.products(deleted_at);
drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- ---------- Product images ----------
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text,
  position int not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_images_product on public.product_images(product_id);

-- ---------- Product variants ----------
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text,
  attributes jsonb not null default '{}'::jsonb,  -- {size,color,storage,...}
  sku text,
  price integer,
  stock_quantity int not null default 0,
  image_url text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_variants_product on public.product_variants(product_id);

-- ---------- Version history ----------
create table if not exists public.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  snapshot jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_versions_product on public.product_versions(product_id);

-- ---------- Audit log ----------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  action text not null,
  entity text not null,
  entity_id uuid,
  summary text,
  diff jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_entity on public.audit_logs(entity, entity_id);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_versions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id or public.is_staff());
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "categories staff" on public.categories;
create policy "categories staff" on public.categories
  for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories
  for select using (is_active and deleted_at is null);

drop policy if exists "products staff" on public.products;
create policy "products staff" on public.products
  for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products
  for select using (status = 'published' and deleted_at is null);

drop policy if exists "product_images staff" on public.product_images;
create policy "product_images staff" on public.product_images
  for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "product_images public read" on public.product_images;
create policy "product_images public read" on public.product_images
  for select using (true);

drop policy if exists "product_variants staff" on public.product_variants;
create policy "product_variants staff" on public.product_variants
  for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "product_variants public read" on public.product_variants;
create policy "product_variants public read" on public.product_variants
  for select using (true);

drop policy if exists "product_versions staff" on public.product_versions;
create policy "product_versions staff" on public.product_versions
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "audit staff read" on public.audit_logs;
create policy "audit staff read" on public.audit_logs
  for select using (public.is_staff());

-- ---------- Storage bucket for product media ----------
insert into storage.buckets (id, name, public)
  values ('product-media','product-media', true)
  on conflict (id) do nothing;

drop policy if exists "product-media read" on storage.objects;
create policy "product-media read" on storage.objects
  for select using (bucket_id = 'product-media');
drop policy if exists "product-media insert" on storage.objects;
create policy "product-media insert" on storage.objects
  for insert with check (bucket_id = 'product-media' and public.is_staff());
drop policy if exists "product-media update" on storage.objects;
create policy "product-media update" on storage.objects
  for update using (bucket_id = 'product-media' and public.is_staff());
drop policy if exists "product-media delete" on storage.objects;
create policy "product-media delete" on storage.objects
  for delete using (bucket_id = 'product-media' and public.is_staff());

-- ============================================================================
-- AFTER you sign up your first user in the app, promote them to super_admin:
--   update public.profiles set role = 'super_admin' where email = 'you@example.com';
-- ============================================================================
