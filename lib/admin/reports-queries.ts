import "server-only";
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ORDER_STATUS_LABEL, isOrderStatus } from "@/lib/admin/orders-schema";
import {
  DELIVERY_ZONE_LABEL,
  PAYMENT_METHOD_LABEL,
  isDeliveryZone,
  isPaymentMethod,
} from "@/lib/data/bd";
import {
  REPORT_PERIOD_LABEL,
  type Breakdown,
  type PeriodReport,
  type ReportPeriod,
  type ReportRange,
  type ReportsData,
  type ReportsOverview,
  type RecentOrder,
  type SeriesPoint,
  type TopProduct,
} from "@/lib/admin/reports-shared";

// Re-export the client-safe types + constants so existing server imports of
// this module keep working.
export * from "@/lib/admin/reports-shared";

/**
 * Server-only analytics aggregation. Reads orders + order_items and computes
 * KPIs, a sales time series, and breakdowns in JS (fine at this scale). Revenue
 * conventions for a COD-heavy BD store: paid revenue = payment_status 'paid';
 * pending = non-cancelled unpaid (COD in flight); sales (chart) = all
 * non-cancelled order totals.
 */

interface OrderRecord {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  delivery_zone: string;
  total: number;
  placed_at: string;
  customer_email: string;
  customer_name: string;
}

type Granularity = "day" | "week" | "month";

const toNum = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const toStr = (v: unknown): string => (typeof v === "string" ? v : "");

function bucketKey(date: Date, granularity: Granularity): { key: string; label: string } {
  if (granularity === "day") {
    return { key: format(date, "yyyy-MM-dd"), label: format(date, "MMM d") };
  }
  if (granularity === "week") {
    const s = startOfWeek(date, { weekStartsOn: 1 });
    return { key: format(s, "yyyy-MM-dd"), label: format(s, "MMM d") };
  }
  const s = startOfMonth(date);
  return { key: format(s, "yyyy-MM"), label: format(s, "MMM yyyy") };
}

function buildSeries(
  orders: OrderRecord[],
  start: Date,
  end: Date,
  granularity: Granularity,
): SeriesPoint[] {
  const points =
    granularity === "day"
      ? eachDayOfInterval({ start, end })
      : granularity === "week"
        ? eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
        : eachMonthOfInterval({ start, end });

  const buckets = new Map<string, SeriesPoint>();
  const order: string[] = [];
  for (const p of points) {
    const { key, label } = bucketKey(p, granularity);
    if (!buckets.has(key)) {
      buckets.set(key, { key, label, sales: 0, orders: 0 });
      order.push(key);
    }
  }

  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const placed = new Date(o.placed_at);
    if (Number.isNaN(placed.getTime())) continue;
    const { key } = bucketKey(placed, granularity);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.sales += o.total;
    bucket.orders += 1;
  }

  return order.map((key) => buckets.get(key)).filter((b): b is SeriesPoint => b !== undefined);
}

function tally(
  orders: OrderRecord[],
  keyOf: (o: OrderRecord) => string,
  labelOf: (key: string) => string,
): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const o of orders) {
    const key = keyOf(o);
    if (!key) continue;
    const cur = map.get(key) ?? { key, label: labelOf(key), revenue: 0, count: 0 };
    cur.revenue += o.total;
    cur.count += 1;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

async function collectOrders(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rangeStart: Date | null,
): Promise<OrderRecord[]> {
  let oq = supabase
    .from("orders")
    .select(
      "id,order_number,status,payment_status,payment_method,delivery_zone,total,placed_at,customer_email,customer_name",
    )
    .is("deleted_at", null);
  if (rangeStart) oq = oq.gte("placed_at", rangeStart.toISOString());
  const { data, error } = await oq.order("placed_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((o) => ({
    id: toStr(o.id),
    order_number: toStr(o.order_number),
    status: toStr(o.status),
    payment_status: toStr(o.payment_status),
    payment_method: toStr(o.payment_method),
    delivery_zone: toStr(o.delivery_zone),
    total: toNum(o.total),
    placed_at: toStr(o.placed_at),
    customer_email: toStr(o.customer_email).toLowerCase(),
    customer_name: toStr(o.customer_name),
  }));
}

async function getTopProducts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  orderIds: string[],
): Promise<TopProduct[]> {
  if (orderIds.length === 0) return [];
  const { data, error } = await supabase
    .from("order_items")
    .select("product_id,name,quantity,line_total,order_id")
    .in("order_id", orderIds);
  if (error) throw new Error(error.message);

  const map = new Map<string, TopProduct>();
  for (const raw of (data ?? []) as Record<string, unknown>[]) {
    const productId = toStr(raw.product_id) || toStr(raw.name);
    if (!productId) continue;
    const cur =
      map.get(productId) ?? { productId, name: toStr(raw.name) || "—", units: 0, revenue: 0 };
    cur.units += toNum(raw.quantity);
    cur.revenue += toNum(raw.line_total);
    map.set(productId, cur);
  }
  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);
}

async function buildReportsData(
  rangeStart: Date | null,
  granularity: Granularity,
  now: Date,
): Promise<ReportsData> {
  const supabase = await createSupabaseServerClient();
  const orders = await collectOrders(supabase, rangeStart);

  // "active" = real, completed-or-in-progress sales. Cancelled AND refunded
  // orders are excluded from revenue, AOV, and the sales series so a refund
  // doesn't inflate the numbers. (The status breakdown below still counts them.)
  const active = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
  const paid = active.filter((o) => o.payment_status === "paid");
  const pending = active.filter((o) => o.payment_status === "unpaid");

  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const pendingRevenue = pending.reduce((s, o) => s + o.total, 0);
  const gross = active.reduce((s, o) => s + o.total, 0);
  const orderCount = active.length;
  const aov = orderCount > 0 ? Math.round(gross / orderCount) : 0;
  const customers = new Set(active.map((o) => o.customer_email).filter(Boolean)).size;

  let seriesStart = rangeStart;
  if (!seriesStart) {
    const earliest = orders.reduce<Date | null>((min, o) => {
      const d = new Date(o.placed_at);
      if (Number.isNaN(d.getTime())) return min;
      return min === null || d < min ? d : min;
    }, null);
    seriesStart = earliest ?? subDays(startOfDay(now), 29);
  }
  const series = buildSeries(active, seriesStart, now, granularity);

  // Status breakdown covers ALL orders (incl. cancelled/refunded) so the admin
  // sees the full distribution; payment/zone breakdowns reflect real sales only.
  const statusBreakdown = tally(
    orders,
    (o) => o.status,
    (k) => (isOrderStatus(k) ? ORDER_STATUS_LABEL[k] : k),
  );
  const paymentBreakdown = tally(
    active,
    (o) => o.payment_method,
    (k) => (isPaymentMethod(k) ? PAYMENT_METHOD_LABEL[k] : k || "—"),
  );
  const zoneBreakdown = tally(
    active,
    (o) => o.delivery_zone,
    (k) => (isDeliveryZone(k) ? DELIVERY_ZONE_LABEL[k] : k || "—"),
  );

  const topProducts = await getTopProducts(
    supabase,
    active.map((o) => o.id),
  );

  const recentOrders: RecentOrder[] = orders.slice(0, 8).map((o) => ({
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    payment_status: o.payment_status,
    total: o.total,
    placed_at: o.placed_at,
    customer_name: o.customer_name,
  }));

  return {
    kpis: { revenue, pendingRevenue, orders: orderCount, aov, customers },
    series,
    statusBreakdown,
    paymentBreakdown,
    zoneBreakdown,
    topProducts,
    recentOrders,
    hasData: orders.length > 0,
  };
}

const RANGE_DAYS: Record<ReportRange, number | null> = { "7d": 7, "30d": 30, "90d": 90, all: null };

function granularityForSpan(days: number | null): Granularity {
  if (days === null || days > 180) return "month";
  if (days > 45) return "week";
  return "day";
}

export async function getReportsOverview(range: ReportRange): Promise<ReportsOverview> {
  const now = new Date();
  const days = RANGE_DAYS[range];
  const rangeStart = days === null ? null : subDays(startOfDay(now), days - 1);
  const data = await buildReportsData(rangeStart, granularityForSpan(days), now);
  return { ...data, range };
}

const PERIOD_DAYS: Record<ReportPeriod, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

export async function getReportForPeriod(period: ReportPeriod): Promise<PeriodReport> {
  const now = new Date();
  const days = PERIOD_DAYS[period];
  const rangeStart = subDays(startOfDay(now), days - 1);
  const data = await buildReportsData(rangeStart, granularityForSpan(days), now);

  const rangeLabel =
    days === 1
      ? format(now, "MMM d, yyyy")
      : `${format(rangeStart, "MMM d, yyyy")} – ${format(now, "MMM d, yyyy")}`;

  return {
    ...data,
    period,
    title: `${REPORT_PERIOD_LABEL[period]} report`,
    rangeLabel,
    generatedAtLabel: format(now, "MMM d, yyyy · h:mm a"),
  };
}
