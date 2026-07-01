import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));

/** Form/validation schema for creating & editing customers. */
export const customerInputSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(200),
  name: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(60).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1)).default([]),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  marketing_opt_in: z.boolean().default(false),
  is_blocked: z.boolean().default(false),
  address_line1: optionalText,
  address_city: optionalText,
  address_postal: optionalText,
  address_country: optionalText,
});

export type CustomerInput = z.input<typeof customerInputSchema>;
export type CustomerParsed = z.output<typeof customerInputSchema>;

const emptyToNull = (value: string | null | undefined): string | null =>
  value === undefined || value === null || value.trim() === "" ? null : value.trim();

/** Map validated form input to a customers table row payload. */
export function toCustomerRow(input: CustomerParsed): Record<string, unknown> {
  const address: Record<string, string> = {};
  if (input.address_line1 && input.address_line1.trim()) address.line1 = input.address_line1.trim();
  if (input.address_city && input.address_city.trim()) address.city = input.address_city.trim();
  if (input.address_postal && input.address_postal.trim())
    address.postal_code = input.address_postal.trim();
  if (input.address_country && input.address_country.trim())
    address.country = input.address_country.trim();

  return {
    email: input.email.trim(),
    name: (input.name ?? "").trim(),
    phone: emptyToNull(input.phone),
    tags: input.tags,
    notes: emptyToNull(input.notes),
    marketing_opt_in: input.marketing_opt_in,
    is_blocked: input.is_blocked,
    default_address: address,
  };
}
