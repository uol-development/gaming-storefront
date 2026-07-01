import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Storefront promo-banner reads. Cookie-less anon client — the public-read RLS
 * policy already restricts to enabled, published, non-deleted banners inside
 * their publish/expire window, so callers only add placement + ordering.
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

export interface StoreBanner {
  id: string;
  size: "large" | "medium" | "small" | "tall";
  heading: string;
  subheading: string;
  description: string;
  imageUrl: string | undefined;
  imageMobileUrl: string | undefined;
  ctaText: string;
  ctaLink: string;
  ctaNewTab: boolean;
  bgColor: string | undefined;
  overlayColor: string | undefined;
  overlayOpacity: number;
  badge: string | undefined;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

const COLS =
  "id,size,heading,subheading,description,image_url,image_mobile_url,cta_text,cta_link,cta_new_tab,bg_color,overlay_color,overlay_opacity,badge,position";

function normalizeSize(value: unknown): StoreBanner["size"] {
  return value === "large" || value === "small" || value === "tall" ? value : "medium";
}

function mapBanner(raw: Record<string, unknown>): StoreBanner {
  return {
    id: str(raw.id),
    size: normalizeSize(raw.size),
    heading: str(raw.heading),
    subheading: str(raw.subheading),
    description: str(raw.description),
    imageUrl: typeof raw.image_url === "string" && raw.image_url ? raw.image_url : undefined,
    imageMobileUrl:
      typeof raw.image_mobile_url === "string" && raw.image_mobile_url ? raw.image_mobile_url : undefined,
    ctaText: str(raw.cta_text),
    ctaLink: str(raw.cta_link),
    ctaNewTab: raw.cta_new_tab === true,
    bgColor: typeof raw.bg_color === "string" && raw.bg_color ? raw.bg_color : undefined,
    overlayColor:
      typeof raw.overlay_color === "string" && raw.overlay_color ? raw.overlay_color : undefined,
    overlayOpacity: num(raw.overlay_opacity),
    badge: typeof raw.badge === "string" && raw.badge ? raw.badge : undefined,
  };
}

export async function getBannersForPlacement(
  placement = "before_flash_sale",
  limit = 8,
): Promise<StoreBanner[]> {
  const supabase = publicClient();
  const { data } = await supabase
    .from("promo_banners")
    .select(COLS)
    .eq("placement", placement)
    .order("position", { ascending: true })
    .limit(limit);
  return ((data ?? []) as Record<string, unknown>[]).map(mapBanner);
}
