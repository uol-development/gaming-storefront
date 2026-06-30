import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Shared shell for static content pages (about, support, legal, etc.) so they
 * stay visually consistent. Server-component friendly. Pass section content as
 * children using <Section>/<Prose> or plain markup.
 */
export function ContentPage({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link
          href="/"
          className="rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Home
        </Link>
        <ChevronRight className="size-4" aria-hidden />
        <span className="text-foreground">{title}</span>
      </nav>

      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {lede ? <p className="mt-4 text-balance text-lg text-muted-foreground">{lede}</p> : null}

      <div className="mt-8 space-y-8">{children}</div>
    </div>
  );
}

/** A titled content block. */
export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold tracking-tight">{heading}</h2>
      <div className="space-y-3 leading-relaxed text-foreground/85">{children}</div>
    </section>
  );
}

/** Consistent paragraph styling for content bodies. */
export function Prose({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed text-foreground/85">{children}</p>;
}
