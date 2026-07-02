"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, can, type AdminProfile } from "@/lib/auth/server";
import { logAudit } from "@/lib/admin/audit";
import { isReviewStatus } from "@/lib/admin/reviews-schema";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function requireManage(): Promise<AdminProfile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");
  if (!can.manageReviews(profile.role))
    throw new Error("You don't have permission to manage reviews");
  return profile;
}

function plural(n: number): string {
  return n === 1 ? "review" : "reviews";
}

async function productIdsForReviews(supabase: ServerClient, ids: string[]): Promise<string[]> {
  const { data } = await supabase.from("reviews").select("product_id").in("id", ids);
  const set = new Set<string>();
  for (const row of (data ?? []) as { product_id?: string | null }[]) {
    if (row.product_id) set.add(row.product_id);
  }
  return Array.from(set);
}

/** Recompute a product's rating + reviews_count from its APPROVED reviews and
 *  revalidate its storefront page. */
async function syncProductRating(supabase: ServerClient, productId: string): Promise<void> {
  const { data } = await supabase
    .from("reviews")
    .select("rating")
    .eq("product_id", productId)
    .eq("status", "approved");
  const ratings = ((data ?? []) as { rating?: number }[])
    .map((r) => (typeof r.rating === "number" ? r.rating : 0))
    .filter((n) => n >= 1 && n <= 5);
  const count = ratings.length;
  const average = count > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / count) * 10) / 10 : 0;

  await supabase.from("products").update({ rating: average, reviews_count: count }).eq("id", productId);

  const { data: prod } = await supabase.from("products").select("slug").eq("id", productId).maybeSingle();
  const slug = (prod as { slug?: string } | null)?.slug;
  if (slug) revalidatePath(`/products/${slug}`);
}

async function syncProducts(supabase: ServerClient, productIds: string[]): Promise<void> {
  for (const id of productIds) await syncProductRating(supabase, id);
  revalidatePath("/admin/reviews");
  revalidatePath("/");
}

export async function setReviewsStatus(ids: string[], status: string): Promise<ActionResult> {
  await requireManage();
  if (!isReviewStatus(status)) return { ok: false, error: "Invalid status" };
  if (ids.length === 0) return { ok: true };

  const supabase = await createSupabaseServerClient();
  const products = await productIdsForReviews(supabase, ids);
  const { error } = await supabase.from("reviews").update({ status }).in("id", ids);
  if (error) return { ok: false, error: error.message };

  await syncProducts(supabase, products);
  await logAudit({
    action: "moderate",
    entity: "review",
    summary: `Set ${ids.length} ${plural(ids.length)} to ${status}`,
  });
  return { ok: true };
}

export async function deleteReviews(ids: string[]): Promise<ActionResult> {
  const profile = await requireManage();
  if (!can.delete(profile.role)) return { ok: false, error: "You don't have permission to delete" };
  if (ids.length === 0) return { ok: true };

  const supabase = await createSupabaseServerClient();
  const products = await productIdsForReviews(supabase, ids);
  const { error } = await supabase.from("reviews").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };

  await syncProducts(supabase, products);
  await logAudit({
    action: "delete",
    entity: "review",
    summary: `Deleted ${ids.length} ${plural(ids.length)}`,
  });
  return { ok: true };
}
