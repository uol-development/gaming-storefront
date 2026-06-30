import type { Transition } from "motion/react";

/**
 * Single source of truth for motion timing. No magic numbers in components —
 * every duration/easing/spring is named here so the whole storefront animates
 * with one consistent rhythm.
 */

/** Canonical timing scale, in seconds. */
export const DURATION = {
  fast: 0.2,
  base: 0.35,
  slow: 0.5,
} as const;

/**
 * Cubic-bezier curves (Material 3 "emphasized" family). Typed as fixed 4-tuples
 * so they are assignable to Motion's `ease` field under `strict`.
 */
export const EASE: Record<"standard" | "emphasized" | "exit", [number, number, number, number]> = {
  standard: [0.4, 0, 0.2, 1],
  emphasized: [0.2, 0, 0, 1],
  exit: [0.4, 0, 1, 1],
};

/** Reusable spring transitions for gesture/layout motion. */
export const SPRING = {
  soft: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 },
  snappy: { type: "spring", stiffness: 420, damping: 32, mass: 0.8 },
  gentle: { type: "spring", stiffness: 180, damping: 26 },
} as const satisfies Record<string, Transition>;
