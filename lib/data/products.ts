/**
 * Mock product catalog for Phase 2 home rails. Prices are in minor units (cents).
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
  specs: string[];
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
    specs: ["RTX 5080", "16\" OLED 240Hz", "32GB DDR5"],
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
    specs: ["RTX 5090", "16\" QHD+ 240Hz", "64GB DDR5"],
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
    specs: ["49\" Dual QHD", "240Hz", "0.03ms"],
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
  },
];
