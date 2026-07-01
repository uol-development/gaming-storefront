import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageOff, MoveDown, MoveUp } from "lucide-react";
import { getInventoryItem, getStockMovements } from "@/lib/admin/inventory-queries";
import {
  INVENTORY_STATUS_BADGE,
  INVENTORY_STATUS_LABEL,
  MOVEMENT_REASON_LABEL,
  isMovementReason,
} from "@/lib/admin/inventory-schema";
import { cn } from "@/lib/utils";
import { StockAdjuster } from "@/components/admin/inventory/stock-adjuster";

export const metadata = { title: "Adjust stock" };
export const dynamic = "force-dynamic";

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, movements] = await Promise.all([getInventoryItem(id), getStockMovements(id)]);
  if (!item) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/inventory"
          className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to inventory
        </Link>
      </div>

      {/* Product header */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-secondary text-muted-foreground">
          {item.featured_image_url ? (
            <img
              src={item.featured_image_url}
              alt=""
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <ImageOff className="size-6" />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-bold tracking-tight">{item.name}</h1>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                INVENTORY_STATUS_BADGE[item.inventory_status],
              )}
            >
              {INVENTORY_STATUS_LABEL[item.inventory_status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.brand ? `${item.brand} · ` : ""}
            {item.sku ?? "No SKU"} ·{" "}
            <span className="font-medium text-foreground tabular-nums">{item.stock_quantity}</span>{" "}
            in stock · reorder at{" "}
            <span className="tabular-nums">{item.low_stock_threshold}</span>
          </p>
        </div>
        <Link
          href={`/admin/products/${item.id}`}
          className="ml-auto hidden shrink-0 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:inline-block"
        >
          Edit product
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Adjuster */}
        <div className="lg:col-span-1">
          <StockAdjuster
            productId={item.id}
            currentStock={item.stock_quantity}
            lowStockThreshold={item.low_stock_threshold}
          />
        </div>

        {/* Movement history */}
        <section className="overflow-hidden rounded-xl border border-border bg-card lg:col-span-2">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-base font-semibold">
              Movement history{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({movements.length})
              </span>
            </h2>
          </div>
          {movements.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No stock movements yet. Adjustments you make will appear here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2.5 font-medium">Change</th>
                    <th className="px-3 py-2.5 font-medium">Reason</th>
                    <th className="px-3 py-2.5 text-right font-medium">Result</th>
                    <th className="px-5 py-2.5 text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => {
                    const positive = m.delta >= 0;
                    return (
                      <tr key={m.id} className="border-b border-border last:border-0 align-top">
                        <td className="px-5 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-medium tabular-nums",
                              positive ? "text-emerald-400" : "text-destructive",
                            )}
                          >
                            {positive ? (
                              <MoveUp className="size-3.5" />
                            ) : (
                              <MoveDown className="size-3.5" />
                            )}
                            {positive ? "+" : ""}
                            {m.delta}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-foreground">
                            {isMovementReason(m.reason)
                              ? MOVEMENT_REASON_LABEL[m.reason]
                              : m.reason}
                          </span>
                          {m.note ? (
                            <p className="text-xs text-muted-foreground">{m.note}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-right font-medium tabular-nums">
                          {m.resulting_quantity}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right text-muted-foreground">
                          {formatDateTime(m.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
