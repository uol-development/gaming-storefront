import Link from "next/link";
import type { Metadata } from "next";
import { Package } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  isOrderStatus,
  isPaymentStatus,
} from "@/lib/admin/orders-schema";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/account/sign-out-button";
import { AccountSignInPrompt } from "@/components/account/account-signin-prompt";

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  placed_at: string;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(
    date,
  );
}

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="container mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {!user ? (
        <AccountSignInPrompt />
      ) : (
        <AccountContent
          userId={user.id}
          email={user.email ?? ""}
          supabase={supabase}
        />
      )}
    </main>
  );
}

async function AccountContent({
  userId,
  email,
  supabase,
}: {
  userId: string;
  email: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}) {
  const [{ data: profile }, { data: orderData }] = await Promise.all([
    supabase.from("profiles").select("full_name,email").eq("id", userId).maybeSingle(),
    supabase
      .from("orders")
      .select("id,order_number,status,payment_status,total,placed_at")
      .ilike("customer_email", email)
      .is("deleted_at", null)
      .order("placed_at", { ascending: false }),
  ]);

  const name =
    (profile && typeof profile.full_name === "string" && profile.full_name.trim()) || email;
  const orders: OrderRow[] = ((orderData ?? []) as Record<string, unknown>[]).map((o) => ({
    id: String(o.id ?? ""),
    order_number: String(o.order_number ?? ""),
    status: String(o.status ?? ""),
    payment_status: String(o.payment_status ?? ""),
    total: typeof o.total === "number" ? o.total : 0,
    placed_at: String(o.placed_at ?? ""),
  }));

  const totalSpent = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{email}</p>
        </div>
        <SignOutButton />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Orders</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{orders.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total spent
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatPrice(totalSpent)}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">Order history</h2>
        </div>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
              <Package className="size-6" />
            </span>
            <p className="text-sm text-muted-foreground">You haven&apos;t placed any orders yet.</p>
            <Link
              href="/products"
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Order</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Payment</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total</th>
                  <th className="px-5 py-2.5 text-right font-medium">Placed</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium text-foreground">{order.order_number}</td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                          isOrderStatus(order.status)
                            ? ORDER_STATUS_BADGE[order.status]
                            : "border-border bg-secondary text-muted-foreground",
                        )}
                      >
                        {isOrderStatus(order.status) ? ORDER_STATUS_LABEL[order.status] : order.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {isPaymentStatus(order.payment_status)
                        ? PAYMENT_STATUS_LABEL[order.payment_status]
                        : order.payment_status}
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
    </div>
  );
}
