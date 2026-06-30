"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { backdrop, drawerPanel, staggerContainer, staggerItem } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { useUiStore } from "@/lib/store/ui-store";
import type { NavItem } from "./nav-config";

interface MobileNavProps {
  items: NavItem[];
  className?: string;
}

/**
 * Mobile drawer. The panel slides on `x` (transform) and the backdrop fades on
 * `opacity` — both compositor-only. `AnimatePresence` gives the panel a genuine
 * exit, and body scroll is locked while open. Submenus reposition siblings with
 * Motion `layout` (transform) instead of animating height, so no layout thrash.
 *
 * Note: this ships a pragmatic focus model (focus close on open, Escape/backdrop
 * to dismiss). Swap in a full focus trap (e.g. Radix Dialog) in Phase 4.
 */
export function MobileNav({ items, className }: MobileNavProps) {
  const open = useUiStore((state) => state.isMobileNavOpen);
  const openNav = useUiStore((state) => state.openMobileNav);
  const closeNav = useUiStore((state) => state.closeMobileNav);
  const { prefersReduced } = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNav();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeNav]);

  return (
    <>
      <button
        type="button"
        onClick={openNav}
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "grid size-10 place-items-center rounded-md text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <Menu className="size-5" aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          // Tracked by AnimatePresence so it defers unmount until the backdrop
          // and panel finish their exit animations.
          <motion.div key="mobile-drawer" className="fixed inset-0 z-[60] lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/60"
              variants={backdrop}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={closeNav}
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              variants={prefersReduced ? undefined : drawerPanel}
              initial={prefersReduced ? { opacity: 0 } : "hidden"}
              animate={prefersReduced ? { opacity: 1 } : "visible"}
              exit={prefersReduced ? { opacity: 0 } : "exit"}
              className="absolute right-0 top-0 flex h-dvh w-[min(86vw,22rem)] flex-col border-l border-border/70 bg-background shadow-2xl"
            >
              <div className="flex h-16 items-center justify-between border-b border-border/60 px-4">
                <span className="font-display text-lg font-bold tracking-tight">NEXUS</span>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={closeNav}
                  aria-label="Close menu"
                  className="grid size-10 place-items-center rounded-md text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>

              <nav aria-label="Mobile" className="flex-1 overflow-y-auto overscroll-contain p-2">
                {items.map((item) => (
                  <MobileNavItem key={item.href} item={item} onNavigate={closeNav} />
                ))}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MobileNavItem({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const { prefersReduced } = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const hasMenu = Boolean(item.columns?.length);

  if (!hasMenu) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className="block rounded-md px-3 py-3 text-base font-medium text-foreground/90 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {item.label}
      </Link>
    );
  }

  return (
    <motion.div layout={!prefersReduced} className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between rounded-md px-3 py-3 text-base font-medium text-foreground/90 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {item.label}
        <ChevronDown
          aria-hidden
          className={cn("size-5 transition-transform duration-200", expanded && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ul
            id={panelId}
            variants={prefersReduced ? undefined : staggerContainer}
            initial={prefersReduced ? { opacity: 0 } : "hidden"}
            animate={prefersReduced ? { opacity: 1 } : "visible"}
            exit={prefersReduced ? { opacity: 0 } : "exit"}
            className="space-y-0.5 pb-2 pl-3"
          >
            {item.columns
              ?.flatMap((column) => column.items)
              .map((leaf) => (
                <motion.li key={leaf.href} variants={prefersReduced ? undefined : staggerItem}>
                  <Link
                    href={leaf.href}
                    onClick={onNavigate}
                    className="block rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {leaf.label}
                  </Link>
                </motion.li>
              ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
