"use client";

import { useCallback } from "react";
import { useCartStore } from "@/lib/store/cart-store";
import { useFlyToCartStore } from "@/lib/store/fly-to-cart-store";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";

export interface FlySource {
  /** Bounding rect of the element the chip should fly from (e.g. the media frame). */
  rect: DOMRect;
  /** Tailwind gradient classes for the flying chip. */
  gradient: string;
}

/**
 * Adds a product to the cart and (unless reduced motion) launches a fly-to-cart
 * animation from the given source rect. The cart always updates instantly; the
 * flight is purely the visual confirmation.
 */
export function useAddToCart() {
  const addItem = useCartStore((state) => state.addItem);
  const launch = useFlyToCartStore((state) => state.launch);
  const { prefersReduced } = useReducedMotion();

  return useCallback(
    (productId: string, source?: FlySource, quantity = 1) => {
      addItem(productId, quantity);
      if (prefersReduced || !source) return;
      launch({
        fromX: source.rect.left + source.rect.width / 2,
        fromY: source.rect.top + source.rect.height / 2,
        size: Math.min(source.rect.width, source.rect.height, 112),
        gradient: source.gradient,
      });
    },
    [addItem, launch, prefersReduced],
  );
}
