import { z } from "zod";

export const BANNER_SIZES = ["large", "medium", "small", "tall"] as const;
export type BannerSize = (typeof BANNER_SIZES)[number];
export const BANNER_SIZE_LABEL: Record<BannerSize, string> = {
  large: "Large (4:3)",
  medium: "Medium (2:1)",
  small: "Small (1:1)",
  tall: "Tall (2:3)",
};

export const BANNER_STATUSES = ["draft", "published"] as const;
export type BannerStatus = (typeof BANNER_STATUSES)[number];
export const BANNER_STATUS_LABEL: Record<BannerStatus, string> = {
  draft: "Draft",
  published: "Published",
};

export const BANNER_BADGES = ["New", "Sale", "Limited Time", "Hot Deal", "Exclusive"] as const;
export type BannerBadge = (typeof BANNER_BADGES)[number];

export const BANNER_PLACEMENTS = [
  "before_flash_sale",
  "hero",
  "between_sections",
  "footer",
  "category",
  "product",
] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];
export const BANNER_PLACEMENT_LABEL: Record<BannerPlacement, string> = {
  before_flash_sale: "Before Flash Sale",
  hero: "Homepage Hero",
  between_sections: "Between Product Sections",
  footer: "Footer Promotion",
  category: "Category Pages",
  product: "Product Pages",
};

/** Badge pill styles (shared storefront + admin). */
export const BANNER_BADGE_STYLE: Record<string, string> = {
  New: "bg-emerald-500 text-white",
  Sale: "bg-primary text-primary-foreground",
  "Limited Time": "bg-amber-500 text-black",
  "Hot Deal": "bg-destructive text-white",
  Exclusive: "bg-accent text-accent-foreground",
};

const optionalText = z.string().trim().optional().or(z.literal(""));

export const bannerInputSchema = z.object({
  placement: z.enum(BANNER_PLACEMENTS).default("before_flash_sale"),
  size: z.enum(BANNER_SIZES).default("medium"),
  heading: z.string().trim().max(160).optional().or(z.literal("")),
  subheading: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  image_url: z.string().url().optional().or(z.literal("")),
  image_mobile_url: z.string().url().optional().or(z.literal("")),
  cta_text: z.string().trim().max(60).optional().or(z.literal("")),
  cta_link: optionalText,
  cta_new_tab: z.boolean().default(false),
  bg_color: optionalText,
  overlay_color: optionalText,
  overlay_opacity: z.coerce.number().int().min(0).max(100).default(0),
  badge: z.string().trim().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
  status: z.enum(BANNER_STATUSES).default("published"),
  publish_at: z.string().trim().nullable().optional(),
  expire_at: z.string().trim().nullable().optional(),
});

export type BannerInput = z.input<typeof bannerInputSchema>;
export type BannerParsed = z.output<typeof bannerInputSchema>;

const emptyToNull = (value: string | null | undefined): string | null =>
  value === undefined || value === null || value.trim() === "" ? null : value.trim();

export function toBannerRow(input: BannerParsed): Record<string, unknown> {
  return {
    placement: input.placement,
    size: input.size,
    heading: (input.heading ?? "").trim(),
    subheading: emptyToNull(input.subheading),
    description: emptyToNull(input.description),
    image_url: emptyToNull(input.image_url),
    image_mobile_url: emptyToNull(input.image_mobile_url),
    cta_text: emptyToNull(input.cta_text),
    cta_link: emptyToNull(input.cta_link),
    cta_new_tab: input.cta_new_tab,
    bg_color: emptyToNull(input.bg_color),
    overlay_color: emptyToNull(input.overlay_color),
    overlay_opacity: input.overlay_opacity,
    badge: emptyToNull(input.badge),
    is_active: input.is_active,
    status: input.status,
    publish_at: emptyToNull(input.publish_at),
    expire_at: emptyToNull(input.expire_at),
  };
}
