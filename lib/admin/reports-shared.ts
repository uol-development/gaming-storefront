/**
 * Pure, client-safe report types + constants (no server imports). Shared by the
 * server-only aggregation layer (reports-queries.ts) and client components
 * (the PDF export). Money is integer minor units (poisha) throughout.
 */

/* ------------------------------ dashboard ranges ------------------------- */

export type ReportRange = "7d" | "30d" | "90d" | "all";
export const REPORT_RANGES: readonly ReportRange[] = ["7d", "30d", "90d", "all"] as const;
export const REPORT_RANGE_LABEL: Record<ReportRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
};
export function asReportRange(value: string): ReportRange {
  return (REPORT_RANGES as readonly string[]).includes(value) ? (value as ReportRange) : "30d";
}

/* ------------------------------- PDF periods ----------------------------- */

export type ReportPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
export const REPORT_PERIODS: readonly ReportPeriod[] = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;
export const REPORT_PERIOD_LABEL: Record<ReportPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};
export function asReportPeriod(value: string): ReportPeriod {
  return (REPORT_PERIODS as readonly string[]).includes(value) ? (value as ReportPeriod) : "monthly";
}

/* --------------------------------- types --------------------------------- */

export interface ReportKpis {
  revenue: number;
  pendingRevenue: number;
  orders: number;
  aov: number;
  customers: number;
}

export interface SeriesPoint {
  key: string;
  label: string;
  sales: number;
  orders: number;
}

export interface Breakdown {
  key: string;
  label: string;
  revenue: number;
  count: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  units: number;
  revenue: number;
}

export interface RecentOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  placed_at: string;
  customer_name: string;
}

export interface ReportsData {
  kpis: ReportKpis;
  series: SeriesPoint[];
  statusBreakdown: Breakdown[];
  paymentBreakdown: Breakdown[];
  zoneBreakdown: Breakdown[];
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
  hasData: boolean;
}

export interface ReportsOverview extends ReportsData {
  range: ReportRange;
}

export interface PeriodReport extends ReportsData {
  period: ReportPeriod;
  title: string;
  rangeLabel: string;
  generatedAtLabel: string;
}
