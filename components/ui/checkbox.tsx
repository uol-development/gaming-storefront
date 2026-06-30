"use client";

import { useCallback, useId } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { SPRING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  /**
   * Accessible name for the control when no visible `label` is rendered. Required
   * in practice whenever `label` is omitted so the `role="checkbox"` is never
   * left without an accessible name (WCAG 4.1.2). Ignored when `label` is set,
   * since the visible label already names the control via `aria-labelledby`.
   */
  "aria-label"?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Animated checkbox. A `role="checkbox"` button holding a fixed size-5 box; the
 * Check icon scales/fades in via AnimatePresence (spring) and out on uncheck. An
 * optional label sits beside it and toggles the same state on click.
 *
 * No CLS: the box reserves its size always and the icon is absolutely centered,
 * so the check appearing/disappearing never reflows anything. Motion is gated to
 * an instant opacity swap when the user prefers reduced motion (the bespoke
 * scale transform is dropped, never re-defined as a shared variant).
 */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  "aria-label": ariaLabel,
  id,
  disabled = false,
  className,
}: CheckboxProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const labelId = `${controlId}-label`;
  const { prefersReduced } = useReducedMotion();

  const toggle = useCallback(() => {
    if (disabled) return;
    onCheckedChange(!checked);
  }, [checked, disabled, onCheckedChange]);

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <button
        id={controlId}
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : ariaLabel}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "relative grid size-5 shrink-0 place-items-center rounded-[6px] border transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-40",
          checked ? "border-primary bg-primary" : "border-border bg-transparent",
        )}
      >
        <AnimatePresence initial={false}>
          {checked ? (
            <motion.span
              key="check"
              aria-hidden
              className="grid place-items-center text-primary-foreground"
              initial={{ scale: prefersReduced ? 1 : 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: prefersReduced ? 1 : 0, opacity: 0 }}
              transition={prefersReduced ? { duration: 0 } : SPRING.snappy}
            >
              <Check className="size-3.5" strokeWidth={3} aria-hidden />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>

      {label ? (
        <label
          id={labelId}
          htmlFor={controlId}
          onClick={(event) => {
            // The wrapping label already forwards activation to the button via
            // htmlFor; guard the disabled case so the click is inert.
            if (disabled) event.preventDefault();
          }}
          className={cn(
            "select-none text-sm text-foreground",
            disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
          )}
        >
          {label}
        </label>
      ) : null}
    </div>
  );
}
