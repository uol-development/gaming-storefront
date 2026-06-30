"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { DURATION, EASE } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";

export interface CheckoutStepperProps {
  steps: string[];
  current: number;
}

/**
 * Horizontal checkout progress. A track line sits behind the step circles with a
 * primary fill that animates on `scaleX` only (origin-left) to the current
 * progress fraction — transform-only, so it never triggers layout. Each circle
 * reflects completed / active / upcoming state; the active step carries
 * `aria-current="step"`. Space is fully reserved so the fill animates with no CLS.
 */
export function CheckoutStepper({ steps, current }: CheckoutStepperProps) {
  const { prefersReduced } = useReducedMotion();

  const stepCount = steps.length;
  // Clamp `current` into the valid index range for state comparisons.
  const activeIndex = Math.min(Math.max(current, 0), Math.max(stepCount - 1, 0));

  // Guard against a single (or empty) step set — no track/fill division by zero.
  const segments = stepCount - 1;
  const progress = segments > 0 ? Math.min(Math.max(activeIndex / segments, 0), 1) : 0;

  return (
    <nav aria-label="Checkout progress">
      <ol className="relative flex items-start justify-between gap-2">
        {/* Track + animated fill — only drawn when there is more than one step.
            Both span the gap between the FIRST and LAST circle centers (size-9 =>
            half = 1.125rem inset on each end) so the fill aligns with the dots. */}
        {segments > 0 ? (
          <div
            aria-hidden
            className="pointer-events-none absolute left-[1.125rem] right-[1.125rem] top-[1.125rem] -translate-y-1/2"
          >
            <div className="relative h-0.5 w-full bg-border">
              <motion.div
                className="absolute inset-0 h-full w-full origin-left bg-primary"
                initial={false}
                animate={{ scaleX: progress }}
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : { duration: DURATION.base, ease: EASE.emphasized }
                }
              />
            </div>
          </div>
        ) : null}

        {steps.map((label, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;

          return (
            <li
              key={`${index}-${label}`}
              className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full bg-background text-sm font-semibold tabular-nums transition-colors",
                  isCompleted && "border-0 bg-primary text-primary-foreground",
                  isActive && "border-2 border-primary text-primary",
                  !isCompleted && !isActive && "border border-border text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <span>{index + 1}</span>
                )}
              </span>

              <span
                {...(isActive ? { "aria-current": "step" as const } : {})}
                className={cn(
                  "max-w-full break-words text-xs leading-tight sm:text-sm",
                  isCompleted || isActive
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
