/**
 * Shared storefront order pricing rules. Money is in integer minor units
 * (cents) everywhere. Imported by the checkout UI (order summary + flow) AND the
 * server-side `placeOrder` action so the total a customer sees is exactly the
 * total that gets persisted.
 */

/** Free shipping at/above this subtotal (minor units); flat fee otherwise. */
export const FREE_SHIPPING_THRESHOLD = 7_500_000;
export const SHIPPING_FEE = 1_500;
export const TAX_RATE = 0.08;

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export function computeOrderTotals(subtotal: number): OrderTotals {
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const tax = Math.round(subtotal * TAX_RATE);
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}
