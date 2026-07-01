-- ============================================================================
-- NEXUS — Customer accounts (email-verified sign-up) + role separation
-- Run this in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (idempotent).
--
-- SECURITY: new sign-ups must become CUSTOMERS, not staff, so a shopper who
-- registers can never reach /admin (is_staff() excludes 'customer', and the
-- admin layout's requireStaff() bounces non-staff).
-- ============================================================================

-- 1) Add the customer role to the enum (no-op if it already exists).
alter type user_role add value if not exists 'customer';

-- 2) New auth users get a 'customer' profile (was defaulting to 'staff').
--    Existing profiles are untouched; promote staff manually as before.
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end; $$ language plpgsql security definer;

-- 3) Let a signed-in customer read THEIR OWN orders + items (matched on the JWT
--    email, case-insensitively). Staff still read everything via their policy.
drop policy if exists "orders own read" on public.orders;
create policy "orders own read" on public.orders
  for select using (lower(auth.jwt() ->> 'email') = lower(customer_email));

drop policy if exists "order_items own read" on public.order_items;
create policy "order_items own read" on public.order_items
  for select using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and lower(auth.jwt() ->> 'email') = lower(o.customer_email)
  ));
