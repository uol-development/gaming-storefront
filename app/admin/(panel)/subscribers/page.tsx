import { listSubscribers } from "@/lib/admin/subscribers-queries";
import { SubscribersTable } from "@/components/admin/subscribers/subscribers-table";

export const metadata = { title: "Subscribers" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const pageRaw = Number.parseInt(firstParam(params.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const search = firstParam(params.search);

  const result = await listSubscribers({ page, search });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Subscribers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.total.toLocaleString("en-US")} newsletter{" "}
          {result.total === 1 ? "subscriber" : "subscribers"} captured from the storefront
        </p>
      </header>

      <SubscribersTable
        rows={result.rows}
        total={result.total}
        page={result.page}
        perPage={result.perPage}
        search={search}
      />
    </div>
  );
}
