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
  ...(isGithubPages
    ? { output: "export", basePath: "/gaming-storefront", trailingSlash: true }
    : {}),
};

export default nextConfig;
