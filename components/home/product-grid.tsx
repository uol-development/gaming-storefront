"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/data/products";

interface ProductGridProps {
  /** Featured products to render, supplied by a server parent. */
  products: Product[];
}

/**
 * Featured-products rail. The scroll-reveal stagger is owned here — the
 * container reveals its children once in view and each list item rides the
 * shared `staggerItem` variant — while the canonical <ProductCard> owns all
 * per-card interaction (hover lift, media zoom, wishlist, quick view, add to
 * cart). The "View all" link is a sibling of the grid, never nested in a card.
 */
export function ProductGrid({ products }: ProductGridProps) {
  const { variants } = useReducedMotion();

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

      {products.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No featured gear right now — check back soon.</p>
      ) : (
        <motion.ul
          variants={variants(staggerContainer)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4"
        >
          {products.map((product) => (
            <motion.li key={product.id} variants={variants(staggerItem)}>
              <ProductCard product={product} />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </section>
  );
}
