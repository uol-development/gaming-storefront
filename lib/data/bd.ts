/**
 * Bangladesh localization constants — shared by the checkout UI and the
 * server-side order action. Money is in integer minor units (poisha; 1 ৳ = 100).
 */

export const BD_DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Khulna",
  "Rajshahi",
  "Sylhet",
  "Barishal",
  "Rangpur",
  "Mymensingh",
] as const;
export type BdDivision = (typeof BD_DIVISIONS)[number];

export function isBdDivision(value: string): value is BdDivision {
  return (BD_DIVISIONS as readonly string[]).includes(value);
}

/** Bangladeshi mobile number: 01XXXXXXXXX (operator prefixes 013–019). */
export const BD_PHONE_RE = /^01[3-9]\d{8}$/;

/* -------------------------------- Delivery ------------------------------- */

export type DeliveryZone = "inside_dhaka" | "outside_dhaka";

export const DELIVERY_ZONE_LABEL: Record<DeliveryZone, string> = {
  inside_dhaka: "Inside Dhaka",
  outside_dhaka: "Outside Dhaka",
};

export function isDeliveryZone(value: string): value is DeliveryZone {
  return value === "inside_dhaka" || value === "outside_dhaka";
}

/** Delivery zone inferred from the division (Dhaka division → inside-Dhaka rate). */
export function zoneForDivision(division: string): DeliveryZone {
  return division === "Dhaka" ? "inside_dhaka" : "outside_dhaka";
}

/* -------------------------------- Payments ------------------------------- */

export type PaymentMethod = "cod" | "bkash" | "nagad" | "rocket" | "card";
export type PaymentKind = "cod" | "wallet" | "card";

export interface PaymentOption {
  value: PaymentMethod;
  label: string;
  kind: PaymentKind;
  hint: string;
}

export const PAYMENT_OPTIONS: readonly PaymentOption[] = [
  { value: "cod", label: "Cash on Delivery", kind: "cod", hint: "Pay in cash when your order arrives." },
  { value: "bkash", label: "bKash", kind: "wallet", hint: "Pay from your bKash account." },
  { value: "nagad", label: "Nagad", kind: "wallet", hint: "Pay from your Nagad account." },
  { value: "rocket", label: "Rocket", kind: "wallet", hint: "Pay from your Rocket account." },
  { value: "card", label: "Card", kind: "card", hint: "Visa, Mastercard or American Express." },
] as const;

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  card: "Card",
};

export function isPaymentMethod(value: string): value is PaymentMethod {
  return value === "cod" || value === "bkash" || value === "nagad" || value === "rocket" || value === "card";
}

export function paymentKind(method: PaymentMethod): PaymentKind {
  if (method === "cod") return "cod";
  if (method === "card") return "card";
  return "wallet";
}
