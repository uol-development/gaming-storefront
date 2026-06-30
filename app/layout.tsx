import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/layout/site-header";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://nexus.example.com"),
  title: {
    default: "NEXUS — Premium Gaming Gear",
    template: "%s · NEXUS",
  },
  description:
    "Gaming laptops, custom PCs, GPUs, monitors, and pro peripherals — engineered for performance, delivered fast.",
};

export const viewport: Viewport = {
  themeColor: "#15141c",
  colorScheme: "dark",
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
        <Providers>
          <a
            href="#main"
            className="sr-only z-[100] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
          >
            Skip to content
          </a>
          <SiteHeader />
          <main id="main">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
