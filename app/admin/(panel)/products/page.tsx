import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import {
  countTrashedProducts,
  listProducts,
  type ProductSort,
} from "@/lib/admin/products-queries";
import { ProductsTable } from "@/components/admin/products/products-table";

export const metadata = { title: "Products" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

/** Read the first usable value of a search param that may arrive as an array. */
function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const SORTS: readonly ProductSort[] = ["updated_at", "name", "price", "stock_quantity"];

function asSort(value: string): ProductSort {
  return (SORTS as readonly string[]).includes(value) ? (value as ProductSort) : "updated_at";
}

function asDir(value: string): "asc" | "desc" {
  return value === "asc" ? "asc" : "desc";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const pageRaw = Number.parseInt(firstParam(params.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const search = firstParam(params.search);
  const status = firstParam(params.status);
  const sort = firstParam(params.sort) || "updated_at";
  const dir = firstParam(params.dir) || "desc";

  const [result, trashCount] = await Promise.all([
    listProducts({ page, search, status, sort: asSort(sort), dir: asDir(dir) }),
    countTrashedProducts(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total.toLocaleString("en-US")}{" "}
            {result.total === 1 ? "product" : "products"} in your catalog
          </p>
        </div>

        <div className="flex items-center gap-2">
          {trashCount > 0 ? (
            <Link
              href="/admin/products/trash"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="size-4 text-muted-foreground" />
              Recycle bin ({trashCount.toLocaleString("en-US")})
            </Link>
          ) : null}

          <Link
            href="/admin/products/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
            Add product
          </Link>
        </div>
      </header>

      <ProductsTable
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
