"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, can, type AdminProfile } from "@/lib/auth/server";
import { logAudit } from "@/lib/admin/audit";
import { bannerInputSchema, toBannerRow, type BannerInput } from "@/lib/admin/banners-schema";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function requireManage(): Promise<AdminProfile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");
  if (!can.manageBanners(profile.role))
    throw new Error("You don't have permission to manage banners");
  return profile;
}

function firstIssue(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

function plural(n: number): string {
  return n === 1 ? "banner" : "banners";
}

function revalidateBanners(id?: string): void {
  revalidatePath("/admin/banners");
  if (id) revalidatePath(`/admin/banners/${id}`);
  revalidatePath("/");
}

export async function createBanner(input: BannerInput): Promise<ActionResult> {
  await requireManage();
  const parsed = bannerInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };

  const supabase = await createSupabaseServerClient();
  const { data: maxRow } = await supabase
    .from("promo_banners")
    .select("position")
    .eq("placement", parsed.data.placement)
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = ((maxRow?.position as number | undefined) ?? 0) + 1;

  const row = toBannerRow(parsed.data);
  row.position = nextPos;

  const { data, error } = await supabase.from("promo_banners").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };
  const id = (data as { id: string }).id;
  await logAudit({
    action: "create",
    entity: "banner",
    entityId: id,
    summary: `Added banner "${String(row.heading) || "(untitled)"}"`,
  });
  revalidateBanners();
  return { ok: true, id };
}

export async function updateBanner(id: string, input: BannerInput): Promise<ActionResult> {
  await requireManage();
  const parsed = bannerInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("promo_banners").update(toBannerRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "update", entity: "banner", entityId: id, summary: "Updated a banner" });
  revalidateBanners(id);
  return { ok: true, id };
}

export async function reorderBanners(orderedIds: string[]): Promise<ActionResult> {
  await requireManage();
  if (orderedIds.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  let index = 0;
  for (const bannerId of orderedIds) {
    const { error } = await supabase.from("promo_banners").update({ position: index }).eq("id", bannerId);
    if (error) return { ok: false, error: error.message };
    index += 1;
  }
  await logAudit({ action: "reorder", entity: "banner", summary: `Reordered ${orderedIds.length} ${plural(orderedIds.length)}` });
  revalidateBanners();
  return { ok: true };
}

export async function setBannersActive(ids: string[], active: boolean): Promise<ActionResult> {
  await requireManage();
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("promo_banners").update({ is_active: active }).in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "status", entity: "banner", summary: `${active ? "Enabled" : "Disabled"} ${ids.length} ${plural(ids.length)}` });
  revalidateBanners();
  return { ok: true };
}

export async function setBannersStatus(ids: string[], status: "draft" | "published"): Promise<ActionResult> {
  await requireManage();
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("promo_banners").update({ status }).in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "status", entity: "banner", summary: `Set ${ids.length} ${plural(ids.length)} to ${status}` });
  revalidateBanners();
  return { ok: true };
}

export async function duplicateBanner(id: string): Promise<ActionResult> {
  await requireManage();
  const supabase = await createSupabaseServerClient();
  const { data: current, error: readError } = await supabase
    .from("promo_banners")
    .select("*")
    .eq("id", id)
    .single();
  if (readError || !current) return { ok: false, error: readError?.message ?? "Banner not found" };

  const source = current as Record<string, unknown>;
  const copy: Record<string, unknown> = {
    ...source,
    heading: `${String(source.heading ?? "Banner")} (copy)`,
    status: "draft",
    is_active: false,
  };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  delete copy.deleted_at;

  const { data, error } = await supabase.from("promo_banners").insert(copy).select("id").single();
  if (error) return { ok: false, error: error.message };
  const newId = (data as { id: string }).id;
  await logAudit({ action: "duplicate", entity: "banner", entityId: newId, summary: "Duplicated a banner" });
  revalidateBanners();
  return { ok: true, id: newId };
}

export async function softDeleteBanners(ids: string[]): Promise<ActionResult> {
  const profile = await requireManage();
  if (!can.delete(profile.role)) return { ok: false, error: "You don't have permission to delete" };
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("promo_banners")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "delete", entity: "banner", summary: `Archived ${ids.length} ${plural(ids.length)}` });
  revalidateBanners();
  return { ok: true };
}

export async function restoreBanners(ids: string[]): Promise<ActionResult> {
  await requireManage();
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("promo_banners").update({ deleted_at: null }).in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "restore", entity: "banner", summary: `Restored ${ids.length} ${plural(ids.length)}` });
  revalidateBanners();
  return { ok: true };
}

export async function permanentlyDeleteBanners(ids: string[]): Promise<ActionResult> {
  const profile = await requireManage();
  if (!can.delete(profile.role)) return { ok: false, error: "You don't have permission to delete" };
  if (ids.length === 0) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("promo_banners").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logAudit({ action: "purge", entity: "banner", summary: `Permanently deleted ${ids.length} ${plural(ids.length)}` });
  revalidateBanners();
  return { ok: true };
}
