"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPRING } from "@/lib/animations/tokens";
import { megaMenu } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import type { NavItem } from "./nav-config";

interface DesktopNavProps {
  items: NavItem[];
  className?: string;
}

/**
 * Desktop primary nav. The active-link indicator is a single `layoutId` element
 * that slides between links via the GPU (transform), and each mega menu mounts
 * through `AnimatePresence` so it gets a real exit animation. Hover + focus +
 * Escape all drive one `openIndex` so keyboard and pointer behave identically.
 */
export function DesktopNav({ items, className }: DesktopNavProps) {
  const pathname = usePathname();
  const { prefersReduced } = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const isActive = useCallback(
    (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href)),
    [pathname],
  );

  return (
    <nav
      aria-label="Primary"
      className={cn("relative items-center gap-1", className)}
      onMouseLeave={() => setOpenIndex(null)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpenIndex(null);
      }}
    >
      {items.map((item, index) => {
        const active = isActive(item.href);
        const hasMenu = Boolean(item.columns?.length);
        const open = openIndex === index;

        return (
          <div
            key={item.href}
            className="relative"
            onMouseEnter={() => setOpenIndex(hasMenu ? index : null)}
          >
            <Link
              href={item.href}
              aria-haspopup={hasMenu || undefined}
              aria-expanded={hasMenu ? open : undefined}
              onFocus={() => setOpenIndex(hasMenu ? index : null)}
              className={cn(
                "relative flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-foreground" : "text-foreground/70 hover:text-foreground",
              )}
            >
              {item.label}
              {hasMenu && (
                <ChevronDown
                  aria-hidden
                  className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
                />
              )}
              {active && (
                <motion.span
                  aria-hidden
                  // Drop the shared layoutId under reduced motion so the marker
                  // snaps to the active link instead of sliding.
                  layoutId={prefersReduced ? undefined : "nav-active-underline"}
                  transition={SPRING.snappy}
                  className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary"
                />
              )}
            </Link>

            {hasMenu && (
              <AnimatePresence>
                {open && (
                  <motion.div
                    role="region"
                    aria-label={`${item.label} categories`}
                    variants={prefersReduced ? undefined : megaMenu}
                    initial={prefersReduced ? { opacity: 0 } : "hidden"}
                    animate={prefersReduced ? { opacity: 1 } : "visible"}
                    exit={prefersReduced ? { opacity: 0 } : "exit"}
                    className="absolute left-0 top-full z-40 mt-2 w-[min(92vw,42rem)] origin-top rounded-xl border border-border/70 bg-popover/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl"
                  >
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                      {item.columns?.map((column) => (
                        <div key={column.heading}>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {column.heading}
                          </p>
                          <ul className="space-y-0.5">
                            {column.items.map((leaf) => (
                              <li key={leaf.href}>
                                <Link
                                  href={leaf.href}
                                  className="block rounded-md px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  {leaf.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        );
      })}
    </nav>
  );
}
