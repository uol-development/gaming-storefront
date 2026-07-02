import Link from "next/link";
import { Facebook, Instagram, Music2, Twitter, Youtube, type LucideIcon } from "lucide-react";
import { getStoreSettings } from "@/lib/data/settings-read";
import { enabledPaymentMethods } from "@/lib/data/settings";

/**
 * Site footer. A server-rendered surface (zero JS shipped) that now reads live
 * store settings: brand name/tagline, social links, contact, and the accepted
 * payment badges all come from admin-configured settings (with safe defaults).
 * Every internal link follows the no-404 convention; social links render only
 * when configured. Layout is a fixed grid that collapses to one column on
 * mobile, so nothing reflows after hydration (no CLS).
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

const LEGAL_LINKS: FooterLink[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/cookies" },
];

const PAYMENT_BADGE_LABELS: Record<string, string[]> = {
  cod: ["Cash on Delivery"],
  bkash: ["bKash"],
  nagad: ["Nagad"],
  rocket: ["Rocket"],
  card: ["Visa", "Mastercard"],
};

const linkClass =
  "rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const isHttp = (url: string): boolean => /^https?:\/\//i.test(url.trim());

export async function Footer() {
  const settings = await getStoreSettings();
  const { store, social } = settings;

  const socials: { label: string; href: string; icon: LucideIcon }[] = [
    { label: `${store.name} on Facebook`, href: social.facebook, icon: Facebook },
    { label: `${store.name} on Instagram`, href: social.instagram, icon: Instagram },
    { label: `${store.name} on YouTube`, href: social.youtube, icon: Youtube },
    { label: `${store.name} on TikTok`, href: social.tiktok, icon: Music2 },
    { label: `${store.name} on X`, href: social.x, icon: Twitter },
  ].filter((s) => isHttp(s.href));

  const paymentBadges = Array.from(
    new Set(enabledPaymentMethods(settings).flatMap((m) => PAYMENT_BADGE_LABELS[m] ?? [])),
  );

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand block */}
          <div className="lg:col-span-4">
            <Link
              href="/"
              aria-label={`${store.name} home`}
              className="inline-flex items-center gap-2 rounded-md font-display text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
                {store.name.charAt(0).toUpperCase() || "N"}
              </span>
              <span>{store.name}</span>
            </Link>

            <p className="mt-4 max-w-xs text-sm text-muted-foreground">{store.tagline}</p>

            {store.supportEmail || store.supportPhone ? (
              <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                {store.supportEmail ? (
                  <li>
                    <a href={`mailto:${store.supportEmail}`} className={linkClass}>
                      {store.supportEmail}
                    </a>
                  </li>
                ) : null}
                {store.supportPhone ? (
                  <li>
                    <a href={`tel:${store.supportPhone.replace(/\s+/g, "")}`} className={linkClass}>
                      {store.supportPhone}
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : null}

            {socials.length > 0 ? (
              <ul className="mt-6 flex items-center gap-2">
                {socials.map(({ label, href, icon: Icon }) => (
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
            ) : null}
          </div>

          {/* Link columns */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
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
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {store.name}. All rights reserved.
            </p>
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

          {paymentBadges.length > 0 ? (
            <ul aria-label="Accepted payment methods" className="flex flex-wrap items-center gap-2">
              {paymentBadges.map((method) => (
                <li
                  key={method}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground"
                >
                  {method}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
