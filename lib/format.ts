/**
 * Formatting helpers. Prices are stored as integer minor units (poisha; 1 ৳ =
 * 100) to avoid floating-point drift; format at the edge only. Default currency
 * is Bangladeshi Taka (৳) with South-Asian (lakh/crore) digit grouping.
 */

export function formatPrice(minorUnits: number, currency = "BDT"): string {
  const value = minorUnits / 100;
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  // ৳ with en-IN grouping (3,60,000) — reliable Taka sign across environments.
  return `৳${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value))}`;
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

export type StockTone = "in" | "low" | "out";

/** Consistent availability label/tone from a stock count. */
export function stockStatus(stock: number): { tone: StockTone; label: string } {
  if (stock <= 0) return { tone: "out", label: "Out of stock" };
  if (stock <= 5) return { tone: "low", label: `Only ${stock} left` };
  return { tone: "in", label: "In stock" };
}
