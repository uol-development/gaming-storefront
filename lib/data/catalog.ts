import { FEATURED_PRODUCTS, type Product } from "./products";
import { FLASH_DEALS } from "./deals";
import { categoryImageIds, imageUrl, productGalleryIds, productImageId } from "./images";

/**
 * Aggregated catalog over the Phase-2 mock sources. Replace the source arrays
 * with the real API/CMS later — consumers only depend on the helpers below.
 */
export const ALL_PRODUCTS: Product[] = (() => {
  const bySlug = new Map<string, Product>();
  for (const product of [...FEATURED_PRODUCTS, ...FLASH_DEALS]) {
    if (!bySlug.has(product.slug)) bySlug.set(product.slug, product);
  }
  return [...bySlug.values()];
})();

export function getProductBySlug(slug: string): Product | undefined {
  return ALL_PRODUCTS.find((product) => product.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return ALL_PRODUCTS.find((product) => product.id === id);
}

export function getAllProductSlugs(): string[] {
  return ALL_PRODUCTS.map((product) => product.slug);
}

/** Same-category first, then fill from the rest. */
export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const sameCategory = ALL_PRODUCTS.filter(
    (candidate) => candidate.id !== product.id && candidate.category === product.category,
  );
  const others = ALL_PRODUCTS.filter(
    (candidate) => candidate.id !== product.id && candidate.category !== product.category,
  );
  return [...sameCategory, ...others].slice(0, limit);
}

/* ---- Presentational derivation (no real imagery / long-form copy in mocks) ---- */

const GRADIENTS = [
  "from-violet-500/30 to-fuchsia-500/10",
  "from-cyan-500/30 to-blue-500/10",
  "from-emerald-500/30 to-teal-500/10",
  "from-orange-500/30 to-amber-500/10",
  "from-pink-500/30 to-rose-500/10",
  "from-sky-500/30 to-indigo-500/10",
] as const;

/** Deterministic gradient for a product (stable across renders/sessions). */
export function productGradient(product: Product): string {
  let hash = 0;
  for (const char of product.slug) hash = (hash + char.charCodeAt(0)) % GRADIENTS.length;
  return GRADIENTS[hash] ?? "from-primary/30 to-accent/10";
}

export interface GalleryView {
  id: string;
  label: string;
  /** Brand gradient — rendered behind the image as graceful fallback. */
  gradient: string;
  /** Verified, people-free CDN photo for this view. */
  image: string;
}

/** Four gallery "angles" for a product, each a verified photo over its gradient. */
export function productGallery(product: Product): GalleryView[] {
  const base = productGradient(product);
  const ids = productGalleryIds(product.slug, product.category);
  return ["Front", "Angle", "Detail", "In use"].map((label, index) => ({
    id: `${product.slug}-${index}`,
    label,
    gradient: base,
    image: imageUrl(ids[index] ?? ids[0] ?? "", 900),
  }));
}

/** Primary product photo (cards, cart, search, summary). */
export function productImageUrl(product: Product, width = 800): string {
  return imageUrl(productImageId(product.slug, product.category), width);
}

/** Lead photo for a category card. */
export function categoryImageUrl(category: string, width = 800): string {
  return imageUrl(categoryImageIds(category)[0] ?? "", width);
}

/** Short marketing blurb composed from the product's own fields. */
export function productBlurb(product: Product): string {
  const highlights = product.specs.slice(0, 3).join(", ").toLowerCase();
  return `The ${product.name} from ${product.brand} is built for serious play — ${highlights}, with the durability competitive gaming demands. Tuned for consistent performance whether you're climbing the ranked ladder or deep in a campaign.`;
}

export interface SpecGroup {
  heading: string;
  rows: { label: string; value: string }[];
}

/** Grouped key/value specs for the PDP accordion. */
export function productSpecGroups(product: Product): SpecGroup[] {
  return [
    {
      heading: "Details",
      rows: [
        { label: "Brand", value: product.brand },
        { label: "Category", value: product.category },
        { label: "SKU", value: product.id.toUpperCase() },
        { label: "Rating", value: `${product.rating} / 5 (${product.reviews} reviews)` },
      ],
    },
    {
      heading: "In the box",
      rows: [
        { label: "Product", value: product.name },
        { label: "Cables & adapters", value: "Region-appropriate" },
        { label: "Documentation", value: "Quick-start guide" },
      ],
    },
    {
      heading: "Warranty & returns",
      rows: [
        { label: "Warranty", value: "2-year limited" },
        { label: "Returns", value: "30-day free returns" },
        { label: "Support", value: "Lifetime technical support" },
      ],
    },
  ];
}

/* ------------------------------------------------------------------ *
 * Phase 4 — search / filter / sort
 * ------------------------------------------------------------------ */

export type SortKey = "featured" | "price-asc" | "price-desc" | "rating";

export interface ProductFilters {
  categories: string[];
  brands: string[];
  /** Minor units; products priced above this are excluded (0 = no cap). */
  maxPrice: number;
  /** 0..5; products rated below this are excluded (0 = no minimum). */
  minRating: number;
  onSaleOnly: boolean;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface CatalogFacets {
  categories: FacetValue[];
  brands: FacetValue[];
  priceMin: number;
  priceMax: number;
}

export function getCatalogFacets(): CatalogFacets {
  const categoryCounts = new Map<string, number>();
  const brandCounts = new Map<string, number>();
  let priceMin = Number.POSITIVE_INFINITY;
  let priceMax = 0;
  for (const product of ALL_PRODUCTS) {
    categoryCounts.set(product.category, (categoryCounts.get(product.category) ?? 0) + 1);
    brandCounts.set(product.brand, (brandCounts.get(product.brand) ?? 0) + 1);
    priceMin = Math.min(priceMin, product.price);
    priceMax = Math.max(priceMax, product.price);
  }
  const toFacets = (counts: Map<string, number>): FacetValue[] =>
    [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  return {
    categories: toFacets(categoryCounts),
    brands: toFacets(brandCounts),
    priceMin: Number.isFinite(priceMin) ? priceMin : 0,
    priceMax,
  };
}

export function defaultFilters(facets: CatalogFacets): ProductFilters {
  return { categories: [], brands: [], maxPrice: facets.priceMax, minRating: 0, onSaleOnly: false };
}

export function filterProducts(filters: ProductFilters): Product[] {
  return ALL_PRODUCTS.filter((product) => {
    if (filters.categories.length > 0 && !filters.categories.includes(product.category)) return false;
    if (filters.brands.length > 0 && !filters.brands.includes(product.brand)) return false;
    if (filters.maxPrice > 0 && product.price > filters.maxPrice) return false;
    if (filters.minRating > 0 && product.rating < filters.minRating) return false;
    if (filters.onSaleOnly && typeof product.compareAtPrice !== "number") return false;
    return true;
  });
}

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const copy = [...products];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating);
    case "featured":
    default:
      return copy;
  }
}

/** Substring search over name/brand/category/specs. Empty query -> no results. */
export function searchProducts(query: string, limit = 8): Product[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];
  const matches = ALL_PRODUCTS.filter((product) =>
    [product.name, product.brand, product.category, ...product.specs]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
  return matches.slice(0, limit);
}

export const POPULAR_SEARCHES = [
  "RTX 5090",
  "Mechanical keyboard",
  "OLED monitor",
  "Wireless mouse",
  "Gaming chair",
];
