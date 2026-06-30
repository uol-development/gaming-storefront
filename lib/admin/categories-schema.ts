import { z } from "zod";

/** Form/validation schema for creating & editing categories. */
export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Too long (max 120)"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers, and hyphens only"),
  parent_id: z.string().uuid().nullable().optional(),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  image_url: z.string().url().nullable().optional().or(z.literal("")),
  banner_url: z.string().url().nullable().optional().or(z.literal("")),
  position: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  seo_meta_title: z.string().trim().max(200).optional().or(z.literal("")),
  seo_meta_description: z.string().trim().max(400).optional().or(z.literal("")),
  seo_og_image: z.string().url().optional().or(z.literal("")),
});

export type CategoryInput = z.input<typeof categoryInputSchema>;
export type CategoryParsed = z.output<typeof categoryInputSchema>;

const emptyToNull = (value: string | null | undefined): string | null =>
  value === undefined || value === null || value.trim() === "" ? null : value.trim();

/**
 * Map validated form input to a categories table row payload.
 * NOTE: the categories table has no created_by/updated_by columns (unlike
 * products), so we never include those keys here.
 */
export function toCategoryRow(input: CategoryParsed): Record<string, unknown> {
  return {
    parent_id: input.parent_id ?? null,
    name: input.name.trim(),
    slug: input.slug.trim(),
    description: emptyToNull(input.description),
    image_url: emptyToNull(input.image_url),
    banner_url: emptyToNull(input.banner_url),
    position: input.position,
    is_active: input.is_active,
    seo: {
      meta_title: emptyToNull(input.seo_meta_title),
      meta_description: emptyToNull(input.seo_meta_description),
      og_image: emptyToNull(input.seo_og_image),
    },
  };
}
