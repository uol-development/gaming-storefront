-- ============================================================================
-- NEXUS — Product reviews & ratings (with moderation)
-- Run this in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (idempotent).
-- ============================================================================

do $$ begin create type review_status as enum ('pending', 'approved', 'rejected', 'spam');
exception when duplicate_object then null; end $$;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  author_name text not null default '',
  author_email text not null default '',
  rating int not null default 5 check (rating between 1 and 5),
  title text,
  body text not null default '',
  status review_status not null default 'pending',
  is_verified boolean not null default false,  -- author bought this product
  helpful_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_reviews_product on public.reviews(product_id, status);
create index if not exists idx_reviews_status on public.reviews(status);
drop trigger if exists trg_reviews_updated on public.reviews;
create trigger trg_reviews_updated before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

drop policy if exists "reviews staff" on public.reviews;
create policy "reviews staff" on public.reviews
  for all using (public.is_staff()) with check (public.is_staff());

-- Public can read only APPROVED reviews. (Submissions go through a server action
-- using the service-role key, so no public insert policy is needed.)
drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read" on public.reviews
  for select using (status = 'approved');
