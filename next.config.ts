import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // AVIF/WebP keep product imagery light so hero/grid reveals never trade
    // perf for polish. Lock `remotePatterns` to real CDNs before launch.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    // Tree-shake icon/animation barrels so initial motion JS stays minimal.
    optimizePackageImports: ["lucide-react", "motion"],
  },
};

export default nextConfig;
