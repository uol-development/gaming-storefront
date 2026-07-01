import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminBannerRow {
  id: string;
  placement: string;
  size: string;
  heading: string;
  badge: string | null;
  image_url: string | null;
  cta_text: string | null;
  position: number;
  is_active: boolean;
  status: string;
  publish_at: string | null;
  expire_at: string | null;
  updated_at: string;
  deleted_at: string | null;
}

export type BannerSort = "position" | "created_at" | "heading";

export interface ListBannersParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  placement?: string;
  sort?: BannerSort;
  dir?: "asc" | "desc";
  trash?: boolean;
}

export interface ListBannersResult {
  rows: AdminBannerRow[];
  total: number;
  page: number;
  perPage: number;
}

const COLUMNS =
  "id,placement,size,heading,badge,image_url,cta_text,position,is_active,status,publish_at,expire_at,updated_at,deleted_at";

const sanitize = (value: string) => value.replace(/[,()%*]/g, "").trim();
const toStrOrNull = (v: unknown): string | null => (typeof v === "string" ? v : null);

function mapRow(raw: Record<string, unknown>): AdminBannerRow {
  return {
    id: String(raw.id ?? ""),
    placement: String(raw.placement ?? "before_flash_sale"),
    size: String(raw.size ?? "medium"),
    heading: String(raw.heading ?? ""),
    badge: toStrOrNull(raw.badge),
    image_url: toStrOrNull(raw.image_url),
    cta_text: toStrOrNull(raw.cta_text),
    position: typeof raw.position === "number" ? raw.position : 0,
    is_active: raw.is_active === true,
    status: String(raw.status ?? "draft"),
    publish_at: toStrOrNull(raw.publish_at),
    expire_at: toStrOrNull(raw.expire_at),
    updated_at: String(raw.updated_at ?? ""),
    deleted_at: toStrOrNull(raw.deleted_at),
  };
}

export async function listBanners(params: ListBannersParams = {}): Promise<ListBannersResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 50));
  const sort = params.sort ?? "position";
  const ascending = params.dir ? params.dir === "asc" : sort !== "created_at";
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("promo_banners").select(COLUMNS, { count: "exact" });
  query = params.trash ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);

  const search = sanitize(params.search ?? "");
  if (search.length > 0) query = query.ilike("heading", `%${search}%`);
  if (params.status && params.status.length > 0) query = query.eq("status", params.status);
  if (params.placement && params.placement.length > 0)
    query = query.eq("placement", params.placement);

  query = query.order(sort, { ascending });
  if (sort !== "heading") query = query.order("heading", { ascending: true });
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

export async function getBannerById(id: string): Promise<Record<string, unknown> | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("promo_banners").select("*").eq("id", id).single();
  return (data as Record<string, unknown> | null) ?? null;
}

export async function countTrashedBanners(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("promo_banners")
    .select("*", { count: "exact", head: true })
    .not("deleted_at", "is", null);
  return count ?? 0;
}
