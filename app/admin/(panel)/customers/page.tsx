import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import {
  countTrashedCustomers,
  listCustomers,
  type CustomerSort,
} from "@/lib/admin/customers-queries";
import { CustomersTable } from "@/components/admin/customers/customers-table";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const SORTS: readonly CustomerSort[] = [
  "last_order_at",
  "name",
  "email",
  "order_count",
  "total_spent",
  "created_at",
];

function asSort(value: string): CustomerSort {
  return (SORTS as readonly string[]).includes(value) ? (value as CustomerSort) : "last_order_at";
}

function asDir(value: string): "asc" | "desc" {
  return value === "asc" ? "asc" : "desc";
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const pageRaw = Number.parseInt(firstParam(params.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const search = firstParam(params.search);
  const status = firstParam(params.status);
  const sort = firstParam(params.sort) || "last_order_at";
  const dirRaw = firstParam(params.dir);
  const dir = dirRaw || (sort === "name" || sort === "email" ? "asc" : "desc");

  const [result, trashCount] = await Promise.all([
    listCustomers({ page, search, status, sort: asSort(sort), dir: asDir(dir) }),
    countTrashedCustomers(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total.toLocaleString("en-US")} {result.total === 1 ? "customer" : "customers"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {trashCount > 0 ? (
            <Link
              href="/admin/customers/trash"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="size-4 text-muted-foreground" />
              Archived ({trashCount.toLocaleString("en-US")})
            </Link>
          ) : null}

          <Link
            href="/admin/customers/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
            Add customer
          </Link>
        </div>
      </header>

      <CustomersTable
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
