"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { SlidersHorizontal, X } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import {
  defaultFilters,
  filterProducts,
  getCatalogFacets,
  sortProducts,
  type CatalogFacets,
  type ProductFilters,
  type SortKey,
} from "@/lib/data/catalog";
import type { Product } from "@/lib/data/products";
import { ProductCard } from "@/components/product/product-card";
import { FilterDrawer } from "@/components/products/filter-drawer";

/**
 * Client PLP body. Owns the filter/sort state, derives the result set with
 * `filterProducts` + `sortProducts`, and renders the toolbar, the active-filter
 * chips, the staggered product grid and the filter drawer.
 *
 * Animation: the grid is the single stagger orchestrator (`staggerContainer`
 * parent + `staggerItem` children). Keying the list on the sort + result ids
 * re-mounts it so the stagger replays whenever the visible set changes; reduced
 * motion strips transforms via `variants()`. Each card reserves its own media
 * height (CLS ~ 0) so nothing reflows as items reveal.
 */

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top rated" },
];

/**
 * Build the initial filter state from URL query params, falling back to the
 * defaults for anything unset. Only known facet values are honored so a bad
 * `?category=` / `?brand=` never produces an empty, un-clearable result set.
 *
 * Recognized: `category` -> categories=[value], `brand` -> brands=[value]
 * (URL-decoded), `sale=1` -> onSaleOnly. The PLP page is responsible for
 * wrapping this component in <Suspense> because it reads useSearchParams.
 */
function filtersFromParams(
  params: URLSearchParams,
  facets: CatalogFacets,
): ProductFilters {
  const base = defaultFilters(facets);

  const category = params.get("category");
  if (category && facets.categories.some((facet) => facet.value === category)) {
    base.categories = [category];
  }

  const brandParam = params.get("brand");
  if (brandParam) {
    const brand = decodeURIComponent(brandParam);
    if (facets.brands.some((facet) => facet.value === brand)) {
      base.brands = [brand];
    }
  }

  if (params.get("sale") === "1") {
    base.onSaleOnly = true;
  }

  return base;
}

export function ProductBrowser({ products }: { products: Product[] }) {
  const facets = useMemo(() => getCatalogFacets(products), [products]);
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ProductFilters>(() =>
    filtersFromParams(new URLSearchParams(searchParams.toString()), facets),
  );
  const [sort, setSort] = useState<SortKey>("featured");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Re-apply URL-derived filters only when the relevant params actually change,
  // so user edits made between navigations aren't clobbered on unrelated renders.
  const appliedParamsRef = useRef<string>(searchParams.toString());
  useEffect(() => {
    const next = searchParams.toString();
    if (next === appliedParamsRef.current) return;
    appliedParamsRef.current = next;
    setFilters(filtersFromParams(new URLSearchParams(next), facets));
  }, [searchParams, facets]);

  const { variants } = useReducedMotion();

  const results = useMemo(
    () => sortProducts(filterProducts(filters, products), sort),
    [filters, sort, products],
  );

  const resetFilters = (): void => setFilters(defaultFilters(facets));

  const priceCapped = filters.maxPrice < facets.priceMax;
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.brands.length > 0 ||
    priceCapped ||
    filters.minRating > 0 ||
    filters.onSaleOnly;

  const removeCategory = (value: string): void =>
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.filter((category) => category !== value),
    }));

  const removeBrand = (value: string): void =>
    setFilters((prev) => ({
      ...prev,
      brands: prev.brands.filter((brand) => brand !== value),
    }));

  const removePriceCap = (): void =>
    setFilters((prev) => ({ ...prev, maxPrice: facets.priceMax }));

  const removeMinRating = (): void => setFilters((prev) => ({ ...prev, minRating: 0 }));

  const removeOnSale = (): void => setFilters((prev) => ({ ...prev, onSaleOnly: false }));

  const productCountLabel = `${results.length} ${results.length === 1 ? "product" : "products"}`;
  // Key the list on the visible set so the stagger replays when results change.
  const gridKey = `${sort}:${results.map((product) => product.id).join(",")}`;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground/90 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters
            {hasActiveFilters ? (
              <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {activeFilterCount(filters, priceCapped)}
              </span>
            ) : null}
          </button>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {productCountLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="product-sort" className="sr-only">
            Sort products
          </label>
          <select
            id="product-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            aria-label="Sort products"
            className="h-10 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground/90 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          {filters.categories.map((category) => (
            <FilterChip
              key={`category:${category}`}
              label="Category"
              value={category}
              onRemove={() => removeCategory(category)}
            />
          ))}
          {filters.brands.map((brand) => (
            <FilterChip
              key={`brand:${brand}`}
              label="Brand"
              value={brand}
              onRemove={() => removeBrand(brand)}
            />
          ))}
          {priceCapped ? (
            <FilterChip
              label="Up to"
              value={formatPrice(filters.maxPrice)}
              onRemove={removePriceCap}
            />
          ) : null}
          {filters.minRating > 0 ? (
            <FilterChip
              label="Rating"
              value={`${filters.minRating}+`}
              onRemove={removeMinRating}
            />
          ) : null}
          {filters.onSaleOnly ? (
            <FilterChip label="" value="On sale" onRemove={removeOnSale} />
          ) : null}

          <button
            type="button"
            onClick={resetFilters}
            className="ml-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear all
          </button>
        </div>
      ) : null}

      {/* Grid / empty state */}
      {results.length === 0 ? (
        <div className="grid place-items-center gap-4 rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <div className="space-y-1">
            <p className="font-display text-lg font-semibold text-foreground">
              No products match your filters
            </p>
            <p className="text-sm text-muted-foreground">
              Try removing a filter or widening your price range.
            </p>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <motion.ul
          key={gridKey}
          variants={variants(staggerContainer)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4"
        >
          {results.map((product) => (
            <motion.li key={product.id} variants={variants(staggerItem)}>
              <ProductCard product={product} />
            </motion.li>
          ))}
        </motion.ul>
      )}

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        facets={facets}
        value={filters}
        onChange={setFilters}
        onClear={resetFilters}
      />
    </div>
  );
}

function FilterChip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary py-1 pl-3 pr-1.5 text-xs font-medium text-foreground",
      )}
    >
      {label ? <span className="text-muted-foreground">{label}:</span> : null}
      <span>{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label ? `${label} ` : ""}${value} filter`}
        className="grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

/** Count of distinct active filter parts for the toolbar badge. */
function activeFilterCount(filters: ProductFilters, priceCapped: boolean): number {
  return (
    filters.categories.length +
    filters.brands.length +
    (priceCapped ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.onSaleOnly ? 1 : 0)
  );
}
