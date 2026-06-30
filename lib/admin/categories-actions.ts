"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, can, type AdminProfile } from "@/lib/auth/server";
import { logAudit } from "@/lib/admin/audit";
import {
  categoryInputSchema,
  toCategoryRow,
  type CategoryInput,
} from "@/lib/admin/categories-schema";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function requireManage(): Promise<AdminProfile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");
  if (!can.manageCategories(profile.role))
    throw new Error("You don't have permission to manage categories");
  return profile;
}

function firstIssue(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

function plural(n: number): string {
  return n === 1 ? "category" : "categories";
}

// Category changes ripple to the storefront nav (home) and the listing facets.
function revalidateStorefront(): void {
  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/products");
}

export async function createCategory(input: CategoryInput): Promise<ActionResult> {
  await requireManage();
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .insert(toCategoryRow(parsed.data))
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const id = (data as { id: string }).id;
  await logAudit({
    action: "create",
    entity: "category",
    entityId: id,
    summary: `Created "${parsed.data.name}"`,
  });
  revalidateStorefront();
  return { ok: true, id };
}

export async function updateCategory(id: string, input: CategoryInput): Promise<ActionResult> {
  await requireManage();
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };
  if (parsed.data.parent_id && parsed.data.parent_id === id) {
    return { ok: false, error: "A category can't be its own parent." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("categories").update(toCategoryRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "update",
    entity: "category",
    entityId: id,
    summary: `Updated "${parsed.data.name}"`,
  });
  revalidateStorefront();
  revalidatePath(`/admin/categories/${id}`);
  return { ok: true, id };
}

export async function softDeleteCategories(ids: string[]): Promise<ActionResult> {
  const profile = await requireManage();
  if (!can.delete(profile.role)) return { ok: false, error: "You don't have permission to delete" };
  if (ids.length === 0) return { ok: true };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("categories")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "delete",
    entity: "category",
    summary: `Moved ${ids.length} ${plural(ids.length)} to trash`,
  });
  revalidateStorefront();
  return { ok: true };
}

export async function restoreCategories(ids: string[]): Promise<ActionResult> {
  await requireManage();
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("categories").update({ deleted_at: null }).in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({
    action: "restore",
    entity: "category",
    summary: `Restored ${ids.length} ${plural(ids.length)}`,
  });
  revalidateStorefront();
  return { ok: true };
}

export async function permanentlyDeleteCategories(ids: string[]): Promise<ActionResult> {
  const profile = await requireManage();
  if (!can.delete(profile.role)) return { ok: false, error: "You don't have permission to delete" };
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("categories").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({
    action: "purge",
    entity: "category",
    summary: `Permanently deleted ${ids.length} ${plural(ids.length)}`,
  });
  revalidateStorefront();
  return { ok: true };
}

export async function setCategoriesActive(ids: string[], active: boolean): Promise<ActionResult> {
  await requireManage();
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("categories").update({ is_active: active }).in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({
    action: "status",
    entity: "category",
    summary: `Set ${ids.length} ${plural(ids.length)} to ${active ? "active" : "inactive"}`,
  });
  revalidateStorefront();
  return { ok: true };
}

export async function duplicateCategory(id: string): Promise<ActionResult> {
  await requireManage();
  const supabase = await createSupabaseServerClient();
  const { data: current, error: readError } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();
  if (readError || !current) return { ok: false, error: readError?.message ?? "Category not found" };

  const source = current as Record<string, unknown>;
  const suffix = Math.random().toString(36).slice(2, 6);
  const copy: Record<string, unknown> = {
    ...source,
    name: `${String(source.name ?? "Category")} (copy)`,
    slug: `${String(source.slug ?? "category")}-copy-${suffix}`,
    is_active: false,
  };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  delete copy.deleted_at;

  const { data, error } = await supabase.from("categories").insert(copy).select("id").single();
  if (error) return { ok: false, error: error.message };
  const newId = (data as { id: string }).id;
  await logAudit({
    action: "duplicate",
    entity: "category",
    entityId: newId,
    summary: "Duplicated a category",
  });
  revalidateStorefront();
  return { ok: true, id: newId };
}
