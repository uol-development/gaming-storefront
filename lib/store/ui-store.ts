import { create } from "zustand";

export type AuthMode = "login" | "register";

/**
 * Transient UI overlays (drawers / modals / overlay search). Opening any one
 * closes the others so overlays never stack. No persistence by design.
 */
interface UiState {
  isMobileNavOpen: boolean;
  isCartOpen: boolean;
  isSearchOpen: boolean;
  isAuthOpen: boolean;
  authMode: AuthMode;

  openMobileNav: () => void;
  closeMobileNav: () => void;
  openCart: () => void;
  closeCart: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  openAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;
  setAuthMode: (mode: AuthMode) => void;
}

const ALL_CLOSED = {
  isMobileNavOpen: false,
  isCartOpen: false,
  isSearchOpen: false,
  isAuthOpen: false,
} as const;

export const useUiStore = create<UiState>((set) => ({
  ...ALL_CLOSED,
  authMode: "login",

  openMobileNav: () => set({ ...ALL_CLOSED, isMobileNavOpen: true }),
  closeMobileNav: () => set({ isMobileNavOpen: false }),
  openCart: () => set({ ...ALL_CLOSED, isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
  openSearch: () => set({ ...ALL_CLOSED, isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
  openAuth: (mode = "login") => set({ ...ALL_CLOSED, isAuthOpen: true, authMode: mode }),
  closeAuth: () => set({ isAuthOpen: false }),
  setAuthMode: (mode) => set({ authMode: mode }),
}));
