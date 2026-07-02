import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ImageOff } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

export const metadata: Metadata = { title: "Order" };
export const dynamic = "force-dynamic";

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

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

function addressLines(address: Record<string, unknown>): string[] {
  const get = (k: string) => (typeof address[k] === "string" ? (address[k] as string) : "");
  const district = get("district") || get("city");
  const region = [district, get("postal_code")].filter(Boolean).join(" ");
  return [get("line1"), get("area"), region, get("country")].filter((s) => s.trim().length > 0);
}

export default async function CustomerOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account");

  // RLS ("orders own read" + "order_items own read") guarantees a customer only
  // sees THEIR order — a stranger's id simply returns null.
  const { data } = await supabase
    .from("orders")
    .select(
      "id,order_number,status,payment_status,payment_method,delivery_zone,subtotal,shipping,tax,discount,total,shipping_address,customer_name,customer_phone,placed_at, order_items(id,name,sku,image_url,unit_price,quantity,line_total)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const order = data as Record<string, unknown>;
  const items = Array.isArray(order.order_items)
    ? (order.order_items as Record<string, unknown>[])
    : [];
  const shipping = addressLines(
    typeof order.shipping_address === "object" && order.shipping_address
      ? (order.shipping_address as Record<string, unknown>)
      : {},
  );

  const status = str(order.status);
  const paymentStatus = str(order.payment_status);
  const method = str(order.payment_method);
  const zone = str(order.delivery_zone);

  return (
    <main className="container mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        Back to my account
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">{str(order.order_number)}</h1>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
            isOrderStatus(status) ? ORDER_STATUS_BADGE[status] : "border-border bg-secondary text-muted-foreground",
          )}
        >
          {isOrderStatus(status) ? ORDER_STATUS_LABEL[status] : status}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
            isPaymentStatus(paymentStatus)
              ? PAYMENT_STATUS_BADGE[paymentStatus]
              : "border-border bg-secondary text-muted-foreground",
          )}
        >
          {isPaymentStatus(paymentStatus) ? PAYMENT_STATUS_LABEL[paymentStatus] : paymentStatus}
        </span>
        <span className="text-sm text-muted-foreground">
          Placed {formatDateTime(str(order.placed_at))}
        </span>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Items + totals */}
        <section className="overflow-hidden rounded-xl border border-border bg-card lg:col-span-2">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-base font-semibold">
              Items <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {items.map((raw, index) => {
              const it = raw;
              return (
                <li key={str(it.id) || index} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-secondary text-muted-foreground">
                    {typeof it.image_url === "string" && it.image_url ? (
                      <img src={it.image_url} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <ImageOff className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{str(it.name)}</p>
                    <p className="text-xs text-muted-foreground">Qty {num(it.quantity)}</p>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">{formatPrice(num(it.line_total))}</span>
                </li>
              );
            })}
          </ul>
          <dl className="space-y-1.5 border-t border-border px-5 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(num(order.subtotal))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className="tabular-nums">{formatPrice(num(order.shipping))}</dd>
            </div>
            {num(order.discount) > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="tabular-nums text-emerald-400">−{formatPrice(num(order.discount))}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice(num(order.total))}</dd>
            </div>
          </dl>
        </section>

        {/* Delivery + payment */}
        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-base font-semibold">Delivery</h2>
            {zone && isDeliveryZone(zone) ? (
              <p className="mb-2 text-xs font-medium text-muted-foreground">{DELIVERY_ZONE_LABEL[zone]}</p>
            ) : null}
            {shipping.length > 0 ? (
              <address className="text-sm not-italic leading-relaxed text-muted-foreground">
                <span className="block font-medium text-foreground">{str(order.customer_name)}</span>
                {str(order.customer_phone) ? (
                  <span className="block">{str(order.customer_phone)}</span>
                ) : null}
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

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-2 text-base font-semibold">Payment</h2>
            <p className="text-sm text-muted-foreground">
              {method && isPaymentMethod(method) ? PAYMENT_METHOD_LABEL[method] : method || "—"} ·{" "}
              {isPaymentStatus(paymentStatus) ? PAYMENT_STATUS_LABEL[paymentStatus] : paymentStatus}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
