import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminCategoryRow {
  id: string;
  parent_id: string | null;
  parent_name: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  position: number;
  is_active: boolean;
  product_count: number;
  updated_at: string;
  deleted_at: string | null;
}

export type CategorySort = "position" | "name" | "updated_at";

export interface ListCategoriesParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string; // "" | "active" | "inactive"
  sort?: CategorySort;
  dir?: "asc" | "desc";
  trash?: boolean;
}

export interface ListCategoriesResult {
  rows: AdminCategoryRow[];
  total: number;
  page: number;
  perPage: number;
}

const COLUMNS =
  "id,parent_id,name,slug,description,image_url,position,is_active,updated_at,deleted_at";

// Strip characters that have meaning in a PostgREST or() filter to avoid injection.
const sanitize = (value: string) => value.replace(/[,()%*]/g, "").trim();

type RawCategoryRow = Omit<AdminCategoryRow, "parent_name" | "product_count">;

export async function listCategories(
  params: ListCategoriesParams = {},
): Promise<ListCategoriesResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 20));
  const sort = params.sort ?? "position";
  // Default direction: ascending for position/name, descending for updated_at.
  const ascending = params.dir ? params.dir === "asc" : sort !== "updated_at";
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("categories").select(COLUMNS, { count: "exact" });
  query = params.trash ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);

  const search = sanitize(params.search ?? "");
  if (search.length > 0) {
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  }
  if (params.status === "active") query = query.eq("is_active", true);
  else if (params.status === "inactive") query = query.eq("is_active", false);

  query = query.order(sort, { ascending });
  if (sort !== "name") query = query.order("name", { ascending: true });
  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as RawCategoryRow[];

  // Resolve parent names + product counts with two lightweight queries.
  const [{ data: allCats }, { data: prodRows }] = await Promise.all([
    supabase.from("categories").select("id,name"),
    supabase.from("products").select("category_id").is("deleted_at", null),
  ]);

  const nameById = new Map<string, string>();
  for (const c of (allCats ?? []) as { id: string; name: string }[]) nameById.set(c.id, c.name);

  const countById = new Map<string, number>();
  for (const p of (prodRows ?? []) as { category_id: string | null }[]) {
    if (p.category_id) countById.set(p.category_id, (countById.get(p.category_id) ?? 0) + 1);
  }

  const enriched: AdminCategoryRow[] = rows.map((r) => ({
    ...r,
    parent_name: r.parent_id ? (nameById.get(r.parent_id) ?? null) : null,
    product_count: countById.get(r.id) ?? 0,
  }));

  return { rows: enriched, total: count ?? 0, page, perPage };
}

export async function getCategoryById(id: string): Promise<Record<string, unknown> | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("categories").select("*").eq("id", id).single();
  return (data as Record<string, unknown> | null) ?? null;
}

export async function countTrashedCategories(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true })
    .not("deleted_at", "is", null);
  return count ?? 0;
}

/** Non-deleted categories as {id,name} for the parent <select>, optionally
 *  excluding one id (the category being edited, so it can't parent itself). */
export async function listCategoryOptions(
  excludeId?: string,
): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("id,name")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  const rows = (data ?? []) as { id: string; name: string }[];
  return excludeId ? rows.filter((r) => r.id !== excludeId) : rows;
}
