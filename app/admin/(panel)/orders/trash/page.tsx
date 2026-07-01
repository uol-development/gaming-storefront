import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { listOrders } from "@/lib/admin/orders-queries";
import { OrdersTrashTable } from "@/components/admin/orders/orders-trash-table";

export const metadata = { title: "Archived orders" };
export const dynamic = "force-dynamic";

export default async function OrdersTrashPage() {
  const result = await listOrders({ trash: true, perPage: 100 });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to orders
        </Link>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
          <Trash2 className="size-6 text-muted-foreground" />
          Archived orders
        </h1>
        <p className="text-sm text-muted-foreground">
          Archived orders are hidden from the main list. Restore one to bring it back, or delete it
          permanently. Permanent deletion cannot be undone.
        </p>
      </div>

      <OrdersTrashTable rows={result.rows} />
    </div>
  );
}
