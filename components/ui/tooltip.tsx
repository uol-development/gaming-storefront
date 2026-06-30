"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { tooltip } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

/**
 * Hover/focus tooltip. The wrapper is a relative inline-flex element holding the
 * trigger ({children}) and an absolutely-positioned, CSS-positioned tooltip — no
 * collision library, so nothing measures the DOM and there is no layout shift.
 *
 * Opens on mouseenter/focus of the wrapper, closes on mouseleave/blur, and hides
 * on Escape. The tooltip is pointer-events-none so it never interferes with the
 * trigger's own interactions. Motion is opacity-only when reduced motion is on
 * (the shared `tooltip` object variant is auto-stripped by `variants()`).
 *
 * Accessibility: `aria-describedby` is wired onto the focusable trigger element
 * itself (via cloning a single valid element child), not the wrapper — screen
 * readers announce a description relative to the focused control, so it must live
 * on that control. When the child is not a clonable element we fall back to the
 * wrapper. Focus enter/leave is guarded with `relatedTarget` containment so that
 * moving focus between multiple focusable children does not flicker the tooltip.
 */
const SIDE_CLASS: Record<NonNullable<TooltipProps["side"]>, string> = {
  top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
  bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
  left: "right-full mr-2 top-1/2 -translate-y-1/2",
  right: "left-full ml-2 top-1/2 -translate-y-1/2",
};

/** Props we may merge onto a cloned trigger element. */
type DescribableProps = { "aria-describedby"?: string };

function mergeDescribedBy(
  existing: string | undefined,
  tipId: string,
): string {
  if (!existing) return tipId;
  return existing
    .split(/\s+/)
    .filter(Boolean)
    .includes(tipId)
    ? existing
    : `${existing} ${tipId}`;
}

export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const { variants } = useReducedMotion();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  // Only close when focus actually leaves the wrapper subtree. Moving focus
  // between multiple focusable children keeps `relatedTarget` inside the wrapper,
  // so we do not flicker the tooltip closed/open.
  const onBlur = useCallback((event: FocusEvent<HTMLSpanElement>) => {
    const next = event.relatedTarget;
    const wrapper = wrapperRef.current;
    if (wrapper && next instanceof Node && wrapper.contains(next)) return;
    setOpen(false);
  }, []);

  // Symmetric guard on enter: focus moving in from within the wrapper does not
  // need to re-open (it is already open) and avoids redundant state churn.
  const onFocus = useCallback((event: FocusEvent<HTMLSpanElement>) => {
    const prev = event.relatedTarget;
    const wrapper = wrapperRef.current;
    if (wrapper && prev instanceof Node && wrapper.contains(prev)) return;
    setOpen(true);
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Escape") setOpen(false);
  }, []);

  // Wire `aria-describedby` onto the actual focusable trigger when possible, so
  // assistive tech announces the tooltip relative to the focused control. When
  // open we point the trigger at the live tooltip node; when closed we drop the
  // reference so AT never resolves a non-existent id. If the child is not a
  // single clonable element, the wrapper-level `aria-describedby` is the
  // fallback association.
  const childArray = Children.toArray(children);
  const onlyChild = childArray.length === 1 ? childArray[0] : undefined;
  const canCloneTrigger = onlyChild !== undefined && isValidElement(onlyChild);

  let trigger: React.ReactNode = children;
  if (canCloneTrigger) {
    const element = onlyChild as ReactElement<DescribableProps>;
    const existing = element.props["aria-describedby"];
    trigger = cloneElement(element, {
      "aria-describedby": open ? mergeDescribedBy(existing, tipId) : existing,
    });
  }

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      aria-describedby={!canCloneTrigger && open ? tipId : undefined}
    >
      {trigger}

      <AnimatePresence>
        {open ? (
          <motion.div
            role="tooltip"
            id={tipId}
            variants={variants(tooltip)}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow",
              SIDE_CLASS[side],
              className,
            )}
          >
            {content}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
