import type { Product } from "./products";

/**
 * Flash-sale data. The countdown component targets `mount time +
 * FLASH_SALE_DURATION_HOURS` so the timer is always live (no hardcoded date that
 * silently expires). Every deal carries a `compareAtPrice` for the strike-through.
 */
export const FLASH_SALE_DURATION_HOURS = 8;

export const FLASH_DEALS: Product[] = [
  {
    id: "d-001",
    slug: "rog-swift-pg27aqdm",
    name: "ROG Swift OLED PG27",
    brand: "ASUS ROG",
    category: "monitors",
    price: 74900,
    compareAtPrice: 99900,
    rating: 4.8,
    reviews: 1442,
    badge: "Sale",
    specs: ["27\" OLED", "240Hz", "0.03ms"],
  },
  {
    id: "d-002",
    slug: "k70-rgb-pro",
    name: "K70 RGB PRO",
    brand: "Corsair",
    category: "keyboards",
    price: 11900,
    compareAtPrice: 16900,
    rating: 4.7,
    reviews: 2890,
    badge: "Sale",
    specs: ["OPX optical", "8000Hz", "PBT keycaps"],
  },
  {
    id: "d-003",
    slug: "cloud-iii-wireless",
    name: "Cloud III Wireless",
    brand: "HyperX",
    category: "headsets",
    price: 12900,
    compareAtPrice: 16900,
    rating: 4.6,
    reviews: 1755,
    badge: "Sale",
    specs: ["120h battery", "53mm drivers", "2.4GHz + BT"],
  },
  {
    id: "d-004",
    slug: "sn850x-2tb",
    name: "WD_BLACK SN850X 2TB",
    brand: "Western Digital",
    category: "ssds",
    price: 14900,
    compareAtPrice: 22900,
    rating: 4.9,
    reviews: 6120,
    badge: "Sale",
    specs: ["PCIe 4.0", "7300MB/s", "Game Mode 2.0"],
  },
  {
    id: "d-005",
    slug: "titan-evo-2024",
    name: "Titan Evo Gaming Chair",
    brand: "Secretlab",
    category: "chairs",
    price: 47900,
    compareAtPrice: 59900,
    rating: 4.8,
    reviews: 980,
    badge: "Sale",
    specs: ["NEO Hybrid leather", "4D armrests", "Magnetic head pillow"],
  },
  {
    id: "d-006",
    slug: "g502-x-plus",
    name: "G502 X PLUS",
    brand: "Logitech G",
    category: "mice",
    price: 11900,
    compareAtPrice: 15900,
    rating: 4.7,
    reviews: 4310,
    badge: "Sale",
    specs: ["HERO 25K", "LIGHTFORCE", "13 controls"],
  },
];
