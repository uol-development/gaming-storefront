import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

/**
 * GitHub Pages serves this repo from the `/gaming-storefront` subpath as plain
 * static files, so the Pages build switches on static export, the subpath
 * basePath, and unoptimized images. Local dev and any Node host (e.g. Vercel)
 * leave these off and keep full SSR for later phases — gated by the
 * GITHUB_PAGES env flag the Pages workflow sets.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // Pages has no image-optimization server.
    unoptimized: isGithubPages,
  },
  experimental: {
    // Tree-shake icon/animation barrels so initial motion JS stays minimal.
    optimizePackageImports: ["lucide-react", "motion"],
  },
  // Security headers on every response. Source-restricting CSP directives
  // (script-src/connect-src/…) are intentionally omitted — those need per-request
  // nonces to avoid breaking Next/Supabase/YouTube/Unsplash — but anti-clickjacking,
  // no-plugin, no-base-tag-injection, and transport hardening are applied.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
    ];
  },
  ...(isGithubPages
    ? { output: "export", basePath: "/gaming-storefront", trailingSlash: true }
    : {}),
};

export default nextConfig;
