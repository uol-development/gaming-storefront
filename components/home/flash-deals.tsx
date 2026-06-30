"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Zap } from "lucide-react";
import { staggerContainer, staggerItem, countdownTick } from "@/lib/animations/variants";
import { useReducedMotion } from "@/lib/animations/use-reduced-motion";
import { cn } from "@/lib/utils";
import { formatPrice, discountPercent } from "@/lib/format";
import { FLASH_DEALS, FLASH_SALE_DURATION_HOURS } from "@/lib/data/deals";

/** Stable placeholder shown until the client mounts — keeps SSR === first client render. */
const PLACEHOLDER = "--";

/** Zero-pad a non-negative integer to two characters. */
function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

/**
 * Flash-sale band. The countdown targets `mount time + FLASH_SALE_DURATION_HOURS`
 * (stored in a ref so it survives re-renders without restarting), and each
 * HH:MM:SS digit rolls vertically on change via AnimatePresence — transform +
 * opacity only, inside a fixed-size clipped box so there is zero layout shift.
 */
export function FlashDeals() {
  const { prefersReduced, variants } = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const targetRef = useRef<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    setMounted(true);
    targetRef.current = Date.now() + FLASH_SALE_DURATION_HOURS * 3600 * 1000;

    const tick = () => {
      const target = targetRef.current;
      if (target === null) return;
      setRemaining(Math.max(0, Math.round((target - Date.now()) / 1000)));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  // Before mount, render stable placeholder glyphs so the markup is identical
  // on the server and the first client paint (no hydration mismatch).
  const hh = mounted ? pad2(hours) : PLACEHOLDER;
  const mm = mounted ? pad2(minutes) : PLACEHOLDER;
  const ss = mounted ? pad2(seconds) : PLACEHOLDER;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
              <Zap className="size-4" aria-hidden />
              Flash deals
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Ends soon
            </h2>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="sr-only">Flash sale ending soon</span>
            <DigitGroup value={hh} prefersReduced={prefersReduced} />
            <Separator />
            <DigitGroup value={mm} prefersReduced={prefersReduced} />
            <Separator />
            <DigitGroup value={ss} prefersReduced={prefersReduced} />
          </div>
        </header>

        <motion.ul
          variants={variants(staggerContainer)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        >
          {FLASH_DEALS.map((deal) => {
            const compareAt = deal.compareAtPrice;
            const hasCompare = typeof compareAt === "number" && compareAt > deal.price;
            const percent = hasCompare ? discountPercent(deal.price, compareAt) : 0;

            return (
              <motion.li key={deal.id} variants={variants(staggerItem)}>
                <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50">
                  <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-secondary to-muted">
                    {percent > 0 && (
                      <span className="absolute left-2 top-2 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold leading-none text-primary-foreground">
                        -{percent}%
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {deal.brand}
                    </p>
                    <h3 className="line-clamp-1 text-sm font-medium text-foreground">{deal.name}</h3>
                    <div className="mt-auto flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 pt-1">
                      <span className="text-sm font-bold text-foreground">
                        {formatPrice(deal.price)}
                      </span>
                      {hasCompare && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(compareAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}

/** Static colon separator between digit groups. */
function Separator() {
  return (
    <span aria-hidden className="font-display text-xl font-bold text-muted-foreground sm:text-2xl">
      :
    </span>
  );
}

/**
 * A two-character group (e.g. "07"). Each character lives in its own fixed-size,
 * clipped box; on change the new glyph rolls in while the old rolls out.
 */
function DigitGroup({ value, prefersReduced }: { value: string; prefersReduced: boolean }) {
  const chars = value.split("");
  return (
    <span aria-hidden className="flex gap-1">
      {chars.map((char, index) => (
        <DigitBox key={index} char={char} prefersReduced={prefersReduced} />
      ))}
    </span>
  );
}

/** A single fixed-size digit box. Reserves space up-front so nothing shifts. */
function DigitBox({ char, prefersReduced }: { char: string; prefersReduced: boolean }) {
  const box =
    "relative h-10 w-7 overflow-hidden rounded-md border border-border bg-card font-display text-lg font-bold tabular-nums sm:h-12 sm:w-9 sm:text-xl";

  if (prefersReduced) {
    return <span className={cn(box, "grid place-items-center")}>{char}</span>;
  }

  return (
    <span className={box}>
      <AnimatePresence initial={false}>
        <motion.span
          key={char}
          className="absolute inset-0 grid place-items-center"
          variants={countdownTick}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
