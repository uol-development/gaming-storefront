import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/lib/data/products";
import { youTubeThumbnail, youTubeWatchUrl, type VideoKind } from "@/lib/data/youtube";

/**
 * Storefront "Featured in Videos" reads. Uses a cookie-less anon client — the
 * `featured_videos` public-read RLS policy already restricts rows to enabled,
 * published, non-deleted videos inside their schedule window, so callers only
 * add featured/product filters + ordering.
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

export interface FeaturedVideo {
  id: string;
  videoId: string;
  kind: VideoKind;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  watchUrl: string;
  product: Product;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

const PRODUCT_COLS =
  "id,name,slug,brand,price,sale_price,rating,reviews_count,featured_image_url,stock_quantity";
const VIDEO_COLS = `id,video_id,kind,title,channel_name,thumbnail_url,position,product_id, product:products(${PRODUCT_COLS})`;

function mapProduct(raw: unknown): Product | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const id = str(p.id);
  if (!id) return null;
  const regular = num(p.price);
  const sale = typeof p.sale_price === "number" ? p.sale_price : null;
  const onSale = sale !== null && sale < regular;
  return {
    id,
    slug: str(p.slug),
    name: str(p.name),
    brand: str(p.brand),
    category: "",
    price: onSale && sale !== null ? sale : regular,
    compareAtPrice: onSale ? regular : undefined,
    rating: num(p.rating),
    reviews: num(p.reviews_count),
    badge: onSale ? "Sale" : undefined,
    specs: [],
    description: "",
    stock: num(p.stock_quantity),
    image: typeof p.featured_image_url === "string" ? p.featured_image_url : undefined,
  };
}

function mapVideo(raw: Record<string, unknown>): FeaturedVideo | null {
  // PostgREST returns an embedded to-one relation as an object (or array); handle both.
  const embedded = Array.isArray(raw.product) ? raw.product[0] : raw.product;
  const product = mapProduct(embedded);
  if (!product) return null; // video with no visible product is not shown
  const videoId = str(raw.video_id);
  return {
    id: str(raw.id),
    videoId,
    kind: raw.kind === "short" ? "short" : "video",
    title: str(raw.title),
    channelName: str(raw.channel_name),
    thumbnailUrl: str(raw.thumbnail_url) || youTubeThumbnail(videoId),
    watchUrl: youTubeWatchUrl(videoId),
    product,
  };
}

/** Featured videos for the homepage "Featured in Videos" carousel. */
export async function getHomeFeaturedVideos(limit = 12): Promise<FeaturedVideo[]> {
  const supabase = publicClient();
  const { data } = await supabase
    .from("featured_videos")
    .select(VIDEO_COLS)
    .eq("is_featured", true)
    .order("position", { ascending: true })
    .limit(limit);
  return ((data ?? []) as Record<string, unknown>[]).map(mapVideo).filter((v): v is FeaturedVideo => v !== null);
}

/** Videos linked to a specific product (for its product page). */
export async function getProductVideos(productId: string, limit = 8): Promise<FeaturedVideo[]> {
  const supabase = publicClient();
  const { data } = await supabase
    .from("featured_videos")
    .select(VIDEO_COLS)
    .eq("product_id", productId)
    .order("position", { ascending: true })
    .limit(limit);
  return ((data ?? []) as Record<string, unknown>[]).map(mapVideo).filter((v): v is FeaturedVideo => v !== null);
}
