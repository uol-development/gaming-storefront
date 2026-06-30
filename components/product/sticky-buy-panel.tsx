"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";
import { popKey } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";
import { discountPercent, formatPrice, stockStatus, type StockTone } from "@/lib/format";
import type { Product } from "@/lib/data/products";
import { productGradient } from "@/lib/data/catalog";
import { useIsWishlisted, useWishlistStore } from "@/lib/store/wishlist-store";
import { useAddToCart } from "@/lib/hooks/use-add-to-cart";

interface StickyBuyPanelProps {
  product: Product;
}

const ADDED_FEEDBACK_MS = 1100;
const MAX_QUANTITY = 99;

const STOCK_DOT: Record<StockTone, string> = {
  in: "bg-emerald-400",
  low: "bg-amber-400",
  out: "bg-muted-foreground",
};

const STOCK_TEXT: Record<StockTone, string> = {
  in: "text-emerald-400",
  low: "text-amber-400",
  out: "text-muted-foreground",
};

/**
 * PDP purchase panel. Renders two coordinated surfaces — a desktop sticky card
 * and a fixed mobile bar — sharing the same quantity state and handlers. The
 * desktop swatch is the fly-to-cart source; the cart store updates instantly and
 * the global fly chip is the confirmation (we never render the chip here).
 */
export function StickyBuyPanel({ product }: StickyBuyPanelProps) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const router = useRouter();
  const { prefersReduced } = useReducedMotion();
  const addToCart = useAddToCart();
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const wishlisted = useIsWishlisted(product.id);

  const swatchRef = useRef<HTMLSpanElement | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gradient = productGradient(product);
  const hasDiscount =
    typeof product.compareAtPrice === "number" && product.compareAtPrice > product.price;
  const discount = hasDiscount ? discountPercent(product.price, product.compareAtPrice ?? 0) : 0;

  const status = stockStatus(product.stock);
  const outOfStock = product.stock === 0;

  useEffect(() => {
    return () => {
      if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);
    };
  }, []);

  const decrease = useCallback(() => {
    setQuantity((current) => Math.max(1, current - 1));
  }, []);

  const increase = useCallback(() => {
    setQuantity((current) => Math.min(MAX_QUANTITY, current + 1));
  }, []);

  const handleAdd = useCallback(() => {
    if (outOfStock) return;
    const rect = swatchRef.current?.getBoundingClientRect();
    addToCart(product.id, rect ? { rect, gradient } : undefined, quantity);

    setAdded(true);
    if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => {
      setAdded(false);
      feedbackTimer.current = null;
    }, ADDED_FEEDBACK_MS);
  }, [addToCart, gradient, outOfStock, product.id, quantity]);

  const handleBuyNow = useCallback(() => {
    if (outOfStock) return;
    addToCart(product.id, undefined, quantity);
    router.push("/checkout");
  }, [addToCart, outOfStock, product.id, quantity, router]);

  return (
    <>
      {/* (a) DESKTOP sticky card --------------------------------------------------- */}
      <div className="hidden lg:block sticky top-24 rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span
            ref={swatchRef}
            aria-hidden
            className={cn(
              "size-11 shrink-0 rounded-xl border border-border/60 bg-gradient-to-br",
              gradient,
            )}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {formatPrice(product.price)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.compareAtPrice ?? 0)}
                </span>
              )}
              {discount > 0 && (
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
                  -{discount}%
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {product.brand}
            </p>
          </div>
        </div>

        <AvailabilityRow status={status} />

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">Quantity</span>
          <Stepper
            quantity={quantity}
            onDecrease={decrease}
            onIncrease={increase}
            prefersReduced={prefersReduced}
          />
        </div>

        <AddToCartButton
          added={added}
          outOfStock={outOfStock}
          prefersReduced={prefersReduced}
          onClick={handleAdd}
        />

        <button
          type="button"
          onClick={handleBuyNow}
          disabled={outOfStock}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
        >
          <Zap className="size-4" aria-hidden />
          {outOfStock ? "Out of stock" : "Buy now"}
        </button>

        <button
          type="button"
          aria-pressed={wishlisted}
          onClick={() => toggleWishlist(product.id)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <WishlistHeart active={wishlisted} prefersReduced={prefersReduced} />
          {wishlisted ? "Saved to wishlist" : "Add to wishlist"}
        </button>

        <ul className="grid gap-2 border-t border-border pt-4">
          <TrustRow icon={<Truck className="size-4" aria-hidden />} label="Free 2-day shipping" />
          <TrustRow icon={<RotateCcw className="size-4" aria-hidden />} label="30-day returns" />
          <TrustRow
            icon={<ShieldCheck className="size-4" aria-hidden />}
            label="2-yr warranty"
          />
        </ul>
      </div>

      {/* (b) MOBILE bar ------------------------------------------------------------ */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-base font-bold leading-tight tracking-tight text-foreground">
            {formatPrice(product.price)}
          </span>
          {hasDiscount ? (
            <span className="text-xs text-muted-foreground line-through leading-tight">
              {formatPrice(product.compareAtPrice ?? 0)}
            </span>
          ) : (
            <AvailabilityRow status={status} compact />
          )}
        </div>

        <Stepper
          compact
          quantity={quantity}
          onDecrease={decrease}
          onIncrease={increase}
          prefersReduced={prefersReduced}
        />

        <AddToCartButton
          added={added}
          outOfStock={outOfStock}
          prefersReduced={prefersReduced}
          onClick={handleAdd}
          className="ml-auto flex-1 px-3"
        />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Availability row (dot + label)
 * ------------------------------------------------------------------ */

function AvailabilityRow({
  status,
  compact = false,
}: {
  status: { tone: StockTone; label: string };
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", compact ? "leading-tight" : "")}>
      <span
        aria-hidden
        className={cn("inline-block size-2 shrink-0 rounded-full", STOCK_DOT[status.tone])}
      />
      <span
        className={cn(
          "font-medium",
          compact ? "text-xs" : "text-sm",
          STOCK_TEXT[status.tone],
        )}
      >
        {status.label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Quantity stepper
 * ------------------------------------------------------------------ */

interface StepperProps {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  prefersReduced: boolean;
  compact?: boolean;
}

function Stepper({ quantity, onDecrease, onIncrease, prefersReduced, compact = false }: StepperProps) {
  return (
    <div className="flex items-center rounded-xl border border-border bg-background">
      <StepperButton
        label="Decrease quantity"
        onClick={onDecrease}
        disabled={quantity <= 1}
        compact={compact}
      >
        <Minus className="size-4" aria-hidden />
      </StepperButton>

      <div
        aria-live="polite"
        className={cn(
          "relative grid place-items-center overflow-hidden text-center text-sm font-semibold tabular-nums text-foreground",
          compact ? "h-9 w-9" : "h-10 w-12",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={quantity}
            variants={prefersReduced ? undefined : popKey}
            initial={prefersReduced ? false : "initial"}
            animate={prefersReduced ? undefined : "animate"}
            exit={prefersReduced ? undefined : "exit"}
            className="col-start-1 row-start-1"
          >
            {quantity}
          </motion.span>
        </AnimatePresence>
      </div>

      <StepperButton
        label="Increase quantity"
        onClick={onIncrease}
        disabled={quantity >= MAX_QUANTITY}
        compact={compact}
      >
        <Plus className="size-4" aria-hidden />
      </StepperButton>
    </div>
  );
}

interface StepperButtonProps {
  label: string;
  onClick: () => void;
  disabled: boolean;
  compact: boolean;
  children: React.ReactNode;
}

function StepperButton({ label, onClick, disabled, compact, children }: StepperButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid place-items-center rounded-xl text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
        compact ? "size-9" : "size-10",
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Add-to-cart button with "Added" feedback
 * ------------------------------------------------------------------ */

interface AddToCartButtonProps {
  added: boolean;
  outOfStock: boolean;
  prefersReduced: boolean;
  onClick: () => void;
  className?: string;
}

function AddToCartButton({ added, outOfStock, prefersReduced, onClick, className }: AddToCartButtonProps) {
  if (outOfStock) {
    return (
      <button
        type="button"
        disabled
        aria-disabled
        className={cn(
          "grid h-11 place-items-center rounded-xl bg-secondary px-4 text-sm font-semibold text-muted-foreground lg:w-full",
          "cursor-not-allowed",
          className,
        )}
      >
        Out of stock
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative grid h-11 place-items-center overflow-hidden rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-full",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {added ? (
          <motion.span
            key="added"
            variants={prefersReduced ? undefined : popKey}
            initial={prefersReduced ? false : "initial"}
            animate={prefersReduced ? undefined : "animate"}
            exit={prefersReduced ? undefined : "exit"}
            className="col-start-1 row-start-1 flex items-center gap-1.5"
          >
            <Check className="size-4" aria-hidden />
            Added
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            variants={prefersReduced ? undefined : popKey}
            initial={prefersReduced ? false : "initial"}
            animate={prefersReduced ? undefined : "animate"}
            exit={prefersReduced ? undefined : "exit"}
            className="col-start-1 row-start-1"
          >
            Add to cart
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Wishlist heart (bespoke pop — gated off when reduced motion)
 * ------------------------------------------------------------------ */

function WishlistHeart({ active, prefersReduced }: { active: boolean; prefersReduced: boolean }) {
  return (
    <motion.span
      aria-hidden
      className="inline-flex"
      animate={prefersReduced ? undefined : { scale: active ? [1, 1.3, 1] : 1 }}
      transition={prefersReduced ? undefined : { duration: 0.32, ease: "easeOut" }}
    >
      <Heart
        className={cn(
          "size-4 transition-colors",
          active ? "fill-primary text-primary" : "text-foreground",
        )}
        aria-hidden
      />
    </motion.span>
  );
}

/* ------------------------------------------------------------------ *
 * Trust row
 * ------------------------------------------------------------------ */

function TrustRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="shrink-0 text-foreground/70">{icon}</span>
      {label}
    </li>
  );
}
