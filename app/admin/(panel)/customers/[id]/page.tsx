import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, Mail, Package, ShoppingBag, Wallet } from "lucide-react";
import { getCustomerById } from "@/lib/admin/customers-queries";
import {
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
  isOrderStatus,
} from "@/lib/admin/orders-schema";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CustomerForm } from "@/components/admin/customers/customer-form";

export const metadata = { title: "Customer" };
export const dynamic = "force-dynamic";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    date,
  );
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const displayName = customer.name.trim() || customer.email;
  const stats = [
    { label: "Orders", value: customer.order_count.toLocaleString("en-US"), icon: ShoppingBag },
    { label: "Total spent", value: formatPrice(customer.total_spent), icon: Wallet },
    { label: "Last order", value: formatDate(customer.last_order_at), icon: Package },
    { label: "Customer since", value: formatDate(customer.created_at), icon: Mail },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to customers
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight">{displayName}</h1>
          {customer.is_blocked ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
              <Ban className="size-3" />
              Blocked
            </span>
          ) : null}
          <a
            href={`mailto:${customer.email}`}
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            {customer.email}
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Icon className="size-4" />
                {stat.label}
              </div>
              <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Order history */}
        <section className="overflow-hidden rounded-xl border border-border bg-card lg:col-span-2">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-base font-semibold">
              Order history{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({customer.orders.length})
              </span>
            </h2>
          </div>
          {customer.orders.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2.5 font-medium">Order</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 text-right font-medium">Total</th>
                    <th className="px-5 py-2.5 text-right font-medium">Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                            isOrderStatus(order.status)
                              ? ORDER_STATUS_BADGE[order.status]
                              : "border-border bg-secondary text-muted-foreground",
                          )}
                        >
                          {isOrderStatus(order.status)
                            ? ORDER_STATUS_LABEL[order.status]
                            : order.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground">
                        {formatDate(order.placed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Edit form */}
        <div className="lg:col-span-1">
          <CustomerForm mode="edit" customerId={id} initial={customer} />
        </div>
      </div>
    </div>
  );
}
