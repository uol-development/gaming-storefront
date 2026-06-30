"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Heart, Search, ShoppingCart } from "lucide-react";
import { EASE, SPRING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { useCartCount } from "@/lib/store/cart-store";
import { useWishlistCount } from "@/lib/store/wishlist-store";
import { CART_FLY_TARGET_ID } from "@/components/cart/fly-to-cart-layer";
import { DesktopNav } from "./desktop-nav";
import { MobileNav } from "./mobile-nav";
import { NAV_ITEMS } from "./nav-config";

/**
 * Sticky header with blur-on-scroll. The blurred background is a SEPARATE
 * absolutely-positioned layer whose `opacity` we animate — we never animate
 * `backdrop-filter`/`background` directly, so the effect stays on the
 * compositor and the header floats transparently over the hero at the top.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const { prefersReduced } = useReducedMotion();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    const next = y > 12;
    // Only flip state on threshold crossings — avoids per-frame re-renders.
    setScrolled((prev) => (prev === next ? prev : next));
  });

  return (
    <header className="sticky top-0 z-50">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 border-b border-border/60 bg-background/70 backdrop-blur-xl"
        initial={false}
        animate={{ opacity: scrolled ? 1 : 0 }}
        transition={{ duration: prefersReduced ? 0 : 0.25, ease: EASE.standard }}
      />

      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:h-18 lg:px-8">
        <Link
          href="/"
          aria-label="NEXUS home"
          className="flex shrink-0 items-center gap-2 rounded-md font-display text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            N
          </span>
          <span className="hidden sm:inline">NEXUS</span>
        </Link>

        <DesktopNav items={NAV_ITEMS} className="ml-2 hidden lg:flex" />

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <IconLink label="Search" href="/search">
            <Search className="size-5" aria-hidden />
          </IconLink>
          <WishlistButton />
          <CartButton />
          <MobileNav items={NAV_ITEMS} className="ml-1 lg:hidden" />
        </div>
      </div>
    </header>
  );
}

function CartButton() {
  const count = useCartCount();
  return (
    <IconLink label="Cart" href="/cart" count={count} id={CART_FLY_TARGET_ID}>
      <ShoppingCart className="size-5" aria-hidden />
    </IconLink>
  );
}

function WishlistButton() {
  const count = useWishlistCount();
  return (
    <IconLink label="Wishlist" href="/wishlist" count={count}>
      <Heart className="size-5" aria-hidden />
    </IconLink>
  );
}

function IconLink({
  label,
  href,
  count,
  id,
  children,
}: {
  label: string;
  href: string;
  count?: number;
  id?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      id={id}
      aria-label={count ? `${label}, ${count} item${count === 1 ? "" : "s"}` : label}
      className="relative grid size-10 place-items-center rounded-md text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <CountBadge count={count} />
    </Link>
  );
}

/** Count badge that springs in/out — communicates cart/wishlist state changes. */
function CountBadge({ count }: { count?: number }) {
  const { prefersReduced } = useReducedMotion();
  const hidden = prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.4 };

  return (
    <AnimatePresence>
      {!!count && (
        <motion.span
          key="badge"
          aria-hidden
          initial={hidden}
          animate={{ opacity: 1, scale: 1 }}
          exit={hidden}
          transition={SPRING.snappy}
          className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
        >
          {count > 9 ? "9+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
