/**
 * Demo imagery (remote CDN — Unsplash). Every id below was visually verified to
 * be a product / hardware / environment shot with NO people. Components render
 * these over the product's brand gradient so a slow/failed load never shows a
 * broken box and never shifts layout (the gradient is the frame background).
 *
 * `unoptimized` images + wildcard remotePatterns are enabled for static export.
 */

const CDN = "https://images.unsplash.com/photo-";

export function imageUrl(id: string, width = 800, quality = 70): string {
  return CDN + id + "?auto=format&fit=crop&w=" + width + "&q=" + quality;
}

/** Verified, people-free shots keyed by product category. */
export const CATEGORY_IMAGE_IDS: Record<string, string[]> = {
  laptops: ["1593642632823-8f785ba67e45", "1603302576837-37561b2e2302"],
  desktops: ["1587202372775-e229f172b9d7", "1593640408182-31c70c8268f5"],
  gpus: ["1591488320449-011701bb6704", "1624705002806-5d72df19c3ad"],
  monitors: ["1527443224154-c4a3942d3acf", "1547082299-de196ea013d6"],
  keyboards: ["1618384887929-16ec33fab9ef", "1587829741301-dc798b83add3"],
  mice: ["1527814050087-3793815479db"],
  headsets: ["1599669454699-248893623440"],
  chairs: ["1598550476439-6847785fcea6"],
  ssds: ["1555680202-c86f0e12f086", "1624705002806-5d72df19c3ad"],
  accessories: ["1592840496694-26d035b52b48", "1526738549149-8e07eca6c147"],
};

const FALLBACK_IDS = ["1593640408182-31c70c8268f5", "1587202372775-e229f172b9d7"];

/** Atmospheric shots for hero / section / environment use. */
export const SECTION_IMAGE_IDS = {
  hero: "1587202372775-e229f172b9d7",
  battlestation: "1598550476439-6847785fcea6",
  console: "1593305841991-05c297ba4575",
  retro: "1550745165-9bc0b252726f",
  flatlay: "1526738549149-8e07eca6c147",
  setup: "1593640408182-31c70c8268f5",
} as const;

function hashString(value: string): number {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

export function categoryImageIds(category: string): string[] {
  const ids = CATEGORY_IMAGE_IDS[category];
  return ids && ids.length > 0 ? ids : FALLBACK_IDS;
}

/** Deterministic primary image id for a product (stable across renders). */
export function productImageId(slug: string, category: string): string {
  const ids = categoryImageIds(category);
  return ids[hashString(slug) % ids.length] ?? FALLBACK_IDS[0] ?? "";
}

/** Four ids for a product gallery — its category shots plus environment variety. */
export function productGalleryIds(slug: string, category: string): string[] {
  const pool = [...categoryImageIds(category), SECTION_IMAGE_IDS.setup, SECTION_IMAGE_IDS.battlestation];
  const start = hashString(slug);
  const out: string[] = [];
  for (let index = 0; index < 4; index += 1) {
    out.push(pool[(start + index) % pool.length] ?? FALLBACK_IDS[0] ?? "");
  }
  return out;
}
