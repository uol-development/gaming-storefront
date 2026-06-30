/**
 * Category showcase data for the home page. `icon` is a stable key the UI maps
 * to a lucide icon; `gradient` uses Tailwind default-palette utilities for the
 * card wash (the theme tokens stay reserved for text/surfaces).
 */

export type CategoryIcon =
  | "laptop"
  | "monitor"
  | "cpu"
  | "keyboard"
  | "mouse"
  | "headphones"
  | "armchair"
  | "hard-drive";

export interface Category {
  slug: string;
  name: string;
  href: string;
  tagline: string;
  itemCount: number;
  icon: CategoryIcon;
  gradient: string;
}

export const CATEGORIES: Category[] = [
  {
    slug: "laptops",
    name: "Gaming Laptops",
    href: "/laptops",
    tagline: "RTX power, anywhere",
    itemCount: 128,
    icon: "laptop",
    gradient: "from-violet-500/25 to-fuchsia-500/10",
  },
  {
    slug: "desktops",
    name: "Desktops & Rigs",
    href: "/desktops",
    tagline: "Built to dominate",
    itemCount: 86,
    icon: "cpu",
    gradient: "from-cyan-500/25 to-blue-500/10",
  },
  {
    slug: "gpus",
    name: "Graphics Cards",
    href: "/components/gpus",
    tagline: "Frame-rate fuel",
    itemCount: 54,
    icon: "hard-drive",
    gradient: "from-emerald-500/25 to-teal-500/10",
  },
  {
    slug: "monitors",
    name: "Monitors",
    href: "/monitors",
    tagline: "240Hz and beyond",
    itemCount: 73,
    icon: "monitor",
    gradient: "from-orange-500/25 to-amber-500/10",
  },
  {
    slug: "keyboards",
    name: "Keyboards",
    href: "/peripherals/keyboards",
    tagline: "Every keystroke counts",
    itemCount: 112,
    icon: "keyboard",
    gradient: "from-pink-500/25 to-rose-500/10",
  },
  {
    slug: "mice",
    name: "Mice",
    href: "/peripherals/mice",
    tagline: "Pixel-perfect aim",
    itemCount: 95,
    icon: "mouse",
    gradient: "from-sky-500/25 to-indigo-500/10",
  },
  {
    slug: "headsets",
    name: "Headsets",
    href: "/peripherals/headsets",
    tagline: "Hear them coming",
    itemCount: 67,
    icon: "headphones",
    gradient: "from-purple-500/25 to-violet-500/10",
  },
  {
    slug: "chairs",
    name: "Gaming Chairs",
    href: "/chairs",
    tagline: "Comfort for the long haul",
    itemCount: 41,
    icon: "armchair",
    gradient: "from-teal-500/25 to-cyan-500/10",
  },
];
