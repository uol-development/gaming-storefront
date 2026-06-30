"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Gamepad2, Heart, Plus, Search, ShoppingCart, Star } from "lucide-react";
import { hoverLift, mediaZoom, popKey } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";
import { formatCompact, formatPrice, discountPercent } from "@/lib/format";
import type { Product } from "@/lib/data/products";
import { productGradient } from "@/lib/data/catalog";
import { useWishlistStore, useIsWishlisted } from "@/lib/store/wishlist-store";
import { useQuickViewStore } from "@/lib/store/quick-view-store";
import { useAddToCart } from "@/lib/hooks/use-add-to-cart";

/**
 * Canonical product card (replaces the Phase-2 inline teaser).
 *
 * The root is a single `motion.article` driving `hoverLift`; its `rest`/`hover`
 * states propagate to the inner `mediaZoom` motion.div via Motion variant
 * inheritance, so hovering or focusing anything inside lifts the card and zooms
 * the media together. Scroll-reveal stagger is owned by the parent list — this
 * card never declares hidden/visible.
 */
export function ProductCard({ product }: { product: Product }) {
  const { prefersReduced, variants } = useReducedMotion();
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [added, setAdded] = useState(false);

  const gradient = productGradient(product);
  const initials = brandInitials(product.brand);

  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const wishlisted = useIsWishlisted(product.id);
  const openQuickView = useQuickViewStore((s) => s.open);
  const addToCart = useAddToCart();

  // Clear any pending "Added" timeout on unmount to avoid setting state late.
  useEffect(() => {
    return () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    };
  }, []);

  function handleAddToCart() {
    const rect = mediaRef.current?.getBoundingClientRect();
    addToCart(product.id, rect ? { rect, gradient } : undefined);

    setAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1100);
  }

  const hasDiscount = typeof product.compareAtPrice === "number";
  const percentOff = hasDiscount
    ? discountPercent(product.price, product.compareAtPrice as number)
    : 0;
  const isSale = product.badge === "Sale";

  return (
    <motion.article
      variants={variants(hoverLift)}
      initial="rest"
      whileHover="hover"
      whileFocus="hover"
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      {/* Media — fly-to-cart source. Aspect ratio reserves height (CLS ~ 0). */}
      <div
        ref={mediaRef}
        className={cn(
          "relative aspect-[4/3] overflow-hidden bg-gradient-to-br",
          gradient,
        )}
      >
        <motion.div
          variants={variants(mediaZoom)}
          className="absolute inset-0 grid place-items-center"
        >
          {initials ? (
            <span
              aria-hidden
              className="select-none font-display text-3xl font-bold tracking-tight text-foreground/40"
            >
              {initials}
            </span>
          ) : (
            <Gamepad2 className="size-12 text-foreground/40" aria-hidden />
          )}
        </motion.div>
      </div>

      {/* Overlay controls — OUTSIDE the body link to avoid nested interactives. */}
      {product.badge ? (
        <span
          className={cn(
            "absolute left-3 top-3 z-10 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            isSale
              ? "bg-accent text-accent-foreground"
              : "bg-primary text-primary-foreground",
          )}
        >
          {product.badge}
        </span>
      ) : null}

      <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
        <button
          type="button"
          aria-pressed={wishlisted}
          aria-label={
            wishlisted
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
          onClick={() => toggleWishlist(product.id)}
          className="grid size-9 place-items-center rounded-md bg-background/70 text-foreground/80 backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <motion.span
            className="grid place-items-center"
            animate={
              prefersReduced ? undefined : { scale: wishlisted ? [1, 1.35, 1] : 1 }
            }
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Heart
              className={cn(
                "size-4 transition-colors",
                wishlisted ? "fill-primary text-primary" : "",
              )}
              aria-hidden
            />
          </motion.span>
        </button>

        <button
          type="button"
          aria-label={`Quick view ${product.name}`}
          onClick={() => openQuickView(product.id)}
          className={cn(
            "grid size-9 place-items-center rounded-md bg-background/70 text-foreground/80 backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            // Keyboard-reachable: reveal on group hover/focus AND on its own focus.
            prefersReduced
              ? "opacity-0 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
              : "translate-y-1 opacity-0 transition-[opacity,transform] focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100",
          )}
        >
          <Search className="size-4" aria-hidden />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          href={`/products/${product.slug}`}
          className="group/link rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="block text-xs text-muted-foreground">{product.brand}</span>
          <span className="mt-0.5 block line-clamp-1 font-medium text-foreground group-hover/link:text-primary">
            {product.name}
          </span>
        </Link>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
          <span className="font-medium text-foreground">{product.rating}</span>
          <span>({formatCompact(product.reviews)})</span>
        </div>

        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-base font-semibold text-foreground">
            {formatPrice(product.price)}
          </span>
          {hasDiscount ? (
            <>
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice as number)}
              </span>
              {percentOff > 0 ? (
                <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                  -{percentOff}%
                </span>
              ) : null}
            </>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          aria-label={`Add ${product.name} to cart`}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <AnimatePresence mode="wait" initial={false}>
            {added ? (
              <motion.span
                key="added"
                variants={variants(popKey)}
                initial="initial"
                animate="animate"
                exit="exit"
                className="inline-flex items-center gap-2"
              >
                <Check className="size-4" aria-hidden />
                Added
              </motion.span>
            ) : (
              <motion.span
                key="add"
                variants={variants(popKey)}
                initial="initial"
                animate="animate"
                exit="exit"
                className="inline-flex items-center gap-2"
              >
                <ShoppingCart className="size-4" aria-hidden />
                Add to cart
                <Plus className="size-4 opacity-70" aria-hidden />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.article>
  );
}

/** First two word-initials of a brand, uppercased (e.g. "ASUS ROG" -> "AR"). */
function brandInitials(brand: string): string {
  const letters = brand
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return letters;
}
