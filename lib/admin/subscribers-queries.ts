import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminSubscriberRow {
  id: string;
  email: string;
  source: string | null;
  status: string;
  created_at: string;
}

export type SubscriberSort = "created_at" | "email";

export interface ListSubscribersParams {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: SubscriberSort;
  dir?: "asc" | "desc";
}

export interface ListSubscribersResult {
  rows: AdminSubscriberRow[];
  total: number;
  page: number;
  perPage: number;
}

const COLUMNS = "id,email,source,status,created_at";
const sanitize = (value: string) => value.replace(/[,()%*]/g, "").trim();

function mapRow(raw: Record<string, unknown>): AdminSubscriberRow {
  return {
    id: String(raw.id ?? ""),
    email: String(raw.email ?? ""),
    source: typeof raw.source === "string" ? raw.source : null,
    status: String(raw.status ?? "subscribed"),
    created_at: String(raw.created_at ?? ""),
  };
}

export async function listSubscribers(
  params: ListSubscribersParams = {},
): Promise<ListSubscribersResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 25));
  const sort = params.sort ?? "created_at";
  const ascending = params.dir ? params.dir === "asc" : sort === "email";
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("newsletter_subscribers").select(COLUMNS, { count: "exact" });
  const search = sanitize(params.search ?? "");
  if (search.length > 0) query = query.ilike("email", `%${search}%`);

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
