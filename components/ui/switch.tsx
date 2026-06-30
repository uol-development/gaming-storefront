"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { SPRING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Animated toggle. A single `role="switch"` button whose thumb slides on the
 * `x` transform only (GPU-friendly, zero layout). When the user prefers reduced
 * motion the thumb snaps instantly (no transition) — the bespoke transform is
 * gated off per CLAUDE.md rule 4.
 *
 * The optional label is rendered beside the control and associated via `htmlFor`
 * so the switch stays a single focusable button (no nested interactive elements,
 * no layout shift — both track and thumb are fixed-size).
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  id,
  disabled = false,
  className,
}: SwitchProps) {
  const { prefersReduced } = useReducedMotion();
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const labelId = label !== undefined ? `${switchId}-label` : undefined;

  const control = (
    <button
      id={switchId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label === undefined ? "Toggle" : undefined}
      aria-labelledby={labelId}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted",
        label === undefined ? className : undefined,
      )}
    >
      <motion.span
        aria-hidden
        initial={false}
        animate={{ x: checked ? 22 : 2 }}
        transition={prefersReduced ? { duration: 0 } : SPRING.snappy}
        className="size-5 rounded-full bg-background shadow"
      />
    </button>
  );

  if (label === undefined) {
    return control;
  }

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      {control}
      <label
        id={labelId}
        htmlFor={switchId}
        className={cn(
          "select-none text-sm font-medium text-foreground",
          disabled ? "pointer-events-none opacity-50" : "cursor-pointer",
        )}
      >
        {label}
      </label>
    </div>
  );
}
