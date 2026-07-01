import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminOrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  payment_status: string;
  total: number;
  item_count: number;
  placed_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AdminOrderItem {
  id: string;
  name: string;
  sku: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface AdminOrderDetail {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  status: string;
  payment_status: string;
  payment_method: string | null;
  delivery_zone: string | null;
  currency: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  shipping_address: Record<string, unknown>;
  billing_address: Record<string, unknown>;
  notes: string | null;
  placed_at: string;
  updated_at: string;
  deleted_at: string | null;
  items: AdminOrderItem[];
}

export type OrderSort = "placed_at" | "total" | "order_number" | "status";

export interface ListOrdersParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  sort?: OrderSort;
  dir?: "asc" | "desc";
  trash?: boolean;
}

export interface ListOrdersResult {
  rows: AdminOrderRow[];
  total: number;
  page: number;
  perPage: number;
}

const LIST_COLUMNS =
  "id,order_number,customer_name,customer_email,status,payment_status,total,placed_at,updated_at,deleted_at,order_items(count)";

// Strip characters that have meaning in a PostgREST or() filter to avoid injection.
const sanitize = (value: string) => value.replace(/[,()%*]/g, "").trim();

const toNum = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;
const toStrOrNull = (v: unknown): string | null => (typeof v === "string" ? v : null);
const toObj = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};

function extractItemCount(embedded: unknown): number {
  if (!Array.isArray(embedded)) return 0;
  const first = embedded[0] as { count?: unknown } | undefined;
  return first && typeof first.count === "number" ? first.count : 0;
}

export async function listOrders(params: ListOrdersParams = {}): Promise<ListOrdersResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 20));
  const sort = params.sort ?? "placed_at";
  // Default direction: descending for placed_at/total, ascending otherwise.
  const ascending = params.dir ? params.dir === "asc" : !(sort === "placed_at" || sort === "total");
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("orders").select(LIST_COLUMNS, { count: "exact" });
  query = params.trash ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);

  const search = sanitize(params.search ?? "");
  if (search.length > 0) {
    query = query.or(
      `order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`,
    );
  }
  if (params.status && params.status.length > 0) {
    query = query.eq("status", params.status);
  }

  query = query.order(sort, { ascending });
  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const rows: AdminOrderRow[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id ?? ""),
    order_number: String(r.order_number ?? ""),
    customer_name: String(r.customer_name ?? ""),
    customer_email: String(r.customer_email ?? ""),
    status: String(r.status ?? ""),
    payment_status: String(r.payment_status ?? ""),
    total: toNum(r.total),
    item_count: extractItemCount(r.order_items),
    placed_at: String(r.placed_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
    deleted_at: toStrOrNull(r.deleted_at),
  }));

  return { rows, total: count ?? 0, page, perPage };
}

export async function getOrderById(id: string): Promise<AdminOrderDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .single();
  if (!data) return null;

  const raw = data as Record<string, unknown>;
  const itemsRaw = Array.isArray(raw.order_items) ? (raw.order_items as Record<string, unknown>[]) : [];
  const items: AdminOrderItem[] = itemsRaw.map((it) => ({
    id: String(it.id ?? ""),
    name: String(it.name ?? ""),
    sku: toStrOrNull(it.sku),
    image_url: toStrOrNull(it.image_url),
    unit_price: toNum(it.unit_price),
    quantity: toNum(it.quantity),
    line_total: toNum(it.line_total),
  }));

  return {
    id: String(raw.id ?? ""),
    order_number: String(raw.order_number ?? ""),
    customer_name: String(raw.customer_name ?? ""),
    customer_email: String(raw.customer_email ?? ""),
    customer_phone: toStrOrNull(raw.customer_phone),
    status: String(raw.status ?? ""),
    payment_status: String(raw.payment_status ?? ""),
    payment_method: toStrOrNull(raw.payment_method),
    delivery_zone: toStrOrNull(raw.delivery_zone),
    currency: String(raw.currency ?? "BDT"),
    subtotal: toNum(raw.subtotal),
    shipping: toNum(raw.shipping),
    tax: toNum(raw.tax),
    discount: toNum(raw.discount),
    total: toNum(raw.total),
    shipping_address: toObj(raw.shipping_address),
    billing_address: toObj(raw.billing_address),
    notes: toStrOrNull(raw.notes),
    placed_at: String(raw.placed_at ?? ""),
    updated_at: String(raw.updated_at ?? ""),
    deleted_at: toStrOrNull(raw.deleted_at),
    items,
  };
}

export async function countTrashedOrders(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .not("deleted_at", "is", null);
  return count ?? 0;
}
