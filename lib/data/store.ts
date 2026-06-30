import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Product, ProductBadge } from "./products";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

// Cookie-less anon client — RLS still restricts reads to published rows. Works
// at build time (generateStaticParams / sitemap) AND at request time, unlike the
// cookie-bound server client which can't run outside a request scope.
function publicClient(): SupabaseClient {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    { auth: { persistSession: false } },
  );
}

/**
 * Live storefront catalog, read from Supabase (published, non-deleted products).
 * Maps the DB row to the storefront `Product` shape so existing components keep
 * working. RLS "products public read" allows anonymous reads of published rows.
 */

const COLS =
  "id,name,slug,brand,category_id,price,sale_price,rating,reviews_count,features,description,stock_quantity,featured_image_url,status,deleted_at,updated_at";

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

async function categorySlugMap(supabase: SupabaseClient): Promise<Map<string, string>> {
  const { data } = await supabase.from("categories").select("id, slug");
  const map = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; slug: string }[]) map.set(row.id, row.slug);
  return map;
}

function mapRow(raw: unknown, catSlug: Map<string, string>): Product {
  const row = (raw ?? {}) as Record<string, unknown>;
  const regular = num(row.price);
  const sale = typeof row.sale_price === "number" ? row.sale_price : null;
  const onSale = sale !== null && sale < regular;
  const categoryId = typeof row.category_id === "string" ? row.category_id : null;
  const badge: ProductBadge | undefined = onSale ? "Sale" : undefined;

  return {
    id: str(row.id),
    slug: str(row.slug),
    name: str(row.name),
    brand: str(row.brand),
    category: (categoryId ? catSlug.get(categoryId) : "") ?? "",
    price: onSale && sale !== null ? sale : regular,
    compareAtPrice: onSale ? regular : undefined,
    rating: num(row.rating),
    reviews: num(row.reviews_count),
    badge,
    specs: Array.isArray(row.features) ? (row.features as unknown[]).map(str).filter(Boolean) : [],
    description: str(row.description),
    stock: num(row.stock_quantity),
    image: typeof row.featured_image_url === "string" ? row.featured_image_url : undefined,
  };
}

export async function getStoreProducts(): Promise<Product[]> {
  const supabase = publicClient();
  const [{ data }, catSlug] = await Promise.all([
    supabase
      .from("products")
      .select(COLS)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    categorySlugMap(supabase),
  ]);
  return ((data ?? []) as unknown[]).map((row) => mapRow(row, catSlug));
}

export async function getStoreProductBySlug(slug: string): Promise<Product | null> {
  const supabase = publicClient();
  const { data } = await supabase
    .from("products")
    .select(COLS)
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  return mapRow(data, await categorySlugMap(supabase));
}

export async function getStoreProductById(id: string): Promise<Product | null> {
  const supabase = publicClient();
  const { data } = await supabase
    .from("products")
    .select(COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  return mapRow(data, await categorySlugMap(supabase));
}

export async function getStoreProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const supabase = publicClient();
  const [{ data }, catSlug] = await Promise.all([
    supabase.from("products").select(COLS).in("id", ids),
    categorySlugMap(supabase),
  ]);
  return ((data ?? []) as unknown[]).map((row) => mapRow(row, catSlug));
}

export async function getStoreProductSlugs(): Promise<string[]> {
  const supabase = publicClient();
  const { data } = await supabase
    .from("products")
    .select("slug")
    .eq("status", "published")
    .is("deleted_at", null);
  return ((data ?? []) as { slug: string }[]).map((row) => row.slug);
}

export async function getStoreRelated(product: Product, limit = 4): Promise<Product[]> {
  const all = await getStoreProducts();
  const same = all.filter((p) => p.id !== product.id && p.category === product.category);
  const others = all.filter((p) => p.id !== product.id && p.category !== product.category);
  return [...same, ...others].slice(0, limit);
}

export async function searchStoreProducts(query: string, limit = 8): Promise<Product[]> {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];
  const all = await getStoreProducts();
  return all
    .filter((p) =>
      [p.name, p.brand, p.category, ...p.specs].join(" ").toLowerCase().includes(needle),
    )
    .slice(0, limit);
}
