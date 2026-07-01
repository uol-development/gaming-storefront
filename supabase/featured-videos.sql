-- ============================================================================
-- NEXUS — Featured in Videos (YouTube videos / Shorts linked to products)
-- Run this in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (idempotent).
-- ============================================================================

do $$ begin create type video_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

create table if not exists public.featured_videos (
  id uuid primary key default gen_random_uuid(),
  youtube_url text not null,
  video_id text not null,                 -- extracted 11-char YouTube id
  kind text not null default 'video',     -- 'video' | 'short'
  title text not null default '',
  channel_name text,
  thumbnail_url text,
  product_id uuid references public.products(id) on delete set null,
  position int not null default 0,        -- manual ordering (drag & drop)
  is_active boolean not null default true,   -- enabled / disabled
  is_featured boolean not null default false, -- show on the homepage
  status video_status not null default 'published',
  publish_at timestamptz,                 -- schedule publish (null = immediately)
  unpublish_at timestamptz,               -- schedule unpublish (null = never)
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_featured_videos_product on public.featured_videos(product_id);
create index if not exists idx_featured_videos_position on public.featured_videos(position);
create index if not exists idx_featured_videos_featured on public.featured_videos(is_featured);
drop trigger if exists trg_featured_videos_updated on public.featured_videos;
create trigger trg_featured_videos_updated before update on public.featured_videos
  for each row execute function public.set_updated_at();

alter table public.featured_videos enable row level security;

drop policy if exists "featured_videos staff" on public.featured_videos;
create policy "featured_videos staff" on public.featured_videos
  for all using (public.is_staff()) with check (public.is_staff());

-- Public can read enabled, published, non-deleted videos within their schedule window.
drop policy if exists "featured_videos public read" on public.featured_videos;
create policy "featured_videos public read" on public.featured_videos
  for select using (
    is_active
    and status = 'published'
    and deleted_at is null
    and (publish_at is null or publish_at <= now())
    and (unpublish_at is null or unpublish_at > now())
  );
