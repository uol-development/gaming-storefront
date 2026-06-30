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
    href: "/laptops",
    columns: [
      {
        heading: "By use",
        items: [
          { label: "Esports", href: "/laptops/esports" },
          { label: "Creator", href: "/laptops/creator" },
          { label: "Ultraportable", href: "/laptops/ultraportable" },
        ],
      },
      {
        heading: "By GPU",
        items: [
          { label: "RTX 5090", href: "/laptops/rtx-5090" },
          { label: "RTX 5080", href: "/laptops/rtx-5080" },
          { label: "RTX 5070", href: "/laptops/rtx-5070" },
        ],
      },
      {
        heading: "Brands",
        items: [
          { label: "ASUS ROG", href: "/brands/asus-rog" },
          { label: "Razer", href: "/brands/razer" },
          { label: "Lenovo Legion", href: "/brands/legion" },
        ],
      },
    ],
  },
  {
    label: "Desktops",
    href: "/desktops",
    columns: [
      {
        heading: "Prebuilt",
        items: [
          { label: "Entry rigs", href: "/desktops/entry" },
          { label: "Mid-tier", href: "/desktops/mid" },
          { label: "Flagship", href: "/desktops/flagship" },
        ],
      },
      {
        heading: "Custom",
        items: [
          { label: "PC Builder", href: "/builder" },
          { label: "Liquid-cooled", href: "/desktops/liquid" },
          { label: "Small form factor", href: "/desktops/sff" },
        ],
      },
    ],
  },
  {
    label: "Components",
    href: "/components",
    columns: [
      {
        heading: "Core",
        items: [
          { label: "Graphics cards", href: "/components/gpus" },
          { label: "Processors", href: "/components/cpus" },
          { label: "Motherboards", href: "/components/motherboards" },
        ],
      },
      {
        heading: "Memory & storage",
        items: [
          { label: "RAM", href: "/components/ram" },
          { label: "NVMe SSDs", href: "/components/ssds" },
          { label: "Cooling", href: "/components/cooling" },
        ],
      },
    ],
  },
  {
    label: "Peripherals",
    href: "/peripherals",
    columns: [
      {
        heading: "Input",
        items: [
          { label: "Keyboards", href: "/peripherals/keyboards" },
          { label: "Mice", href: "/peripherals/mice" },
          { label: "Controllers", href: "/peripherals/controllers" },
        ],
      },
      {
        heading: "Audio & video",
        items: [
          { label: "Headsets", href: "/peripherals/headsets" },
          { label: "Monitors", href: "/monitors" },
          { label: "Webcams", href: "/peripherals/webcams" },
        ],
      },
    ],
  },
  { label: "Chairs", href: "/chairs" },
  { label: "Deals", href: "/deals" },
];
