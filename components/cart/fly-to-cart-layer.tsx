"use client";

import { motion } from "motion/react";
import { useFlyToCartStore } from "@/lib/store/fly-to-cart-store";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";

/** The header cart icon tags itself with this id so flights know where to land. */
export const CART_FLY_TARGET_ID = "cart-fly-target";

/**
 * Global overlay that animates a small chip from each launched source to the
 * header cart icon. Only `x/y/scale/opacity` animate (compositor-only); the chip
 * has a fixed pixel size and shrinks via `scale`, never width/height. Under
 * reduced motion nothing renders — the cart still updated instantly in the hook.
 */
export function FlyToCartLayer() {
  const flights = useFlyToCartStore((state) => state.flights);
  const land = useFlyToCartStore((state) => state.land);
  const { prefersReduced } = useReducedMotion();

  if (prefersReduced || flights.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[80]">
      {flights.map((flight) => {
        const target =
          typeof document !== "undefined" ? document.getElementById(CART_FLY_TARGET_ID) : null;
        const rect = target?.getBoundingClientRect();
        const toX = rect ? rect.left + rect.width / 2 : flight.fromX;
        const toY = rect ? rect.top + rect.height / 2 : flight.fromY - 240;
        const half = flight.size / 2;
        const startX = flight.fromX - half;
        const startY = flight.fromY - half;
        const endX = toX - half;
        const endY = toY - half;
        // Lift the midpoint above both endpoints for an arc toward the cart.
        const arcY = Math.min(startY, endY) - 64;

        return (
          <motion.div
            key={flight.id}
            className={cn(
              "absolute left-0 top-0 bg-gradient-to-br shadow-lg shadow-primary/40 ring-1 ring-white/10",
              flight.gradient,
            )}
            style={{ width: flight.size, height: flight.size, borderRadius: 16 }}
            initial={{ x: startX, y: startY, scale: 1, opacity: 1 }}
            animate={{
              x: [startX, (startX + endX) / 2, endX],
              y: [startY, arcY, endY],
              scale: [1, 0.6, 0.22],
              opacity: [1, 1, 0.15],
            }}
            transition={{ duration: 0.75, ease: "easeInOut", times: [0, 0.5, 1] }}
            onAnimationComplete={() => land(flight.id)}
          />
        );
      })}
    </div>
  );
}
