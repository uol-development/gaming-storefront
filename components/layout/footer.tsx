import Link from "next/link";
import { Github, Instagram, Twitch, Twitter, Youtube, type LucideIcon } from "lucide-react";

/**
 * Site footer. A static, server-rendered surface — no client state or motion is
 * needed, so this stays a Server Component (zero JS shipped). Every internal
 * link follows the no-404 convention: category/shop links resolve to the PLP at
 * `/products` with query params it understands; support/company/legal links
 * resolve to real content routes; social links point to external profiles.
 * Layout is a fixed multi-column grid that collapses to a single stacked column
 * on mobile, so nothing reflows after hydration (no CLS).
 */

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

const SHOP_LINKS: FooterColumn = {
  heading: "Shop",
  links: [
    { label: "Laptops", href: "/products?category=laptops" },
    { label: "Desktops", href: "/products?category=desktops" },
    { label: "GPUs", href: "/products?category=gpus" },
    { label: "Monitors", href: "/products?category=monitors" },
    { label: "Peripherals", href: "/products?category=keyboards" },
    { label: "All products", href: "/products" },
    { label: "Deals", href: "/products?sale=1" },
  ],
};

const SUPPORT_LINKS: FooterColumn = {
  heading: "Support",
  links: [
    { label: "Help center", href: "/support" },
    { label: "Shipping", href: "/shipping" },
    { label: "Returns", href: "/returns" },
    { label: "Warranty", href: "/warranty" },
    { label: "Contact", href: "/contact" },
  ],
};

const COMPANY_LINKS: FooterColumn = {
  heading: "Company",
  links: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Blog", href: "/blog" },
    { label: "Sustainability", href: "/about" },
  ],
};

const LINK_COLUMNS: FooterColumn[] = [SHOP_LINKS, SUPPORT_LINKS, COMPANY_LINKS];

const SOCIAL_LINKS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "NEXUS on Twitter", href: "https://twitter.com", icon: Twitter },
  { label: "NEXUS on YouTube", href: "https://www.youtube.com", icon: Youtube },
  { label: "NEXUS on Twitch", href: "https://www.twitch.tv", icon: Twitch },
  { label: "NEXUS on Instagram", href: "https://www.instagram.com", icon: Instagram },
  { label: "NEXUS on GitHub", href: "https://github.com", icon: Github },
];

const LEGAL_LINKS: FooterLink[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/cookies" },
];

const PAYMENT_METHODS = [
  "bKash",
  "Nagad",
  "Rocket",
  "Cash on Delivery",
  "Visa",
  "Mastercard",
] as const;

const linkClass =
  "rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand block */}
          <div className="lg:col-span-4">
            <Link
              href="/"
              aria-label="NEXUS home"
              className="inline-flex items-center gap-2 rounded-md font-display text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
                N
              </span>
              <span>NEXUS</span>
            </Link>

            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Premium gaming gear, hand-picked rigs, and battle-tested peripherals — built for
              players who refuse to lose to their hardware.
            </p>

            <ul className="mt-6 flex items-center gap-2">
              {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon className="size-4" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5"
          >
            {LINK_COLUMNS.map((column) => (
              <div key={column.heading}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {column.heading}
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className={linkClass}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Newsletter prompt */}
          <div className="lg:col-span-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Stay in the game
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Drop sales, restocks, and new arrivals straight into your inbox.
            </p>
            <Link
              href="/#newsletter"
              className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              Subscribe
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-6 border-t border-border pt-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <p className="text-sm text-muted-foreground">&copy; 2026 NEXUS. All rights reserved.</p>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <ul aria-label="Accepted payment methods" className="flex flex-wrap items-center gap-2">
            {PAYMENT_METHODS.map((method) => (
              <li
                key={method}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground"
              >
                {method}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
