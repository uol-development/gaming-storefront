"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, can, type AdminProfile } from "@/lib/auth/server";
import { logAudit } from "@/lib/admin/audit";
import { isOrderStatus, isPaymentStatus } from "@/lib/admin/orders-schema";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireManage(): Promise<AdminProfile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");
  if (!can.manageOrders(profile.role))
    throw new Error("You don't have permission to manage orders");
  return profile;
}

function plural(n: number): string {
  return n === 1 ? "order" : "orders";
}

function revalidateOrder(id?: string): void {
  revalidatePath("/admin/orders");
  if (id) revalidatePath(`/admin/orders/${id}`);
}

export async function setOrderStatus(id: string, status: string): Promise<ActionResult> {
  await requireManage();
  if (!isOrderStatus(status)) return { ok: false, error: "Invalid order status" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "status", entity: "order", entityId: id, summary: `Set order status to ${status}` });
  revalidateOrder(id);
  return { ok: true };
}

export async function setOrderPaymentStatus(
  id: string,
  paymentStatus: string,
): Promise<ActionResult> {
  await requireManage();
  if (!isPaymentStatus(paymentStatus)) return { ok: false, error: "Invalid payment status" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("orders")
    .update({ payment_status: paymentStatus })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit({
    action: "payment",
    entity: "order",
    entityId: id,
    summary: `Set payment status to ${paymentStatus}`,
  });
  revalidateOrder(id);
  return { ok: true };
}

export async function updateOrderNotes(id: string, notes: string): Promise<ActionResult> {
  await requireManage();
  const trimmed = notes.trim();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("orders")
    .update({ notes: trimmed.length > 0 ? trimmed : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "note", entity: "order", entityId: id, summary: "Updated order notes" });
  revalidateOrder(id);
  return { ok: true };
}

export async function bulkSetOrderStatus(ids: string[], status: string): Promise<ActionResult> {
  await requireManage();
  if (!isOrderStatus(status)) return { ok: false, error: "Invalid order status" };
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("orders").update({ status }).in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({
    action: "status",
    entity: "order",
    summary: `Set ${ids.length} ${plural(ids.length)} to ${status}`,
  });
  revalidateOrder();
  return { ok: true };
}

export async function softDeleteOrders(ids: string[]): Promise<ActionResult> {
  const profile = await requireManage();
  if (!can.delete(profile.role)) return { ok: false, error: "You don't have permission to delete" };
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("orders")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({
    action: "delete",
    entity: "order",
    summary: `Archived ${ids.length} ${plural(ids.length)}`,
  });
  revalidateOrder();
  return { ok: true };
}

export async function restoreOrders(ids: string[]): Promise<ActionResult> {
  await requireManage();
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("orders").update({ deleted_at: null }).in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({
    action: "restore",
    entity: "order",
    summary: `Restored ${ids.length} ${plural(ids.length)}`,
  });
  revalidateOrder();
  return { ok: true };
}

export async function permanentlyDeleteOrders(ids: string[]): Promise<ActionResult> {
  const profile = await requireManage();
  if (!can.delete(profile.role)) return { ok: false, error: "You don't have permission to delete" };
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("orders").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({
    action: "purge",
    entity: "order",
    summary: `Permanently deleted ${ids.length} ${plural(ids.length)}`,
  });
  revalidateOrder();
  return { ok: true };
}
