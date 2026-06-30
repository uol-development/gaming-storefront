import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Raw apostrophes/quotes in JSX text render fine; the rule is noise for content pages.
      "react/no-unescaped-entities": "off",
      // We intentionally use <img> (static export, unoptimized remote CDN — next/image optimization is off).
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
