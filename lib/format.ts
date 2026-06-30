/**
 * Formatting helpers. Prices are stored as integer minor units (cents) to avoid
 * floating-point drift; format at the edge only.
 */

export function formatPrice(minorUnits: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}

/** Compact counts, e.g. 1280 -> "1.3K". */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

/** Percent saved between a sale price and its higher compare-at price. */
export function discountPercent(price: number, compareAtPrice: number): number {
  if (compareAtPrice <= 0 || price >= compareAtPrice) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}
