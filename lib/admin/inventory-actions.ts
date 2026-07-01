"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, can, type AdminProfile } from "@/lib/auth/server";
import { logAudit } from "@/lib/admin/audit";
import {
  deriveInventoryStatus,
  isAdjustMode,
  isMovementReason,
  type AdjustMode,
} from "@/lib/admin/inventory-schema";

export interface ActionResult {
  ok: boolean;
  error?: string;
  newQuantity?: number;
}

async function requireManage(): Promise<AdminProfile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");
  if (!can.manageInventory(profile.role))
    throw new Error("You don't have permission to manage inventory");
  return profile;
}

function revalidateInventory(id?: string, slug?: string): void {
  revalidatePath("/admin/inventory");
  if (id) revalidatePath(`/admin/inventory/${id}`);
  revalidatePath("/admin/products");
  if (slug) revalidatePath(`/products/${slug}`);
}

function nextQuantity(mode: AdjustMode, current: number, amount: number): number {
  if (mode === "add") return current + amount;
  if (mode === "remove") return Math.max(0, current - amount);
  return amount; // set
}

export interface AdjustStockInput {
  mode: string;
  amount: number;
  reason: string;
  note?: string;
}

export async function adjustStock(productId: string, input: AdjustStockInput): Promise<ActionResult> {
  const profile = await requireManage();

  if (!isAdjustMode(input.mode)) return { ok: false, error: "Invalid adjustment type" };
  if (!isMovementReason(input.reason)) return { ok: false, error: "Choose a reason" };
  if (!Number.isFinite(input.amount) || input.amount < 0 || !Number.isInteger(input.amount)) {
    return { ok: false, error: "Enter a whole, non-negative amount" };
  }
  if ((input.mode === "add" || input.mode === "remove") && input.amount === 0) {
    return { ok: false, error: "Enter an amount greater than zero" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: current, error: readError } = await supabase
    .from("products")
    .select("stock_quantity,low_stock_threshold,slug,name")
    .eq("id", productId)
    .single();
  if (readError || !current) return { ok: false, error: readError?.message ?? "Product not found" };

  const row = current as Record<string, unknown>;
  const currentQty = typeof row.stock_quantity === "number" ? row.stock_quantity : 0;
  const threshold = typeof row.low_stock_threshold === "number" ? row.low_stock_threshold : 5;
  const slug = typeof row.slug === "string" ? row.slug : undefined;

  const newQty = nextQuantity(input.mode, currentQty, input.amount);
  const delta = newQty - currentQty;
  if (delta === 0) return { ok: false, error: "Stock is already at that level" };

  const { error: updateError } = await supabase
    .from("products")
    .update({
      stock_quantity: newQty,
      inventory_status: deriveInventoryStatus(newQty, threshold),
      updated_by: profile.id,
    })
    .eq("id", productId);
  if (updateError) return { ok: false, error: updateError.message };

  const { error: moveError } = await supabase.from("stock_movements").insert({
    product_id: productId,
    delta,
    reason: input.reason,
    note: input.note && input.note.trim().length > 0 ? input.note.trim() : null,
    resulting_quantity: newQty,
    created_by: profile.id,
  });
  if (moveError) return { ok: false, error: moveError.message };

  await logAudit({
    action: "stock",
    entity: "product",
    entityId: productId,
    summary: `Stock ${delta > 0 ? "+" : ""}${delta} (${input.reason}) → ${newQty}`,
  });
  revalidateInventory(productId, slug);
  return { ok: true, newQuantity: newQty };
}

export async function setLowStockThreshold(
  productId: string,
  threshold: number,
): Promise<ActionResult> {
  const profile = await requireManage();
  if (!Number.isFinite(threshold) || threshold < 0 || !Number.isInteger(threshold)) {
    return { ok: false, error: "Enter a whole, non-negative threshold" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase
    .from("products")
    .select("stock_quantity,slug")
    .eq("id", productId)
    .single();
  const row = (current ?? {}) as Record<string, unknown>;
  const currentQty = typeof row.stock_quantity === "number" ? row.stock_quantity : 0;
  const slug = typeof row.slug === "string" ? row.slug : undefined;

  const { error } = await supabase
    .from("products")
    .update({
      low_stock_threshold: threshold,
      inventory_status: deriveInventoryStatus(currentQty, threshold),
      updated_by: profile.id,
    })
    .eq("id", productId);
  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "threshold",
    entity: "product",
    entityId: productId,
    summary: `Set low-stock threshold to ${threshold}`,
  });
  revalidateInventory(productId, slug);
  return { ok: true };
}

export async function bulkRestock(
  ids: string[],
  amount: number,
  reason: string,
): Promise<ActionResult> {
  const profile = await requireManage();
  if (ids.length === 0) return { ok: true };
  if (!isMovementReason(reason)) return { ok: false, error: "Choose a reason" };
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    return { ok: false, error: "Enter a whole amount greater than zero" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error: readError } = await supabase
    .from("products")
    .select("id,stock_quantity,low_stock_threshold")
    .in("id", ids);
  if (readError) return { ok: false, error: readError.message };

  const products = (data ?? []) as Record<string, unknown>[];
  const movements: Record<string, unknown>[] = [];
  for (const p of products) {
    const id = String(p.id ?? "");
    const currentQty = typeof p.stock_quantity === "number" ? p.stock_quantity : 0;
    const threshold = typeof p.low_stock_threshold === "number" ? p.low_stock_threshold : 5;
    const newQty = currentQty + amount;
    const { error: updateError } = await supabase
      .from("products")
      .update({
        stock_quantity: newQty,
        inventory_status: deriveInventoryStatus(newQty, threshold),
        updated_by: profile.id,
      })
      .eq("id", id);
    if (updateError) return { ok: false, error: updateError.message };
    movements.push({
      product_id: id,
      delta: amount,
      reason,
      resulting_quantity: newQty,
      created_by: profile.id,
    });
  }

  if (movements.length > 0) {
    const { error: moveError } = await supabase.from("stock_movements").insert(movements);
    if (moveError) return { ok: false, error: moveError.message };
  }

  await logAudit({
    action: "stock",
    entity: "product",
    summary: `Restocked ${products.length} product(s) by +${amount} (${reason})`,
  });
  revalidateInventory();
  return { ok: true };
}
