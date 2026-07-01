import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageOff } from "lucide-react";
import { getOrderById } from "@/lib/admin/orders-queries";
import {
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_BADGE,
  PAYMENT_STATUS_LABEL,
  isOrderStatus,
  isPaymentStatus,
} from "@/lib/admin/orders-schema";
import {
  DELIVERY_ZONE_LABEL,
  PAYMENT_METHOD_LABEL,
  isDeliveryZone,
  isPaymentMethod,
} from "@/lib/data/bd";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OrderManager } from "@/components/admin/orders/order-manager";

export const metadata = { title: "Order" };
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

function addressLine(address: Record<string, unknown>): string[] {
  const get = (key: string) => (typeof address[key] === "string" ? (address[key] as string) : "");
  const l1 = get("line1");
  const l2 = get("line2");
  const area = get("area");
  // Bangladesh: city (district) + division; legacy US orders: city + state.
  const cityRegion = [get("city"), get("division") || get("state")].filter(Boolean).join(", ");
  const region = [cityRegion, get("postal_code")].filter(Boolean).join(" ");
  return [l1, l2, area, region, get("country")].filter((s) => s.trim().length > 0);
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const statusBadge = isOrderStatus(order.status)
    ? ORDER_STATUS_BADGE[order.status]
    : "border-border bg-secondary text-muted-foreground";
  const statusLabel = isOrderStatus(order.status)
    ? ORDER_STATUS_LABEL[order.status]
    : order.status;
  const paymentBadge = isPaymentStatus(order.payment_status)
    ? PAYMENT_STATUS_BADGE[order.payment_status]
    : "border-border bg-secondary text-muted-foreground";
  const paymentLabel = isPaymentStatus(order.payment_status)
    ? PAYMENT_STATUS_LABEL[order.payment_status]
    : order.payment_status;

  const shipping = addressLine(order.shipping_address);
  const paymentMethodLabel =
    order.payment_method && isPaymentMethod(order.payment_method)
      ? PAYMENT_METHOD_LABEL[order.payment_method]
      : order.payment_method;
  const deliveryZoneLabel =
    order.delivery_zone && isDeliveryZone(order.delivery_zone)
      ? DELIVERY_ZONE_LABEL[order.delivery_zone]
      : null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to orders
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight">{order.order_number}</h1>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
              statusBadge,
            )}
          >
            {statusLabel}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
              paymentBadge,
            )}
          >
            {paymentLabel}
          </span>
          {paymentMethodLabel ? (
            <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground">
              {paymentMethodLabel}
            </span>
          ) : null}
          <span className="text-sm text-muted-foreground">
            Placed {formatDateTime(order.placed_at)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Line items */}
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-base font-semibold">
                Items{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({order.items.length})
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2.5 font-medium">Product</th>
                    <th className="px-3 py-2.5 text-right font-medium">Unit</th>
                    <th className="px-3 py-2.5 text-center font-medium">Qty</th>
                    <th className="px-5 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-secondary text-muted-foreground">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt=""
                                className="size-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <ImageOff className="size-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{item.name}</p>
                            {item.sku ? (
                              <p className="truncate text-xs text-muted-foreground">{item.sku}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {formatPrice(item.unit_price)}
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums">{item.quantity}</td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums">
                        {formatPrice(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <dl className="space-y-1.5 border-t border-border px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="tabular-nums">{formatPrice(order.shipping)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="tabular-nums">{formatPrice(order.tax)}</dd>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="tabular-nums text-emerald-400">−{formatPrice(order.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Side column */}
        <div className="space-y-5">
          {/* Management controls (client) */}
          <OrderManager
            orderId={order.id}
            status={order.status}
            paymentStatus={order.payment_status}
            notes={order.notes ?? ""}
          />

          {/* Customer */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-base font-semibold">Customer</h2>
            <p className="text-sm font-medium text-foreground">{order.customer_name || "—"}</p>
            {order.customer_email ? (
              <a
                href={`mailto:${order.customer_email}`}
                className="mt-0.5 block truncate text-sm text-primary underline-offset-2 hover:underline"
              >
                {order.customer_email}
              </a>
            ) : null}
            {order.customer_phone ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{order.customer_phone}</p>
            ) : null}
          </section>

          {/* Shipping address */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Shipping address</h2>
              {deliveryZoneLabel ? (
                <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {deliveryZoneLabel}
                </span>
              ) : null}
            </div>
            {shipping.length > 0 ? (
              <address className="text-sm not-italic leading-relaxed text-muted-foreground">
                {shipping.map((line, index) => (
                  <span key={index} className="block">
                    {line}
                  </span>
                ))}
              </address>
            ) : (
              <p className="text-sm text-muted-foreground">No address on file.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
