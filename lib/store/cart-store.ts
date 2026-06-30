import { create } from "zustand";

/**
 * Cart store. Phase 3 adds real line mutations so add-to-cart updates the header
 * badge and drives the fly animation. Persistence + the cart drawer arrive in
 * Phase 4 (kept in-memory here to avoid SSR/hydration handling for now).
 */
export interface CartLine {
  productId: string;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  lines: [],
  addItem: (productId, quantity = 1) =>
    set((state) => {
      const existing = state.lines.find((line) => line.productId === productId);
      if (existing) {
        return {
          lines: state.lines.map((line) =>
            line.productId === productId ? { ...line, quantity: line.quantity + quantity } : line,
          ),
        };
      }
      return { lines: [...state.lines, { productId, quantity }] };
    }),
  removeItem: (productId) =>
    set((state) => ({ lines: state.lines.filter((line) => line.productId !== productId) })),
  setQuantity: (productId, quantity) =>
    set((state) => ({
      lines:
        quantity <= 0
          ? state.lines.filter((line) => line.productId !== productId)
          : state.lines.map((line) =>
              line.productId === productId ? { ...line, quantity } : line,
            ),
    })),
  clear: () => set({ lines: [] }),
}));

/** Total item count for the header badge (subscribe to the number, not the array). */
export const useCartCount = () =>
  useCartStore((state) => state.lines.reduce((total, line) => total + line.quantity, 0));

/** Quantity of a single product currently in the cart (0 if absent). */
export const useCartQuantity = (productId: string) =>
  useCartStore(
    (state) => state.lines.find((line) => line.productId === productId)?.quantity ?? 0,
  );
