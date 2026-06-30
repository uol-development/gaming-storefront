import { z } from "zod";

export const PRODUCT_STATUSES = ["draft", "published", "archived", "scheduled"] as const;
export const INVENTORY_STATUSES = ["in_stock", "low_stock", "out_of_stock", "backorder"] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

const optionalText = z.string().trim().optional().or(z.literal(""));

/** Form/validation schema for creating & editing products. Prices in minor units (cents). */
export const productInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers, and hyphens only"),
  sku: optionalText,
  barcode: optionalText,
  brand: optionalText,
  category_id: z.string().uuid().nullable().optional(),
  short_description: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  features: z.array(z.string().trim().min(1)).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
  status: z.enum(PRODUCT_STATUSES).default("draft"),
  scheduled_at: z.string().trim().nullable().optional(),
  price: z.coerce.number().int().nonnegative().default(0),
  sale_price: z.coerce.number().int().nonnegative().nullable().optional(),
  cost_price: z.coerce.number().int().nonnegative().nullable().optional(),
  tax_class: optionalText,
  shipping_class: optionalText,
  weight: z.coerce.number().nonnegative().nullable().optional(),
  warranty: optionalText,
  stock_quantity: z.coerce.number().int().nonnegative().default(0),
  featured_image_url: z.string().url().nullable().optional().or(z.literal("")),
  seo_meta_title: z.string().trim().max(200).optional().or(z.literal("")),
  seo_meta_description: z.string().trim().max(400).optional().or(z.literal("")),
  seo_og_image: z.string().url().optional().or(z.literal("")),
});

export type ProductInput = z.input<typeof productInputSchema>;
export type ProductParsed = z.output<typeof productInputSchema>;

/** Derive an inventory status from a stock count (used when not explicitly set). */
export function deriveInventoryStatus(stock: number): InventoryStatus {
  if (stock <= 0) return "out_of_stock";
  if (stock <= 5) return "low_stock";
  return "in_stock";
}

const emptyToNull = (value: string | null | undefined): string | null =>
  value === undefined || value === null || value.trim() === "" ? null : value.trim();

/** Map validated form input to a products table row payload. */
export function toProductRow(input: ProductParsed): Record<string, unknown> {
  return {
    name: input.name.trim(),
    slug: input.slug.trim(),
    sku: emptyToNull(input.sku),
    barcode: emptyToNull(input.barcode),
    brand: emptyToNull(input.brand),
    category_id: input.category_id ?? null,
    short_description: emptyToNull(input.short_description),
    description: emptyToNull(input.description),
    features: input.features,
    tags: input.tags,
    status: input.status,
    scheduled_at: emptyToNull(input.scheduled_at),
    published_at: input.status === "published" ? new Date().toISOString() : null,
    price: input.price,
    sale_price: input.sale_price ?? null,
    cost_price: input.cost_price ?? null,
    tax_class: emptyToNull(input.tax_class),
    shipping_class: emptyToNull(input.shipping_class),
    weight: input.weight ?? null,
    warranty: emptyToNull(input.warranty),
    stock_quantity: input.stock_quantity,
    inventory_status: deriveInventoryStatus(input.stock_quantity),
    featured_image_url: emptyToNull(input.featured_image_url),
    seo: {
      meta_title: emptyToNull(input.seo_meta_title),
      meta_description: emptyToNull(input.seo_meta_description),
      og_image: emptyToNull(input.seo_og_image),
    },
  };
}
