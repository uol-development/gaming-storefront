import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  brand: string | null;
  status: string;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  inventory_status: string;
  featured_image_url: string | null;
  category_id: string | null;
  updated_at: string;
  deleted_at: string | null;
}

export type ProductSort = "updated_at" | "name" | "price" | "stock_quantity";

export interface ListProductsParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  sort?: ProductSort;
  dir?: "asc" | "desc";
  trash?: boolean;
}

export interface ListProductsResult {
  rows: AdminProductRow[];
  total: number;
  page: number;
  perPage: number;
}

const COLUMNS =
  "id,name,slug,sku,brand,status,price,sale_price,stock_quantity,inventory_status,featured_image_url,category_id,updated_at,deleted_at";

// Strip characters that have meaning in a PostgREST or() filter to avoid injection.
const sanitize = (value: string) => value.replace(/[,()%*]/g, "").trim();

export async function listProducts(params: ListProductsParams = {}): Promise<ListProductsResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 20));
  const sort = params.sort ?? "updated_at";
  const ascending = params.dir === "asc";
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("products").select(COLUMNS, { count: "exact" });
  query = params.trash ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);

  const search = sanitize(params.search ?? "");
  if (search.length > 0) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,brand.ilike.%${search}%`);
  }
  if (params.status && params.status.length > 0) {
    query = query.eq("status", params.status);
  }

  query = query.order(sort, { ascending });
  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return {
    rows: (data ?? []) as unknown as AdminProductRow[],
    total: count ?? 0,
    page,
    perPage,
  };
}

export async function getProductById(id: string): Promise<Record<string, unknown> | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).single();
  return (data as Record<string, unknown> | null) ?? null;
}

export async function countTrashedProducts(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .not("deleted_at", "is", null);
  return count ?? 0;
}
