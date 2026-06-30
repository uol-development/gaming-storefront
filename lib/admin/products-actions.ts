"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, can, type AdminProfile } from "@/lib/auth/server";
import { logAudit } from "@/lib/admin/audit";
import { productInputSchema, toProductRow, type ProductInput } from "@/lib/admin/products-schema";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function requireManage(): Promise<AdminProfile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");
  if (!can.manageProducts(profile.role)) throw new Error("You don't have permission to manage products");
  return profile;
}

function firstIssue(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

export async function createProduct(input: ProductInput): Promise<ActionResult> {
  const profile = await requireManage();
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ ...toProductRow(parsed.data), created_by: profile.id, updated_by: profile.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const id = (data as { id: string }).id;
  await logAudit({ action: "create", entity: "product", entityId: id, summary: `Created "${parsed.data.name}"` });
  revalidatePath("/admin/products");
  return { ok: true, id };
}

export async function updateProduct(id: string, input: ProductInput): Promise<ActionResult> {
  const profile = await requireManage();
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };

  const supabase = await createSupabaseServerClient();
  // Snapshot the current row into version history before overwriting.
  const { data: current } = await supabase.from("products").select("*").eq("id", id).single();
  if (current) {
    await supabase
      .from("product_versions")
      .insert({ product_id: id, snapshot: current, created_by: profile.id });
  }

  const { error } = await supabase
    .from("products")
    .update({ ...toProductRow(parsed.data), updated_by: profile.id })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit({ action: "update", entity: "product", entityId: id, summary: `Updated "${parsed.data.name}"` });
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath(`/products/${parsed.data.slug}`);
  return { ok: true, id };
}

export async function softDeleteProducts(ids: string[]): Promise<ActionResult> {
  const profile = await requireManage();
  if (!can.delete(profile.role)) return { ok: false, error: "You don't have permission to delete" };
  if (ids.length === 0) return { ok: true };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), updated_by: profile.id })
    .in("id", ids);
  if (error) return { ok: false, error: error.message };

  await logAudit({ action: "delete", entity: "product", summary: `Moved ${ids.length} product(s) to trash` });
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function restoreProducts(ids: string[]): Promise<ActionResult> {
  const profile = await requireManage();
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({ deleted_at: null, updated_by: profile.id })
    .in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "restore", entity: "product", summary: `Restored ${ids.length} product(s)` });
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function permanentlyDeleteProducts(ids: string[]): Promise<ActionResult> {
  const profile = await requireManage();
  if (!can.delete(profile.role)) return { ok: false, error: "You don't have permission to delete" };
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "purge", entity: "product", summary: `Permanently deleted ${ids.length} product(s)` });
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function setProductsStatus(
  ids: string[],
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  const profile = await requireManage();
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const payload: Record<string, unknown> = { status, updated_by: profile.id };
  if (status === "published") payload.published_at = new Date().toISOString();
  const { error } = await supabase.from("products").update(payload).in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: status === "published" ? "publish" : "status", entity: "product", summary: `Set ${ids.length} product(s) to ${status}` });
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function duplicateProduct(id: string): Promise<ActionResult> {
  const profile = await requireManage();
  const supabase = await createSupabaseServerClient();
  const { data: current, error: readError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (readError || !current) return { ok: false, error: readError?.message ?? "Product not found" };

  const source = current as Record<string, unknown>;
  const suffix = Math.random().toString(36).slice(2, 6);
  const copy: Record<string, unknown> = {
    ...source,
    name: `${String(source.name ?? "Product")} (copy)`,
    slug: `${String(source.slug ?? "product")}-copy-${suffix}`,
    status: "draft",
    published_at: null,
    created_by: profile.id,
    updated_by: profile.id,
  };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  delete copy.deleted_at;

  const { data, error } = await supabase.from("products").insert(copy).select("id").single();
  if (error) return { ok: false, error: error.message };
  const newId = (data as { id: string }).id;
  await logAudit({ action: "duplicate", entity: "product", entityId: newId, summary: `Duplicated a product` });
  revalidatePath("/admin/products");
  return { ok: true, id: newId };
}
