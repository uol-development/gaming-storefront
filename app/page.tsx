import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { Hero } from "@/components/home/hero";
import { SectionSkeleton } from "@/components/home/section-skeleton";
import { getStoreProducts } from "@/lib/data/store";

export const metadata: Metadata = {
  title: "Premium Gaming Gear",
};

/**
 * Home route — Server Component that composes the storefront sections.
 *
 * Hero is imported statically (above the fold). Every below-the-fold section is
 * code-split with `next/dynamic`. Because this is an RSC we keep default SSR
 * (no `ssr: false`, which Next 15 forbids here) and give each a height-reserving
 * skeleton so the streamed chunk swaps in with zero layout shift.
 *
 * Render order: Hero, CategoryCards, FlashDeals, ProductGrid, BrandCarousel,
 * Newsletter. The single page <h1> lives inside Hero.
 *
 * Catalog data is read live from Supabase via the server-only data layer. The
 * `await getStoreProducts()` call opts this route out of static rendering, so
 * the page always reflects the current published catalog from /admin.
 */

const CategoryCards = dynamic(
  () => import("@/components/home/category-cards").then((m) => m.CategoryCards),
  { loading: () => <SectionSkeleton className="h-[520px]" /> },
);

const FlashDeals = dynamic(
  () => import("@/components/home/flash-deals").then((m) => m.FlashDeals),
  { loading: () => <SectionSkeleton className="h-[440px]" /> },
);

const ProductGrid = dynamic(
  () => import("@/components/home/product-grid").then((m) => m.ProductGrid),
  { loading: () => <SectionSkeleton className="h-[640px]" /> },
);

const BrandCarousel = dynamic(
  () => import("@/components/home/brand-carousel").then((m) => m.BrandCarousel),
  { loading: () => <SectionSkeleton className="h-[112px]" /> },
);

const Newsletter = dynamic(
  () => import("@/components/home/newsletter").then((m) => m.Newsletter),
  { loading: () => <SectionSkeleton className="h-[340px]" /> },
);

export default async function HomePage() {
  const products = await getStoreProducts();
  const featured = products.slice(0, 8);
  const deals = products
    .filter((p) => typeof p.compareAtPrice === "number")
    .slice(0, 6);

  return (
    <>
      <Hero />
      <CategoryCards />
      <FlashDeals deals={deals} />
      <ProductGrid products={featured} />
      <BrandCarousel />
      <Newsletter />
    </>
  );
}
