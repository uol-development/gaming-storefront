"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { reviewInputSchema, type ReviewInput } from "@/lib/admin/reviews-schema";

/**
 * Public review submission from the storefront PDP. Runs on the server and
 * writes with the service-role client (anonymous shoppers can't satisfy the
 * staff-only RLS write path); the review is stored as `pending` for moderation.
 * A "verified purchase" flag is computed from the customer's order history.
 */

export interface SubmitReviewResult {
  ok: boolean;
  error?: string;
}

export async function submitReview(input: ReviewInput): Promise<SubmitReviewResult> {
  const parsed = reviewInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your review." };
  }
  const { product_id, author_name, author_email, rating, title, body } = parsed.data;
  const email = author_email.toLowerCase();

  const supabase = createSupabaseAdminClient();

  // One review per email per product.
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("product_id", product_id)
    .ilike("author_email", email)
    .limit(1);
  if (existing && existing.length > 0) {
    return { ok: false, error: "You've already reviewed this product." };
  }

  // Verified purchase: did this email buy this product?
  let isVerified = false;
  const { data: myOrders } = await supabase
    .from("orders")
    .select("id")
    .ilike("customer_email", email)
    .is("deleted_at", null);
  const orderIds = ((myOrders ?? []) as { id: string }[]).map((o) => o.id);
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("id")
      .eq("product_id", product_id)
      .in("order_id", orderIds)
      .limit(1);
    isVerified = Boolean(items && items.length > 0);
  }

  const { error } = await supabase.from("reviews").insert({
    product_id,
    author_name,
    author_email: email,
    rating,
    title: title && title.trim().length > 0 ? title.trim() : null,
    body,
    status: "pending",
    is_verified: isVerified,
  });
  if (error) return { ok: false, error: "Something went wrong. Please try again." };

  revalidatePath("/admin/reviews");
  return { ok: true };
}
