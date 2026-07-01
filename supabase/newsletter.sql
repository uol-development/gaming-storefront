-- ============================================================================
-- NEXUS — Newsletter subscribers
-- Run this in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (idempotent). Public sign-ups are written by a server action
-- using the service-role key, so only a staff RLS policy is needed here.
-- ============================================================================

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,                                  -- 'home' | 'footer' | ...
  status text not null default 'subscribed',    -- subscribed | unsubscribed
  created_at timestamptz not null default now()
);
create index if not exists idx_newsletter_email_lower
  on public.newsletter_subscribers(lower(email));

alter table public.newsletter_subscribers enable row level security;
drop policy if exists "newsletter staff" on public.newsletter_subscribers;
create policy "newsletter staff" on public.newsletter_subscribers
  for all using (public.is_staff()) with check (public.is_staff());
