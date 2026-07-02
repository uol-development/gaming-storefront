"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, can, type AdminProfile } from "@/lib/auth/server";
import { logAudit } from "@/lib/admin/audit";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABEL,
  canActorTouchRole,
  isProfileRole,
  toProfileRole,
  type ProfileRole,
} from "@/lib/admin/users-schema";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

interface TargetProfile {
  id: string;
  role: ProfileRole;
  is_suspended: boolean;
  email: string | null;
}

/**
 * Managing users is privilege management — gate hard. Only super_admin/admin
 * pass `can.manageUsers`; every write below ALSO re-checks per-target rules.
 */
async function requireManageUsers(): Promise<AdminProfile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");
  if (!can.manageUsers(profile.role)) {
    throw new Error("You don't have permission to manage users");
  }
  // A suspended admin whose session is still live must not perform privileged
  // writes (requireStaff bounces them from the UI; mirror that here).
  if (profile.is_suspended) {
    throw new Error("Your account is suspended");
  }
  return profile;
}

function coerceTarget(row: Record<string, unknown>): TargetProfile {
  return {
    id: typeof row.id === "string" ? row.id : "",
    role: toProfileRole(row.role),
    is_suspended: row.is_suspended === true,
    email: typeof row.email === "string" ? row.email : null,
  };
}

function plural(n: number): string {
  return n === 1 ? "user" : "users";
}

async function countActiveSuperAdmins(admin: SupabaseClient): Promise<number> {
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin")
    .eq("is_suspended", false);
  return count ?? 0;
}

/**
 * Returns an error string if the actor may NOT apply the change to this target,
 * or null if allowed. Enforces, in order:
 *  1. No acting on yourself (no self-demotion / self-lockout / self-escalation).
 *  2. Actor must be allowed to touch the target's CURRENT role.
 *  3. For a role change, actor must also be allowed to assign the NEW role
 *     (blocks an admin from minting admins/super_admins → privilege escalation).
 *  4. The last active super admin can't be demoted or suspended.
 */
function guardChange(
  actor: AdminProfile,
  target: TargetProfile,
  opts: { newRole?: ProfileRole; suspend?: boolean },
): string | null {
  if (target.id === actor.id) {
    return "You can't change your own role or status.";
  }
  if (!canActorTouchRole(actor.role, target.role)) {
    return `You don't have permission to modify a ${ROLE_LABEL[target.role]}.`;
  }
  if (opts.newRole !== undefined && !canActorTouchRole(actor.role, opts.newRole)) {
    return `You don't have permission to assign the ${ROLE_LABEL[opts.newRole]} role.`;
  }
  return null;
}

/**
 * Whether applying `opts` to this target REMOVES an active super admin — i.e.
 * demotes it to a non-super_admin role, or suspends it. Evaluated across the
 * WHOLE batch (see the actions) so that N super admins can't each pass a
 * per-target "more than one exists" check and collectively drop the count to 0.
 */
function removesActiveSuperAdmin(
  target: TargetProfile,
  opts: { newRole?: ProfileRole; suspend?: boolean },
): boolean {
  if (target.role !== "super_admin" || target.is_suspended) return false;
  return (opts.newRole !== undefined && opts.newRole !== "super_admin") || opts.suspend === true;
}

async function loadTargets(admin: SupabaseClient, ids: string[]): Promise<TargetProfile[]> {
  const { data, error } = await admin
    .from("profiles")
    .select("id,role,is_suspended,email")
    .in("id", ids);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(coerceTarget);
}

export async function setUsersRole(ids: string[], role: string): Promise<ActionResult> {
  const actor = await requireManageUsers();
  if (ids.length === 0) return { ok: true };
  if (!isProfileRole(role)) return { ok: false, error: "Unknown role." };

  const admin = createSupabaseAdminClient();
  try {
    const targets = await loadTargets(admin, ids);
    if (targets.length === 0) return { ok: false, error: "No matching users." };

    for (const target of targets) {
      const violation = guardChange(actor, target, { newRole: role });
      if (violation) return { ok: false, error: violation };
    }

    // Batch-level lockout guard: never let one call drop active super admins
    // below one, even when several are demoted together.
    const removed = targets.filter((t) => removesActiveSuperAdmin(t, { newRole: role })).length;
    if (removed > 0) {
      const activeSuperAdmins = await countActiveSuperAdmins(admin);
      if (activeSuperAdmins - removed < 1) {
        return { ok: false, error: "There must be at least one active super admin." };
      }
    }

    const { error } = await admin.from("profiles").update({ role }).in("id", ids);
    if (error) return { ok: false, error: error.message };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update role." };
  }

  await logAudit({
    action: "role",
    entity: "user",
    summary: `Set ${ids.length} ${plural(ids.length)} to ${ROLE_LABEL[role]}`,
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUsersSuspended(ids: string[], suspended: boolean): Promise<ActionResult> {
  const actor = await requireManageUsers();
  if (ids.length === 0) return { ok: true };

  const admin = createSupabaseAdminClient();
  try {
    const targets = await loadTargets(admin, ids);
    if (targets.length === 0) return { ok: false, error: "No matching users." };

    for (const target of targets) {
      const violation = guardChange(actor, target, { suspend: suspended });
      if (violation) return { ok: false, error: violation };
    }

    // Batch-level lockout guard (suspending only removes active super admins).
    if (suspended) {
      const removed = targets.filter((t) => removesActiveSuperAdmin(t, { suspend: true })).length;
      if (removed > 0) {
        const activeSuperAdmins = await countActiveSuperAdmins(admin);
        if (activeSuperAdmins - removed < 1) {
          return { ok: false, error: "There must be at least one active super admin." };
        }
      }
    }

    const { error } = await admin
      .from("profiles")
      .update({ is_suspended: suspended })
      .in("id", ids);
    if (error) return { ok: false, error: error.message };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update status." };
  }

  await logAudit({
    action: suspended ? "suspend" : "restore",
    entity: "user",
    summary: `${suspended ? "Suspended" : "Reactivated"} ${ids.length} ${plural(ids.length)}`,
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Create + delete accounts (service-role auth admin API)                     */
/* -------------------------------------------------------------------------- */

const addUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  fullName: z.string().trim().min(1, "Name is required").max(120),
  role: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export type AddUserInput = z.input<typeof addUserSchema>;

export interface AddUserResult extends ActionResult {
  userId?: string;
}

/**
 * Create a staff (or customer) account directly from the admin panel. The admin
 * sets a temporary password and the account is confirmed immediately (no email
 * needed) so the new member can sign in and change it. Gated by
 * requireManageUsers + the actor's assign-role permission.
 */
export async function addUser(input: AddUserInput): Promise<AddUserResult> {
  const actor = await requireManageUsers();

  const parsed = addUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { email, fullName, role, password } = parsed.data;

  if (!isProfileRole(role) || !ASSIGNABLE_ROLES.includes(role)) {
    return { ok: false, error: "Unknown role." };
  }
  if (!canActorTouchRole(actor.role, role)) {
    return { ok: false, error: `You don't have permission to assign the ${ROLE_LABEL[role]} role.` };
  }

  const admin = createSupabaseAdminClient();
  try {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data?.user) {
      const msg = error?.message ?? "Could not create the user.";
      return {
        ok: false,
        error: /already|exists|registered|duplicate/i.test(msg)
          ? "A user with that email already exists."
          : msg,
      };
    }

    // The on_auth_user_created trigger seeds a 'customer' profile; upsert the
    // chosen role + name so it's correct regardless of trigger timing.
    const userId = data.user.id;
    const { error: profileError } = await admin
      .from("profiles")
      .upsert({ id: userId, email, full_name: fullName, role }, { onConflict: "id" });
    if (profileError) {
      // Roll back the half-created account so the email isn't left taken by an
      // orphaned (customer-role) user that also blocks a retry.
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
      return { ok: false, error: profileError.message };
    }

    await logAudit({
      action: "create",
      entity: "user",
      entityId: userId,
      summary: `Created ${ROLE_LABEL[role]} account ${email}`,
    });
    revalidatePath("/admin/users");
    return { ok: true, userId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create the user." };
  }
}

/**
 * Permanently delete accounts (removes the auth user; the profile cascades).
 * Same privilege guards as a role change, plus the last-active-super-admin
 * lockout guard evaluated across the batch.
 */
export async function deleteUsers(ids: string[]): Promise<ActionResult> {
  const actor = await requireManageUsers();
  if (ids.length === 0) return { ok: true };

  const admin = createSupabaseAdminClient();
  try {
    const targets = await loadTargets(admin, ids);
    if (targets.length === 0) return { ok: false, error: "No matching users." };

    for (const target of targets) {
      if (target.id === actor.id) {
        return { ok: false, error: "You can't delete your own account." };
      }
      if (!canActorTouchRole(actor.role, target.role)) {
        return { ok: false, error: `You don't have permission to delete a ${ROLE_LABEL[target.role]}.` };
      }
    }

    // Deleting an active super admin removes them — guard against zeroing out.
    const removed = targets.filter((t) => t.role === "super_admin" && !t.is_suspended).length;
    if (removed > 0) {
      const activeSuperAdmins = await countActiveSuperAdmins(admin);
      if (activeSuperAdmins - removed < 1) {
        return { ok: false, error: "There must be at least one active super admin." };
      }
    }

    // Delete one at a time (no bulk auth API). Keep going on error and report an
    // aggregate so a mid-batch failure doesn't hide what actually got deleted.
    const failed: string[] = [];
    let deleted = 0;
    for (const target of targets) {
      const { error } = await admin.auth.admin.deleteUser(target.id);
      if (error) failed.push(target.email ?? target.id);
      else deleted += 1;
    }

    if (deleted > 0) {
      await logAudit({
        action: "delete",
        entity: "user",
        summary: `Deleted ${deleted} ${plural(deleted)}`,
      });
      revalidatePath("/admin/users");
    }

    if (failed.length > 0) {
      const shown = failed.slice(0, 3).join(", ");
      const more = failed.length > 3 ? `, +${failed.length - 3} more` : "";
      return { ok: false, error: `Deleted ${deleted}. Couldn't delete ${failed.length} (${shown}${more}).` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete users." };
  }
}
