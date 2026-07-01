"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";
import { safeHref } from "@/lib/data/safe-url";
import { BANNER_BADGE_STYLE } from "@/lib/admin/banners-schema";
import type { StoreBanner } from "@/lib/data/banners";

/**
 * Walmart-style promotional-banner mosaic. A CSS grid places each banner into a
 * cell whose span + shape is driven by `banner.size`; `grid-flow-dense` lets the
 * small tiles backfill the row a large/tall tile leaves open. The grid + fixed
 * aspect ratios (mobile) / auto-rows (desktop) reserve height up front, so the
 * staggered reveal is pure transform/opacity and contributes no CLS.
 */

const SPAN_BY_SIZE: Record<StoreBanner["size"], string> = {
  large: "col-span-2 lg:col-span-2 lg:row-span-2",
  medium: "col-span-2 lg:col-span-2 lg:row-span-1",
  small: "col-span-1 lg:col-span-1 lg:row-span-1",
  tall: "col-span-2 lg:col-span-1 lg:row-span-2",
};

/** Mobile height comes from an aspect ratio; on lg the row-span drives height. */
const ASPECT_BY_SIZE: Record<StoreBanner["size"], string> = {
  large: "aspect-[4/3] lg:aspect-auto lg:h-full",
  medium: "aspect-[2/1] lg:aspect-auto lg:h-full",
  small: "aspect-square lg:aspect-auto lg:h-full",
  tall: "aspect-[3/4] lg:aspect-auto lg:h-full",
};

const HEADING_BY_SIZE: Record<StoreBanner["size"], string> = {
  large: "text-xl sm:text-2xl",
  medium: "text-lg",
  small: "text-base",
  tall: "text-xl sm:text-2xl",
};

function BannerCta({ banner }: { banner: StoreBanner }) {
  // Neutralise any unsafe (javascript:/off-site) link before it becomes an href.
  const href = safeHref(banner.ctaLink);
  if (!href) return null;

  const className =
    "mt-3 inline-flex h-9 w-fit items-center rounded-md bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {banner.ctaText}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={className}
      target={banner.ctaNewTab ? "_blank" : undefined}
      rel={banner.ctaNewTab ? "noopener noreferrer" : undefined}
    >
      {banner.ctaText}
    </a>
  );
}

function BannerCard({ banner }: { banner: StoreBanner }) {
  const showDescription = banner.size !== "small" && banner.description !== "";
  const hasOverlay =
    banner.overlayColor !== undefined && banner.overlayOpacity > 0;

  return (
    <div
      className={cn(
        "relative block overflow-hidden rounded-2xl",
        ASPECT_BY_SIZE[banner.size],
      )}
      style={banner.bgColor ? { backgroundColor: banner.bgColor } : undefined}
    >
      {banner.imageUrl ? (
        banner.imageMobileUrl ? (
          <picture>
            <source media="(max-width: 640px)" srcSet={banner.imageMobileUrl} />
            <img
              src={banner.imageUrl}
              alt={banner.heading || "Promotional banner"}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
        ) : (
          <img
            src={banner.imageUrl}
            alt={banner.heading || "Promotional banner"}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )
      ) : null}

      {hasOverlay ? (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundColor: banner.overlayColor,
            opacity: banner.overlayOpacity / 100,
          }}
        />
      ) : null}

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
      />

      {banner.badge ? (
        <span
          className={cn(
            "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            BANNER_BADGE_STYLE[banner.badge] ?? "bg-secondary text-foreground",
          )}
        >
          {banner.badge}
        </span>
      ) : null}

      <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5">
        {banner.heading ? (
          <h3
            className={cn(
              "font-display font-bold text-white line-clamp-2",
              HEADING_BY_SIZE[banner.size],
            )}
          >
            {banner.heading}
          </h3>
        ) : null}

        {banner.subheading ? (
          <p className="mt-1 text-sm text-white/85 line-clamp-1">
            {banner.subheading}
          </p>
        ) : null}

        {showDescription ? (
          <p className="mt-1 text-xs text-white/75 line-clamp-2">
            {banner.description}
          </p>
        ) : null}

        {banner.ctaText ? <BannerCta banner={banner} /> : null}
      </div>
    </div>
  );
}

export function PromoBanners({ banners }: { banners: StoreBanner[] }) {
  const { variants } = useReducedMotion();

  if (banners.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <h2 className="sr-only">Promotions</h2>

      <motion.ul
        variants={variants(staggerContainer)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:auto-rows-[13rem] lg:grid-flow-dense"
      >
        {banners.map((banner) => (
          <motion.li
            key={banner.id}
            variants={variants(staggerItem)}
            className={SPAN_BY_SIZE[banner.size]}
          >
            <BannerCard banner={banner} />
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
