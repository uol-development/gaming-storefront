"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { Check, Heart, Star, X } from "lucide-react";
import { backdrop, crossfade, modalPanel } from "@/lib/animations/variants";
import { SPRING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";
import { discountPercent, formatCompact, formatPrice } from "@/lib/format";
import { getProductById, productGallery, productGradient } from "@/lib/data/catalog";
import { type Product } from "@/lib/data/products";
import { useQuickViewStore } from "@/lib/store/quick-view-store";
import { useWishlistStore, useIsWishlisted } from "@/lib/store/wishlist-store";
import { useAddToCart } from "@/lib/hooks/use-add-to-cart";

/**
 * Global quick-view modal. A single instance is mounted near the root; any card
 * opens it by id via the quick-view store. The gallery is intentionally
 * self-contained (no shared ProductGallery import) so this stays a single leaf.
 *
 * Focus model is pragmatic for now: we move focus to the close button on open
 * and close on Escape / backdrop click. Phase 4 layers a full focus trap on top.
 */
export function QuickView() {
  const productId = useQuickViewStore((state) => state.productId);
  const close = useQuickViewStore((state) => state.close);
  const product = productId ? getProductById(productId) : undefined;

  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const mediaRef = useRef<HTMLDivElement | null>(null);

  const { prefersReduced, variants } = useReducedMotion();
  const addToCart = useAddToCart();
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const wishlisted = useIsWishlisted(product?.id ?? "");

  const [selected, setSelected] = useState(0);
  const [added, setAdded] = useState(false);

  const open = product !== undefined;

  // Reset the active gallery view + the "added" flash each time a product opens.
  useEffect(() => {
    setSelected(0);
    setAdded(false);
  }, [productId]);

  // Lock body scroll + wire Escape while the modal is open; restore on cleanup.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);

    // Move focus to the close control once the panel is mounted.
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  function handleAddToCart(): void {
    if (!product) return;
    const rect = mediaRef.current?.getBoundingClientRect();
    addToCart(
      product.id,
      rect ? { rect, gradient: productGradient(product) } : undefined,
    );
    setAdded(true);
  }

  return (
    <AnimatePresence>
      {product ? (
        <QuickViewContent
          key={product.id}
          product={product}
          titleId={titleId}
          selected={selected}
          onSelect={setSelected}
          added={added}
          wishlisted={wishlisted}
          onToggleWishlist={() => toggleWishlist(product.id)}
          onAddToCart={handleAddToCart}
          onClose={close}
          closeRef={closeRef}
          mediaRef={mediaRef}
          prefersReduced={prefersReduced}
          backdropVariants={variants(backdrop)}
          panelVariants={variants(modalPanel)}
          crossfadeVariants={variants(crossfade)}
        />
      ) : null}
    </AnimatePresence>
  );
}

function QuickViewContent({
  product,
  titleId,
  selected,
  onSelect,
  added,
  wishlisted,
  onToggleWishlist,
  onAddToCart,
  onClose,
  closeRef,
  mediaRef,
  prefersReduced,
  backdropVariants,
  panelVariants,
  crossfadeVariants,
}: {
  product: Product;
  titleId: string;
  selected: number;
  onSelect: (index: number) => void;
  added: boolean;
  wishlisted: boolean;
  onToggleWishlist: () => void;
  onAddToCart: () => void;
  onClose: () => void;
  closeRef: RefObject<HTMLButtonElement | null>;
  mediaRef: RefObject<HTMLDivElement | null>;
  prefersReduced: boolean;
  backdropVariants: Variants;
  panelVariants: Variants;
  crossfadeVariants: Variants;
}) {
  const gallery = productGallery(product);
  // noUncheckedIndexedAccess: clamp + guard so the active view is always defined.
  const activeIndex = selected >= 0 && selected < gallery.length ? selected : 0;
  const activeView = gallery[activeIndex];
  const activeGradient = activeView?.gradient ?? productGradient(product);

  const { compareAtPrice } = product;
  const discount =
    compareAtPrice !== undefined ? discountPercent(product.price, compareAtPrice) : 0;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      {/* Backdrop — opacity only; clicking it dismisses. */}
      <motion.div
        aria-hidden
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      {/* Panel */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative max-w-3xl w-full rounded-2xl border border-border bg-popover p-5 shadow-2xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" aria-hidden />
        </button>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* LEFT — self-contained compact gallery. */}
          <div className="space-y-3">
            <div
              ref={mediaRef}
              className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeIndex}
                  variants={crossfadeVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className={cn(
                    "grid h-full w-full place-items-center bg-gradient-to-br",
                    activeGradient,
                  )}
                >
                  <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground/50">
                    {activeView?.label ?? product.name}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex gap-2">
              {gallery.map((view, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={view.id}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`View ${view.label}`}
                    onClick={() => onSelect(index)}
                    className={cn(
                      "relative aspect-square w-full overflow-hidden rounded-md border bg-gradient-to-br transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      view.gradient,
                      isActive
                        ? "border-primary ring-1 ring-primary"
                        : "border-border hover:border-foreground/30",
                    )}
                  >
                    <span className="sr-only">{view.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT — details. */}
          <div className="flex flex-col">
            <p className="text-xs text-muted-foreground">{product.brand}</p>
            <h2
              id={titleId}
              className="mt-1 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl"
            >
              {product.name}
            </h2>

            <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
              <span className="font-medium text-foreground">{product.rating}</span>
              <span>({formatCompact(product.reviews)} reviews)</span>
            </div>

            <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-lg font-semibold text-foreground">
                {formatPrice(product.price)}
              </span>
              {compareAtPrice !== undefined ? (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(compareAtPrice)}
                </span>
              ) : null}
              {discount > 0 ? (
                <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                  {discount}% off
                </span>
              ) : null}
            </div>

            {product.specs.length > 0 ? (
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                {product.specs.map((spec) => (
                  <li key={spec} className="flex items-start gap-2">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span>{spec}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={onAddToCart}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {added ? (
                  <>
                    <Check className="size-4" aria-hidden />
                    Added to cart
                  </>
                ) : (
                  "Add to cart"
                )}
              </button>

              <button
                type="button"
                aria-pressed={wishlisted}
                aria-label={
                  wishlisted
                    ? `Remove ${product.name} from wishlist`
                    : `Add ${product.name} to wishlist`
                }
                onClick={onToggleWishlist}
                className="grid size-11 shrink-0 place-items-center rounded-md border border-border text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <motion.span
                  initial={false}
                  animate={prefersReduced ? undefined : { scale: wishlisted ? 1.15 : 1 }}
                  transition={prefersReduced ? undefined : SPRING.snappy}
                  className="grid place-items-center"
                >
                  <Heart
                    className={cn(
                      "size-5 transition-colors",
                      wishlisted ? "fill-primary text-primary" : "fill-transparent",
                    )}
                    aria-hidden
                  />
                </motion.span>
              </button>
            </div>

            <Link
              href={`/products/${product.slug}`}
              onClick={onClose}
              className="mt-3 inline-flex h-10 items-center justify-center rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              View full details
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
