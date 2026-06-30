import { create } from "zustand";

/**
 * Drives the global quick-view modal. Any product card can open it by id; the
 * single `<QuickView />` mounted near the root reads the active product.
 */
interface QuickViewState {
  productId: string | null;
  open: (productId: string) => void;
  close: () => void;
}

export const useQuickViewStore = create<QuickViewState>((set) => ({
  productId: null,
  open: (productId) => set({ productId }),
  close: () => set({ productId: null }),
}));
