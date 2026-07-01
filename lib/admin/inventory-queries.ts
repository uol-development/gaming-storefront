import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deriveInventoryStatus, type InventoryStatus } from "@/lib/admin/inventory-schema";

export interface AdminInventoryRow {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  brand: string | null;
  status: string; // product publish status
  stock_quantity: number;
  low_stock_threshold: number;
  inventory_status: InventoryStatus; // derived from stock vs threshold
  featured_image_url: string | null;
  updated_at: string;
}

export interface StockMovementRow {
  id: string;
  delta: number;
  reason: string;
  note: string | null;
  resulting_quantity: number;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  brand: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  inventory_status: InventoryStatus;
  featured_image_url: string | null;
}

export interface InventorySummary {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

export type InventorySort = "stock_quantity" | "name" | "updated_at";

export interface ListInventoryParams {
  page?: number;
  perPage?: number;
  search?: string;
  stock?: string; // "" | "in_stock" | "low_stock" | "out_of_stock"
  sort?: InventorySort;
  dir?: "asc" | "desc";
}

export interface ListInventoryResult {
  rows: AdminInventoryRow[];
  total: number;
  page: number;
  perPage: number;
}

const COLUMNS =
  "id,name,slug,sku,brand,status,stock_quantity,low_stock_threshold,featured_image_url,updated_at";

const sanitize = (value: string) => value.replace(/[,()%*]/g, "").trim();
const toNum = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const toStrOrNull = (v: unknown): string | null => (typeof v === "string" ? v : null);

function mapRow(raw: Record<string, unknown>): AdminInventoryRow {
  const stock = toNum(raw.stock_quantity);
  const threshold = typeof raw.low_stock_threshold === "number" ? raw.low_stock_threshold : 5;
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    slug: String(raw.slug ?? ""),
    sku: toStrOrNull(raw.sku),
    brand: toStrOrNull(raw.brand),
    status: String(raw.status ?? ""),
    stock_quantity: stock,
    low_stock_threshold: threshold,
    inventory_status: deriveInventoryStatus(stock, threshold),
    featured_image_url: toStrOrNull(raw.featured_image_url),
    updated_at: String(raw.updated_at ?? ""),
  };
}

function compareRows(
  a: AdminInventoryRow,
  b: AdminInventoryRow,
  sort: InventorySort,
  ascending: boolean,
): number {
  let cmp = 0;
  if (sort === "name") cmp = a.name.localeCompare(b.name);
  else if (sort === "updated_at") cmp = a.updated_at.localeCompare(b.updated_at);
  else cmp = a.stock_quantity - b.stock_quantity;
  if (cmp === 0) cmp = a.name.localeCompare(b.name);
  return ascending ? cmp : -cmp;
}

export async function listInventory(params: ListInventoryParams = {}): Promise<ListInventoryResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 20));
  const sort = params.sort ?? "stock_quantity";
  const ascending = params.dir ? params.dir === "asc" : sort !== "updated_at";
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("products").select(COLUMNS).is("deleted_at", null);
  const search = sanitize(params.search ?? "");
  if (search.length > 0) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,brand.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = ((data ?? []) as Record<string, unknown>[]).map(mapRow);
  if (params.stock === "in_stock" || params.stock === "low_stock" || params.stock === "out_of_stock") {
    rows = rows.filter((r) => r.inventory_status === params.stock);
  }
  rows.sort((a, b) => compareRows(a, b, sort, ascending));

  const total = rows.length;
  const start = (page - 1) * perPage;
  return { rows: rows.slice(start, start + perPage), total, page, perPage };
}

export async function inventorySummary(): Promise<InventorySummary> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("stock_quantity,low_stock_threshold")
    .is("deleted_at", null);
  const summary: InventorySummary = { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 };
  for (const raw of (data ?? []) as Record<string, unknown>[]) {
    const stock = toNum(raw.stock_quantity);
    const threshold = typeof raw.low_stock_threshold === "number" ? raw.low_stock_threshold : 5;
    summary.total += 1;
    const status = deriveInventoryStatus(stock, threshold);
    if (status === "in_stock") summary.inStock += 1;
    else if (status === "low_stock") summary.lowStock += 1;
    else summary.outOfStock += 1;
  }
  return summary;
}

export async function getInventoryItem(id: string): Promise<InventoryItem | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("id,name,slug,sku,brand,stock_quantity,low_stock_threshold,featured_image_url")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  const raw = data as Record<string, unknown>;
  const stock = toNum(raw.stock_quantity);
  const threshold = typeof raw.low_stock_threshold === "number" ? raw.low_stock_threshold : 5;
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    slug: String(raw.slug ?? ""),
    sku: toStrOrNull(raw.sku),
    brand: toStrOrNull(raw.brand),
    stock_quantity: stock,
    low_stock_threshold: threshold,
    inventory_status: deriveInventoryStatus(stock, threshold),
    featured_image_url: toStrOrNull(raw.featured_image_url),
  };
}

export async function getStockMovements(
  productId: string,
  limit = 25,
): Promise<StockMovementRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("stock_movements")
    .select("id,delta,reason,note,resulting_quantity,created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Record<string, unknown>[]).map((raw) => ({
    id: String(raw.id ?? ""),
    delta: toNum(raw.delta),
    reason: String(raw.reason ?? ""),
    note: toStrOrNull(raw.note),
    resulting_quantity: toNum(raw.resulting_quantity),
    created_at: String(raw.created_at ?? ""),
  }));
}
