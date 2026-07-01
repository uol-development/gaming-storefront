"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, can, type AdminProfile } from "@/lib/auth/server";
import { logAudit } from "@/lib/admin/audit";
import {
  customerInputSchema,
  toCustomerRow,
  type CustomerInput,
} from "@/lib/admin/customers-schema";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function requireManage(): Promise<AdminProfile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");
  if (!can.manageCustomers(profile.role))
    throw new Error("You don't have permission to manage customers");
  return profile;
}

function firstIssue(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

function plural(n: number): string {
  return n === 1 ? "customer" : "customers";
}

function friendlyError(message: string): string {
  if (message.includes("duplicate key") || message.includes("customers_email_key")) {
    return "A customer with that email already exists.";
  }
  return message;
}

export async function createCustomer(input: CustomerInput): Promise<ActionResult> {
  await requireManage();
  const parsed = customerInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .insert(toCustomerRow(parsed.data))
    .select("id")
    .single();
  if (error) return { ok: false, error: friendlyError(error.message) };

  const id = (data as { id: string }).id;
  await logAudit({
    action: "create",
    entity: "customer",
    entityId: id,
    summary: `Created customer ${parsed.data.email}`,
  });
  revalidatePath("/admin/customers");
  return { ok: true, id };
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<ActionResult> {
  await requireManage();
  const parsed = customerInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("customers").update(toCustomerRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: friendlyError(error.message) };

  await logAudit({
    action: "update",
    entity: "customer",
    entityId: id,
    summary: `Updated customer ${parsed.data.email}`,
  });
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
  return { ok: true, id };
}

export async function setCustomersBlocked(ids: string[], blocked: boolean): Promise<ActionResult> {
  await requireManage();
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("customers").update({ is_blocked: blocked }).in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({
    action: "status",
    entity: "customer",
    summary: `${blocked ? "Blocked" : "Unblocked"} ${ids.length} ${plural(ids.length)}`,
  });
  revalidatePath("/admin/customers");
  return { ok: true };
}

export async function softDeleteCustomers(ids: string[]): Promise<ActionResult> {
  const profile = await requireManage();
  if (!can.delete(profile.role)) return { ok: false, error: "You don't have permission to delete" };
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({
    action: "delete",
    entity: "customer",
    summary: `Archived ${ids.length} ${plural(ids.length)}`,
  });
  revalidatePath("/admin/customers");
  return { ok: true };
}

export async function restoreCustomers(ids: string[]): Promise<ActionResult> {
  await requireManage();
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("customers").update({ deleted_at: null }).in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({
    action: "restore",
    entity: "customer",
    summary: `Restored ${ids.length} ${plural(ids.length)}`,
  });
  revalidatePath("/admin/customers");
  return { ok: true };
}

export async function permanentlyDeleteCustomers(ids: string[]): Promise<ActionResult> {
  const profile = await requireManage();
  if (!can.delete(profile.role)) return { ok: false, error: "You don't have permission to delete" };
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("customers").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({
    action: "purge",
    entity: "customer",
    summary: `Permanently deleted ${ids.length} ${plural(ids.length)}`,
  });
  revalidatePath("/admin/customers");
  return { ok: true };
}
