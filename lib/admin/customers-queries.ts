import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminCustomerRow {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  is_blocked: boolean;
  marketing_opt_in: boolean;
  tags: string[];
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CustomerOrderSummary {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  placed_at: string;
}

export interface AdminCustomerDetail {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  tags: string[];
  notes: string | null;
  marketing_opt_in: boolean;
  is_blocked: boolean;
  default_address: Record<string, unknown>;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  orders: CustomerOrderSummary[];
}

export type CustomerSort =
  | "name"
  | "email"
  | "created_at"
  | "order_count"
  | "total_spent"
  | "last_order_at";

export interface ListCustomersParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string; // "" | "active" | "blocked"
  sort?: CustomerSort;
  dir?: "asc" | "desc";
  trash?: boolean;
}

export interface ListCustomersResult {
  rows: AdminCustomerRow[];
  total: number;
  page: number;
  perPage: number;
}

const sanitize = (value: string) => value.replace(/[,()%*]/g, "").trim();
const toNum = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const toStrOrNull = (v: unknown): string | null => (typeof v === "string" ? v : null);
const toObj = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
const toStrArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((t): t is string => typeof t === "string") : [];

interface Stat {
  count: number;
  spent: number;
  last: string | null;
}

/** Aggregate non-deleted orders by lowercased customer email. */
async function orderStatsByEmail(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<Map<string, Stat>> {
  const { data } = await supabase
    .from("orders")
    .select("customer_email,total,payment_status,placed_at")
    .is("deleted_at", null);
  const stats = new Map<string, Stat>();
  for (const o of (data ?? []) as Record<string, unknown>[]) {
    const email = String(o.customer_email ?? "").toLowerCase();
    if (!email) continue;
    const cur = stats.get(email) ?? { count: 0, spent: 0, last: null };
    cur.count += 1;
    if (String(o.payment_status) === "paid") cur.spent += toNum(o.total);
    const placed = String(o.placed_at ?? "");
    if (placed && (cur.last === null || placed > cur.last)) cur.last = placed;
    stats.set(email, cur);
  }
  return stats;
}

function compareRows(
  a: AdminCustomerRow,
  b: AdminCustomerRow,
  sort: CustomerSort,
  ascending: boolean,
): number {
  let cmp = 0;
  switch (sort) {
    case "name":
      cmp = a.name.localeCompare(b.name);
      break;
    case "email":
      cmp = a.email.localeCompare(b.email);
      break;
    case "order_count":
      cmp = a.order_count - b.order_count;
      break;
    case "total_spent":
      cmp = a.total_spent - b.total_spent;
      break;
    case "last_order_at":
      cmp = (a.last_order_at ?? "").localeCompare(b.last_order_at ?? "");
      break;
    case "created_at":
      cmp = a.created_at.localeCompare(b.created_at);
      break;
  }
  if (cmp === 0) cmp = a.email.localeCompare(b.email);
  return ascending ? cmp : -cmp;
}

export async function listCustomers(
  params: ListCustomersParams = {},
): Promise<ListCustomersResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 20));
  const sort = params.sort ?? "last_order_at";
  const ascending = params.dir ? params.dir === "asc" : sort === "name" || sort === "email";
  const supabase = await createSupabaseServerClient();

  let cq = supabase
    .from("customers")
    .select(
      "id,email,name,phone,tags,is_blocked,marketing_opt_in,created_at,updated_at,deleted_at",
    );
  cq = params.trash ? cq.not("deleted_at", "is", null) : cq.is("deleted_at", null);
  const search = sanitize(params.search ?? "");
  if (search.length > 0) cq = cq.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  if (params.status === "blocked") cq = cq.eq("is_blocked", true);
  else if (params.status === "active") cq = cq.eq("is_blocked", false);

  const [{ data: custData, error }, stats] = await Promise.all([cq, orderStatsByEmail(supabase)]);
  if (error) throw new Error(error.message);

  const rows: AdminCustomerRow[] = ((custData ?? []) as Record<string, unknown>[]).map((c) => {
    const email = String(c.email ?? "");
    const s = stats.get(email.toLowerCase()) ?? { count: 0, spent: 0, last: null };
    return {
      id: String(c.id ?? ""),
      email,
      name: String(c.name ?? ""),
      phone: toStrOrNull(c.phone),
      is_blocked: c.is_blocked === true,
      marketing_opt_in: c.marketing_opt_in === true,
      tags: toStrArray(c.tags),
      order_count: s.count,
      total_spent: s.spent,
      last_order_at: s.last,
      created_at: String(c.created_at ?? ""),
      updated_at: String(c.updated_at ?? ""),
      deleted_at: toStrOrNull(c.deleted_at),
    };
  });

  rows.sort((a, b) => compareRows(a, b, sort, ascending));

  const total = rows.length;
  const start = (page - 1) * perPage;
  return { rows: rows.slice(start, start + perPage), total, page, perPage };
}

export async function getCustomerById(id: string): Promise<AdminCustomerDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("customers").select("*").eq("id", id).single();
  if (!data) return null;
  const c = data as Record<string, unknown>;
  const email = String(c.email ?? "");

  const { data: orderData } = await supabase
    .from("orders")
    .select("id,order_number,status,payment_status,total,placed_at")
    .ilike("customer_email", email)
    .is("deleted_at", null)
    .order("placed_at", { ascending: false });

  const orders: CustomerOrderSummary[] = ((orderData ?? []) as Record<string, unknown>[]).map(
    (o) => ({
      id: String(o.id ?? ""),
      order_number: String(o.order_number ?? ""),
      status: String(o.status ?? ""),
      payment_status: String(o.payment_status ?? ""),
      total: toNum(o.total),
      placed_at: String(o.placed_at ?? ""),
    }),
  );

  const total_spent = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((sum, o) => sum + o.total, 0);

  return {
    id: String(c.id ?? ""),
    email,
    name: String(c.name ?? ""),
    phone: toStrOrNull(c.phone),
    tags: toStrArray(c.tags),
    notes: toStrOrNull(c.notes),
    marketing_opt_in: c.marketing_opt_in === true,
    is_blocked: c.is_blocked === true,
    default_address: toObj(c.default_address),
    order_count: orders.length,
    total_spent,
    last_order_at: orders[0]?.placed_at ?? null,
    created_at: String(c.created_at ?? ""),
    updated_at: String(c.updated_at ?? ""),
    deleted_at: toStrOrNull(c.deleted_at),
    orders,
  };
}

export async function countTrashedCustomers(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .not("deleted_at", "is", null);
  return count ?? 0;
}
