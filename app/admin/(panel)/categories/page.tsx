import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import {
  countTrashedCategories,
  listCategories,
  type CategorySort,
} from "@/lib/admin/categories-queries";
import { CategoriesTable } from "@/components/admin/categories/categories-table";

export const metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const SORTS: readonly CategorySort[] = ["position", "name", "updated_at"];

function asSort(value: string): CategorySort {
  return (SORTS as readonly string[]).includes(value) ? (value as CategorySort) : "position";
}

function asDir(value: string): "asc" | "desc" {
  return value === "desc" ? "desc" : "asc";
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const pageRaw = Number.parseInt(firstParam(params.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const search = firstParam(params.search);
  const status = firstParam(params.status);
  const sort = firstParam(params.sort) || "position";
  const dirRaw = firstParam(params.dir);
  const dir = dirRaw || (sort === "updated_at" ? "desc" : "asc");

  const [result, trashCount] = await Promise.all([
    listCategories({ page, search, status, sort: asSort(sort), dir: asDir(dir) }),
    countTrashedCategories(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total.toLocaleString("en-US")}{" "}
            {result.total === 1 ? "category" : "categories"} organizing your catalog
          </p>
        </div>

        <div className="flex items-center gap-2">
          {trashCount > 0 ? (
            <Link
              href="/admin/categories/trash"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="size-4 text-muted-foreground" />
              Recycle bin ({trashCount.toLocaleString("en-US")})
            </Link>
          ) : null}

          <Link
            href="/admin/categories/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
            Add category
          </Link>
        </div>
      </header>

      <CategoriesTable
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
