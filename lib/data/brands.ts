/** Brand wordmarks for the trust/marquee strip. Rendered as text (no logo assets yet). */
export interface Brand {
  name: string;
  slug: string;
}

export const BRANDS: Brand[] = [
  { name: "ASUS ROG", slug: "asus-rog" },
  { name: "Razer", slug: "razer" },
  { name: "NVIDIA", slug: "nvidia" },
  { name: "AMD", slug: "amd" },
  { name: "Intel", slug: "intel" },
  { name: "Logitech G", slug: "logitech-g" },
  { name: "Corsair", slug: "corsair" },
  { name: "SteelSeries", slug: "steelseries" },
  { name: "HyperX", slug: "hyperx" },
  { name: "MSI", slug: "msi" },
  { name: "Samsung", slug: "samsung" },
  { name: "Secretlab", slug: "secretlab" },
];
