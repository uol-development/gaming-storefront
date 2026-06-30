import { cn } from "@/lib/utils";

/**
 * Fixed-height fallback for code-split home sections.
 *
 * Rendered by `next/dynamic`'s `loading` while a below-the-fold section chunk
 * streams in. Its only job is to RESERVE the section's vertical space so the
 * real component swaps in without shifting the page (CLS approximately 0) — so
 * the caller MUST pass an explicit height via `className` (e.g. "h-[480px]").
 *
 * Purely presentational and inert: aria-hidden, non-interactive, and excluded
 * from the accessibility tree. A faint pulse hints that content is loading
 * without implying any specific layout.
 */
export function SectionSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20"
    >
      <div
        className={cn(
          "w-full animate-pulse rounded-2xl border border-border bg-card/40",
          className,
        )}
      />
    </div>
  );
}
