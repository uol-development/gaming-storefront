import { Suspense } from "react";

import { ProductBrowser } from "@/components/products/product-browser";

export const metadata = { title: "All products" };

/**
 * Product-listing page (PLP). Server Component shell: a static heading block
 * followed by <ProductBrowser />, which is a Client Component that owns its own
 * data, filter/sort state, and the staggered product grid.
 */
export default function ProductsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Shop all
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          All products
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Browse the full NEXUS lineup. Filter by category, brand, price and
          rating to dial in your next upgrade.
        </p>
      </div>

      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <ProductBrowser />
      </Suspense>
    </div>
  );
}
