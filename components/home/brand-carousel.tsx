"use client";

import { motion } from "motion/react";
import { BRANDS, type Brand } from "@/lib/data/brands";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Infinite brand marquee for the "trusted by" trust strip.
 *
 * The track renders BRANDS twice (the second copy aria-hidden) and slides on a
 * single `x` transform from 0% to -50%. Because the two halves are identical,
 * the wrap at -50% is seamless and only the GPU-friendly transform channel
 * animates — never layout. When reduced motion is requested we drop the loop
 * entirely and lay the brands out as a static, wrapped, centered row.
 *
 * No CLS: the track lives in a fixed-height (h-16) clipped frame so the strip
 * reserves its space before anything moves.
 */
export function BrandCarousel() {
  const { prefersReduced } = useReducedMotion();

  return (
    <section
      aria-label="Brands we carry"
      className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <p className="mb-8 text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Trusted by gamers worldwide
      </p>

      {prefersReduced ? (
        <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
          {BRANDS.map((brand) => (
            <li key={brand.slug}>
              <BrandCell brand={brand} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="relative h-16 overflow-hidden">
          <motion.div
            className="flex h-full w-max flex-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 28, ease: "linear", repeat: Infinity }}
          >
            {BRANDS.map((brand) => (
              <BrandCell key={brand.slug} brand={brand} />
            ))}
            {BRANDS.map((brand) => (
              <BrandCell key={`dup-${brand.slug}`} brand={brand} aria-hidden />
            ))}
          </motion.div>

          {/* Edge fades — transform-free overlays so brands dissolve at the rims. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent"
          />
        </div>
      )}
    </section>
  );
}

function BrandCell({
  brand,
  className,
  ...rest
}: { brand: Brand; className?: string } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "grid h-full place-items-center whitespace-nowrap px-6 font-display text-lg text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
      {...rest}
    >
      {brand.name}
    </span>
  );
}
