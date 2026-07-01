import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  countTrashedOrders,
  listOrders,
  type OrderSort,
} from "@/lib/admin/orders-queries";
import { OrdersTable } from "@/components/admin/orders/orders-table";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const SORTS: readonly OrderSort[] = ["placed_at", "total", "order_number", "status"];

function asSort(value: string): OrderSort {
  return (SORTS as readonly string[]).includes(value) ? (value as OrderSort) : "placed_at";
}

function asDir(value: string): "asc" | "desc" {
  return value === "asc" ? "asc" : "desc";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const pageRaw = Number.parseInt(firstParam(params.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const search = firstParam(params.search);
  const status = firstParam(params.status);
  const sort = firstParam(params.sort) || "placed_at";
  const dirRaw = firstParam(params.dir);
  const dir = dirRaw || (sort === "order_number" || sort === "status" ? "asc" : "desc");

  const [result, trashCount] = await Promise.all([
    listOrders({ page, search, status, sort: asSort(sort), dir: asDir(dir) }),
    countTrashedOrders(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total.toLocaleString("en-US")} {result.total === 1 ? "order" : "orders"}
          </p>
        </div>

        {trashCount > 0 ? (
          <Link
            href="/admin/orders/trash"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 className="size-4 text-muted-foreground" />
            Archived ({trashCount.toLocaleString("en-US")})
          </Link>
        ) : null}
      </header>

      <OrdersTable
        rows={result.rows}
        total={result.total}
        page={result.page}
        perPage={result.perPage}
        search={search}
        status={status}
        sort={sort}
        dir={asDir(dir)}
      />
    </div>
  );
}
