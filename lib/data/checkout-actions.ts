"use server";

import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStoreProductsByIds } from "@/lib/data/store";
import { computeOrderTotals } from "@/lib/data/pricing";

/**
 * Public checkout order creation. Runs on the server and writes the order with
 * the service-role client (anonymous shoppers can't satisfy the staff-only RLS
 * on `orders`). Prices/totals are recomputed from authoritative DB product data
 * — client-sent amounts are never trusted.
 */

const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(999),
});

const placeOrderSchema = z.object({
  customer: z.object({
    email: z.string().email(),
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
  }),
  shippingAddress: z.object({
    line1: z.string().trim().min(1),
    city: z.string().trim().min(1),
    postal_code: z.string().trim().min(1),
    country: z.string().trim().min(1),
  }),
  lines: z.array(lineSchema).min(1),
});

export type PlaceOrderInput = z.input<typeof placeOrderSchema>;

export interface PlaceOrderResult {
  ok: boolean;
  error?: string;
  orderNumber?: string;
  total?: number;
}

function makeOrderNumber(attempt: number): string {
  const base = Date.now().toString().slice(-8);
  const salt = attempt === 0 ? "" : Math.random().toString(36).slice(2, 4).toUpperCase();
  return `NEX-${base}${salt}`;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid order details." };
  }
  const { customer, shippingAddress, lines } = parsed.data;

  // Authoritative product data — never trust client-sent prices.
  const ids = Array.from(new Set(lines.map((l) => l.productId)));
  const products = await getStoreProductsByIds(ids);
  const byId = new Map(products.map((p) => [p.id, p]));

  const items = lines
    .map((l) => {
      const product = byId.get(l.productId);
      if (!product) return null;
      const unit = product.price;
      return {
        product_id: product.id,
        name: product.name,
        sku: null as string | null,
        image_url: product.image ?? null,
        unit_price: unit,
        quantity: l.quantity,
        line_total: unit * l.quantity,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (items.length === 0) {
    return { ok: false, error: "Your cart items are no longer available." };
  }

  const subtotal = items.reduce((sum, it) => sum + it.line_total, 0);
  const totals = computeOrderTotals(subtotal);

  const supabase = createSupabaseAdminClient();

  // Insert the order, retrying on the (rare) order_number unique collision.
  let orderId: string | null = null;
  let orderNumber = "";
  for (let attempt = 0; attempt < 4 && !orderId; attempt++) {
    orderNumber = makeOrderNumber(attempt);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: `${customer.firstName} ${customer.lastName}`.trim(),
        customer_email: customer.email,
        status: "pending",
        payment_status: "paid",
        subtotal: totals.subtotal,
        shipping: totals.shipping,
        tax: totals.tax,
        discount: 0,
        total: totals.total,
        shipping_address: shippingAddress,
        billing_address: shippingAddress,
      })
      .select("id")
      .single();
    if (!error && data) {
      orderId = (data as { id: string }).id;
      break;
    }
    if (error && error.code === "23505") continue; // duplicate order_number — retry
    if (error) return { ok: false, error: error.message };
  }

  if (!orderId) return { ok: false, error: "Could not create your order. Please try again." };

  const itemRows = items.map((it) => ({ ...it, order_id: orderId }));
  const { error: itemsError } = await supabase.from("order_items").insert(itemRows);
  if (itemsError) return { ok: false, error: itemsError.message };

  return { ok: true, orderNumber, total: totals.total };
}
