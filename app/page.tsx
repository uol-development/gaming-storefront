import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Premium Gaming Gear",
};

/**
 * Placeholder home route. Exists so the shell renders and the sticky
 * blur-on-scroll header has content to scroll over. Phase 2 replaces this with
 * the real hero, category cards, product grid, flash deals, and newsletter.
 */
export default function HomePage() {
  return (
    <>
      <section className="relative mx-auto flex min-h-[88dvh] max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-8">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Phase 1 · Foundation
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          The motion foundation is live.
        </h1>
        <p className="mt-5 max-w-prose text-balance text-base text-muted-foreground sm:text-lg">
          Sticky blur-on-scroll header, mega menu, mobile drawer, and the shared
          variants + reduced-motion library are wired up. Scroll to watch the
          header background fade in — opacity only, zero layout shift.
        </p>
      </section>

      {/* Filler so the page scrolls; remove when Phase 2 lands. */}
      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-24 sm:px-6 lg:px-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-64 rounded-2xl border border-border/60 bg-card"
            aria-hidden
          />
        ))}
      </section>
    </>
  );
}
