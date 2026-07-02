import type { UserRole } from "@/lib/auth/server";

/**
 * The DB `user_role` enum includes 'customer' (added in customer-accounts.sql),
 * which the staff-only UserRole union deliberately omits. ProfileRole covers
 * every value a `profiles.role` column can actually hold.
 */
export type ProfileRole = UserRole | "customer";

/** All roles, in privilege order (business roles grouped after the tiers). */
export const PROFILE_ROLES: readonly ProfileRole[] = [
  "super_admin",
  "admin",
  "manager",
  "warehouse",
  "seo",
  "call_agent",
  "staff",
  "editor",
  "support",
  "customer",
] as const;

/** Staff roles only (everything that can reach /admin). */
export const STAFF_ROLES: readonly ProfileRole[] = [
  "super_admin",
  "admin",
  "manager",
  "warehouse",
  "seo",
  "call_agent",
  "staff",
  "editor",
  "support",
] as const;

/**
 * Roles offered in the admin "assign role" pickers. The legacy generic roles
 * (staff/editor/support) still work if a profile already has one, but they're
 * hidden here in favour of the clearer business roles. `customer` is included so
 * staff can be demoted back to a plain shopper account.
 */
export const ASSIGNABLE_ROLES: readonly ProfileRole[] = [
  "super_admin",
  "admin",
  "manager",
  "warehouse",
  "seo",
  "call_agent",
  "customer",
] as const;

export const ROLE_LABEL: Record<ProfileRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  manager: "Manager",
  warehouse: "Warehouse",
  seo: "SEO / Content",
  call_agent: "Call Agent",
  staff: "Staff",
  editor: "Editor",
  support: "Support",
  customer: "Customer",
};

export const ROLE_DESCRIPTION: Record<ProfileRole, string> = {
  super_admin: "Full access, including user & role management",
  admin: "Runs the store and staff (except super admins)",
  manager: "Catalog, orders, inventory, customers",
  warehouse: "Inventory and order fulfilment",
  seo: "Products, categories, videos, banners",
  call_agent: "Orders, customers, and reviews",
  staff: "General staff access",
  editor: "Content — products, categories, media, videos",
  support: "Orders, customers, reviews",
  customer: "Shopper account — no admin access",
};

export const ROLE_BADGE: Record<ProfileRole, string> = {
  super_admin: "border-primary/40 bg-primary/10 text-primary",
  admin: "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  manager: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  warehouse: "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  seo: "border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  call_agent: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  staff: "border-border bg-secondary text-foreground",
  editor: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  support: "border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-400",
  customer: "border-border bg-secondary text-muted-foreground",
};

const ROLE_SET: ReadonlySet<string> = new Set<string>(PROFILE_ROLES);

export function isProfileRole(value: string): value is ProfileRole {
  return ROLE_SET.has(value);
}

/** Coerce an unknown DB value to a ProfileRole, defaulting to 'customer'. */
export function toProfileRole(value: unknown): ProfileRole {
  return typeof value === "string" && isProfileRole(value) ? value : "customer";
}

/**
 * Whether an actor of `actorRole` may assign OR act upon a given `role`.
 * - super_admin: anyone/any role.
 * - admin: everything strictly below admin (never admin or super_admin).
 * - anyone else: nothing (they never reach this module — manageUsers gates it).
 *
 * This is the single source of truth shared by the server action guard and the
 * client UI gating (defense-in-depth; the server always re-checks).
 */
export function canActorTouchRole(actorRole: string, role: ProfileRole): boolean {
  if (actorRole === "super_admin") return true;
  if (actorRole === "admin") return role !== "super_admin" && role !== "admin";
  return false;
}
