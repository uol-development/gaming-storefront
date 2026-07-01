"use server";

import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStoreProductsByIds } from "@/lib/data/store";
import { computeOrderTotals } from "@/lib/data/pricing";
import { BD_PHONE_RE } from "@/lib/data/bd";

/**
 * Public checkout order creation (Bangladesh). Runs on the server and writes the
 * order with the service-role client (anonymous shoppers can't satisfy the
 * staff-only RLS on `orders`). Prices/totals are recomputed from authoritative
 * DB product data — client-sent amounts are never trusted. Delivery is charged
 * by zone; Cash-on-Delivery orders are created unpaid, wallet/card as paid.
 */

const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(999),
});

const placeOrderSchema = z.object({
  customer: z.object({
    email: z.string().email(),
    name: z.string().trim().min(1),
    phone: z.string().trim().regex(BD_PHONE_RE, "Enter a valid Bangladeshi mobile number"),
  }),
  shippingAddress: z.object({
    line1: z.string().trim().min(1),
    area: z.string().trim().min(1),
    district: z.string().trim().min(1),
    postal_code: z.string().trim().optional().or(z.literal("")),
  }),
  deliveryZone: z.enum(["inside_dhaka", "dhaka_suburb", "outside_dhaka"]),
  paymentMethod: z.enum(["cod", "bkash", "nagad", "rocket", "card"]),
  paymentRef: z.string().trim().max(120).optional().or(z.literal("")),
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
  const { customer, shippingAddress, deliveryZone, paymentMethod, paymentRef, lines } = parsed.data;

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
  const totals = computeOrderTotals(subtotal, deliveryZone);
  const paymentStatus = paymentMethod === "cod" ? "unpaid" : "paid";

  const address = {
    line1: shippingAddress.line1,
    area: shippingAddress.area,
    district: shippingAddress.district,
    postal_code: shippingAddress.postal_code ?? "",
    country: "Bangladesh",
  };

  const supabase = createSupabaseAdminClient();

  // Lightweight throttle: reject a repeat order from the same email within 20s —
  // stops accidental double-submits and basic order spam without extra infra.
  const { data: recent } = await supabase
    .from("orders")
    .select("id")
    .ilike("customer_email", customer.email)
    .gt("placed_at", new Date(Date.now() - 20_000).toISOString())
    .limit(1);
  if (recent && recent.length > 0) {
    return {
      ok: false,
      error: "You just placed an order — please wait a moment before trying again.",
    };
  }

  let orderId: string | null = null;
  let orderNumber = "";
  for (let attempt = 0; attempt < 4 && !orderId; attempt++) {
    orderNumber = makeOrderNumber(attempt);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        status: "pending",
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        payment_ref: paymentRef && paymentRef.length > 0 ? paymentRef : null,
        delivery_zone: deliveryZone,
        currency: "BDT",
        subtotal: totals.subtotal,
        shipping: totals.shipping,
        tax: totals.tax,
        discount: 0,
        total: totals.total,
        shipping_address: address,
        billing_address: address,
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

  // Best-effort CRM upsert keyed by email (never blocks the order).
  try {
    await supabase.from("customers").upsert(
      {
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
      },
      { onConflict: "email", ignoreDuplicates: true },
    );
  } catch {
    // customers table optional — ignore
  }

  return { ok: true, orderNumber, total: totals.total };
}
