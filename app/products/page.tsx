import { Suspense } from "react";

import { ProductBrowser } from "@/components/products/product-browser";
import { getStoreProducts } from "@/lib/data/store";

export const metadata = { title: "All products" };

// Read the live catalog on every request so /admin edits surface immediately.
export const dynamic = "force-dynamic";

/**
 * Product-listing page (PLP). Server Component shell: a static heading block
 * followed by <ProductBrowser />, which is a Client Component that owns its own
 * filter/sort state and the staggered product grid. The catalog is read from the
 * DB here on the server and handed to the browser as props.
 */
export default async function ProductsPage() {
  const products = await getStoreProducts();

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
        <ProductBrowser products={products} />
      </Suspense>
    </div>
  );
}
