"use client";

import { useMemo } from "react";
import {
  useReducedMotion as useMotionPreference,
  type TargetAndTransition,
  type Variants,
} from "motion/react";

/**
 * Single global reduced-motion authority (CLAUDE.md rule 4).
 *
 * When the user prefers reduced motion, `variants()` strips every transform
 * channel (x/y/scale/rotate/skew) and forces instant transitions, leaving an
 * opacity-only fade. Components stay declarative — they pass their full variants
 * through this helper and never branch on the preference themselves.
 */

const TRANSFORM_KEYS = new Set<string>([
  "x",
  "y",
  "z",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "skew",
  "skewX",
  "skewY",
]);

function stripTransforms(state: TargetAndTransition): TargetAndTransition {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) {
    if (TRANSFORM_KEYS.has(key) || key === "transition") continue;
    out[key] = value;
  }
  out.transition = { duration: 0 };
  return out as unknown as TargetAndTransition;
}

function toReducedVariants(variants: Variants): Variants {
  const reduced: Variants = {};
  for (const [name, def] of Object.entries(variants)) {
    // Dynamic (function) variants are passed through untouched.
    reduced[name] = typeof def === "function" ? def : stripTransforms(def as TargetAndTransition);
  }
  return reduced;
}

export interface ReducedMotionApi {
  /** True when the OS/user requests reduced motion. */
  prefersReduced: boolean;
  /** Returns opacity-only variants when reduced motion is on, else the originals. */
  variants: (full: Variants) => Variants;
}

export function useReducedMotion(): ReducedMotionApi {
  const prefersReduced = useMotionPreference() ?? false;

  return useMemo<ReducedMotionApi>(
    () => ({
      prefersReduced,
      variants: (full) => (prefersReduced ? toReducedVariants(full) : full),
    }),
    [prefersReduced],
  );
}
