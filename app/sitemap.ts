import type { MetadataRoute } from "next";
import { getStoreProductSlugs } from "@/lib/data/store";

/**
 * Sitemap (emitted as /sitemap.xml). Canonical host is Vercel (primary).
 * Product entries are sourced from the live Supabase catalog.
 */
const SITE_URL = "https://gaming-storefront-eight.vercel.app";
const LAST_MODIFIED = "2026-06-30";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/products",
    "/wishlist",
    "/checkout",
    "/about",
    "/contact",
    "/support",
    "/shipping",
    "/returns",
    "/warranty",
    "/careers",
    "/blog",
    "/privacy",
    "/terms",
    "/cookies",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: SITE_URL + route,
    lastModified: LAST_MODIFIED,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.6,
  }));

  const slugs = await getStoreProductSlugs();

  const productEntries: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: SITE_URL + "/products/" + slug,
    lastModified: LAST_MODIFIED,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...productEntries];
}
