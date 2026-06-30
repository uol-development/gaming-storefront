"use client";

import { useCallback, useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { accordionContent } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Generalized, controlled-internally accordion. Sibling reflow when a panel
 * opens/closes is handled by Motion `layout` (a transform) — we NEVER animate
 * height. The panel's inner reveal uses the shared `accordionContent` variant,
 * which `variants()` strips to an opacity-only fade under reduced motion.
 */

export interface AccordionItemData {
  value: string;
  trigger: React.ReactNode;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItemData[];
  type?: "single" | "multiple";
  defaultValue?: string[];
  className?: string;
}

export function Accordion({
  items,
  type = "single",
  defaultValue,
  className,
}: AccordionProps) {
  const { prefersReduced, variants } = useReducedMotion();
  const baseId = useId();

  const [open, setOpen] = useState<Set<string>>(() => {
    const initial = new Set<string>(defaultValue ?? []);
    // `single` may only ever hold one open panel — keep the first if multiple
    // values were provided via defaultValue.
    if (type === "single" && initial.size > 1) {
      const first = (defaultValue ?? []).find((value) => initial.has(value));
      return new Set<string>(first !== undefined ? [first] : []);
    }
    return initial;
  });

  const toggle = useCallback(
    (value: string) => {
      setOpen((current) => {
        const next = new Set<string>(current);
        if (next.has(value)) {
          next.delete(value);
          return next;
        }
        if (type === "single") {
          return new Set<string>([value]);
        }
        next.add(value);
        return next;
      });
    },
    [type],
  );

  const panelVariants = variants(accordionContent);

  return (
    <div
      className={cn(
        "divide-y divide-border overflow-hidden rounded-xl border border-border",
        className,
      )}
    >
      {items.map((item, index) => {
        const isOpen = open.has(item.value);
        const triggerId = `${baseId}-trigger-${index}`;
        const panelId = `${baseId}-panel-${index}`;

        return (
          <motion.div key={item.value} layout={!prefersReduced} className="bg-card">
            <h3 className="m-0">
              <button
                type="button"
                id={triggerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.value)}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:text-base"
              >
                <span className="min-w-0">{item.trigger}</span>
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "size-5 shrink-0 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="content"
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  variants={panelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground">
                    {item.content}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
