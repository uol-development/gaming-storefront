import { create } from "zustand";

/**
 * Wishlist store. Phase 3 promotes the per-card local toggle to a single shared
 * store so the heart state is consistent across cards, quick view, the PDP, and
 * the header badge.
 */
interface WishlistState {
  ids: string[];
  toggle: (id: string) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
}

export const useWishlistStore = create<WishlistState>((set) => ({
  ids: [],
  toggle: (id) =>
    set((state) => ({
      ids: state.ids.includes(id) ? state.ids.filter((existing) => existing !== id) : [...state.ids, id],
    })),
  add: (id) => set((state) => (state.ids.includes(id) ? state : { ids: [...state.ids, id] })),
  remove: (id) => set((state) => ({ ids: state.ids.filter((existing) => existing !== id) })),
}));

export const useWishlistCount = () => useWishlistStore((state) => state.ids.length);

/** Whether a single product is wishlisted (subscribe to the boolean). */
export const useIsWishlisted = (id: string) =>
  useWishlistStore((state) => state.ids.includes(id));
