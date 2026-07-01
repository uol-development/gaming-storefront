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

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export function shippingForZone(subtotal: number, zone: DeliveryZone): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  if (zone === "inside_dhaka") return INSIDE_DHAKA_FEE;
  if (zone === "dhaka_suburb") return DHAKA_SUBURB_FEE;
  return OUTSIDE_DHAKA_FEE;
}

export function computeOrderTotals(subtotal: number, zone: DeliveryZone): OrderTotals {
  const shipping = shippingForZone(subtotal, zone);
  const tax = 0; // prices are VAT-inclusive
  return { subtotal, shipping, tax, total: subtotal + shipping };
}
