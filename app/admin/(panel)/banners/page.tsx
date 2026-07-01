import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import {
  countTrashedBanners,
  listBanners,
  type BannerSort,
} from "@/lib/admin/banners-queries";
import { BannersTable } from "@/components/admin/banners/banners-table";

export const metadata = { title: "Banners" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const SORTS: readonly BannerSort[] = ["position", "created_at", "heading"];

function asSort(value: string): BannerSort {
  return (SORTS as readonly string[]).includes(value) ? (value as BannerSort) : "position";
}

function asDir(value: string): "asc" | "desc" {
  return value === "desc" ? "desc" : "asc";
}

export default async function BannersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const pageRaw = Number.parseInt(firstParam(params.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const search = firstParam(params.search);
  const status = firstParam(params.status);
  const placement = firstParam(params.placement);
  const sort = firstParam(params.sort) || "position";
  const dir = firstParam(params.dir) || (sort === "created_at" ? "desc" : "asc");

  const [result, trashCount] = await Promise.all([
    listBanners({ page, perPage: 50, search, status, placement, sort: asSort(sort), dir: asDir(dir) }),
    countTrashedBanners(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Promo Banners</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total.toLocaleString("en-US")}{" "}
            {result.total === 1 ? "banner" : "banners"} · drag to reorder the homepage mosaic
          </p>
        </div>
        <div className="flex items-center gap-2">
          {trashCount > 0 ? (
            <Link
              href="/admin/banners/trash"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="size-4 text-muted-foreground" />
              Archived ({trashCount.toLocaleString("en-US")})
            </Link>
          ) : null}
          <Link
            href="/admin/banners/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
            Add banner
          </Link>
        </div>
      </header>

      <BannersTable
        rows={result.rows}
        total={result.total}
        page={result.page}
        perPage={result.perPage}
        search={search}
        status={status}
        placement={placement}
        sort={sort}
        dir={asDir(dir)}
      />
    </div>
  );
}
