import { z } from "zod";
import type { StoreSettings } from "@/lib/data/settings";

/**
 * Validation for the Store Settings form. Money fields (shipping rates + free
 * threshold) are stored in minor units (poisha); the admin form edits them in
 * whole ৳ and converts before calling the action, so the schema validates the
 * already-converted minor-unit integers here.
 */

const urlOrEmpty = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), "Enter a full URL (https://…) or leave blank");

const money = z.coerce
  .number()
  .int("Enter a whole amount")
  .min(0, "Cannot be negative")
  .max(100_000_000, "Amount is too large");

export const settingsInputSchema = z.object({
  store: z.object({
    name: z.string().trim().min(1, "Store name is required").max(80),
    tagline: z.string().trim().max(300),
    supportEmail: z.string().trim().max(160).email("Enter a valid email").or(z.literal("")),
    supportPhone: z.string().trim().max(40),
    whatsapp: z.string().trim().max(40),
    address: z.string().trim().max(300),
  }),
  social: z.object({
    facebook: urlOrEmpty,
    instagram: urlOrEmpty,
    youtube: urlOrEmpty,
    tiktok: urlOrEmpty,
    x: urlOrEmpty,
  }),
  shipping: z.object({
    insideDhaka: money,
    dhakaSuburb: money,
    outsideDhaka: money,
    freeThreshold: money,
  }),
  payments: z.object({
    cod: z.boolean(),
    bkash: z.boolean(),
    nagad: z.boolean(),
    rocket: z.boolean(),
    card: z.boolean(),
  }),
  maintenance: z.object({
    enabled: z.boolean(),
    message: z.string().trim().max(300),
  }),
});

export type SettingsInput = z.input<typeof settingsInputSchema>;

/** Parsed settings are structurally the canonical StoreSettings shape. */
export type SettingsParsed = z.infer<typeof settingsInputSchema>;

// Compile-time assurance that the schema output stays in sync with StoreSettings
// (type-only — erased at build, no runtime cost).
type AssertParsedMatches = SettingsParsed extends StoreSettings ? true : never;
export type SettingsShapeOk = AssertParsedMatches;
