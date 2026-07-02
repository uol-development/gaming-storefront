import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Storefront review reads. Cookie-less anon client — the "reviews public read"
 * RLS policy restricts to APPROVED reviews, so callers just filter by product.
 */

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function publicClient(): SupabaseClient {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    { auth: { persistSession: false } },
  );
}

export interface StoreReview {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  isVerified: boolean;
  createdAt: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
  /** counts per star, index 0 = 1★ … index 4 = 5★ */
  distribution: [number, number, number, number, number];
}

export interface ProductReviews {
  summary: ReviewSummary;
  reviews: StoreReview[];
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const clampStar = (v: unknown): number => {
  const n = typeof v === "number" ? v : 0;
  return n >= 1 && n <= 5 ? Math.round(n) : 0;
};

export async function getProductReviews(productId: string, limit = 50): Promise<ProductReviews> {
  const supabase = publicClient();
  const { data } = await supabase
    .from("reviews")
    .select("id,author_name,rating,title,body,is_verified,created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as Record<string, unknown>[];
  const reviews: StoreReview[] = rows.map((r) => ({
    id: str(r.id),
    authorName: str(r.author_name) || "Anonymous",
    rating: clampStar(r.rating),
    title: str(r.title),
    body: str(r.body),
    isVerified: r.is_verified === true,
    createdAt: str(r.created_at),
  }));

  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sum = 0;
  for (const rev of reviews) {
    const idx = rev.rating - 1;
    const current = distribution[idx];
    if (current !== undefined) {
      distribution[idx] = current + 1;
      sum += rev.rating;
    }
  }
  const count = reviews.length;
  const average = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

  return { summary: { average, count, distribution }, reviews };
}
