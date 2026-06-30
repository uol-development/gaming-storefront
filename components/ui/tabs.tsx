"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { SPRING } from "@/lib/animations/tokens";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

/**
 * Accessible tab bar with a sliding active indicator.
 *
 * - Renders ONLY the tablist; consumers render panels keyed by `value`.
 * - The active pill slides between tabs via a shared `layoutId` so Motion
 *   interpolates its position with a transform (no width/height animation, no
 *   layout shift). When the user prefers reduced motion we drop the `layoutId`
 *   so the indicator snaps instantly.
 * - Roving tabIndex: the active tab is the only tab in the page tab order;
 *   ArrowLeft/ArrowRight move selection across tabs and wrap at the ends.
 */
export function Tabs({ items, value, onValueChange, className }: TabsProps) {
  const { prefersReduced } = useReducedMotion();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = items.findIndex((item) => item.value === value);

  const focusTab = useCallback((index: number) => {
    buttonRefs.current[index]?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (items.length === 0) return;

      let nextIndex: number | null = null;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          nextIndex = (index + 1) % items.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          nextIndex = (index - 1 + items.length) % items.length;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = items.length - 1;
          break;
        default:
          return;
      }

      if (nextIndex === null) return;
      event.preventDefault();

      const nextItem = items[nextIndex];
      if (!nextItem) return;

      onValueChange(nextItem.value);
      focusTab(nextIndex);
    },
    [items, onValueChange, focusTab],
  );

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-border bg-secondary/50 p-1",
        className,
      )}
    >
      {items.map((item, index) => {
        const isActive = item.value === value;
        // Roving tabIndex: if nothing matches `value`, the first tab is the
        // entry point so keyboard users never land on a -1 set.
        const isTabStop = activeIndex === -1 ? index === 0 : isActive;

        return (
          <button
            key={item.value}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`ui-tab-${item.value}`}
            aria-selected={isActive}
            aria-controls={`ui-tabpanel-${item.value}`}
            tabIndex={isTabStop ? 0 : -1}
            onClick={() => onValueChange(item.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isActive ? (
              <motion.span
                aria-hidden
                layoutId={prefersReduced ? undefined : "ui-tabs-indicator"}
                transition={prefersReduced ? { duration: 0 } : SPRING.snappy}
                className="absolute inset-0 -z-0 rounded-lg border border-border bg-card shadow-sm"
              />
            ) : null}
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
