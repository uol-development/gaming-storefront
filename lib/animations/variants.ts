import type { Transition, Variants } from "motion/react";
import { DURATION, EASE, SPRING } from "./tokens";

/**
 * Shared Motion variants. Every animated component pulls from here so variant
 * objects are never duplicated inline across the app (CLAUDE.md rule 3).
 *
 * Invariant: variants animate ONLY `opacity` and `transform` channels
 * (x / y / scale) — never width/height/top/left — so nothing triggers layout.
 */

const enter: Transition = { duration: DURATION.base, ease: EASE.emphasized };
const leave: Transition = { duration: DURATION.fast, ease: EASE.exit };

/** Pure cross-fade. Safe for reduced-motion as-is. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: enter },
  exit: { opacity: 0, transition: leave },
};

/** Fade + rise. The default "reveal" for content blocks and grid items. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: enter },
  exit: { opacity: 0, y: 12, transition: leave },
};

/** Fade + descend — for elements anchored to the top (dropdowns, banners). */
export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -24 },
  visible: { opacity: 1, y: 0, transition: enter },
  exit: { opacity: 0, y: -12, transition: leave },
};

/** Spring scale-in for cards, badges, popovers. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: SPRING.soft },
  exit: { opacity: 0, scale: 0.98, transition: leave },
};

/** Orchestrator: stagger children on enter, reverse-stagger on exit. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
  exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
};

/** Child paired with `staggerContainer`. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: enter },
  exit: { opacity: 0, y: 8, transition: leave },
};

/** Mega-menu panel — small descend + scale from its top edge. */
export const megaMenu: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.fast, ease: EASE.emphasized },
  },
  exit: { opacity: 0, y: 4, scale: 0.99, transition: { duration: 0.15, ease: EASE.exit } },
};

/** Right-side drawer panel — slides on the GPU-friendly `x` transform only. */
export const drawerPanel: Variants = {
  hidden: { x: "100%" },
  visible: { x: 0, transition: SPRING.snappy },
  exit: { x: "100%", transition: { duration: DURATION.base, ease: EASE.exit } },
};

/** Dimming backdrop for drawers/modals. */
export const backdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.fast } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

/* ------------------------------------------------------------------ *
 * Phase 2 — Landing/Home
 * ------------------------------------------------------------------ */

/** Card lift on hover/focus. Pair with `whileHover="hover"` / `whileFocus="hover"`. */
export const hoverLift: Variants = {
  rest: { y: 0 },
  hover: { y: -6, transition: SPRING.soft },
};

/** Media zoom inside a clipped frame — pair with a parent `overflow-hidden`. */
export const mediaZoom: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.06, transition: { duration: DURATION.slow, ease: EASE.emphasized } },
};

/** Horizontal shake for inline validation errors (reused by auth in Phase 4). */
export const shake: Variants = {
  idle: { x: 0 },
  error: { x: [0, -8, 8, -6, 6, -3, 3, 0], transition: { duration: 0.45, ease: EASE.standard } },
};

/** Single countdown digit rolling over — transform/opacity only. */
export const countdownTick: Variants = {
  initial: { opacity: 0, y: "-45%" },
  animate: { opacity: 1, y: "0%", transition: { duration: DURATION.fast, ease: EASE.emphasized } },
  exit: { opacity: 0, y: "45%", transition: { duration: DURATION.fast, ease: EASE.exit } },
};

/* ------------------------------------------------------------------ *
 * Phase 3 — Product card + Product detail page
 * ------------------------------------------------------------------ */

/** Centered dialog / quick-view panel. */
export const modalPanel: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE.emphasized },
  },
  exit: { opacity: 0, scale: 0.98, y: 8, transition: { duration: DURATION.fast, ease: EASE.exit } },
};

/** Crossfade for swapping the gallery's active image (paired with AnimatePresence). */
export const crossfade: Variants = {
  enter: { opacity: 0, scale: 1.03 },
  center: { opacity: 1, scale: 1, transition: { duration: DURATION.base, ease: EASE.emphasized } },
  exit: { opacity: 0, scale: 1, transition: { duration: DURATION.fast, ease: EASE.exit } },
};

/** Accordion panel inner reveal — sibling reposition is done with Motion `layout`. */
export const accordionContent: Variants = {
  hidden: { opacity: 0, y: -4 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.fast, ease: EASE.emphasized } },
  exit: { opacity: 0, y: -4, transition: { duration: DURATION.fast, ease: EASE.exit } },
};

/** Quick "pop" for a value change (quantity stepper, in-cart confirmation). */
export const popKey: Variants = {
  initial: { opacity: 0, scale: 0.6, y: 4 },
  animate: { opacity: 1, scale: 1, y: 0, transition: SPRING.snappy },
  exit: { opacity: 0, scale: 0.6, y: -4, transition: { duration: DURATION.fast, ease: EASE.exit } },
};
