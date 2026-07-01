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

export type DeliveryZone = "inside_dhaka" | "dhaka_suburb" | "outside_dhaka";

export const DELIVERY_ZONE_LABEL: Record<DeliveryZone, string> = {
  inside_dhaka: "Inside Dhaka",
  dhaka_suburb: "Dhaka Sub-area",
  outside_dhaka: "Outside Dhaka",
};

export function isDeliveryZone(value: string): value is DeliveryZone {
  return value === "inside_dhaka" || value === "dhaka_suburb" || value === "outside_dhaka";
}

/**
 * Selectable delivery districts, each mapped to a courier zone. "Inside Dhaka"
 * is Dhaka city proper; the Dhaka-division suburbs (Narayanganj, Gazipur, Savar…)
 * are a mid-tier "sub-area"; everything else is outside Dhaka.
 */
export interface BdArea {
  name: string;
  zone: DeliveryZone;
}

export const BD_AREAS: readonly BdArea[] = [
  { name: "Dhaka City", zone: "inside_dhaka" },
  { name: "Savar", zone: "dhaka_suburb" },
  { name: "Keraniganj", zone: "dhaka_suburb" },
  { name: "Narayanganj", zone: "dhaka_suburb" },
  { name: "Gazipur", zone: "dhaka_suburb" },
  { name: "Tongi", zone: "dhaka_suburb" },
  { name: "Narsingdi", zone: "dhaka_suburb" },
  { name: "Munshiganj", zone: "dhaka_suburb" },
  { name: "Manikganj", zone: "dhaka_suburb" },
  { name: "Chattogram", zone: "outside_dhaka" },
  { name: "Sylhet", zone: "outside_dhaka" },
  { name: "Khulna", zone: "outside_dhaka" },
  { name: "Rajshahi", zone: "outside_dhaka" },
  { name: "Barishal", zone: "outside_dhaka" },
  { name: "Rangpur", zone: "outside_dhaka" },
  { name: "Mymensingh", zone: "outside_dhaka" },
  { name: "Cumilla", zone: "outside_dhaka" },
  { name: "Cox's Bazar", zone: "outside_dhaka" },
  { name: "Bogura", zone: "outside_dhaka" },
  { name: "Jashore", zone: "outside_dhaka" },
  { name: "Dinajpur", zone: "outside_dhaka" },
  { name: "Other (Outside Dhaka)", zone: "outside_dhaka" },
] as const;

const AREA_ZONE = new Map<string, DeliveryZone>(BD_AREAS.map((a) => [a.name, a.zone]));

export function isBdArea(name: string): boolean {
  return AREA_ZONE.has(name);
}

/** Delivery zone for a selected district/area (defaults to outside-Dhaka). */
export function zoneForArea(area: string): DeliveryZone {
  return AREA_ZONE.get(area) ?? "outside_dhaka";
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
  { value: "card", label: "Card", kind: "card", hint: "Pay with your Visa or Mastercard." },
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
