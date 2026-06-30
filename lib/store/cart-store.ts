import { create } from "zustand";

/**
 * Minimal cart store — Phase 1 only needs an item count for the header badge.
 * Pricing, line mutations, and the cart drawer arrive in Phase 3/4.
 */
export interface CartLine {
  productId: string;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
}

export const useCartStore = create<CartState>(() => ({
  lines: [],
}));

/**
 * Derived selector. Subscribing to the computed number (not the array) keeps the
 * header badge from re-rendering on unrelated line edits.
 */
export const useCartCount = () =>
  useCartStore((state) => state.lines.reduce((total, line) => total + line.quantity, 0));
