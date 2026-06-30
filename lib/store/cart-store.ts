import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Cart store. Persisted to localStorage so the cart survives a refresh (e.g. on
 * /checkout). `skipHydration` keeps SSR/static-export output deterministic
 * (server + first client render both start empty); `Providers` calls
 * `useCartStore.persist.rehydrate()` in an effect after mount to avoid any
 * hydration mismatch.
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

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      addItem: (productId, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((line) => line.productId === productId);
          if (existing) {
            return {
              lines: state.lines.map((line) =>
                line.productId === productId
                  ? { ...line, quantity: line.quantity + quantity }
                  : line,
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
    }),
    {
      name: "nexus-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
      skipHydration: true,
    },
  ),
);

/** Total item count for the header badge (subscribe to the number, not the array). */
export const useCartCount = () =>
  useCartStore((state) => state.lines.reduce((total, line) => total + line.quantity, 0));

/** Quantity of a single product currently in the cart (0 if absent). */
export const useCartQuantity = (productId: string) =>
  useCartStore((state) => state.lines.find((line) => line.productId === productId)?.quantity ?? 0);
