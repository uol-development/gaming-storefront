import type { DeliveryZone } from "@/lib/data/bd";

/**
 * Shared storefront order pricing rules for Bangladesh. Money is in integer
 * minor units (poisha; 1 ৳ = 100). Imported by the checkout UI (order summary +
 * flow) AND the server-side `placeOrder` action so the total a customer sees is
 * exactly the total that gets persisted.
 *
 * Delivery is a flat fee by zone (Inside vs Outside Dhaka), waived above a
 * threshold. Prices are shown VAT-inclusive (common in BD retail), so there is
 * no separate tax line.
 */

export const INSIDE_DHAKA_FEE = 6_000; // ৳60
export const DHAKA_SUBURB_FEE = 10_000; // ৳100
export const OUTSIDE_DHAKA_FEE = 13_000; // ৳130
/** Free delivery at/above this subtotal (minor units) = ৳1,50,000. */
export const FREE_SHIPPING_THRESHOLD = 15_000_000;

/**
 * Per-zone delivery rates + free-shipping threshold (all in minor units). These
 * are admin-editable via Store Settings; the constants above are the built-in
 * defaults used whenever settings are unset/unavailable, so the money path is
 * never left without valid numbers.
 */
export interface ShippingConfig {
  insideDhaka: number;
  dhakaSuburb: number;
  outsideDhaka: number;
  freeThreshold: number;
}

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  insideDhaka: INSIDE_DHAKA_FEE,
  dhakaSuburb: DHAKA_SUBURB_FEE,
  outsideDhaka: OUTSIDE_DHAKA_FEE,
  freeThreshold: FREE_SHIPPING_THRESHOLD,
};

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export function shippingForZone(
  subtotal: number,
  zone: DeliveryZone,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
): number {
  if (subtotal >= config.freeThreshold) return 0;
  if (zone === "inside_dhaka") return config.insideDhaka;
  if (zone === "dhaka_suburb") return config.dhakaSuburb;
  return config.outsideDhaka;
}

export function computeOrderTotals(
  subtotal: number,
  zone: DeliveryZone,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
): OrderTotals {
  const shipping = shippingForZone(subtotal, zone, config);
  const tax = 0; // prices are VAT-inclusive
  return { subtotal, shipping, tax, total: subtotal + shipping };
}
