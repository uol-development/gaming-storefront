import { create } from "zustand";

/** Minimal wishlist store — header badge count for Phase 1. */
interface WishlistState {
  ids: string[];
}

export const useWishlistStore = create<WishlistState>(() => ({
  ids: [],
}));

export const useWishlistCount = () => useWishlistStore((state) => state.ids.length);
