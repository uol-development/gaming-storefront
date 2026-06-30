"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { ArrowRight, Gamepad2, Heart, Star } from "lucide-react";
import { mediaZoom, staggerContainer, staggerItem } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";
import { discountPercent, formatCompact, formatPrice } from "@/lib/format";
import { FEATURED_PRODUCTS, type Product } from "@/lib/data/products";

/**
 * Featured-products rail (Phase 2 teaser). Each card is a lean preview — the
 * full interactive card lands in Phase 3. The wishlist toggle lives as a sibling
 * of the link (never nested inside the <a>) so the markup stays valid and both
 * targets are independently focusable.
 */
export function ProductGrid() {
  const { prefersReduced, variants } = useReducedMotion();
  const [wishlisted, setWishlisted] = useState<Set<string>>(() => new Set<string>());

  function toggleWishlist(id: string): void {
    setWishlisted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Handpicked</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Featured gear
          </h2>
        </div>
        <Link
          href="/products"
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View all
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>

      <motion.ul
        variants={variants(staggerContainer)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4"
      >
        {FEATURED_PRODUCTS.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            wishlisted={wishlisted.has(product.id)}
            onToggleWishlist={toggleWishlist}
            itemVariants={variants(staggerItem)}
            zoomVariants={variants(mediaZoom)}
            prefersReduced={prefersReduced}
          />
        ))}
      </motion.ul>
    </section>
  );
}

function brandInitials(brand: string): string {
  const words = brand.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("");
  return letters.toUpperCase();
}

function badgeClasses(badge: ProductBadgeValue): string {
  return badge === "Sale"
    ? "bg-accent text-accent-foreground"
    : "bg-primary text-primary-foreground";
}

type ProductBadgeValue = NonNullable<Product["badge"]>;

function ProductCard({
  product,
  wishlisted,
  onToggleWishlist,
  itemVariants,
  zoomVariants,
  prefersReduced,
}: {
  product: Product;
  wishlisted: boolean;
  onToggleWishlist: (id: string) => void;
  itemVariants: Variants;
  zoomVariants: Variants;
  prefersReduced: boolean;
}) {
  const { badge, compareAtPrice } = product;
  const discount =
    compareAtPrice !== undefined ? discountPercent(product.price, compareAtPrice) : 0;

  return (
    <motion.li variants={itemVariants} whileHover="hover" className="relative">
      {/* Wishlist — sibling of the link, never nested inside the <a>. */}
      <button
        type="button"
        aria-pressed={wishlisted}
        aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        onClick={() => onToggleWishlist(product.id)}
        className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-background/70 text-foreground/80 backdrop-blur transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <motion.span
          initial={false}
          animate={prefersReduced ? undefined : { scale: wishlisted ? 1.1 : 1 }}
          transition={
            prefersReduced ? undefined : { type: "spring", stiffness: 420, damping: 18 }
          }
          className="grid place-items-center"
        >
          <Heart
            className={cn(
              "size-4 transition-colors",
              wishlisted ? "fill-primary text-primary" : "fill-transparent",
            )}
            aria-hidden
          />
        </motion.span>
      </button>

      <Link
        href={`/products/${product.slug}`}
        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {/* Media — fixed 4/3 reserves space so the zoom never shifts layout. */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
          <motion.div
            variants={zoomVariants}
            initial="rest"
            className="grid h-full w-full place-items-center bg-gradient-to-br from-violet-500/20 via-card to-cyan-500/20"
          >
            {product.brand ? (
              <span className="font-display text-2xl font-bold tracking-tight text-foreground/60">
                {brandInitials(product.brand)}
              </span>
            ) : (
              <Gamepad2 className="size-10 text-foreground/40" aria-hidden />
            )}
          </motion.div>

          {badge ? (
            <span
              className={cn(
                "absolute left-2 top-2 rounded px-2 py-0.5 text-[10px] font-semibold",
                badgeClasses(badge),
              )}
            >
              {badge}
            </span>
          ) : null}
        </div>

        {/* Body */}
        <div className="mt-3 space-y-1">
          <p className="text-xs text-muted-foreground">{product.brand}</p>
          <h3 className="line-clamp-1 font-medium text-foreground transition-colors group-hover:text-primary">
            {product.name}
          </h3>
        </div>
      </Link>

      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
        <span className="font-medium text-foreground">{product.rating}</span>
        <span>({formatCompact(product.reviews)})</span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-semibold text-foreground">{formatPrice(product.price)}</span>
        {compareAtPrice !== undefined ? (
          <>
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(compareAtPrice)}
            </span>
            {discount > 0 ? (
              <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                {discount}% off
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    </motion.li>
  );
}
