"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Armchair,
  ArrowUpRight,
  Cpu,
  HardDrive,
  Headphones,
  Keyboard,
  Laptop,
  Monitor,
  Mouse,
  type LucideIcon,
} from "lucide-react";
import { hoverLift, staggerContainer, staggerItem } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/format";
import { categoryImageUrl } from "@/lib/data/catalog";
import { CATEGORIES, type CategoryIcon } from "@/lib/data/categories";

/**
 * "Shop by category" grid. The grid itself is the stagger list; each card nests
 * a hover-lift layer inside the staggered <li> so the reveal variants
 * (hidden/visible) never collide with the hover variants (rest/hover).
 *
 * Layout is reserved by the grid + fixed card padding, so the reveal is pure
 * transform/opacity and contributes no CLS.
 */

const ICON_BY_KEY: Record<CategoryIcon, LucideIcon> = {
  laptop: Laptop,
  monitor: Monitor,
  cpu: Cpu,
  keyboard: Keyboard,
  mouse: Mouse,
  headphones: Headphones,
  armchair: Armchair,
  "hard-drive": HardDrive,
};

export function CategoryCards() {
  const { variants } = useReducedMotion();

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="mb-10 sm:mb-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Shop by category
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Find your edge
        </h2>
      </div>

      <motion.ul
        variants={variants(staggerContainer)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        {CATEGORIES.map((category) => {
          const Icon = ICON_BY_KEY[category.icon];

          return (
            <motion.li key={category.slug} variants={variants(staggerItem)}>
              <motion.div
                variants={variants(hoverLift)}
                initial="rest"
                whileHover="hover"
                whileFocus="hover"
              >
                <Link
                  href={`/products?category=${category.slug}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <img
                    src={categoryImageUrl(category.slug)}
                    alt={`${category.name} gear`}
                    loading="lazy"
                    decoding="async"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                  />

                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-background/60 to-background/30"
                  />

                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-50 mix-blend-multiply",
                      category.gradient,
                    )}
                  />

                  <ArrowUpRight
                    aria-hidden
                    className="absolute right-4 top-4 size-4 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />

                  <span className="relative grid size-10 place-items-center rounded-md bg-secondary text-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>

                  <span className="relative mt-4 font-medium text-foreground">
                    {category.name}
                  </span>
                  <span className="relative mt-1 text-sm text-muted-foreground">
                    {category.tagline}
                  </span>
                  <span className="relative mt-3 text-xs text-muted-foreground">
                    {formatCompact(category.itemCount)} products
                  </span>
                </Link>
              </motion.div>
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
}
