import {
  listReviewProductChoices,
  listReviews,
  reviewStatusCounts,
  type ReviewSort,
} from "@/lib/admin/reviews-queries";
import { ReviewsTable } from "@/components/admin/reviews/reviews-table";

export const metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const SORTS: readonly ReviewSort[] = ["created_at", "rating"];

function asSort(value: string): ReviewSort {
  return (SORTS as readonly string[]).includes(value) ? (value as ReviewSort) : "created_at";
}

function asDir(value: string): "asc" | "desc" {
  return value === "asc" ? "asc" : "desc";
}

export default async function ReviewsPage({
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
  const sort = firstParam(params.sort) || "created_at";
  const dir = firstParam(params.dir) || "desc";

  const [result, counts, productChoices] = await Promise.all([
    listReviews({ page, search, status, productId: product, sort: asSort(sort), dir: asDir(dir) }),
    reviewStatusCounts(),
    listReviewProductChoices(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {counts.pending ?? 0} pending · {counts.approved ?? 0} approved · moderate customer product
          reviews
        </p>
      </header>

      <ReviewsTable
        rows={result.rows}
        total={result.total}
        page={result.page}
        perPage={result.perPage}
        search={search}
        status={status}
        productId={product}
        counts={counts}
        productChoices={productChoices}
      />
    </div>
  );
}
