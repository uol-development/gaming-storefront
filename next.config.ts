import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

// Host of the Supabase project (for storage image URLs), derived from the env.
const supabaseHost = (() => {
  try {
    const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return raw ? new URL(raw).hostname : undefined;
  } catch {
    return undefined;
  }
})();

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
    // Allowlist only the hosts we actually load images from — stops the
    // /_next/image optimizer being usable as an open proxy / SSRF + DoS surface
    // (was hostname:"**"). The storefront uses <img>, so this can't break rendering.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost }] : []),
    ],
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
