"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Search, X } from "lucide-react";
import { backdrop, searchOverlay, staggerContainer, staggerItem } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/data/products";
import { productGradient, productImageUrl, POPULAR_SEARCHES } from "@/lib/data/catalog";
import { searchStoreProductsAction } from "@/lib/data/store-actions";
import { useUiStore } from "@/lib/store/ui-store";

/**
 * Global search overlay. Descends from the top edge (`searchOverlay` — y/opacity
 * only) behind an opacity backdrop, mirroring the drawer/modal overlay pattern:
 * a single AnimatePresence-tracked node, opacity backdrop that closes on click,
 * a labelled role="dialog" panel, body scroll-lock + Escape, and focus moved to
 * the input on open.
 *
 * Search is debounced (~200ms) then resolved through a short simulated delay so
 * the skeleton state is exercised. ArrowUp/ArrowDown drive an active row and
 * Enter routes to it. The results region reserves a min-height so revealing rows
 * never shifts surrounding layout (CLS ~ 0).
 *
 * Focus model is pragmatic for now (focus input on open, Escape/backdrop to
 * dismiss); a full focus trap is a later a11y pass.
 */
const MAX_RESULTS = 8;

export function SearchOverlay() {
  const open = useUiStore((state) => state.isSearchOpen);
  const close = useUiStore((state) => state.closeSearch);
  const router = useRouter();
  const { variants } = useReducedMotion();

  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Debounce the raw query (~200ms). Cleared on change/unmount.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(handle);
  }, [query]);

  // Resolve the debounced query against the live catalog. Empty -> clear
  // results; non-empty -> show the skeleton, then await the server action.
  // A `cancelled` flag discards stale results from a superseded query.
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length === 0) {
      setSearching(false);
      setResults([]);
      setActiveIndex(-1);
      return;
    }

    let cancelled = false;
    setSearching(true);

    void (async () => {
      const found = await searchStoreProductsAction(trimmed, MAX_RESULTS);
      if (cancelled) return;
      setResults(found);
      setSearching(false);
      setActiveIndex(-1);
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Lock body scroll, focus the input, and wire Escape while open. Reset all
  // local state when the overlay closes so it reopens clean.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
      setSearching(false);
      setResults([]);
      setActiveIndex(-1);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  function navigateTo(product: Product): void {
    router.push(`/products/${product.slug}`);
    close();
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      const target = activeIndex >= 0 ? results[activeIndex] : results[0];
      if (target) {
        event.preventDefault();
        navigateTo(target);
      }
    }
  }

  const trimmedQuery = debouncedQuery.trim();
  const hasQuery = trimmedQuery.length > 0;
  const showEmptyResults = hasQuery && !searching && results.length === 0;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div key="search" className="fixed inset-0 z-[70]">
          {/* Backdrop — opacity only; clicking it dismisses. */}
          <motion.div
            aria-hidden
            variants={variants(backdrop)}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={close}
            className="absolute inset-0 bg-black/60"
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search products"
            variants={variants(searchOverlay)}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-x-0 top-0 mx-auto w-full max-w-2xl rounded-b-2xl border border-border bg-popover p-4 shadow-2xl sm:mt-20 sm:rounded-2xl"
          >
            {/* Search input */}
            <div className="relative flex items-center">
              <Search
                className="pointer-events-none absolute left-3 size-5 text-muted-foreground"
                aria-hidden
              />
              <input
                ref={inputRef}
                type="search"
                aria-label="Search products"
                placeholder="Search for products, brands, categories..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                autoComplete="off"
                className="h-12 w-full rounded-md border border-border bg-background pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {query.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-2 grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>

            {/* Results region — reserves height so revealing rows never shift layout. */}
            <div className="mt-4 min-h-[18rem]">
              {!hasQuery ? (
                <div>
                  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Popular
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {POPULAR_SEARCHES.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          setQuery(term);
                          inputRef.current?.focus();
                        }}
                        className="rounded-full border border-border bg-secondary px-3 py-1.5 text-sm text-foreground/90 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              ) : searching ? (
                <ul className="space-y-2" aria-hidden>
                  {[0, 1, 2, 3].map((row) => (
                    <li
                      key={row}
                      className="flex h-16 items-center gap-3 rounded-lg border border-border/60 p-2"
                    >
                      <div className="size-12 shrink-0 animate-pulse rounded-md bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                      </div>
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    </li>
                  ))}
                </ul>
              ) : showEmptyResults ? (
                <div className="grid min-h-[18rem] place-items-center px-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No results for &ldquo;
                    <span className="font-medium text-foreground">{trimmedQuery}</span>
                    &rdquo;
                  </p>
                </div>
              ) : (
                <motion.ul
                  key={trimmedQuery}
                  variants={variants(staggerContainer)}
                  initial="hidden"
                  animate="visible"
                  className="space-y-1"
                >
                  {results.map((product, index) => {
                    const isActive = index === activeIndex;
                    return (
                      <motion.li key={product.id} variants={variants(staggerItem)}>
                        <Link
                          href={`/products/${product.slug}`}
                          onClick={close}
                          aria-current={isActive ? "true" : undefined}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isActive
                              ? "border-primary bg-secondary"
                              : "border-transparent hover:bg-secondary",
                          )}
                        >
                          <span
                            className={cn(
                              "relative size-12 shrink-0 overflow-hidden rounded-md border border-border bg-gradient-to-br",
                              productGradient(product),
                            )}
                          >
                            <img
                              src={productImageUrl(product, 160)}
                              alt={product.name}
                              loading="lazy"
                              decoding="async"
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {product.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {product.brand}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold text-foreground">
                            {formatPrice(product.price)}
                          </span>
                        </Link>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
