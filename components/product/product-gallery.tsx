"use client";

import { useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Gamepad2 } from "lucide-react";
import { crossfade } from "@/lib/animations/variants";
import { SPRING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";
import { productGallery } from "@/lib/data/catalog";
import type { Product } from "@/lib/data/products";

/**
 * PDP gallery with thumbnail sync. The active view crossfades via
 * <AnimatePresence mode="wait"> (opacity/scale only — no layout), and the
 * thumbnail strip drives selection. The active-thumbnail ring slides between
 * thumbs with a shared `layoutId`; under reduced motion the layoutId is dropped
 * so the marker snaps instantly. CLS stays ~0: the main frame has a fixed
 * aspect-ratio and thumbnails have fixed dimensions reserved up front.
 */
export function ProductGallery({ product }: { product: Product }) {
  const views = productGallery(product);
  const [selected, setSelected] = useState(0);
  const { prefersReduced, variants } = useReducedMotion();

  // Guard the indexed access (noUncheckedIndexedAccess) with a fallback.
  const active = views[selected] ?? views[0];
  const initials = brandInitials(product.brand);

  function onStripKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (views.length < 2) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSelected((index) => (index - 1 + views.length) % views.length);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setSelected((index) => (index + 1) % views.length);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* MAIN — fixed aspect reserves height before the crossfade runs. */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-card">
        <AnimatePresence mode="wait" initial={false}>
          {active && (
            <motion.div
              key={selected}
              variants={variants(crossfade)}
              initial="enter"
              animate="center"
              exit="exit"
              className={cn(
                "absolute inset-0 grid place-items-center bg-gradient-to-br",
                active.gradient,
              )}
            >
              <div className="flex flex-col items-center gap-3 text-foreground">
                <span className="grid size-16 place-items-center rounded-2xl bg-background/40 backdrop-blur-sm">
                  <Gamepad2 className="size-8 text-foreground/80" aria-hidden />
                </span>
                <span className="font-display text-2xl font-bold tracking-tight">{initials}</span>
                <span className="text-sm font-medium text-muted-foreground">{active.label}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* THUMBS — fixed size per button; active ring rides a shared layoutId. */}
      <div
        role="group"
        aria-label={`${product.name} gallery thumbnails`}
        className="flex gap-2"
        onKeyDown={onStripKeyDown}
      >
        {views.map((view, index) => {
          const isActive = selected === index;
          return (
            <button
              key={view.id}
              type="button"
              aria-label={`View ${index + 1}: ${view.label}`}
              aria-pressed={isActive}
              onClick={() => setSelected(index)}
              className={cn(
                "relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-gradient-to-br transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                view.gradient,
                isActive ? "opacity-100" : "opacity-70 hover:opacity-100",
              )}
            >
              <span className="absolute inset-0 grid place-items-center">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground/70">
                  {view.label}
                </span>
              </span>
              {isActive && (
                <motion.span
                  aria-hidden
                  // Drop the layoutId under reduced motion so the marker snaps
                  // instead of sliding between thumbnails.
                  layoutId={prefersReduced ? undefined : "gallery-active-thumb"}
                  transition={SPRING.snappy}
                  className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-ring ring-offset-2 ring-offset-background"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Up to two uppercase initials from a brand name (e.g. "ASUS ROG" -> "AR"). */
function brandInitials(brand: string): string {
  const initials = brand
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return initials.slice(0, 2) || "NX";
}
