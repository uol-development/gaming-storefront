"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Home, LifeBuoy, Search } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/animations/variants";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

/**
 * Custom branded 404. Client Component so it can (a) open the global search
 * overlay via the UI store and (b) animate its entrance with Motion. It renders
 * inside the root layout, so the site header, footer, and overlays already wrap
 * it — this file only owns the centered "lost" panel.
 *
 * Every link resolves to a real internal route (no dead ends), every
 * link/button carries hover + visible-focus states, and only transform/opacity
 * animate — gated through the shared reduced-motion authority — so there is no
 * layout shift (CLS ~ 0). A `min-h` keeps the panel from feeling cramped on tall
 * viewports.
 */

interface Destination {
  label: string;
  href: string;
}

const POPULAR_DESTINATIONS: Destination[] = [
  { label: "All products", href: "/products" },
  { label: "Deals", href: "/products?sale=1" },
  { label: "Gaming laptops", href: "/products?category=laptops" },
  { label: "Graphics cards", href: "/products?category=gpus" },
  { label: "Wishlist", href: "/wishlist" },
];

export default function NotFound() {
  const { variants } = useReducedMotion();
  const openSearch = useUiStore((s) => s.openSearch);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
      <motion.div
        variants={variants(staggerContainer)}
        initial="hidden"
        animate="visible"
        className="flex w-full flex-col items-center"
      >
        {/* Oversized brand glyph. Absolutely-stacked layers so the big "404"
            sits behind the heading without affecting flow (no CLS). */}
        <motion.div
          variants={variants(fadeUp)}
          className="relative flex w-full items-center justify-center"
        >
          <span
            aria-hidden
            className="pointer-events-none select-none font-display text-[7rem] font-extrabold leading-none tracking-tighter text-primary/10 sm:text-[10rem]"
          >
            404
          </span>
          <span className="absolute text-xs font-semibold uppercase tracking-widest text-primary">
            Page not found
          </span>
        </motion.div>

        <motion.h1
          variants={variants(staggerItem)}
          className="mt-6 text-balance font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          This page pulled a no-show
        </motion.h1>

        <motion.p
          variants={variants(staggerItem)}
          className="mt-4 max-w-md text-balance text-base text-muted-foreground sm:text-lg"
        >
          We couldn&apos;t find what you were looking for — it may have been moved,
          renamed, or sold out and retired. Let&apos;s get you back in the game.
        </motion.p>

        {/* Primary actions */}
        <motion.div
          variants={variants(staggerItem)}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full sm:w-auto")}
          >
            <Home className="size-4" aria-hidden />
            Back to homepage
          </Link>

          <button
            type="button"
            onClick={openSearch}
            aria-label="Search the store"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
          >
            <Search className="size-4" aria-hidden />
            Search the store
          </button>
        </motion.div>

        {/* Popular destinations */}
        <motion.div variants={variants(staggerItem)} className="mt-12 w-full">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Popular destinations
          </h2>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {POPULAR_DESTINATIONS.map((destination) => (
              <li key={destination.href}>
                <Link
                  href={destination.href}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {destination.label}
                  <ArrowRight
                    className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Support line */}
        <motion.p
          variants={variants(staggerItem)}
          className="mt-12 inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground"
        >
          <LifeBuoy className="size-4 text-primary" aria-hidden />
          Still stuck? Visit our{" "}
          <Link
            href="/support"
            className="rounded font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            support center
          </Link>{" "}
          or{" "}
          <Link
            href="/contact"
            className="rounded font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            get in touch
          </Link>
          .
        </motion.p>
      </motion.div>
    </div>
  );
}
