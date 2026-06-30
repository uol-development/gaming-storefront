import type { MetadataRoute } from "next";
import { getAllProductSlugs } from "@/lib/data/catalog";

/**
 * Static sitemap (emitted as /sitemap.xml). Canonical host is Vercel (primary).
 */
const SITE_URL = "https://gaming-storefront-eight.vercel.app";
const LAST_MODIFIED = "2026-06-30";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
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

  const productEntries: MetadataRoute.Sitemap = getAllProductSlugs().map((slug) => ({
    url: SITE_URL + "/products/" + slug,
    lastModified: LAST_MODIFIED,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...productEntries];
}
