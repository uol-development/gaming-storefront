-- ============================================================================
-- NEXUS — Business staff roles (Warehouse / SEO / Call Agent)
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- Adds three function-specific staff roles and teaches is_staff() about them so
-- they can reach /admin. Capability mapping (who can open which module) lives in
-- the app (lib/auth/server.ts `can.*`); RLS only needs to know they are staff.
--
-- NOTE: Postgres won't let a NEW enum value be used as an enum literal in the
-- same transaction it was added ("unsafe use of new value" / 55P04). Since the
-- SQL editor runs the whole script as one transaction, is_staff() compares
-- p.role::TEXT against text literals instead of enum values — so the ALTERs and
-- the function creation succeed together in a single run.
-- ============================================================================

alter type user_role add value if not exists 'warehouse';
alter type user_role add value if not exists 'seo';
alter type user_role add value if not exists 'call_agent';

create or replace function public.is_staff() returns boolean as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_suspended = false
      and p.role::text in (
        'super_admin','admin','manager','staff','editor','support',
        'warehouse','seo','call_agent'
      )
  );
$$ language sql stable security definer;
