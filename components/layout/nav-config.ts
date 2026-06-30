/**
 * Navigation data model. Plain serializable data so it can be imported by both
 * Server and Client Components. `columns` present => the item renders a mega menu.
 */

export interface NavLeaf {
  label: string;
  href: string;
}

export interface NavColumn {
  heading: string;
  items: NavLeaf[];
}

export interface NavItem {
  label: string;
  href: string;
  columns?: NavColumn[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Laptops",
    href: "/products?category=laptops",
    columns: [
      {
        heading: "By use",
        items: [
          { label: "Esports", href: "/products?category=laptops" },
          { label: "Creator", href: "/products?category=laptops" },
          { label: "Ultraportable", href: "/products?category=laptops" },
        ],
      },
      {
        heading: "By GPU",
        items: [
          { label: "RTX 5090", href: "/products?category=laptops" },
          { label: "RTX 5080", href: "/products?category=laptops" },
          { label: "RTX 5070", href: "/products?category=laptops" },
        ],
      },
      {
        heading: "Brands",
        items: [
          { label: "ASUS ROG", href: `/products?brand=${encodeURIComponent("ASUS ROG")}` },
          { label: "Razer", href: `/products?brand=${encodeURIComponent("Razer")}` },
          { label: "Lenovo Legion", href: `/products?brand=${encodeURIComponent("Lenovo Legion")}` },
        ],
      },
    ],
  },
  {
    label: "Desktops",
    href: "/products?category=desktops",
    columns: [
      {
        heading: "Prebuilt",
        items: [
          { label: "Entry rigs", href: "/products?category=desktops" },
          { label: "Mid-tier", href: "/products?category=desktops" },
          { label: "Flagship", href: "/products?category=desktops" },
        ],
      },
      {
        heading: "Custom",
        items: [
          { label: "PC Builder", href: "/products" },
          { label: "Liquid-cooled", href: "/products?category=desktops" },
          { label: "Small form factor", href: "/products?category=desktops" },
        ],
      },
    ],
  },
  {
    label: "Components",
    href: "/products",
    columns: [
      {
        heading: "Core",
        items: [
          { label: "Graphics cards", href: "/products?category=gpus" },
          { label: "Processors", href: "/products" },
          { label: "Motherboards", href: "/products" },
        ],
      },
      {
        heading: "Memory & storage",
        items: [
          { label: "RAM", href: "/products" },
          { label: "NVMe SSDs", href: "/products?category=ssds" },
          { label: "Cooling", href: "/products" },
        ],
      },
    ],
  },
  {
    label: "Peripherals",
    href: "/products",
    columns: [
      {
        heading: "Input",
        items: [
          { label: "Keyboards", href: "/products?category=keyboards" },
          { label: "Mice", href: "/products?category=mice" },
          { label: "Controllers", href: "/products" },
        ],
      },
      {
        heading: "Audio & video",
        items: [
          { label: "Headsets", href: "/products?category=headsets" },
          { label: "Monitors", href: "/products?category=monitors" },
          { label: "Webcams", href: "/products" },
        ],
      },
    ],
  },
  { label: "Chairs", href: "/products?category=chairs" },
  { label: "Deals", href: "/products?sale=1" },
];
