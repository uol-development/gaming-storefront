import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminReviewRow {
  id: string;
  product_id: string | null;
  product_name: string | null;
  author_name: string;
  author_email: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  is_verified: boolean;
  created_at: string;
}

export type ReviewSort = "created_at" | "rating";

export interface ListReviewsParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  productId?: string;
  sort?: ReviewSort;
  dir?: "asc" | "desc";
}

export interface ListReviewsResult {
  rows: AdminReviewRow[];
  total: number;
  page: number;
  perPage: number;
}

const COLUMNS =
  "id,product_id,author_name,author_email,rating,title,body,status,is_verified,created_at,product:products(name)";

const sanitize = (value: string) => value.replace(/[,()%*]/g, "").trim();
const toStrOrNull = (v: unknown): string | null => (typeof v === "string" ? v : null);

function mapRow(raw: Record<string, unknown>): AdminReviewRow {
  const product = (raw.product ?? null) as { name?: string } | null;
  return {
    id: String(raw.id ?? ""),
    product_id: toStrOrNull(raw.product_id),
    product_name: product && typeof product.name === "string" ? product.name : null,
    author_name: String(raw.author_name ?? ""),
    author_email: String(raw.author_email ?? ""),
    rating: typeof raw.rating === "number" ? raw.rating : 0,
    title: toStrOrNull(raw.title),
    body: String(raw.body ?? ""),
    status: String(raw.status ?? "pending"),
    is_verified: raw.is_verified === true,
    created_at: String(raw.created_at ?? ""),
  };
}

export async function listReviews(params: ListReviewsParams = {}): Promise<ListReviewsResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 20));
  const sort = params.sort ?? "created_at";
  const ascending = params.dir ? params.dir === "asc" : false;
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("reviews").select(COLUMNS, { count: "exact" });
  const search = sanitize(params.search ?? "");
  if (search.length > 0) {
    query = query.or(
      `author_name.ilike.%${search}%,title.ilike.%${search}%,author_email.ilike.%${search}%`,
    );
  }
  if (params.status && params.status.length > 0) query = query.eq("status", params.status);
  if (params.productId && params.productId.length > 0) query = query.eq("product_id", params.productId);

  query = query.order(sort, { ascending });
  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return {
    rows: ((data ?? []) as Record<string, unknown>[]).map(mapRow),
    total: count ?? 0,
    page,
    perPage,
  };
}

/** Count of reviews per status (for moderation filters / the pending badge). */
export async function reviewStatusCounts(): Promise<Record<string, number>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("reviews").select("status");
  const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, spam: 0 };
  for (const row of (data ?? []) as { status?: string }[]) {
    const s = row.status ?? "pending";
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}

export async function listReviewProductChoices(): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("id,name")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  return (data ?? []) as { id: string; name: string }[];
}
