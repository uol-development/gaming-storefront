import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminVideoRow {
  id: string;
  video_id: string;
  kind: string;
  title: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  product_id: string | null;
  product_name: string | null;
  position: number;
  is_active: boolean;
  is_featured: boolean;
  status: string;
  publish_at: string | null;
  unpublish_at: string | null;
  updated_at: string;
  deleted_at: string | null;
}

export type VideoSort = "position" | "created_at" | "title";

export interface ListVideosParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  productId?: string;
  sort?: VideoSort;
  dir?: "asc" | "desc";
  trash?: boolean;
}

export interface ListVideosResult {
  rows: AdminVideoRow[];
  total: number;
  page: number;
  perPage: number;
}

const COLUMNS =
  "id,video_id,kind,title,channel_name,thumbnail_url,product_id,position,is_active,is_featured,status,publish_at,unpublish_at,updated_at,deleted_at,product:products(id,name)";

const sanitize = (value: string) => value.replace(/[,()%*]/g, "").trim();
const toStrOrNull = (v: unknown): string | null => (typeof v === "string" ? v : null);

function mapRow(raw: Record<string, unknown>): AdminVideoRow {
  const product = (raw.product ?? null) as { id?: string; name?: string } | null;
  return {
    id: String(raw.id ?? ""),
    video_id: String(raw.video_id ?? ""),
    kind: String(raw.kind ?? "video"),
    title: String(raw.title ?? ""),
    channel_name: toStrOrNull(raw.channel_name),
    thumbnail_url: toStrOrNull(raw.thumbnail_url),
    product_id: toStrOrNull(raw.product_id),
    product_name: product && typeof product.name === "string" ? product.name : null,
    position: typeof raw.position === "number" ? raw.position : 0,
    is_active: raw.is_active === true,
    is_featured: raw.is_featured === true,
    status: String(raw.status ?? "draft"),
    publish_at: toStrOrNull(raw.publish_at),
    unpublish_at: toStrOrNull(raw.unpublish_at),
    updated_at: String(raw.updated_at ?? ""),
    deleted_at: toStrOrNull(raw.deleted_at),
  };
}

export async function listVideos(params: ListVideosParams = {}): Promise<ListVideosResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 20));
  const sort = params.sort ?? "position";
  const ascending = params.dir ? params.dir === "asc" : sort !== "created_at";
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("featured_videos").select(COLUMNS, { count: "exact" });
  query = params.trash ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);

  const search = sanitize(params.search ?? "");
  if (search.length > 0) {
    query = query.or(`title.ilike.%${search}%,channel_name.ilike.%${search}%`);
  }
  if (params.status && params.status.length > 0) query = query.eq("status", params.status);
  if (params.productId && params.productId.length > 0) query = query.eq("product_id", params.productId);

  query = query.order(sort, { ascending });
  if (sort !== "title") query = query.order("title", { ascending: true });
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

export async function getVideoById(id: string): Promise<Record<string, unknown> | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("featured_videos")
    .select("*, product:products(id,name)")
    .eq("id", id)
    .single();
  return (data as Record<string, unknown> | null) ?? null;
}

export async function countTrashedVideos(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("featured_videos")
    .select("*", { count: "exact", head: true })
    .not("deleted_at", "is", null);
  return count ?? 0;
}

/** Products for the association <select> (non-deleted, id + name). */
export async function listProductChoices(): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("id,name")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  return (data ?? []) as { id: string; name: string }[];
}
