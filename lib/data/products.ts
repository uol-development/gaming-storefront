/**
 * Mock product catalog for the storefront. Prices are in minor units (cents).
 * Replace with the real API/CMS source (TanStack Query) when the backend lands.
 */

export type ProductBadge = "New" | "Best Seller" | "Limited" | "Sale";

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  reviews: number;
  badge?: ProductBadge;
  /** Short feature bullets. */
  specs: string[];
  /** Marketing description for the PDP / quick view. */
  description: string;
  /** Units available. 0 = out of stock; <= 5 surfaces a "Low stock" warning. */
  stock: number;
  /** Uploaded image URL (DB-backed products). Falls back to a generated image. */
  image?: string;
}

export const FEATURED_PRODUCTS: Product[] = [
  {
    id: "p-001",
    slug: "rog-zephyrus-g16",
    name: "ROG Zephyrus G16",
    brand: "ASUS ROG",
    category: "laptops",
    price: 249900,
    rating: 4.8,
    reviews: 1280,
    badge: "Best Seller",
    specs: ["RTX 5080", '16" OLED 240Hz', "32GB DDR5"],
    description:
      "A 16-inch powerhouse that disappears into your bag at just 1.5kg. The Nebula OLED display pairs a 240Hz refresh with 100% DCI-P3 colour, while the RTX 5080 and Ryzen AI chip chew through AAA titles and creator workloads alike.",
    stock: 12,
  },
  {
    id: "p-002",
    slug: "blade-16-rtx5090",
    name: "Blade 16",
    brand: "Razer",
    category: "laptops",
    price: 349900,
    rating: 4.7,
    reviews: 642,
    badge: "New",
    specs: ["RTX 5090", '16" QHD+ 240Hz', "64GB DDR5"],
    description:
      "Razer's flagship in a CNC-milled aluminium unibody. An RTX 5090 and 64GB of DDR5 drive a dual-mode QHD+ 240Hz panel, with a vapour-chamber cooling system that stays quiet under sustained load.",
    stock: 7,
  },
  {
    id: "p-003",
    slug: "nexus-vortex-5090",
    name: "Vortex Liquid 5090",
    brand: "NEXUS Build",
    category: "desktops",
    price: 419900,
    rating: 4.9,
    reviews: 318,
    badge: "Limited",
    specs: ["RTX 5090", "Ryzen 9 9950X", "360mm AIO"],
    description:
      "Our hand-assembled flagship tower: an RTX 5090 and Ryzen 9 9950X cooled by a 360mm AIO inside a tempered-glass chassis. Cable-managed, stress-tested, and tuned for silent 4K/240 performance out of the box.",
    stock: 4,
  },
  {
    id: "p-004",
    slug: "rtx-5080-founders",
    name: "GeForce RTX 5080 FE",
    brand: "NVIDIA",
    category: "gpus",
    price: 99900,
    rating: 4.6,
    reviews: 2104,
    specs: ["16GB GDDR7", "DLSS 4", "320W TDP"],
    description:
      "The Founders Edition RTX 5080 brings 16GB of GDDR7 and DLSS 4 multi-frame generation in a compact dual-flow-through cooler. Built for high-refresh 4K with the headroom to drive ray-traced worlds.",
    stock: 9,
  },
  {
    id: "p-005",
    slug: "odyssey-oled-g9",
    name: "Odyssey OLED G9",
    brand: "Samsung",
    category: "monitors",
    price: 119900,
    compareAtPrice: 139900,
    rating: 4.7,
    reviews: 879,
    badge: "Sale",
    specs: ['49" Dual QHD', "240Hz", "0.03ms"],
    description:
      "A 49-inch Dual QHD OLED that wraps your field of view in a 1800R curve. 240Hz, 0.03ms response, and per-pixel contrast make competitive play and cinematic single-player equally absurd.",
    stock: 6,
  },
  {
    id: "p-006",
    slug: "apex-pro-tkl",
    name: "Apex Pro TKL Gen 3",
    brand: "SteelSeries",
    category: "keyboards",
    price: 18900,
    rating: 4.8,
    reviews: 3521,
    badge: "Best Seller",
    specs: ["Hall-effect", "OmniPoint 3.0", "Hot-swap"],
    description:
      "Adjustable Hall-effect switches let you tune actuation per key from a feather 0.1mm to a deliberate 4mm. Rapid Trigger, a premium aluminium top plate, and an OLED smart display round out the pro's choice.",
    stock: 24,
  },
  {
    id: "p-007",
    slug: "g-pro-x-superlight-2",
    name: "G Pro X Superlight 2",
    brand: "Logitech G",
    category: "mice",
    price: 15900,
    rating: 4.9,
    reviews: 5240,
    specs: ["60g", "HERO 2 32K", "95h battery"],
    description:
      "Sub-60g of esports pedigree. The HERO 2 sensor tracks at 32,000 DPI and 888 IPS, hybrid optical-mechanical switches snap with zero debounce delay, and a single charge lasts up to 95 hours.",
    stock: 31,
  },
  {
    id: "p-008",
    slug: "arctis-nova-pro",
    name: "Arctis Nova Pro Wireless",
    brand: "SteelSeries",
    category: "headsets",
    price: 34900,
    compareAtPrice: 37900,
    rating: 4.6,
    reviews: 1933,
    badge: "Sale",
    specs: ["Hot-swap battery", "Active noise cancel", "360° audio"],
    description:
      "A dual-wireless flagship with a hot-swap battery system you never have to plug in. Active noise cancellation, a near-invisible retractable mic, and a multi-system base station make it a do-everything headset.",
    stock: 14,
  },
];
