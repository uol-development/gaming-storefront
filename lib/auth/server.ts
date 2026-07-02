import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserRole = "super_admin" | "admin" | "manager" | "staff" | "editor" | "support";

export interface AdminProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_suspended: boolean;
}

const STAFF_ROLES: UserRole[] = ["super_admin", "admin", "manager", "staff", "editor", "support"];

/** The signed-in user's profile, or null if not authenticated. */
export async function getCurrentProfile(): Promise<AdminProfile | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, avatar_url, is_suspended")
    .eq("id", user.id)
    .single();

  return (data as AdminProfile | null) ?? null;
}

/** Require a non-suspended staff profile; redirect to login otherwise. */
export async function requireStaff(): Promise<AdminProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/admin/login");
  if (profile.is_suspended || !STAFF_ROLES.includes(profile.role)) {
    redirect("/admin/login?error=forbidden");
  }
  return profile;
}

/** Capability helpers for RBAC gating in the UI / actions. */
export const can = {
  manageProducts: (role: UserRole) =>
    ["super_admin", "admin", "manager", "editor"].includes(role),
  manageCategories: (role: UserRole) =>
    ["super_admin", "admin", "manager", "editor"].includes(role),
  manageOrders: (role: UserRole) =>
    ["super_admin", "admin", "manager", "support"].includes(role),
  manageCustomers: (role: UserRole) =>
    ["super_admin", "admin", "manager", "support"].includes(role),
  manageInventory: (role: UserRole) =>
    ["super_admin", "admin", "manager"].includes(role),
  manageVideos: (role: UserRole) =>
    ["super_admin", "admin", "manager", "editor"].includes(role),
  manageSubscribers: (role: UserRole) =>
    ["super_admin", "admin", "manager", "editor"].includes(role),
  manageBanners: (role: UserRole) =>
    ["super_admin", "admin", "manager", "editor"].includes(role),
  manageReviews: (role: UserRole) =>
    ["super_admin", "admin", "manager", "support"].includes(role),
  manageUsers: (role: UserRole) => ["super_admin", "admin"].includes(role),
  manageSettings: (role: UserRole) => ["super_admin", "admin"].includes(role),
  delete: (role: UserRole) => ["super_admin", "admin", "manager"].includes(role),
};
