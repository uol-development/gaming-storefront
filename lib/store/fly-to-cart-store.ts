import { create } from "zustand";

/**
 * Queue of in-flight "add to cart" animations. A card/PDP launches a flight with
 * the source rect; the global <FlyToCartLayer /> animates a chip from there to
 * the header cart icon and calls `land` when it arrives.
 */
export interface CartFlight {
  id: number;
  fromX: number;
  fromY: number;
  size: number;
  /** Tailwind gradient classes so the flying chip matches the product media. */
  gradient: string;
}

interface FlyToCartState {
  flights: CartFlight[];
  launch: (flight: Omit<CartFlight, "id">) => void;
  land: (id: number) => void;
}

// Module-scoped monotonic id — client-only (flights are never launched on the server).
let nextFlightId = 1;

export const useFlyToCartStore = create<FlyToCartState>((set) => ({
  flights: [],
  launch: (flight) =>
    set((state) => ({ flights: [...state.flights, { ...flight, id: nextFlightId++ }] })),
  land: (id) => set((state) => ({ flights: state.flights.filter((flight) => flight.id !== id) })),
}));
