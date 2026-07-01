"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Star, X } from "lucide-react";
import { backdrop, drawerPanelLeft } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type { CatalogFacets, ProductFilters } from "@/lib/data/catalog";

/**
 * Presentational, controlled left filter drawer. It owns NO filter state — the
 * parent passes `value` and the drawer reports edits through `onChange`, so the
 * grid and the drawer never drift out of sync.
 *
 * Motion: the panel slides on the GPU-friendly `x` transform (drawerPanelLeft)
 * and the backdrop fades on `opacity` (variants(backdrop)) — both compositor
 * only, no layout. Reduced motion swaps the panel for an instant opacity fade.
 *
 * Focus model is pragmatic (Esc + backdrop dismiss + labelled close, focus the
 * close button on open); a full focus trap is a later a11y pass.
 */

/** Toggle a value in/out of a string array without mutating the original. */
function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

const RATING_OPTIONS: { label: string; value: number }[] = [
  { label: "4+ stars", value: 4 },
  { label: "3+ stars", value: 3 },
  { label: "Any", value: 0 },
];

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  facets: CatalogFacets;
  value: ProductFilters;
  onChange: (next: ProductFilters) => void;
  onClear: () => void;
}

export function FilterDrawer({ open, onClose, facets, value, onChange, onClear }: FilterDrawerProps) {
  const { prefersReduced } = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  // Lock body scroll + wire Escape while open; focus the close control on open.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="filter-drawer" className="fixed inset-0 z-[70]">
          {/* Backdrop — opacity only; clicking it dismisses. */}
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-black/60"
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            aria-labelledby={titleId}
            variants={prefersReduced ? undefined : drawerPanelLeft}
            initial={prefersReduced ? { opacity: 0 } : "hidden"}
            animate={prefersReduced ? { opacity: 1 } : "visible"}
            exit={prefersReduced ? { opacity: 0 } : "exit"}
            className="absolute left-0 top-0 flex h-dvh w-[min(88vw,22rem)] flex-col border-r border-border bg-background shadow-2xl"
          >
            {/* HEADER */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-4 pt-[env(safe-area-inset-top)]">
              <h2
                id={titleId}
                className="font-display text-lg font-bold tracking-tight text-foreground"
              >
                Filters
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close filters"
                className="grid size-10 place-items-center rounded-md text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {/* BODY */}
            <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain p-4">
              {/* Categories */}
              {facets.categories.length > 0 ? (
                <fieldset className="space-y-2">
                  <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Category
                  </legend>
                  {facets.categories.map((facet) => {
                    const checked = value.categories.includes(facet.value);
                    return (
                      <label
                        key={facet.value}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-secondary/60"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            onChange({
                              ...value,
                              categories: toggleInArray(value.categories, facet.value),
                            })
                          }
                          className="size-4 shrink-0 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <span className="flex-1 capitalize text-foreground/90">{facet.value}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {facet.count}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              ) : null}

              {/* Brands */}
              {facets.brands.length > 0 ? (
                <fieldset className="space-y-2">
                  <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Brand
                  </legend>
                  {facets.brands.map((facet) => {
                    const checked = value.brands.includes(facet.value);
                    return (
                      <label
                        key={facet.value}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-secondary/60"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            onChange({
                              ...value,
                              brands: toggleInArray(value.brands, facet.value),
                            })
                          }
                          className="size-4 shrink-0 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <span className="flex-1 text-foreground/90">{facet.value}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {facet.count}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              ) : null}

              {/* Price */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`${titleId}-price`}
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Price
                  </label>
                  <span className="text-sm font-medium text-foreground">
                    Up to {formatPrice(value.maxPrice)}
                  </span>
                </div>
                <input
                  id={`${titleId}-price`}
                  type="range"
                  min={facets.priceMin}
                  max={facets.priceMax}
                  step={1000}
                  value={value.maxPrice}
                  onChange={(event) =>
                    onChange({ ...value, maxPrice: Number(event.target.value) })
                  }
                  aria-label={`Maximum price, up to ${formatPrice(value.maxPrice)}`}
                  className="w-full accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
                  <span>{formatPrice(facets.priceMin)}</span>
                  <span>{formatPrice(facets.priceMax)}</span>
                </div>
              </div>

              {/* Rating */}
              <fieldset className="space-y-2">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Rating
                </legend>
                <div className="flex flex-wrap gap-2">
                  {RATING_OPTIONS.map((option) => {
                    const active = value.minRating === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange({ ...value, minRating: option.value })}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-foreground/80 hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        {option.value > 0 ? (
                          <Star
                            className={cn(
                              "size-4",
                              active ? "fill-current" : "fill-amber-400 text-amber-400",
                            )}
                            aria-hidden
                          />
                        ) : null}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* On sale */}
              <label className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-secondary/60">
                <input
                  type="checkbox"
                  checked={value.onSaleOnly}
                  onChange={(event) =>
                    onChange({ ...value, onSaleOnly: event.target.checked })
                  }
                  className="size-4 shrink-0 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="flex-1 font-medium text-foreground/90">On sale only</span>
              </label>
            </div>

            {/* FOOTER */}
            <div className="flex shrink-0 items-center gap-3 border-t border-border/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={onClear}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold text-foreground/90 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Show results
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
