"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, PackageOpen, Plus, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import { backdrop, drawerPanel, popKey, scaleIn } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { productGradient, productImageUrl } from "@/lib/data/catalog";
import { getStoreProductsByIdsAction } from "@/lib/data/store-actions";
import type { Product } from "@/lib/data/products";
import { useUiStore } from "@/lib/store/ui-store";
import { useCartStore } from "@/lib/store/cart-store";

interface ResolvedLine {
  product: Product;
  quantity: number;
}

/**
 * Global cart drawer. Mirrors the mobile-nav overlay pattern: the panel slides on
 * the GPU-friendly `x` transform (drawerPanel) and the backdrop fades on opacity,
 * both wrapped in a single AnimatePresence-tracked motion.div so the exit plays.
 *
 * Body scroll is locked while open, Escape dismisses, and focus moves to the close
 * button on open (pragmatic focus model — a full trap is a later a11y pass).
 * Reduced motion swaps the slide for an opacity fade and strips item layout/exit
 * transforms and the quantity pop.
 */
export function CartDrawer() {
  const open = useUiStore((s) => s.isCartOpen);
  const close = useUiStore((s) => s.closeCart);
  const lines = useCartStore((s) => s.lines);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const { prefersReduced, variants } = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Live products resolved by id from the DB, keyed by product id.
  const [productMap, setProductMap] = useState<Record<string, Product>>({});
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  // Batch-resolve the cart lines to live products. Keyed on the set of ids so it
  // re-runs only when the cart contents change. A `cancelled` flag drops stale
  // responses (e.g. quick edits) so we never apply an out-of-date map.
  const lineIds = lines.map((line) => line.productId).join(",");
  useEffect(() => {
    const ids = lineIds ? lineIds.split(",") : [];
    if (ids.length === 0) {
      setProductMap({});
      setResolving(false);
      return;
    }

    let cancelled = false;
    setResolving(true);
    getStoreProductsByIdsAction(ids)
      .then((products) => {
        if (cancelled) return;
        const next: Record<string, Product> = {};
        for (const product of products) next[product.id] = product;
        setProductMap(next);
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lineIds]);

  // Resolve each line to a live product (skip ids not yet resolved / no longer
  // in the catalog), preserving cart order.
  const resolved: ResolvedLine[] = lines.reduce<ResolvedLine[]>((acc, line) => {
    const product = productMap[line.productId];
    if (product) acc.push({ product, quantity: line.quantity });
    return acc;
  }, []);

  // Lines exist but none have resolved yet -> first load of the DB products.
  const isLoading = resolving && resolved.length === 0 && lines.length > 0;

  // While the first resolve is in flight, fall back to the raw cart quantity so
  // the header doesn't flash "0 items" before the products load in.
  const itemCount = isLoading
    ? lines.reduce((total, line) => total + line.quantity, 0)
    : resolved.reduce((total, { quantity }) => total + quantity, 0);
  const subtotal = resolved.reduce(
    (total, { product, quantity }) => total + product.price * quantity,
    0,
  );
  const hasItems = resolved.length > 0;

  return (
    <AnimatePresence>
      {open && (
        // Tracked by AnimatePresence so unmount defers until backdrop + panel exit.
        <motion.div key="cart" className="fixed inset-0 z-[70]">
          <motion.div
            className="absolute inset-0 bg-black/60"
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={close}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            variants={prefersReduced ? undefined : drawerPanel}
            initial={prefersReduced ? { opacity: 0 } : "hidden"}
            animate={prefersReduced ? { opacity: 1 } : "visible"}
            exit={prefersReduced ? { opacity: 0 } : "exit"}
            className="absolute right-0 top-0 flex h-dvh w-[min(92vw,28rem)] flex-col border-l border-border bg-background shadow-2xl"
          >
            {/* HEADER */}
            <div className="flex h-16 items-center justify-between gap-3 border-b border-border/60 px-4">
              <div className="flex items-baseline gap-2">
                <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                  Your cart
                </h2>
                <span className="text-sm text-muted-foreground">
                  {itemCount === 1 ? "1 item" : `${itemCount} items`}
                </span>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close cart"
                className="grid size-10 place-items-center rounded-md text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {isLoading ? (
                <ul className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="Loading cart">
                  {lines.map((line) => (
                    <li
                      key={line.productId}
                      className="flex animate-pulse gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <div className="size-16 shrink-0 rounded-lg border border-border bg-secondary" />
                      <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
                        <div className="h-4 w-3/4 rounded bg-secondary" />
                        <div className="h-3 w-1/3 rounded bg-secondary" />
                        <div className="mt-auto h-8 w-24 rounded bg-secondary" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : hasItems ? (
                <ul className="flex flex-col gap-3 p-4">
                  <AnimatePresence initial={false}>
                    {resolved.map(({ product, quantity }) => (
                      <motion.li
                        key={product.id}
                        layout={!prefersReduced}
                        exit={prefersReduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
                        className="flex gap-3 rounded-xl border border-border bg-card p-3"
                      >
                        {/* Thumbnail — fixed size, no CLS. Image over gradient fallback. */}
                        <div
                          className={cn(
                            "relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-gradient-to-br",
                            productGradient(product),
                          )}
                        >
                          <img
                            src={productImageUrl(product, 160)}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link
                                href={`/products/${product.slug}`}
                                onClick={close}
                                className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <span className="block line-clamp-1 text-sm font-medium text-foreground hover:text-primary">
                                  {product.name}
                                </span>
                              </Link>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {formatPrice(product.price)} each
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(product.id)}
                              aria-label={`Remove ${product.name} from cart`}
                              className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </button>
                          </div>

                          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                            <QuantityStepper
                              productName={product.name}
                              quantity={quantity}
                              prefersReduced={prefersReduced}
                              onDecrement={() => setQuantity(product.id, quantity - 1)}
                              onIncrement={() => setQuantity(product.id, quantity + 1)}
                            />
                            <span className="text-sm font-semibold text-foreground">
                              {formatPrice(product.price * quantity)}
                            </span>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                  <motion.div
                    variants={variants(scaleIn)}
                    initial="hidden"
                    animate="visible"
                    className="grid size-20 place-items-center rounded-full border border-border bg-secondary text-muted-foreground"
                  >
                    <ShoppingBag className="size-8" aria-hidden />
                  </motion.div>
                  <div className="space-y-1">
                    <p className="font-display text-base font-semibold text-foreground">
                      Your cart is empty
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Find your next upgrade and it will show up here.
                    </p>
                  </div>
                  <Link
                    href="/products"
                    onClick={close}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <PackageOpen className="size-4" aria-hidden />
                    Browse products
                  </Link>
                </div>
              )}
            </div>

            {/* FOOTER */}
            {hasItems ? (
              <div className="border-t border-border/60 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-display text-lg font-bold text-foreground">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Shipping and taxes calculated at checkout.
                </p>

                <Link
                  href="/checkout"
                  onClick={close}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Checkout
                </Link>
                <button
                  type="button"
                  onClick={close}
                  className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Continue shopping
                </button>

                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Truck className="size-3.5" aria-hidden />
                  Free shipping on all orders.
                </p>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function QuantityStepper({
  productName,
  quantity,
  prefersReduced,
  onDecrement,
  onIncrement,
}: {
  productName: string;
  quantity: number;
  prefersReduced: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-border">
      <button
        type="button"
        onClick={onDecrement}
        aria-label={
          quantity <= 1
            ? `Remove ${productName} from cart`
            : `Decrease quantity of ${productName}`
        }
        className="grid size-8 place-items-center rounded-l-md text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <Minus className="size-3.5" aria-hidden />
      </button>

      <span
        aria-live="polite"
        className="grid h-8 w-9 place-items-center overflow-hidden text-sm font-medium tabular-nums text-foreground"
      >
        {prefersReduced ? (
          <span>{quantity}</span>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={quantity}
              variants={popKey}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {quantity}
            </motion.span>
          </AnimatePresence>
        )}
      </span>

      <button
        type="button"
        onClick={onIncrement}
        aria-label={`Increase quantity of ${productName}`}
        className="grid size-8 place-items-center rounded-r-md text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
