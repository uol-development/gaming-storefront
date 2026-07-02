import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingCart, Users, Wallet, Receipt, Clock } from "lucide-react";
import { getCurrentProfile, can } from "@/lib/auth/server";
import {
  asReportRange,
  getReportsOverview,
  REPORT_RANGES,
  REPORT_RANGE_LABEL,
  type Breakdown,
} from "@/lib/admin/reports-queries";
import {
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_BADGE,
  PAYMENT_STATUS_LABEL,
  isOrderStatus,
  isPaymentStatus,
} from "@/lib/admin/orders-schema";
import { getStoreSettings } from "@/lib/data/settings-read";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RevenueChart } from "@/components/admin/reports/revenue-chart";
import { ReportExport } from "@/components/admin/reports/report-export";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !can.viewReports(profile.role)) redirect("/admin");

  const params = await searchParams;
  const range = asReportRange(firstParam(params.range));
  const [overview, settings] = await Promise.all([getReportsOverview(range), getStoreSettings()]);
  const { kpis } = overview;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sales performance and analytics · {REPORT_RANGE_LABEL[range]}
          </p>
        </div>
        <ReportExport storeName={settings.store.name} />
      </header>

      {/* Range selector */}
      <div className="flex flex-wrap gap-1.5">
        {REPORT_RANGES.map((r) => (
          <Link
            key={r}
            href={r === "30d" ? "/admin/reports" : `/admin/reports?range=${r}`}
            className={cn(
              "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              r === range
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {REPORT_RANGE_LABEL[r]}
          </Link>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard icon={<Wallet className="size-4" />} label="Paid revenue" value={formatPrice(kpis.revenue)} />
        <KpiCard icon={<Clock className="size-4" />} label="Pending (COD)" value={formatPrice(kpis.pendingRevenue)} muted />
        <KpiCard icon={<ShoppingCart className="size-4" />} label="Orders" value={kpis.orders.toLocaleString("en-US")} />
        <KpiCard icon={<Receipt className="size-4" />} label="Avg. order" value={formatPrice(kpis.aov)} />
        <KpiCard icon={<Users className="size-4" />} label="Customers" value={kpis.customers.toLocaleString("en-US")} />
      </div>

      <RevenueChart series={overview.series} />

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownCard title="Orders by status" rows={overview.statusBreakdown} />
        <BreakdownCard title="Payment methods" rows={overview.paymentBreakdown} />
        <BreakdownCard title="Delivery zones" rows={overview.zoneBreakdown} />
      </div>

      {/* Top products + recent orders */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-base font-semibold">Top products</h2>
          </div>
          {overview.topProducts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No sales yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-5 py-2 text-left font-medium">Product</th>
                  <th scope="col" className="px-3 py-2 text-center font-medium">Units</th>
                  <th scope="col" className="px-5 py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {overview.topProducts.map((p) => (
                  <tr key={p.productId} className="border-b border-border last:border-0">
                    <td className="max-w-0 truncate px-5 py-2.5 font-medium text-foreground">{p.name}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground">{p.units}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-medium">{formatPrice(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-base font-semibold">Recent orders</h2>
          </div>
          {overview.recentOrders.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No orders yet</p>
          ) : (
            <ul className="divide-y divide-border">
              {overview.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {o.order_number}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.customer_name || "—"} · {formatDate(o.placed_at)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "hidden shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium sm:inline-flex",
                      isOrderStatus(o.status) ? ORDER_STATUS_BADGE[o.status] : "border-border bg-secondary text-muted-foreground",
                    )}
                  >
                    {isOrderStatus(o.status) ? ORDER_STATUS_LABEL[o.status] : o.status}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
                      isPaymentStatus(o.payment_status) ? PAYMENT_STATUS_BADGE[o.payment_status] : "border-border bg-secondary text-muted-foreground",
                    )}
                  >
                    {isPaymentStatus(o.payment_status) ? PAYMENT_STATUS_LABEL[o.payment_status] : o.payment_status}
                  </span>
                  <span className="shrink-0 tabular-nums font-medium">{formatPrice(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className={cn("grid size-7 place-items-center rounded-md", muted ? "bg-secondary" : "bg-primary/10 text-primary")}>
          {icon}
        </span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 font-display text-xl font-bold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: Breakdown[] }) {
  const max = Math.max(1, ...rows.map((r) => r.revenue));
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">No data</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium text-foreground">{r.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {r.count} · {formatPrice(r.revenue)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((r.revenue / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
