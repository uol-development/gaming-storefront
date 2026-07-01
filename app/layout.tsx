import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/layout/site-header";
import { Footer } from "@/components/layout/footer";
import { ConditionalChrome } from "@/components/layout/conditional-chrome";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = "https://gaming-storefront-eight.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NEXUS — Premium Gaming Gear",
    template: "%s · NEXUS",
  },
  description:
    "Gaming laptops, custom PCs, GPUs, monitors, and pro peripherals — engineered for performance, delivered fast across Bangladesh.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_BD",
    siteName: "NEXUS",
    url: SITE_URL,
    title: "NEXUS — Premium Gaming Gear",
    description:
      "Gaming laptops, custom PCs, GPUs, monitors, and pro peripherals — engineered for performance, delivered fast across Bangladesh.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXUS — Premium Gaming Gear",
    description:
      "Gaming laptops, custom PCs, GPUs, monitors, and pro peripherals — engineered for performance, delivered fast across Bangladesh.",
  },
};

export const viewport: Viewport = {
  themeColor: "#15141c",
  colorScheme: "dark",
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "NEXUS",
      url: SITE_URL,
      description:
        "Premium gaming laptops, custom PCs, GPUs, monitors, and pro peripherals.",
      areaServed: "BD",
      address: {
        "@type": "PostalAddress",
        addressCountry: "BD",
        addressLocality: "Dhaka",
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        telephone: "+880 1712-345678",
        email: "info@ultimateorganiclife.com",
        areaServed: "BD",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "NEXUS",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/products?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // Storefront ships dark-first; `suppressHydrationWarning` covers a future
      // class-based theme toggle without console noise.
      className={`dark ${inter.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <Providers>
          <ConditionalChrome
            header={
              <>
                <a
                  href="#main"
                  className="sr-only z-[100] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
                >
                  Skip to content
                </a>
                <SiteHeader />
              </>
            }
            footer={<Footer />}
          >
            {children}
          </ConditionalChrome>
        </Providers>
      </body>
    </html>
  );
}
