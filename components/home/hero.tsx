"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { RotateCcw, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { imageUrl, SECTION_IMAGE_IDS } from "@/lib/data/images";
import { cn } from "@/lib/utils";

/**
 * Top-of-page hero. Owns the single page <h1>.
 *
 * The decorative background (atmospheric photo + blurred blobs + grid) lives in
 * an aria-hidden, pointer-events-none layer behind the content. A scroll-linked
 * parallax drifts that layer on the GPU-friendly `y` transform only — and is
 * switched OFF entirely under reduced motion (rendered static, no `style={{ y }}`).
 * Strong dark overlays sit on top of the photo so the headline/CTAs keep high
 * contrast; the photo loads over the existing background so a slow/failed load
 * degrades gracefully with no broken box and no layout shift.
 *
 * Foreground content reveals via the shared stagger variants. Layout reserves a
 * fixed min-height up front so nothing reflows as the content animates in
 * (CLS approximately 0).
 */

interface TrustSignal {
  readonly icon: LucideIcon;
  readonly label: string;
}

const TRUST_SIGNALS: readonly TrustSignal[] = [
  { icon: Truck, label: "Free 2-day shipping" },
  { icon: RotateCcw, label: "30-day returns" },
  { icon: ShieldCheck, label: "Lifetime support" },
];

export function Hero() {
  const { prefersReduced, variants } = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  // Drift the background slightly slower than the page as it scrolls away.
  const y = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[92svh] items-center overflow-hidden"
    >
      {/* Decorative background — never interactive, behind all content. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={prefersReduced ? undefined : { y }}
      >
        {/* Atmospheric hero photo — sits behind the blobs/grid as the base
            layer. The section's background shows through if it loads slowly or
            fails (graceful, no broken box, no CLS). */}
        <img
          src={imageUrl(SECTION_IMAGE_IDS.hero, 1600)}
          alt=""
          aria-hidden
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Strong dark overlays keep the foreground copy/CTAs high-contrast. */}
        <div className="absolute inset-0 bg-background/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />

        {/* Soft blurred radial blobs. */}
        <div className="absolute -left-24 -top-24 size-[36rem] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-32 top-1/4 size-[32rem] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-1/3 size-[28rem] rounded-full bg-primary/10 blur-3xl" />

        {/* Faint grid overlay, masked to fade toward the edges. */}
        <div
          className="absolute inset-0 opacity-[0.18] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] [background-image:linear-gradient(to_right,theme(colors.border)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border)_1px,transparent_1px)] [background-size:56px_56px]"
        />
      </motion.div>

      {/* Foreground content. */}
      <motion.div
        className="mx-auto flex w-full max-w-7xl flex-col items-start px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        variants={variants(staggerContainer)}
        initial="hidden"
        animate="visible"
      >
        <motion.span
          variants={variants(staggerItem)}
          className="text-xs font-semibold uppercase tracking-widest text-primary sm:text-sm"
        >
          New season drop
        </motion.span>

        <motion.h1
          variants={variants(staggerItem)}
          className="mt-4 max-w-4xl font-display text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
        >
          Gear that plays to{" "}
          <span className="text-primary">win</span>.
        </motion.h1>

        <motion.p
          variants={variants(staggerItem)}
          className="mt-6 max-w-prose text-base text-muted-foreground sm:text-lg"
        >
          Precision peripherals, blistering displays, and battle-ready rigs —
          curated for players who refuse to lose to their hardware.
        </motion.p>

        <motion.div
          variants={variants(staggerItem)}
          className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
        >
          <Link
            href="/products?sale=1"
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
          >
            Shop the deals
          </Link>
          <Link
            href="/products?category=desktops"
            className="inline-flex w-full items-center justify-center rounded-md border border-border bg-transparent px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/60 hover:bg-secondary active:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
          >
            Build your PC
          </Link>
        </motion.div>

        <motion.ul
          variants={variants(staggerItem)}
          className="mt-10 flex flex-col gap-x-6 gap-y-3 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center"
        >
          {TRUST_SIGNALS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2">
              <Icon className={cn("size-4 shrink-0 text-primary")} aria-hidden />
              <span>{label}</span>
            </li>
          ))}
        </motion.ul>
      </motion.div>
    </section>
  );
}
