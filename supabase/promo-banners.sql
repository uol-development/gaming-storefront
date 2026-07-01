-- ============================================================================
-- NEXUS — Homepage promotional banners (reusable across placements)
-- Run this in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (idempotent).
-- ============================================================================

do $$ begin create type banner_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

create table if not exists public.promo_banners (
  id uuid primary key default gen_random_uuid(),
  placement text not null default 'before_flash_sale', -- before_flash_sale | hero | between_sections | footer | category | product
  size text not null default 'medium',                 -- large | medium | small | tall (mosaic cell)
  heading text not null default '',
  subheading text,
  description text,
  image_url text,          -- desktop image
  image_mobile_url text,   -- optional mobile image
  cta_text text,
  cta_link text,
  cta_new_tab boolean not null default false,
  bg_color text,           -- optional background (hex)
  overlay_color text,      -- optional overlay tint (hex)
  overlay_opacity int not null default 0,  -- 0..100
  badge text,              -- New | Sale | Limited Time | Hot Deal | Exclusive | null
  position int not null default 0,
  is_active boolean not null default true,
  status banner_status not null default 'published',
  publish_at timestamptz,
  expire_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_promo_banners_placement on public.promo_banners(placement);
create index if not exists idx_promo_banners_position on public.promo_banners(position);
drop trigger if exists trg_promo_banners_updated on public.promo_banners;
create trigger trg_promo_banners_updated before update on public.promo_banners
  for each row execute function public.set_updated_at();

alter table public.promo_banners enable row level security;

drop policy if exists "promo_banners staff" on public.promo_banners;
create policy "promo_banners staff" on public.promo_banners
  for all using (public.is_staff()) with check (public.is_staff());

-- Public reads only enabled, published, non-deleted banners inside their window.
drop policy if exists "promo_banners public read" on public.promo_banners;
create policy "promo_banners public read" on public.promo_banners
  for select using (
    is_active
    and status = 'published'
    and deleted_at is null
    and (publish_at is null or publish_at <= now())
    and (expire_at is null or expire_at > now())
  );
