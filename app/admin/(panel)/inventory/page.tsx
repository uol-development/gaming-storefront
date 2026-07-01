import {
  inventorySummary,
  listInventory,
  type InventorySort,
} from "@/lib/admin/inventory-queries";
import { InventoryTable } from "@/components/admin/inventory/inventory-table";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const SORTS: readonly InventorySort[] = ["stock_quantity", "name", "updated_at"];

function asSort(value: string): InventorySort {
  return (SORTS as readonly string[]).includes(value) ? (value as InventorySort) : "stock_quantity";
}

function asDir(value: string): "asc" | "desc" {
  return value === "desc" ? "desc" : "asc";
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const pageRaw = Number.parseInt(firstParam(params.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const search = firstParam(params.search);
  const stock = firstParam(params.stock);
  const sort = firstParam(params.sort) || "stock_quantity";
  const dirRaw = firstParam(params.dir);
  const dir = dirRaw || (sort === "updated_at" ? "desc" : "asc");

  const [result, summary] = await Promise.all([
    listInventory({ page, search, stock, sort: asSort(sort), dir: asDir(dir) }),
    inventorySummary(),
  ]);

  const cards = [
    { label: "Products tracked", value: summary.total, tone: "text-foreground" },
    { label: "In stock", value: summary.inStock, tone: "text-emerald-400" },
    { label: "Low stock", value: summary.lowStock, tone: "text-amber-400" },
    { label: "Out of stock", value: summary.outOfStock, tone: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stock levels, reorder thresholds, and adjustment history.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {card.label}
            </p>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${card.tone}`}>
              {card.value.toLocaleString("en-US")}
            </p>
          </div>
        ))}
      </div>

      <InventoryTable
        rows={result.rows}
        total={result.total}
        page={result.page}
        perPage={result.perPage}
        search={search}
        stock={stock}
        sort={sort}
        dir={asDir(dir)}
      />
    </div>
  );
}
