"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import type { SpecGroup } from "@/lib/data/catalog";
import { accordionContent } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * PDP specification accordion.
 *
 * Each group is a `motion.div` with `layout` (off under reduced motion) so the
 * siblings reposition on the compositor via transform when a panel expands —
 * we never animate height. The first group is open by default. The panel reveal
 * runs through the shared `accordionContent` variant, which `variants()` strips
 * to an instant opacity fade when the user prefers reduced motion.
 */
export function SpecAccordion({ groups }: { groups: SpecGroup[] }) {
  const { prefersReduced, variants } = useReducedMotion();
  const firstHeading = groups[0]?.heading;
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(firstHeading ? [firstHeading] : []),
  );

  const toggle = (heading: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(heading)) next.delete(heading);
      else next.add(heading);
      return next;
    });
  };

  if (groups.length === 0) return null;

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {groups.map((group) => (
        <AccordionGroup
          key={group.heading}
          group={group}
          isOpen={open.has(group.heading)}
          onToggle={() => toggle(group.heading)}
          prefersReduced={prefersReduced}
          panelVariants={variants(accordionContent)}
        />
      ))}
    </div>
  );
}

function AccordionGroup({
  group,
  isOpen,
  onToggle,
  prefersReduced,
  panelVariants,
}: {
  group: SpecGroup;
  isOpen: boolean;
  onToggle: () => void;
  prefersReduced: boolean;
  panelVariants: ReturnType<ReturnType<typeof useReducedMotion>["variants"]>;
}) {
  const panelId = useId();

  return (
    <motion.div layout={!prefersReduced} className="bg-card">
      <h3 className="m-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <span>{group.heading}</span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out",
              isOpen && "rotate-180",
            )}
          />
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="px-4 pb-3"
          >
            <dl className="m-0">
              {group.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between gap-4 py-1.5 text-sm"
                >
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="m-0 text-right font-medium text-foreground">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
