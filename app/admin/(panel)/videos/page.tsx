import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import {
  countTrashedVideos,
  listProductChoices,
  listVideos,
  type VideoSort,
} from "@/lib/admin/videos-queries";
import { VideosTable } from "@/components/admin/videos/videos-table";

export const metadata = { title: "Featured Videos" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const SORTS: readonly VideoSort[] = ["position", "created_at", "title"];

function asSort(value: string): VideoSort {
  return (SORTS as readonly string[]).includes(value) ? (value as VideoSort) : "position";
}

function asDir(value: string): "asc" | "desc" {
  return value === "desc" ? "desc" : "asc";
}

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const pageRaw = Number.parseInt(firstParam(params.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const search = firstParam(params.search);
  const status = firstParam(params.status);
  const product = firstParam(params.product);
  const sort = firstParam(params.sort) || "position";
  const dirRaw = firstParam(params.dir);
  const dir = dirRaw || (sort === "created_at" ? "desc" : "asc");

  const [result, trashCount, productChoices] = await Promise.all([
    listVideos({ page, perPage: 50, search, status, productId: product, sort: asSort(sort), dir: asDir(dir) }),
    countTrashedVideos(),
    listProductChoices(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Featured Videos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total.toLocaleString("en-US")} YouTube {result.total === 1 ? "video" : "videos"} ·
            drag to reorder the homepage carousel
          </p>
        </div>

        <div className="flex items-center gap-2">
          {trashCount > 0 ? (
            <Link
              href="/admin/videos/trash"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="size-4 text-muted-foreground" />
              Recycle bin ({trashCount.toLocaleString("en-US")})
            </Link>
          ) : null}

          <Link
            href="/admin/videos/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
            Add video
          </Link>
        </div>
      </header>

      <VideosTable
        rows={result.rows}
        total={result.total}
        page={result.page}
        perPage={result.perPage}
        search={search}
        status={status}
        productId={product}
        sort={sort}
        dir={asDir(dir)}
        productChoices={productChoices}
      />
    </div>
  );
}
