import { z } from "zod";

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "partially_refunded"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

/** Tailwind badge classes per order status (shared by table + detail). */
export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  processing: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  shipped: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  delivered: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  cancelled: "border-border bg-secondary text-muted-foreground",
  refunded: "border-destructive/40 bg-destructive/10 text-destructive",
};

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, string> = {
  unpaid: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  refunded: "border-destructive/40 bg-destructive/10 text-destructive",
  partially_refunded: "border-sky-500/30 bg-sky-500/10 text-sky-400",
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}
