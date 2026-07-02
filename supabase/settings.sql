-- ============================================================================
-- NEXUS — Store settings (single-row site configuration)
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- One JSONB blob of NON-SECRET, storefront-facing config: store identity,
-- social links, delivery rates, enabled payment methods, maintenance mode.
-- Nothing sensitive lives here (no API keys), so a public read policy is safe
-- and lets the anon storefront (footer, checkout, maintenance banner) read it.
-- ============================================================================

create table if not exists public.store_settings (
  id text primary key default 'default',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_store_settings_updated on public.store_settings;
create trigger trg_store_settings_updated before update on public.store_settings
  for each row execute function public.set_updated_at();

alter table public.store_settings enable row level security;

drop policy if exists "settings staff" on public.store_settings;
create policy "settings staff" on public.store_settings
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "settings public read" on public.store_settings;
create policy "settings public read" on public.store_settings
  for select using (true);

-- Seed the single row (app merges it over code defaults, so empty is fine).
insert into public.store_settings (id, data)
values ('default', '{}'::jsonb)
on conflict (id) do nothing;
