"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { buttonVariants } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { getProductById } from "@/lib/data/catalog";
import type { Product } from "@/lib/data/products";

/**
 * Wishlist contents. Reads the shared wishlist store (the single source of truth
 * also driving every card heart + the header badge), resolves each saved id to a
 * product, and renders the canonical <ProductCard> in a scroll-reveal stagger
 * grid. Removing an item anywhere updates this list live via the store.
 *
 * The stagger is owned here (container reveals once, each item rides the shared
 * `staggerItem`); the card owns all per-item interaction. Empty state offers a
 * route back into the catalog. The reserved aspect ratios inside each card keep
 * CLS ~ 0.
 */
export function WishlistClient() {
  const { variants } = useReducedMotion();
  const ids = useWishlistStore((s) => s.ids);

  const products = ids
    .map((id) => getProductById(id))
    .filter((product): product is Product => product !== undefined);

  if (products.length === 0) {
    return (
      <div className="grid place-items-center gap-4 rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground"
        >
          <Heart className="size-7" />
        </span>
        <div className="space-y-1">
          <p className="font-display text-lg font-semibold text-foreground">
            Your wishlist is empty
          </p>
          <p className="text-sm text-muted-foreground">
            Tap the heart on any product to save it here for later.
          </p>
        </div>
        <Link href="/products" className={buttonVariants({ variant: "primary" })}>
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {products.length} saved
      </p>

      <motion.ul
        variants={variants(staggerContainer)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4"
      >
        {products.map((product) => (
          <motion.li key={product.id} variants={variants(staggerItem)}>
            <ProductCard product={product} />
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}
