"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { productGradient, productImageUrl } from "@/lib/data/catalog";
import { getStoreProductsByIdsAction } from "@/lib/data/store-actions";
import { computeOrderTotals } from "@/lib/data/pricing";
import { DELIVERY_ZONE_LABEL } from "@/lib/data/bd";
import type { DeliveryZone } from "@/lib/data/bd";
import type { Product } from "@/lib/data/products";
import { useCartStore } from "@/lib/store/cart-store";

/**
 * Checkout order-totals card. Reads the cart store, resolves each line to a real
 * product from the live catalog (skipping any stale/unknown id), and renders the
 * item list plus the subtotal / delivery / total breakdown. Takes the current
 * delivery `zone` so the shipping fee matches the chosen shipping division.
 *
 * Resolution runs through the server action `getStoreProductsByIdsAction`
 * (client components never touch the server-only data layer directly). A
 * cancelled flag guards against stale results when the cart lines change.
 *
 * Money is in integer minor units throughout; format only at the edge with
 * `formatPrice`. Static layout (no Motion) so there is zero CLS as totals change.
 */

interface SummaryRow {
  id: string;
  name: string;
  quantity: number;
  gradient: string;
  image: string;
  lineTotal: number;
}

export function OrderSummary({ zone }: { zone: DeliveryZone }) {
  const lines = useCartStore((s) => s.lines);

  // Resolved products keyed by id. `null` = not yet loaded (loading state).
  const [productsById, setProductsById] = useState<Map<string, Product> | null>(null);

  // Stable key for the effect: only re-resolve when the set of ids changes.
  const idsKey = useMemo(
    () => lines.map((line) => line.productId).join(","),
    [lines],
  );

  useEffect(() => {
    let cancelled = false;
    const ids = idsKey.length > 0 ? idsKey.split(",") : [];

    if (ids.length === 0) {
      setProductsById(new Map());
      return () => {
        cancelled = true;
      };
    }

    void getStoreProductsByIdsAction(ids).then((products) => {
      if (cancelled) return;
      const map = new Map<string, Product>();
      for (const product of products) map.set(product.id, product);
      setProductsById(map);
    });

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const loading = productsById === null;

  const { rows, subtotal } = useMemo(() => {
    const resolved: SummaryRow[] = [];
    let sum = 0;
    if (productsById) {
      for (const line of lines) {
        const product = productsById.get(line.productId);
        if (!product) continue;
        const lineTotal = product.price * line.quantity;
        sum += lineTotal;
        resolved.push({
          id: product.id,
          name: product.name,
          quantity: line.quantity,
          gradient: productGradient(product),
          image: productImageUrl(product, 160),
          lineTotal,
        });
      }
    }
    return { rows: resolved, subtotal: sum };
  }, [lines, productsById]);

  const { shipping, total } = computeOrderTotals(subtotal, zone);

  return (
    <section
      aria-label="Order summary"
      className="rounded-2xl border border-border bg-card p-5 space-y-4"
    >
      <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
        Order summary
      </h2>

      {loading ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Loading items…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items yet</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3">
              <span
                className={cn(
                  "relative size-10 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-gradient-to-br",
                  row.gradient,
                )}
              >
                <img
                  src={row.image}
                  alt={row.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium text-foreground">{row.name}</p>
                <p className="text-xs text-muted-foreground">Qty {row.quantity}</p>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                {formatPrice(row.lineTotal)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <dl className="space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums text-foreground">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Delivery · {DELIVERY_ZONE_LABEL[zone]}</dt>
          <dd className={cn("tabular-nums", shipping === 0 ? "text-success" : "text-foreground")}>
            {shipping === 0 ? "FREE" : formatPrice(shipping)}
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2">
          <dt className="font-semibold text-foreground">Total</dt>
          <dd className="text-base font-bold tabular-nums text-foreground">{formatPrice(total)}</dd>
        </div>
      </dl>
    </section>
  );
}
